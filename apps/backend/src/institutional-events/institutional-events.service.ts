import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  InstitutionalEventType,
  InstitutionalEventVisibility,
  ScheduledEventStatus,
  Prisma,
} from '@prisma/client';
import {
  CreateInstitutionalEventDto,
  UpdateInstitutionalEventDto,
  GetInstitutionalEventsDto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { parseISO } from 'date-fns';

@Injectable()
export class InstitutionalEventsService {
  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // CRUD DE EVENTOS INSTITUCIONAIS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Criar novo evento institucional
   */
  async create(
    dto: CreateInstitutionalEventDto,
    userId: string,
  ) {
    // Validar campos obrigatórios por tipo de evento
    this.validateEventFields(dto.eventType, dto);

    const event = await this.tenantContext.client.institutionalEvent.create({
      data: {
        tenantId: this.tenantContext.tenantId,
        eventType: dto.eventType as InstitutionalEventType,
        visibility: (dto.visibility ?? InstitutionalEventVisibility.ALL_USERS) as InstitutionalEventVisibility,
        title: dto.title,
        description: dto.description,
        scheduledDate: parseISO(`${dto.scheduledDate}T12:00:00.000`), // parseISO com meio-dia para evitar shifts de timezone
        scheduledTime: dto.scheduledTime,
        allDay: dto.allDay ?? false,
        status: (dto.status ?? ScheduledEventStatus.SCHEDULED) as ScheduledEventStatus,
        notes: dto.notes,
        // Campos específicos para documentos
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        expiryDate: dto.expiryDate ? parseISO(`${dto.expiryDate}T12:00:00.000`) : undefined, // parseISO com meio-dia
        responsible: dto.responsible,
        // Campos específicos para treinamentos
        trainingTopic: dto.trainingTopic,
        instructor: dto.instructor,
        targetAudience: dto.targetAudience,
        location: dto.location,
        // Metadados
        metadata: dto.metadata as unknown as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });

    this.logger.info('Evento institucional criado', {
      eventId: event.id,
      tenantId: this.tenantContext.tenantId,
      eventType: event.eventType,
      userId,
    });

    // Criar notificação baseada na visibilidade
    // Como as notificações são broadcast por padrão, todos do tenant recebem
    // O frontend filtra baseado na visibilidade do evento
    try {
      await this.notificationsService.createInstitutionalEventCreatedNotification(
        event.id,
        event.title,
        event.eventType,
        event.scheduledDate,
        'Sistema',
      );
    } catch (error) {
      this.logger.error('Erro ao criar notificação de evento institucional', error);
      // Não bloquear a criação do evento se a notificação falhar
    }

    return event;
  }

  /**
   * Listar eventos institucionais com filtros
   */
  async findAll(dto: GetInstitutionalEventsDto) {
    const where: Prisma.InstitutionalEventWhereInput = {
      deletedAt: null,
    };

    // Filtro por tipo de evento
    if (dto.eventType) {
      where.eventType = dto.eventType;
    }

    // Filtro por visibilidade
    if (dto.visibility) {
      where.visibility = dto.visibility;
    }

    // Filtro por status
    if (dto.status) {
      where.status = dto.status;
    }

    // Filtro por data inicial
    if (dto.startDate) {
      where.scheduledDate = {
        ...(where.scheduledDate as Record<string, unknown> | undefined || {}),
        gte: dto.startDate,
      };
    }

    // Filtro por data final
    if (dto.endDate) {
      where.scheduledDate = {
        ...(where.scheduledDate as Record<string, unknown> | undefined || {}),
        lte: dto.endDate,
      };
    }

    const events = await this.tenantContext.client.institutionalEvent.findMany({
      where,
      include: {
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    return events;
  }

  /**
   * Buscar evento por ID
   */
  async findOne(id: string) {
    const event = await this.tenantContext.client.institutionalEvent.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
      },
    });

    if (!event) {
      throw new NotFoundException('Evento institucional não encontrado');
    }

    return event;
  }

  /**
   * Atualizar evento institucional
   */
  async update(
    id: string,
    dto: UpdateInstitutionalEventDto,
    userId: string,
  ) {
    // Verificar se evento existe
    const existing = await this.findOne(id);

    // Validar campos obrigatórios por tipo de evento (se tipo for alterado)
    const eventType = dto.eventType ?? existing.eventType;
    // Converter existing para o tipo esperado pelo validator (null → undefined, Date → string)
    const existingForValidation = {
      ...existing,
      scheduledDate: existing.scheduledDate instanceof Date ? existing.scheduledDate.toISOString().split('T')[0] : existing.scheduledDate,
      scheduledTime: existing.scheduledTime ?? undefined,
      completedAt: existing.completedAt ?? undefined,
      description: existing.description ?? undefined,
      notes: existing.notes ?? undefined,
      documentType: existing.documentType ?? undefined,
      documentNumber: existing.documentNumber ?? undefined,
      expiryDate: existing.expiryDate instanceof Date ? existing.expiryDate.toISOString().split('T')[0] : (existing.expiryDate ?? undefined),
      responsible: existing.responsible ?? undefined,
      trainingTopic: existing.trainingTopic ?? undefined,
      instructor: existing.instructor ?? undefined,
      targetAudience: existing.targetAudience ?? undefined,
      location: existing.location ?? undefined,
      metadata: (existing.metadata as Record<string, unknown>) ?? undefined,
    };
    this.validateEventFields(eventType, { ...existingForValidation, ...dto });

    const event = await this.tenantContext.client.institutionalEvent.update({
      where: { id },
      data: {
        eventType: dto.eventType as InstitutionalEventType | undefined,
        visibility: dto.visibility as InstitutionalEventVisibility | undefined,
        title: dto.title,
        description: dto.description,
        scheduledDate: dto.scheduledDate ? parseISO(`${dto.scheduledDate}T12:00:00.000`) : undefined, // parseISO com meio-dia
        scheduledTime: dto.scheduledTime,
        allDay: dto.allDay,
        status: dto.status as ScheduledEventStatus | undefined,
        completedAt: dto.completedAt,
        notes: dto.notes,
        // Campos específicos para documentos
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        expiryDate: dto.expiryDate ? parseISO(`${dto.expiryDate}T12:00:00.000`) : undefined, // parseISO com meio-dia
        responsible: dto.responsible,
        // Campos específicos para treinamentos
        trainingTopic: dto.trainingTopic,
        instructor: dto.instructor,
        targetAudience: dto.targetAudience,
        location: dto.location,
        // Metadados
        metadata: dto.metadata as unknown as Prisma.InputJsonValue,
        updatedBy: userId,
      },
      include: {
      },
    });

    this.logger.info('Evento institucional atualizado', {
      eventId: event.id,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    // Criar notificação de atualização
    try {
      await this.notificationsService.createInstitutionalEventUpdatedNotification(
        event.id,
        event.title,
        event.eventType,
        event.scheduledDate,
        'Sistema',
      );
    } catch (error) {
      this.logger.error('Erro ao criar notificação de atualização de evento', error);
      // Não bloquear a atualização do evento se a notificação falhar
    }

    return event;
  }

  /**
   * Deletar evento institucional (soft delete)
   */
  async remove(id: string, userId: string) {
    // Verificar se evento existe
    await this.findOne(id);

    await this.tenantContext.client.institutionalEvent.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.info('Evento institucional deletado', {
      eventId: id,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return { message: 'Evento institucional deletado com sucesso' };
  }

  /**
   * Marcar evento como concluído
   */
  async markAsCompleted(id: string, userId: string) {
    // Verificar se evento existe
    await this.findOne(id);

    const event = await this.tenantContext.client.institutionalEvent.update({
      where: { id },
      data: {
        status: ScheduledEventStatus.COMPLETED as ScheduledEventStatus,
        completedAt: new Date(),
        updatedBy: userId,
      },
      include: {
      },
    });

    this.logger.info('Evento institucional marcado como concluído', {
      eventId: id,
      tenantId: this.tenantContext.tenantId,
      userId,
    });

    return event;
  }

  /**
   * Buscar documentos com vencimento próximo
   */
  async findExpiringDocuments(daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const events = await this.tenantContext.client.institutionalEvent.findMany({
      where: {
        eventType: InstitutionalEventType.DOCUMENT_EXPIRY,
        expiryDate: {
          lte: futureDate,
          gte: new Date(),
        },
        status: {
          not: ScheduledEventStatus.COMPLETED,
        },
        deletedAt: null,
      },
      include: {
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });

    return events;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VALIDAÇÕES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Validar campos obrigatórios por tipo de evento
   */
  private validateEventFields(eventType: InstitutionalEventType, data: CreateInstitutionalEventDto | UpdateInstitutionalEventDto) {
    switch (eventType) {
      case InstitutionalEventType.DOCUMENT_EXPIRY:
        if (!data.documentType) {
          throw new BadRequestException(
            'documentType é obrigatório para eventos de vencimento de documento',
          );
        }
        if (!data.expiryDate) {
          throw new BadRequestException(
            'expiryDate é obrigatório para eventos de vencimento de documento',
          );
        }
        break;

      case InstitutionalEventType.TRAINING:
        if (!data.trainingTopic) {
          throw new BadRequestException(
            'trainingTopic é obrigatório para eventos de treinamento',
          );
        }
        break;

      // Outros tipos não têm validações específicas obrigatórias
      default:
        break;
    }
  }
}
