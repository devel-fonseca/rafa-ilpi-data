import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDailyRecordDto } from './dto/create-daily-record.dto';
import { UpdateDailyRecordDto } from './dto/update-daily-record.dto';
import { QueryDailyRecordDto } from './dto/query-daily-record.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as vitalSignsService from '../services/vitalSigns.service';

@Injectable()
export class DailyRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async create(dto: CreateDailyRecordDto, tenantId: string, userId: string) {
    // Verificar se residente existe e pertence ao tenant
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: dto.residentId,
        tenantId,
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
    const record = await this.prisma.dailyRecord.create({
      data: {
        type: dto.type as any, // Cast para RecordType
        date: new Date(dto.date),
        time: dto.time,
        data: dto.data as any,
        recordedBy: dto.recordedBy,
        notes: dto.notes,
        tenant: {
          connect: { id: tenantId },
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
      tenantId,
      userId,
    });

    // Se for um registro de MONITORAMENTO, criar/atualizar sinais vitais
    if (dto.type === 'MONITORAMENTO' && dto.data) {
      try {
        const vitalSignData = this.extractVitalSignsFromData(dto.data);
        const timestamp = this.buildTimestamp(dto.date, dto.time);

        await vitalSignsService.createVitalSign({
          tenantId,
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
          error: error.message,
        });
        // Não falhar a criação do registro se houver erro nos sinais vitais
      }
    }

    return record;
  }

  /**
   * Extrai dados de sinais vitais do objeto data do registro
   */
  private extractVitalSignsFromData(data: any) {
    const extracted: any = {};

    // Pressão Arterial (ex: "120/80")
    if (data.pressaoArterial) {
      const parts = data.pressaoArterial.split('/');
      if (parts.length === 2) {
        extracted.systolicBloodPressure = parseFloat(parts[0]);
        extracted.diastolicBloodPressure = parseFloat(parts[1]);
      }
    }

    // Temperatura
    if (data.temperatura) {
      extracted.temperature = parseFloat(data.temperatura);
    }

    // Frequência Cardíaca
    if (data.frequenciaCardiaca) {
      extracted.heartRate = parseInt(data.frequenciaCardiaca);
    }

    // Saturação O2
    if (data.saturacaoO2) {
      extracted.oxygenSaturation = parseFloat(data.saturacaoO2);
    }

    // Glicemia
    if (data.glicemia) {
      extracted.bloodGlucose = parseFloat(data.glicemia);
    }

    return extracted;
  }

  /**
   * Constrói timestamp completo a partir de date e time
   */
  private buildTimestamp(dateStr: string, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const timestamp = new Date(dateStr);
    timestamp.setHours(hours, minutes, 0, 0);
    return timestamp;
  }

  async findAll(query: QueryDailyRecordDto, tenantId: string) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '50');
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (query.residentId) {
      where.residentId = query.residentId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.date) {
      // Filtrar por data exata
      const date = new Date(query.date);
      where.date = date;
    } else if (query.startDate || query.endDate) {
      // Filtrar por período
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.dailyRecord.findMany({
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
      this.prisma.dailyRecord.count({ where }),
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

  async findOne(id: string, tenantId: string) {
    const record = await this.prisma.dailyRecord.findFirst({
      where: {
        id,
        tenantId,
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
    tenantId: string,
  ) {
    // Verificar se residente existe e pertence ao tenant
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: residentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const records = await this.prisma.dailyRecord.findMany({
      where: {
        residentId,
        tenantId,
        date: new Date(date),
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
    tenantId: string,
    userId: string,
    userName: string,
  ) {
    // Verificar se registro existe e pertence ao tenant
    const existing = await this.prisma.dailyRecord.findFirst({
      where: {
        id,
        tenantId,
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
    const lastVersion = await this.prisma.dailyRecordHistory.findFirst({
      where: { recordId: id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;

    // Preparar dados novos (apenas campos que foram enviados)
    const newData: any = {};
    if (dto.type !== undefined) newData.type = dto.type;
    if (dto.date !== undefined) newData.date = dto.date;
    if (dto.time !== undefined) newData.time = dto.time;
    if (dto.data !== undefined) newData.data = dto.data;
    if (dto.recordedBy !== undefined) newData.recordedBy = dto.recordedBy;
    if (dto.notes !== undefined) newData.notes = dto.notes;

    // Identificar campos alterados
    const changedFields: string[] = [];
    Object.keys(newData).forEach((key) => {
      if (JSON.stringify((existing as any)[key]) !== JSON.stringify(newData[key])) {
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
    const result = await this.prisma.$transaction(async (prisma) => {
      // 1. Salvar versão anterior no histórico
      await prisma.dailyRecordHistory.create({
        data: {
          recordId: id,
          tenantId,
          versionNumber: nextVersionNumber,
          previousData: previousSnapshot,
          newData,
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
          type: dto.type as any,
          date: dto.date ? new Date(dto.date) : undefined,
          time: dto.time,
          data: dto.data as any,
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
      tenantId,
      userId,
    });

    // Se for um registro de MONITORAMENTO e houve mudança nos dados vitais, atualizar tabela de sinais vitais
    if (result.type === 'MONITORAMENTO' && (dto.data || dto.date || dto.time)) {
      try {
        const vitalSignData = this.extractVitalSignsFromData(result.data);
        const timestamp = this.buildTimestamp(
          result.date.toISOString().split('T')[0],
          result.time,
        );

        await vitalSignsService.updateVitalSignByTimestamp(
          tenantId,
          result.residentId,
          timestamp,
          vitalSignData,
        );

        this.logger.info('Sinal vital atualizado automaticamente', {
          recordId: id,
          timestamp,
        });
      } catch (error) {
        this.logger.error('Erro ao atualizar sinal vital', {
          recordId: id,
          error: error.message,
        });
        // Não falhar a atualização do registro se houver erro nos sinais vitais
      }
    }

    return result;
  }

  async remove(
    id: string,
    deleteDto: { deleteReason: string },
    tenantId: string,
    userId: string,
    userName: string,
  ) {
    // Verificar se registro existe e pertence ao tenant
    const existing = await this.prisma.dailyRecord.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Calcular próximo número de versão
    const lastVersion = await this.prisma.dailyRecordHistory.findFirst({
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
    await this.prisma.$transaction(async (prisma) => {
      // 1. Salvar no histórico antes de deletar
      await prisma.dailyRecordHistory.create({
        data: {
          recordId: id,
          tenantId,
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
      tenantId,
      userId,
    });

    // Se for um registro de MONITORAMENTO, deletar sinal vital correspondente
    if (existing.type === 'MONITORAMENTO') {
      try {
        const timestamp = this.buildTimestamp(
          existing.date.toISOString().split('T')[0],
          existing.time,
        );

        await vitalSignsService.deleteVitalSignByTimestamp(
          tenantId,
          existing.residentId,
          timestamp,
        );

        this.logger.info('Sinal vital deletado automaticamente', {
          recordId: id,
          timestamp,
        });
      } catch (error) {
        this.logger.error('Erro ao deletar sinal vital', {
          recordId: id,
          error: error.message,
        });
        // Não falhar a deleção do registro se houver erro nos sinais vitais
      }
    }

    return { message: 'Registro removido com sucesso' };
  }

  /**
   * Busca o histórico de versões de um registro
   */
  async getHistory(id: string, tenantId: string) {
    // Verificar se registro existe
    const record = await this.prisma.dailyRecord.findFirst({
      where: {
        id,
        tenantId,
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
    const history = await this.prisma.dailyRecordHistory.findMany({
      where: {
        recordId: id,
        tenantId,
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
   * @param tenantId - ID do tenant
   * @param userId - ID do usuário que está restaurando
   * @param userName - Nome do usuário que está restaurando
   */
  async restoreVersion(
    recordId: string,
    versionId: string,
    restoreReason: string,
    tenantId: string,
    userId: string,
    userName: string,
  ) {
    // Buscar registro atual
    const record = await this.prisma.dailyRecord.findFirst({
      where: { id: recordId, tenantId },
    });

    if (!record) {
      throw new NotFoundException('Registro não encontrado');
    }

    // Buscar versão do histórico que será restaurada
    const versionToRestore = await this.prisma.dailyRecordHistory.findFirst({
      where: {
        id: versionId,
        recordId,
        tenantId,
      },
    });

    if (!versionToRestore) {
      throw new NotFoundException('Versão do histórico não encontrada');
    }

    // Calcular próximo número de versão
    const lastVersion = await this.prisma.dailyRecordHistory.findFirst({
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
    const dataToRestore = versionToRestore.previousData as any;

    // Identificar campos alterados
    const changedFields: string[] = [];
    Object.keys(dataToRestore).forEach((key) => {
      if (
        JSON.stringify((record as any)[key]) !==
        JSON.stringify(dataToRestore[key])
      ) {
        changedFields.push(key);
      }
    });

    // Usar transação para garantir consistência
    const result = await this.prisma.$transaction(async (prisma) => {
      // Criar registro no histórico indicando a restauração
      await prisma.dailyRecordHistory.create({
        data: {
          recordId,
          tenantId,
          versionNumber: nextVersionNumber,
          previousData: previousSnapshot,
          newData: dataToRestore,
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
          type: dataToRestore.type,
          date: dataToRestore.date,
          time: dataToRestore.time,
          data: dataToRestore.data,
          recordedBy: dataToRestore.recordedBy,
          notes: dataToRestore.notes,
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
  async findLatestByResidents(tenantId: string) {
    // Query SQL otimizada que busca o último registro de cada residente
    // usando window function DISTINCT ON (mais eficiente que GROUP BY + subquery)
    const latestRecords = await this.prisma.$queryRaw<
      Array<{
        residentId: string;
        type: string;
        date: Date;
        time: string;
        createdAt: Date;
      }>
    >`
      SELECT DISTINCT ON (dr."residentId")
        dr."residentId",
        dr.type,
        dr.date,
        dr.time,
        dr."createdAt"
      FROM daily_records dr
      WHERE dr."tenantId" = ${tenantId}::uuid
        AND dr."deletedAt" IS NULL
      ORDER BY dr."residentId", dr.date DESC, dr.time DESC, dr."createdAt" DESC
    `;

    // Retornar resultado diretamente (já está no formato correto)
    return latestRecords;
  }

  /**
   * Busca todas as datas que possuem registros para um residente em um período (mês)
   * Usado para indicadores no calendário
   */
  async findDatesWithRecordsByResident(
    residentId: string,
    tenantId: string,
    year: number,
    month: number,
  ) {
    // Verificar se residente existe e pertence ao tenant
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: residentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    // Calcular primeiro e último dia do mês
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59);

    // Buscar datas únicas que têm registros
    const datesWithRecords = await this.prisma.dailyRecord.findMany({
      where: {
        residentId,
        tenantId,
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
  async findLastVitalSign(residentId: string, tenantId: string) {
    // Verificar se residente existe e pertence ao tenant
    const resident = await this.prisma.resident.findFirst({
      where: {
        id: residentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Residente não encontrado');
    }

    const record = await this.prisma.dailyRecord.findFirst({
      where: {
        residentId,
        tenantId,
        type: 'MONITORAMENTO',
        deletedAt: null,
      },
      orderBy: [
        { date: 'desc' },
        { time: 'desc' },
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

    return record || null;
  }
}
