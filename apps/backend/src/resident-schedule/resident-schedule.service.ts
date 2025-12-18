import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { parseISO, startOfDay, format } from 'date-fns';
import { ScheduleFrequency, ScheduledEventType } from '@prisma/client';
import {
  CreateScheduleConfigDto,
  UpdateScheduleConfigDto,
  CreateScheduledEventDto,
  UpdateScheduledEventDto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ResidentScheduleService {
  constructor(
    private readonly prisma: PrismaService,
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
    tenantId: string,
    userId: string,
  ) {
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

    // Validar frequência
    this.validateFrequencyFields(dto.frequency, dto.dayOfWeek, dto.dayOfMonth);

    // Verificar duplicata: mesmo residente + recordType + frequency + dayOfWeek/dayOfMonth
    const existing = await this.prisma.residentScheduleConfig.findFirst({
      where: {
        tenantId,
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
    const config = await this.prisma.residentScheduleConfig.create({
      data: {
        tenantId,
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
      tenantId,
    });

    return config;
  }

  /**
   * Buscar configurações de um residente
   */
  async getConfigsByResident(residentId: string, tenantId: string) {
    // Verificar se residente existe
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

    return this.prisma.residentScheduleConfig.findMany({
      where: {
        tenantId,
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
   * Atualizar configuração
   */
  async updateConfig(
    id: string,
    dto: UpdateScheduleConfigDto,
    tenantId: string,
    userId: string,
  ) {
    // Buscar configuração
    const config = await this.prisma.residentScheduleConfig.findFirst({
      where: {
        id,
        tenantId,
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
      const existing = await this.prisma.residentScheduleConfig.findFirst({
        where: {
          id: { not: id },
          tenantId,
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
    const updated = await this.prisma.residentScheduleConfig.update({
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
      tenantId,
    });

    return updated;
  }

  /**
   * Deletar configuração (soft delete)
   */
  async deleteConfig(id: string, tenantId: string, userId: string) {
    const config = await this.prisma.residentScheduleConfig.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!config) {
      throw new NotFoundException('Configuração não encontrada');
    }

    await this.prisma.residentScheduleConfig.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.info('ResidentScheduleConfig deleted', {
      configId: id,
      userId,
      tenantId,
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
    tenantId: string,
    userId: string,
  ) {
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

    // Parse da data
    const scheduledDate = parseISO(`${dto.scheduledDate}T12:00:00.000`);

    // Criar evento
    const event = await this.prisma.residentScheduledEvent.create({
      data: {
        tenantId,
        residentId: dto.residentId,
        eventType: dto.eventType,
        scheduledDate,
        scheduledTime: dto.scheduledTime,
        title: dto.title,
        description: dto.description,
        vaccineData: dto.vaccineData ? (dto.vaccineData as any) : undefined,
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
      tenantId,
    });

    // Criar notificação de evento agendado
    try {
      await this.notificationsService.createScheduledEventDueNotification(
        tenantId,
        event.id,
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
  async getEventsByResident(residentId: string, tenantId: string) {
    // Verificar se residente existe
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

    return this.prisma.residentScheduledEvent.findMany({
      where: {
        tenantId,
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
    tenantId: string,
    userId: string,
  ) {
    const event = await this.prisma.residentScheduledEvent.findFirst({
      where: {
        id,
        tenantId,
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

    const updated = await this.prisma.residentScheduledEvent.update({
      where: { id },
      data: {
        eventType: dto.eventType,
        scheduledDate,
        scheduledTime: dto.scheduledTime,
        title: dto.title,
        description: dto.description,
        vaccineData: dto.vaccineData ? (dto.vaccineData as any) : undefined,
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
      tenantId,
    });

    // Se houve mudança de data/horário (reagendamento), criar notificação
    const dateChanged = dto.scheduledDate && dto.scheduledDate !== format(event.scheduledDate, 'yyyy-MM-dd');
    const timeChanged = dto.scheduledTime && dto.scheduledTime !== event.scheduledTime;

    if (dateChanged || timeChanged) {
      try {
        await this.notificationsService.createScheduledEventDueNotification(
          tenantId,
          updated.id,
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
  async deleteEvent(id: string, tenantId: string, userId: string) {
    const event = await this.prisma.residentScheduledEvent.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!event) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    await this.prisma.residentScheduledEvent.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.info('ResidentScheduledEvent deleted', {
      eventId: id,
      userId,
      tenantId,
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
