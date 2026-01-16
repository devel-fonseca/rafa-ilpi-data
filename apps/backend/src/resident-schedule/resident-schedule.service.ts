import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { parseISO, format } from 'date-fns';
import { ScheduleFrequency, Prisma } from '@prisma/client';
import {
  CreateScheduleConfigDto,
  UpdateScheduleConfigDto,
  CreateScheduledEventDto,
  UpdateScheduledEventDto,
} from './dto';
import { CreateAlimentacaoConfigDto } from './dto/create-alimentacao-config.dto';
import { UpdateAlimentacaoConfigDto } from './dto/update-alimentacao-config.dto';
import { MEAL_TYPES } from './constants/meal-types.constant';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ResidentScheduleService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // CONFIGURAÇÕES DE AGENDA (Registros Recorrentes)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Criar nova configuração de registro obrigatório recorrente
   */
  async createConfig(
    dto: CreateScheduleConfigDto,
    userId: string,
  ) {
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

    // Validar frequência
    this.validateFrequencyFields(dto.frequency, dto.dayOfWeek, dto.dayOfMonth);

    // Verificar duplicata: mesmo residente + recordType + frequency + dayOfWeek/dayOfMonth
    const existing = await this.tenantContext.client.residentScheduleConfig.findFirst({
      where: {
        residentId: dto.residentId,
        recordType: dto.recordType,
        frequency: dto.frequency,
        dayOfWeek: dto.dayOfWeek ?? null,
        dayOfMonth: dto.dayOfMonth ?? null,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe uma configuração com estes parâmetros para este residente',
      );
    }

    // Criar configuração
    const config = await this.tenantContext.client.residentScheduleConfig.create({
      data: {
        tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
        residentId: dto.residentId,
        recordType: dto.recordType,
        frequency: dto.frequency,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        suggestedTimes: dto.suggestedTimes,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
        createdBy: userId,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.info('ResidentScheduleConfig created', {
      configId: config.id,
      residentId: dto.residentId,
      recordType: dto.recordType,
      frequency: dto.frequency,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    return config;
  }

  /**
   * Criar 6 configurações de alimentação em batch (uma para cada refeição obrigatória)
   */
  async createAlimentacaoConfigs(
    dto: CreateAlimentacaoConfigDto,
    userId: string,
  ) {
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

    // Verificar se já existem configs de alimentação para este residente
    const existingConfigs = await this.tenantContext.client.residentScheduleConfig.findMany({
      where: {
        residentId: dto.residentId,
        recordType: 'ALIMENTACAO',
        frequency: 'DAILY',
        deletedAt: null,
      },
    });

    if (existingConfigs.length > 0) {
      throw new ConflictException(
        'Já existem configurações de alimentação para este residente. Use a edição para alterar os horários.',
      );
    }

    // Mapear os horários para os tipos de refeição
    const mealTimesMap: Record<string, string> = {
      'Café da Manhã': dto.mealTimes.cafeDaManha,
      'Colação': dto.mealTimes.colacao,
      'Almoço': dto.mealTimes.almoco,
      'Lanche': dto.mealTimes.lanche,
      'Jantar': dto.mealTimes.jantar,
      'Ceia': dto.mealTimes.ceia,
    };

    // Criar as 6 configs em batch usando transaction
    const configs = await this.tenantContext.client.$transaction(
      MEAL_TYPES.map((mealType) => {
        return this.tenantContext.client.residentScheduleConfig.create({
          data: {
            tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
            residentId: dto.residentId,
            recordType: 'ALIMENTACAO',
            frequency: 'DAILY',
            suggestedTimes: [mealTimesMap[mealType.value]],
            isActive: dto.isActive ?? true,
            notes: dto.notes,
            metadata: {
              mealType: mealType.value,
            },
            createdBy: userId,
          },
          include: {
            resident: {
              select: {
                id: true,
                fullName: true,
              },
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      }),
    );

    this.logger.info('6 ResidentScheduleConfigs created for ALIMENTACAO', {
      residentId: dto.residentId,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    return configs;
  }

  /**
   * Atualizar as 6 configurações de alimentação em batch
   */
  async updateAlimentacaoConfigs(
    residentId: string,
    dto: UpdateAlimentacaoConfigDto,
    userId: string,
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

    // Buscar todas as configs de alimentação atuais
    const existingConfigs = await this.tenantContext.client.residentScheduleConfig.findMany({
      where: {
        residentId,
        recordType: 'ALIMENTACAO',
        frequency: 'DAILY',
        deletedAt: null,
      },
    });

    if (existingConfigs.length === 0) {
      throw new NotFoundException(
        'Nenhuma configuração de alimentação encontrada para este residente',
      );
    }

    // Mapear os horários para os tipos de refeição
    const mealTimesMap: Record<string, string> = {
      'Café da Manhã': dto.mealTimes.cafeDaManha,
      'Colação': dto.mealTimes.colacao,
      'Almoço': dto.mealTimes.almoco,
      'Lanche': dto.mealTimes.lanche,
      'Jantar': dto.mealTimes.jantar,
      'Ceia': dto.mealTimes.ceia,
    };

    // Atualizar todas as 6 configs em transaction
    const updatedConfigs = await this.tenantContext.client.$transaction(
      existingConfigs.map((config) => {
        const metadata = config.metadata as { mealType: string };
        const mealType = metadata.mealType;
        const newTime = mealTimesMap[mealType];

        return this.tenantContext.client.residentScheduleConfig.update({
          where: { id: config.id },
          data: {
            suggestedTimes: [newTime],
            isActive: dto.isActive ?? config.isActive,
            notes: dto.notes ?? config.notes,
            updatedBy: userId,
          },
          include: {
            resident: {
              select: {
                id: true,
                fullName: true,
              },
            },
            updatedByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      }),
    );

    this.logger.info('6 ResidentScheduleConfigs updated for ALIMENTACAO', {
      residentId,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    return updatedConfigs;
  }

  /**
   * Deletar todas as 6 configurações de alimentação em batch
   */
  async deleteAlimentacaoConfigs(
    residentId: string,
    userId: string,
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

    // Buscar todas as configs de alimentação
    const existingConfigs = await this.tenantContext.client.residentScheduleConfig.findMany({
      where: {
        residentId,
        recordType: 'ALIMENTACAO',
        frequency: 'DAILY',
        deletedAt: null,
      },
    });

    if (existingConfigs.length === 0) {
      throw new NotFoundException(
        'Nenhuma configuração de alimentação encontrada para este residente',
      );
    }

    // Soft delete de todas as 6 configs
    await this.tenantContext.client.residentScheduleConfig.updateMany({
      where: {
        residentId,
        recordType: 'ALIMENTACAO',
        frequency: 'DAILY',
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.info('6 ResidentScheduleConfigs deleted for ALIMENTACAO', {
      residentId,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    return { message: 'Configurações de alimentação removidas com sucesso' };
  }

  /**
   * Buscar configurações de um residente
   */
  async getConfigsByResident(residentId: string) {
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

    return this.tenantContext.client.residentScheduleConfig.findMany({
      where: {
        residentId,
        deletedAt: null,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { recordType: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Buscar todas as configurações ativas de registros obrigatórios do tenant
   * Usado para cálculo de cobertura de registros obrigatórios
   */
  async getAllActiveConfigs() {
    return this.tenantContext.client.residentScheduleConfig.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        resident: {
          status: 'Ativo',
          deletedAt: null,
        },
      },
      select: {
        id: true,
        residentId: true,
        recordType: true,
        frequency: true,
        dayOfWeek: true,
        dayOfMonth: true,
        suggestedTimes: true,
        metadata: true,
      },
      orderBy: [
        { residentId: 'asc' },
        { recordType: 'asc' },
      ],
    });
  }

  /**
   * Atualizar configuração
   */
  async updateConfig(
    id: string,
    dto: UpdateScheduleConfigDto,
    userId: string,
  ) {
    // Buscar configuração
    const config = await this.tenantContext.client.residentScheduleConfig.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!config) {
      throw new NotFoundException('Configuração não encontrada');
    }

    // Validar frequência se estiver sendo alterada
    if (dto.frequency) {
      this.validateFrequencyFields(
        dto.frequency,
        dto.dayOfWeek ?? config.dayOfWeek ?? undefined,
        dto.dayOfMonth ?? config.dayOfMonth ?? undefined,
      );
    }

    // Verificar duplicata se campos-chave estiverem sendo alterados
    if (dto.recordType || dto.frequency || dto.dayOfWeek || dto.dayOfMonth) {
      const existing = await this.tenantContext.client.residentScheduleConfig.findFirst({
        where: {
          id: { not: id },
          residentId: config.residentId,
          recordType: dto.recordType ?? config.recordType,
          frequency: dto.frequency ?? config.frequency,
          dayOfWeek: dto.dayOfWeek ?? config.dayOfWeek ?? null,
          dayOfMonth: dto.dayOfMonth ?? config.dayOfMonth ?? null,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException(
          'Já existe uma configuração com estes parâmetros para este residente',
        );
      }
    }

    // Atualizar
    const updated = await this.tenantContext.client.residentScheduleConfig.update({
      where: { id },
      data: {
        recordType: dto.recordType,
        frequency: dto.frequency,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        suggestedTimes: dto.suggestedTimes,
        isActive: dto.isActive,
        notes: dto.notes,
        updatedBy: userId,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.info('ResidentScheduleConfig updated', {
      configId: id,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    return updated;
  }

  /**
   * Deletar configuração (soft delete)
   */
  async deleteConfig(id: string, userId: string) {
    const config = await this.tenantContext.client.residentScheduleConfig.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!config) {
      throw new NotFoundException('Configuração não encontrada');
    }

    await this.tenantContext.client.residentScheduleConfig.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.info('ResidentScheduleConfig deleted', {
      configId: id,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    return { message: 'Configuração removida com sucesso' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AGENDAMENTOS PONTUAIS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Criar novo agendamento pontual
   */
  async createEvent(
    dto: CreateScheduledEventDto,
    userId: string,
  ) {
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

    // Parse da data
    const scheduledDate = parseISO(`${dto.scheduledDate}T12:00:00.000`);

    // Criar evento
    const event = await this.tenantContext.client.residentScheduledEvent.create({
      data: {
        tenantId: this.tenantContext.tenantId, // ⚠️ TEMPORARY: Schema ainda não migrado
        residentId: dto.residentId,
        eventType: dto.eventType,
        scheduledDate,
        scheduledTime: dto.scheduledTime,
        title: dto.title,
        description: dto.description,
        vaccineData: dto.vaccineData ? (dto.vaccineData as unknown as Prisma.InputJsonValue) : undefined,
        notes: dto.notes,
        createdBy: userId,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.info('ResidentScheduledEvent created', {
      eventId: event.id,
      residentId: dto.residentId,
      eventType: dto.eventType,
      scheduledDate: dto.scheduledDate,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    // Criar notificação de evento agendado
    try {
      await this.notificationsService.createScheduledEventDueNotification(
        event.id,
        resident.id,
        resident.fullName,
        event.title,
        event.scheduledTime,
      );
    } catch (error) {
      this.logger.error('Failed to create notification for scheduled event', {
        eventId: event.id,
        error,
      });
    }

    return event;
  }

  /**
   * Buscar agendamentos de um residente
   */
  async getEventsByResident(residentId: string) {
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

    return this.tenantContext.client.residentScheduledEvent.findMany({
      where: {
        residentId,
        deletedAt: null,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    });
  }

  /**
   * Atualizar agendamento
   */
  async updateEvent(
    id: string,
    dto: UpdateScheduledEventDto,
    userId: string,
  ) {
    const event = await this.tenantContext.client.residentScheduledEvent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    // Parse da data se estiver sendo alterada
    const scheduledDate = dto.scheduledDate
      ? parseISO(`${dto.scheduledDate}T12:00:00.000`)
      : undefined;

    const updated = await this.tenantContext.client.residentScheduledEvent.update({
      where: { id },
      data: {
        eventType: dto.eventType,
        scheduledDate,
        scheduledTime: dto.scheduledTime,
        title: dto.title,
        description: dto.description,
        vaccineData: dto.vaccineData ? (dto.vaccineData as unknown as Prisma.InputJsonValue) : undefined,
        status: dto.status,
        completedRecordId: dto.completedRecordId,
        completedAt: dto.status === 'COMPLETED' ? new Date() : undefined,
        notes: dto.notes,
        updatedBy: userId,
      },
      include: {
        resident: {
          select: {
            id: true,
            fullName: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.info('ResidentScheduledEvent updated', {
      eventId: id,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    // Se houve mudança de data/horário (reagendamento), criar notificação
    const dateChanged = dto.scheduledDate && dto.scheduledDate !== format(event.scheduledDate, 'yyyy-MM-dd');
    const timeChanged = dto.scheduledTime && dto.scheduledTime !== event.scheduledTime;

    if (dateChanged || timeChanged) {
      try {
        await this.notificationsService.createScheduledEventDueNotification(
          updated.id,
          updated.resident.id,
          updated.resident.fullName,
          updated.title,
          updated.scheduledTime,
        );
      } catch (error) {
        this.logger.error('Failed to create notification for rescheduled event', {
          eventId: id,
          error,
        });
      }
    }

    return updated;
  }

  /**
   * Deletar agendamento (soft delete)
   */
  async deleteEvent(id: string, userId: string) {
    const event = await this.tenantContext.client.residentScheduledEvent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    await this.tenantContext.client.residentScheduledEvent.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.info('ResidentScheduledEvent deleted', {
      eventId: id,
      userId,
      tenantId: this.tenantContext.tenantId,
    });

    return { message: 'Agendamento removido com sucesso' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Validar campos de frequência
   */
  private validateFrequencyFields(
    frequency: ScheduleFrequency,
    dayOfWeek?: number,
    dayOfMonth?: number,
  ) {
    if (frequency === ScheduleFrequency.DAILY) {
      if (dayOfWeek !== undefined || dayOfMonth !== undefined) {
        throw new BadRequestException(
          'Frequência DAILY não deve ter dayOfWeek ou dayOfMonth',
        );
      }
    }

    if (frequency === ScheduleFrequency.WEEKLY) {
      if (dayOfWeek === undefined) {
        throw new BadRequestException(
          'dayOfWeek é obrigatório para frequência WEEKLY',
        );
      }
      if (dayOfMonth !== undefined) {
        throw new BadRequestException(
          'Frequência WEEKLY não deve ter dayOfMonth',
        );
      }
    }

    if (frequency === ScheduleFrequency.MONTHLY) {
      if (dayOfMonth === undefined) {
        throw new BadRequestException(
          'dayOfMonth é obrigatório para frequência MONTHLY',
        );
      }
      if (dayOfWeek !== undefined) {
        throw new BadRequestException(
          'Frequência MONTHLY não deve ter dayOfWeek',
        );
      }
    }
  }
}
