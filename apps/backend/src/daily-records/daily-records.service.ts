import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { CreateDailyRecordDto } from './dto/create-daily-record.dto';
import { UpdateDailyRecordDto } from './dto/update-daily-record.dto';
import { QueryDailyRecordDto } from './dto/query-daily-record.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { VitalSignsService } from '../vital-signs/vital-signs.service';
import { IncidentInterceptorService } from './incident-interceptor.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DailyRecordCreatedEvent } from '../sentinel-events/events/daily-record-created.event';
import { parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { localToUTC } from '../utils/date.helpers';
import {
  RecordType,
  IncidentCategory,
  IncidentSeverity,
  IncidentSubtypeClinical,
  IncidentSubtypeAssistencial,
  IncidentSubtypeAdministrativa,
  SystemNotificationType,
  NotificationCategory,
  NotificationSeverity,
  Prisma,
} from '@prisma/client';

@Injectable()
export class DailyRecordsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly vitalSignsService: VitalSignsService,
    private readonly incidentInterceptorService: IncidentInterceptorService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateDailyRecordDto, userId: string) {
    // Verificar se residente existe
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: dto.residentId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // Validar formato de hora (HH:mm) - redundante com class-validator, mas garante
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(dto.time)) {
      throw new BadRequestException('Formato de hora inválido. Use HH:mm');
    }

    // Criar registro
    const record = await this.tenantContext.client.dailyRecord.create({
      data: {
        type: dto.type as RecordType,
        // FIX TIMESTAMPTZ: Usar parseISO com meio-dia para evitar shifts de timezone
        // dto.date vem como "YYYY-MM-DD", adicionamos T12:00:00 para manter a data correta
        date: parseISO(`${dto.date}T12:00:00.000`),
        time: dto.time,
        data: dto.data as Prisma.InputJsonValue,
        recordedBy: dto.recordedBy,
        notes: dto.notes,
        // Campos de intercorrência (opcionais)
        incidentCategory: dto.incidentCategory as IncidentCategory | undefined,
        incidentSeverity: dto.incidentSeverity as IncidentSeverity | undefined,
        incidentSubtypeClinical: dto.incidentSubtypeClinical as IncidentSubtypeClinical | undefined,
        incidentSubtypeAssist: dto.incidentSubtypeAssist as IncidentSubtypeAssistencial | undefined,
        incidentSubtypeAdmin: dto.incidentSubtypeAdmin as IncidentSubtypeAdministrativa | undefined,
        isEventoSentinela: dto.isEventoSentinela,
        isDoencaNotificavel: dto.isDoencaNotificavel,
        rdcIndicators: dto.rdcIndicators as Prisma.InputJsonValue | undefined,
        tenant: {
          connect: { id: this.tenantContext.tenantId },
        },
        resident: {
          connect: { id: dto.residentId },
        },
        user: {
          connect: { id: userId },
        },
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            fotoUrl: true,
          },
        },
      },
    });

    this.logger.info('Registro diário criado', {
      recordId: record.id,
      residentId: dto.residentId,
      type: dto.type,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    // NOTIFICAÇÃO DE INTERCORRÊNCIA MANUAL
    // Se o registro for do tipo INTERCORRENCIA (registro manual de intercorrência)
    // criar notificação para o tenant
    if (dto.type === 'INTERCORRENCIA') {
      try {
        // Mapear severidade do incident para severidade da notificação
        const notificationSeverity =
          dto.incidentSeverity === IncidentSeverity.GRAVE
            ? NotificationSeverity.CRITICAL
            : dto.incidentSeverity === IncidentSeverity.MODERADA
              ? NotificationSeverity.WARNING
              : NotificationSeverity.INFO;

        // Construir mensagem baseada na categoria e subtipo
        let description = 'Intercorrência registrada';
        if (dto.incidentCategory === IncidentCategory.CLINICA && dto.incidentSubtypeClinical) {
          description = `${dto.incidentSubtypeClinical}`;
        } else if (dto.incidentCategory === IncidentCategory.ASSISTENCIAL && dto.incidentSubtypeAssist) {
          description = `${dto.incidentSubtypeAssist}`;
        } else if (dto.incidentCategory === IncidentCategory.ADMINISTRATIVA && dto.incidentSubtypeAdmin) {
          description = `${dto.incidentSubtypeAdmin}`;
        }

        // Criar notificação
        await this.notificationsService.createForTenant(this.tenantContext.tenantId, {
          type: SystemNotificationType.INCIDENT_CREATED,
          category: NotificationCategory.INCIDENT,
          severity: notificationSeverity,
          title: 'Intercorrência Registrada',
          message: `${resident.fullName}: ${description}`,
          actionUrl: `/dashboard/registros-diarios`,
          entityType: 'DAILY_RECORD',
          entityId: record.id,
          metadata: {
            residentId: dto.residentId,
            residentName: resident.fullName,
            category: dto.incidentCategory,
            subtypeClinical: dto.incidentSubtypeClinical,
            subtypeAssist: dto.incidentSubtypeAssist,
            subtypeAdmin: dto.incidentSubtypeAdmin,
            severity: dto.incidentSeverity,
            isEventoSentinela: dto.isEventoSentinela,
            deteccaoAutomatica: false,
          },
        });

        this.logger.info('Notificação de intercorrência manual criada', {
          recordId: record.id,
          residentName: resident.fullName,
        });
      } catch (notificationError) {
        this.logger.error('Erro ao criar notificação de intercorrência manual', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
          stack: notificationError instanceof Error ? notificationError.stack : undefined,
          recordId: record.id,
        });
        // Não propagar o erro - o registro já foi criado com sucesso
      }
    }

    // DETECÇÃO AUTOMÁTICA DE INTERCORRÊNCIAS (RDC 502/2021)
    // Analisar o registro para detectar padrões que indiquem intercorrências
    try {
      await this.incidentInterceptorService.analyzeAndCreateIncidents(
        record,
        userId,
      );
    } catch (error) {
      this.logger.error('Erro na análise de intercorrências', {
        recordId: record.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Não falhar a criação do registro original
    }

    // Emitir evento para processamento assíncrono
    // O SentinelEventsService está escutando este evento via @OnEvent
    this.eventEmitter.emit(
      'daily-record.created',
      new DailyRecordCreatedEvent(record, this.tenantContext.tenantId, userId),
    );

    this.logger.info('Evento daily-record.created emitido', {
      recordId: record.id,
      isEventoSentinela: dto.isEventoSentinela,
    });

    // Se for um registro de MONITORAMENTO, criar/atualizar sinais vitais
    if (dto.type === 'MONITORAMENTO' && dto.data) {
      try {
        // Buscar timezone do tenant para construir timestamp corretamente
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: this.tenantContext.tenantId },
          select: { timezone: true },
        });
        const timezone = tenant?.timezone || 'America/Sao_Paulo';

        const vitalSignData = this.extractVitalSignsFromData(dto.data);
        const timestamp = this.buildTimestamp(dto.date, dto.time, timezone);

        // Usar VitalSignsService do NestJS que já tem detecção de anomalias integrada
        await this.vitalSignsService.create(userId, {
          residentId: dto.residentId,
          userId,
          timestamp,
          ...vitalSignData,
        });

        this.logger.info('Sinal vital criado automaticamente', {
          recordId: record.id,
          timestamp,
        });
      } catch (error) {
        this.logger.error('Erro ao criar sinal vital', {
          recordId: record.id,
          error: error instanceof Error ? error.message : String(error),
        });
        // Não falhar a criação do registro se houver erro nos sinais vitais
      }
    }

    return record;
  }

  /**
   * Extrai dados de sinais vitais do objeto data do registro
   */
  private extractVitalSignsFromData(data: Record<string, unknown>) {
    const extracted: {
      systolicBloodPressure?: number;
      diastolicBloodPressure?: number;
      temperature?: number;
      heartRate?: number;
      oxygenSaturation?: number;
      bloodGlucose?: number;
    } = {};

    // Pressão Arterial (ex: "120/80")
    if (typeof data.pressaoArterial === 'string') {
      const parts = data.pressaoArterial.split('/');
      if (parts.length === 2) {
        extracted.systolicBloodPressure = parseFloat(parts[0]);
        extracted.diastolicBloodPressure = parseFloat(parts[1]);
      }
    }

    // Temperatura
    if (data.temperatura) {
      extracted.temperature = parseFloat(String(data.temperatura));
    }

    // Frequência Cardíaca
    if (data.frequenciaCardiaca) {
      extracted.heartRate = parseInt(String(data.frequenciaCardiaca));
    }

    // Saturação O2
    if (data.saturacaoO2) {
      extracted.oxygenSaturation = parseFloat(String(data.saturacaoO2));
    }

    // Glicemia
    if (data.glicemia) {
      extracted.bloodGlucose = parseFloat(String(data.glicemia));
    }

    return extracted;
  }

  /**
   * Constrói timestamp completo a partir de date e time
   * @param dateStr Data civil (YYYY-MM-DD)
   * @param timeStr Hora local (HH:mm)
   * @param timezone Timezone IANA do tenant
   * @returns Date UTC representando o momento local especificado (timezone-safe)
   */
  private buildTimestamp(dateStr: string, timeStr: string, timezone: string = 'America/Sao_Paulo'): Date {
    // Usar helper timezone-safe que converte hora local para UTC corretamente
    return localToUTC(dateStr, timeStr, timezone);
  }

  async findAll(query: QueryDailyRecordDto) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: Prisma.DailyRecordWhereInput = {
      deletedAt: null,
    };

    if (query.residentId) {
      where.residentId = query.residentId;
    }

    if (query.type) {
      where.type = query.type as RecordType;
    }

    if (query.date) {
      // FIX TIMESTAMPTZ: Filtrar por data exata usando range (dia completo)
      const dateObj = parseISO(query.date);
      where.date = {
        gte: startOfDay(dateObj),
        lte: endOfDay(dateObj),
      };
    } else if (query.startDate || query.endDate) {
      // FIX TIMESTAMPTZ: Filtrar por período usando startOfDay/endOfDay
      where.date = {};
      if (query.startDate) {
        where.date.gte = startOfDay(parseISO(query.startDate));
      }
      if (query.endDate) {
        where.date.lte = endOfDay(parseISO(query.endDate));
      }
    }

    const [records, total] = await Promise.all([
      this.tenantContext.client.dailyRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { date: query.sortOrder || 'desc' },
          { time: query.sortOrder || 'desc' },
        ],
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
              fotoUrl: true,
            },
          },
        },
      }),
      this.tenantContext.client.dailyRecord.count({ where }),
    ]);

    return {
      data: records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const record = await this.tenantContext.client.dailyRecord.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            fotoUrl: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Registro não encontrado');
    }

    return record;
  }

  async findByResidentAndDate(
    residentId: string,
    date: string,
  ) {
    // Verificar se residente existe
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // FIX TIMESTAMPTZ: Comparar por dia completo usando date-fns
    // date vem como "YYYY-MM-DD", precisamos buscar todos os registros desse dia
    // independente do horário armazenado no TIMESTAMPTZ
    const dateObj = parseISO(date);

    const records = await this.tenantContext.client.dailyRecord.findMany({
      where: {
        residentId,
        date: {
          gte: startOfDay(dateObj),
          lte: endOfDay(dateObj),
        },
        deletedAt: null,
      },
      orderBy: {
        time: 'asc',
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            fotoUrl: true,
          },
        },
      },
    });

    return records;
  }

  async update(
    id: string,
    dto: UpdateDailyRecordDto,
    userId: string,
    userName: string,
  ) {
    // Verificar se registro existe
    const existing = await this.tenantContext.client.dailyRecord.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Se time foi fornecido, validar formato
    if (dto.time) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(dto.time)) {
        throw new BadRequestException('Formato de hora inválido. Use HH:mm');
      }
    }

    // Calcular próximo número de versão
    const lastVersion = await this.tenantContext.client.dailyRecordHistory.findFirst({
      where: { recordId: id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Preparar dados novos (apenas campos que foram enviados)
    const newData: Record<string, unknown> = {};
    if (dto.type !== undefined) newData.type = dto.type;
    if (dto.date !== undefined) newData.date = dto.date;
    if (dto.time !== undefined) newData.time = dto.time;
    if (dto.data !== undefined) newData.data = dto.data;
    if (dto.recordedBy !== undefined) newData.recordedBy = dto.recordedBy;
    if (dto.notes !== undefined) newData.notes = dto.notes;

    // Identificar campos alterados
    const changedFields: string[] = [];
    Object.keys(newData).forEach((key) => {
      const existingValue = existing[key as keyof typeof existing];
      if (JSON.stringify(existingValue) !== JSON.stringify(newData[key])) {
        changedFields.push(key);
      }
    });

    // Criar snapshot do estado anterior
    const previousSnapshot = {
      type: existing.type,
      date: existing.date,
      time: existing.time,
      data: existing.data,
      recordedBy: existing.recordedBy,
      notes: existing.notes,
      updatedAt: existing.updatedAt,
    };

    // Usar transação para garantir consistência
    const result = await this.tenantContext.client.$transaction(async (prisma) => {
      // 1. Salvar versão anterior no histórico
      await prisma.dailyRecordHistory.create({
        data: {
          recordId: id,
          tenantId: this.tenantContext.tenantId,
          versionNumber: nextVersionNumber,
          previousData: previousSnapshot as Prisma.InputJsonValue,
          newData: newData as Prisma.InputJsonValue,
          changedFields,
          changeType: 'UPDATE',
          changeReason: dto.editReason,
          changedBy: userId,
          changedByName: userName,
        },
      });

      // 2. Atualizar registro
      const updated = await prisma.dailyRecord.update({
        where: { id },
        data: {
          type: dto.type as RecordType | undefined,
          // FIX TIMESTAMPTZ: Usar parseISO com meio-dia para evitar shifts de timezone
          date: dto.date ? parseISO(`${dto.date}T12:00:00.000`) : undefined,
          time: dto.time,
          data: dto.data as Prisma.InputJsonValue | undefined,
          recordedBy: dto.recordedBy,
          notes: dto.notes,
        },
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
              fotoUrl: true,
            },
          },
        },
      });

      return updated;
    });

    this.logger.info('Registro diário atualizado com versionamento', {
      recordId: id,
      versionNumber: nextVersionNumber,
      changedFields,
      reason: dto.editReason,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    // Se for um registro de MONITORAMENTO e houve mudança nos dados vitais, atualizar tabela de sinais vitais
    if (result.type === 'MONITORAMENTO' && (dto.data || dto.date || dto.time)) {
      try {
        // Buscar timezone do tenant para construir timestamp corretamente
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: this.tenantContext.tenantId },
          select: { timezone: true },
        });
        const timezone = tenant?.timezone || 'America/Sao_Paulo';

        const vitalSignData = this.extractVitalSignsFromData(
          (result.data as Record<string, unknown>) || {}
        );
        const timestamp = this.buildTimestamp(
          result.date.toISOString().split('T')[0],
          result.time,
          timezone,
        );

        // Buscar VitalSign existente por timestamp
        const existingVitalSign = await this.tenantContext.client.vitalSign.findFirst({
          where: {
            residentId: result.residentId,
            timestamp,
            deletedAt: null,
          },
        });

        if (existingVitalSign) {
          // Atualizar usando VitalSignsService do NestJS (com detecção de anomalias)
          await this.vitalSignsService.update(
            userId,
            existingVitalSign.id,
            { ...vitalSignData, changeReason: dto.editReason || 'Atualização via Registro Diário' },
          );

          this.logger.info('Sinal vital atualizado automaticamente', {
            recordId: id,
            vitalSignId: existingVitalSign.id,
            timestamp,
          });
        } else {
          this.logger.warn('Sinal vital não encontrado para atualização', {
            recordId: id,
            timestamp,
          });
        }
      } catch (error) {
        this.logger.error('Erro ao atualizar sinal vital', {
          recordId: id,
          error: error instanceof Error ? error.message : String(error),
        });
        // Não falhar a atualização do registro se houver erro nos sinais vitais
      }
    }

    return result;
  }

  async remove(
    id: string,
    deleteDto: { deleteReason: string },
    userId: string,
    userName: string,
  ) {
    // Verificar se registro existe
    const existing = await this.tenantContext.client.dailyRecord.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Calcular próximo número de versão
    const lastVersion = await this.tenantContext.client.dailyRecordHistory.findFirst({
      where: { recordId: id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Snapshot do estado final antes de deletar
    const finalSnapshot = {
      type: existing.type,
      date: existing.date,
      time: existing.time,
      data: existing.data,
      recordedBy: existing.recordedBy,
      notes: existing.notes,
      updatedAt: existing.updatedAt,
    };

    // Usar transação
    await this.tenantContext.client.$transaction(async (prisma) => {
      // 1. Salvar no histórico antes de deletar
      await prisma.dailyRecordHistory.create({
        data: {
          recordId: id,
          tenantId: this.tenantContext.tenantId,
          versionNumber: nextVersionNumber,
          previousData: finalSnapshot,
          newData: { deleted: true },
          changedFields: ['deletedAt'],
          changeType: 'DELETE',
          changeReason: deleteDto.deleteReason,
          changedBy: userId,
          changedByName: userName,
        },
      });

      // 2. Soft delete
      await prisma.dailyRecord.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });
    });

    this.logger.info('Registro diário removido (soft delete) com versionamento', {
      recordId: id,
      versionNumber: nextVersionNumber,
      reason: deleteDto.deleteReason,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    // Se for um registro de MONITORAMENTO, deletar sinal vital correspondente
    if (existing.type === 'MONITORAMENTO') {
      try {
        // Buscar timezone do tenant para construir timestamp corretamente
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: this.tenantContext.tenantId },
          select: { timezone: true },
        });
        const timezone = tenant?.timezone || 'America/Sao_Paulo';

        const timestamp = this.buildTimestamp(
          existing.date.toISOString().split('T')[0],
          existing.time,
          timezone,
        );

        // Buscar VitalSign existente por timestamp
        const existingVitalSign = await this.tenantContext.client.vitalSign.findFirst({
          where: {
            residentId: existing.residentId,
            timestamp,
            deletedAt: null,
          },
        });

        if (existingVitalSign) {
          // Deletar usando VitalSignsService do NestJS (com versionamento)
          await this.vitalSignsService.remove(
            userId,
            existingVitalSign.id,
            deleteDto.deleteReason || 'Remoção via Registro Diário',
          );

          this.logger.info('Sinal vital deletado automaticamente', {
            recordId: id,
            vitalSignId: existingVitalSign.id,
            timestamp,
          });
        } else {
          this.logger.warn('Sinal vital não encontrado para deleção', {
            recordId: id,
            timestamp,
          });
        }
      } catch (error) {
        this.logger.error('Erro ao deletar sinal vital', {
          recordId: id,
          error: error instanceof Error ? error.message : String(error),
        });
        // Não falhar a deleção do registro se houver erro nos sinais vitais
      }
    }

    return { message: 'Registro removido com sucesso' };
  }

  /**
   * Busca o histórico de versões de um registro
   */
  async getHistory(id: string) {
    // Verificar se registro existe
    const record = await this.tenantContext.client.dailyRecord.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        type: true,
      },
    });

    if (!record) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Buscar histórico ordenado por versão (mais recente primeiro)
    const history = await this.tenantContext.client.dailyRecordHistory.findMany({
      where: {
        recordId: id,
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    return {
      recordId: id,
      recordType: record.type,
      totalVersions: history.length,
      history,
    };
  }

  /**
   * Restaura um registro para uma versão anterior
   * Cria uma nova versão no histórico indicando a restauração
   *
   * @param recordId - ID do registro que será restaurado
   * @param versionId - ID da versão do histórico que será restaurada
   * @param restoreReason - Motivo da restauração (compliance)
   * @param userId - ID do usuário que está restaurando
   * @param userName - Nome do usuário que está restaurando
   */
  async restoreVersion(
    recordId: string,
    versionId: string,
    restoreReason: string,
    userId: string,
    userName: string,
  ) {
    // Buscar registro atual
    const record = await this.tenantContext.client.dailyRecord.findFirst({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Buscar versão do histórico que será restaurada
    const versionToRestore = await this.tenantContext.client.dailyRecordHistory.findFirst({
      where: {
        id: versionId,
        recordId,
      },
    });

    if (!versionToRestore) {
      throw new NotFoundException('Versão do histórico não encontrada');
    }

    // Calcular próximo número de versão
    const lastVersion = await this.tenantContext.client.dailyRecordHistory.findFirst({
      where: { recordId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Snapshot dos dados atuais (antes da restauração)
    const previousSnapshot = {
      type: record.type,
      date: record.date,
      time: record.time,
      data: record.data,
      recordedBy: record.recordedBy,
      notes: record.notes,
      updatedAt: record.updatedAt,
    };

    // Dados da versão que será restaurada (previousData da versão selecionada)
    const dataToRestore = versionToRestore.previousData as Record<string, unknown>;

    // Identificar campos alterados
    const changedFields: string[] = [];
    Object.keys(dataToRestore).forEach((key) => {
      const recordValue = record[key as keyof typeof record];
      if (
        JSON.stringify(recordValue) !==
        JSON.stringify(dataToRestore[key])
      ) {
        changedFields.push(key);
      }
    });

    // Usar transação para garantir consistência
    const result = await this.tenantContext.client.$transaction(async (prisma) => {
      // Criar registro no histórico indicando a restauração
      await prisma.dailyRecordHistory.create({
        data: {
          recordId,
          tenantId: this.tenantContext.tenantId,
          versionNumber: nextVersionNumber,
          previousData: previousSnapshot as Prisma.InputJsonValue,
          newData: dataToRestore as Prisma.InputJsonValue,
          changedFields,
          changeType: 'UPDATE',
          changeReason: `[RESTAURAÇÃO v${versionToRestore.versionNumber}] ${restoreReason}`,
          changedBy: userId,
          changedByName: userName,
        },
      });

      // Atualizar o registro com os dados restaurados
      const restored = await prisma.dailyRecord.update({
        where: { id: recordId },
        data: {
          type: dataToRestore.type as RecordType,
          date: dataToRestore.date as Date,
          time: dataToRestore.time as string,
          data: dataToRestore.data as Prisma.InputJsonValue,
          recordedBy: dataToRestore.recordedBy as string,
          notes: dataToRestore.notes as string | null,
          updatedAt: new Date(),
        },
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
              fotoUrl: true,
            },
          },
        },
      });

      return restored;
    });

    return result;
  }

  /**
   * Busca o último registro diário de cada residente do tenant
   * Query otimizada usando SQL RAW para melhor performance
   */
  async findLatestByResidents() {
    const tenantSchemaName = (await this.prisma.tenant.findUnique({
      where: { id: this.tenantContext.tenantId },
      select: { schemaName: true },
    }))?.schemaName;

    if (!tenantSchemaName) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Query SQL otimizada que busca o último registro de cada residente
    // usando window function DISTINCT ON (mais eficiente que GROUP BY + subquery)
    const latestRecords = await this.tenantContext.client.$queryRawUnsafe<
      Array<{
        residentId: string;
        type: string;
        date: Date;
        time: string;
        createdAt: Date;
      }>
    >(`
      SELECT DISTINCT ON (dr."residentId")
        dr."residentId",
        dr.type,
        dr.date,
        dr.time,
        dr."createdAt"
      FROM "${tenantSchemaName}".daily_records dr
      WHERE dr."deletedAt" IS NULL
      ORDER BY dr."residentId", dr.date DESC, dr.time DESC, dr."createdAt" DESC
    `);

    // Retornar resultado diretamente (já está no formato correto)
    return latestRecords;
  }

  /**
   * Busca os últimos N registros de um residente específico
   * Retorna registros ordenados por data/hora (mais recentes primeiro)
   */
  async findLatestByResident(
    residentId: string,
    limit: number = 3,
  ) {
    // Verificar se residente existe
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // Buscar últimos N registros ordenados por data DESC, time DESC
    const latestRecords = await this.tenantContext.client.dailyRecord.findMany({
      where: {
        residentId,
        deletedAt: null,
      },
      select: {
        id: true,
        type: true,
        date: true,
        time: true,
        recordedBy: true,
        createdAt: true,
      },
      orderBy: [
        { date: 'desc' },
        { time: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return latestRecords;
  }

  /**
   * Busca todas as datas que possuem registros para um residente em um período (mês)
   * Usado para indicadores no calendário
   */
  async findDatesWithRecordsByResident(
    residentId: string,
    year: number,
    month: number,
  ) {
    // Verificar se residente existe
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // FIX TIMESTAMPTZ: Calcular primeiro e último dia do mês usando date-fns
    // Garante timezone correto e evita problemas com horário de verão
    const referenceDate = new Date(year, month - 1, 1);
    const firstDay = startOfMonth(referenceDate);
    const lastDay = endOfMonth(referenceDate);

    // Buscar datas únicas que têm registros
    const datesWithRecords = await this.tenantContext.client.dailyRecord.findMany({
      where: {
        residentId,
        date: {
          gte: firstDay,
          lte: lastDay,
        },
        deletedAt: null,
      },
      distinct: ['date'],
      select: {
        date: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Retornar apenas as datas em formato YYYY-MM-DD
    return datesWithRecords.map((record) => {
      const date = new Date(record.date);
      return date.toISOString().split('T')[0];
    });
  }

  /**
   * Busca o último registro de Monitoramento Vital de um residente
   * Otimizado para não carregar todos os registros (apenas o mais recente)
   */
  async findLastVitalSign(residentId: string) {
    // Verificar se residente existe
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // Buscar último sinal vital da tabela VitalSign
    const vitalSign = await this.tenantContext.client.vitalSign.findFirst({
      where: {
        residentId,
        deletedAt: null,
      },
      orderBy: [
        { timestamp: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
            fotoUrl: true,
          },
        },
      },
    });

    return vitalSign || null;
  }

  /**
   * Busca os últimos valores registrados de cada parâmetro vital
   * Consolida valores de diferentes registros para exibição rápida
   */
  async findConsolidatedVitalSigns(residentId: string) {
    // Verificar se residente existe
    const resident = await this.tenantContext.client.resident.findFirst({
      where: {
        id: residentId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // Buscar último valor de cada parâmetro
    // Otimizado: uma query por parâmetro, ordenada por timestamp DESC
    const [
      lastBloodPressure,
      lastBloodGlucose,
      lastTemperature,
      lastOxygenSaturation,
      lastHeartRate,
    ] = await Promise.all([
      // Pressão Arterial (PA)
      this.tenantContext.client.vitalSign.findFirst({
        where: {
          residentId,
          deletedAt: null,
          systolicBloodPressure: { not: null },
          diastolicBloodPressure: { not: null },
        },
        select: {
          systolicBloodPressure: true,
          diastolicBloodPressure: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      }),

      // Glicemia
      this.tenantContext.client.vitalSign.findFirst({
        where: {
          residentId,
          deletedAt: null,
          bloodGlucose: { not: null },
        },
        select: {
          bloodGlucose: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      }),

      // Temperatura
      this.tenantContext.client.vitalSign.findFirst({
        where: {
          residentId,
          deletedAt: null,
          temperature: { not: null },
        },
        select: {
          temperature: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      }),

      // Saturação de Oxigênio (SpO2)
      this.tenantContext.client.vitalSign.findFirst({
        where: {
          residentId,
          deletedAt: null,
          oxygenSaturation: { not: null },
        },
        select: {
          oxygenSaturation: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      }),

      // Frequência Cardíaca (FC)
      this.tenantContext.client.vitalSign.findFirst({
        where: {
          residentId,
          deletedAt: null,
          heartRate: { not: null },
        },
        select: {
          heartRate: true,
          timestamp: true,
        },
        orderBy: [{ timestamp: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    // Montar resposta consolidada
    return {
      bloodPressure: lastBloodPressure
        ? {
            systolic: lastBloodPressure.systolicBloodPressure,
            diastolic: lastBloodPressure.diastolicBloodPressure,
            timestamp: lastBloodPressure.timestamp,
          }
        : null,
      bloodGlucose: lastBloodGlucose
        ? {
            value: lastBloodGlucose.bloodGlucose,
            timestamp: lastBloodGlucose.timestamp,
          }
        : null,
      temperature: lastTemperature
        ? {
            value: lastTemperature.temperature,
            timestamp: lastTemperature.timestamp,
          }
        : null,
      oxygenSaturation: lastOxygenSaturation
        ? {
            value: lastOxygenSaturation.oxygenSaturation,
            timestamp: lastOxygenSaturation.timestamp,
          }
        : null,
      heartRate: lastHeartRate
        ? {
            value: lastHeartRate.heartRate,
            timestamp: lastHeartRate.timestamp,
          }
        : null,
    };
  }
}
