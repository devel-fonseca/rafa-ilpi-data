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
import {
  InstitutionalEventType,
  InstitutionalEventVisibility,
  ScheduledEventStatus,
} from '@prisma/client';
import {
  CreateInstitutionalEventDto,
  UpdateInstitutionalEventDto,
  GetInstitutionalEventsDto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InstitutionalEventsService {
  constructor(
    private readonly prisma: PrismaService,
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
    tenantId: string,
    userId: string,
  ) {
    // Validar campos obrigatórios por tipo de evento
    this.validateEventFields(dto.eventType, dto);

    const event = await this.prisma.institutionalEvent.create({
      data: {
        tenantId,
        eventType: dto.eventType,
        visibility: dto.visibility ?? InstitutionalEventVisibility.ALL_USERS,
        title: dto.title,
        description: dto.description,
        scheduledDate: new Date(dto.scheduledDate),
        scheduledTime: dto.scheduledTime,
        allDay: dto.allDay ?? false,
        status: dto.status ?? ScheduledEventStatus.SCHEDULED,
        notes: dto.notes,
        // Campos específicos para documentos
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        responsible: dto.responsible,
        // Campos específicos para treinamentos
        trainingTopic: dto.trainingTopic,
        instructor: dto.instructor,
        targetAudience: dto.targetAudience,
        location: dto.location,
        // Metadados
        metadata: dto.metadata,
        createdBy: userId,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.info('Evento institucional criado', {
      eventId: event.id,
      tenantId,
      eventType: event.eventType,
      userId,
    });

    // Criar notificação baseada na visibilidade
    // Como as notificações são broadcast por padrão, todos do tenant recebem
    // O frontend filtra baseado na visibilidade do evento
    try {
      await this.notificationsService.createInstitutionalEventCreatedNotification(
        tenantId,
        event.id,
        event.title,
        event.eventType,
        event.scheduledDate,
        event.createdByUser.name,
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
  async findAll(dto: GetInstitutionalEventsDto, tenantId: string) {
    const where: any = {
      tenantId,
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
        ...where.scheduledDate,
        gte: dto.startDate,
      };
    }

    // Filtro por data final
    if (dto.endDate) {
      where.scheduledDate = {
        ...where.scheduledDate,
        lte: dto.endDate,
      };
    }

    const events = await this.prisma.institutionalEvent.findMany({
      where,
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
  async findOne(id: string, tenantId: string) {
    const event = await this.prisma.institutionalEvent.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
    tenantId: string,
    userId: string,
  ) {
    // Verificar se evento existe
    const existing = await this.findOne(id, tenantId);

    // Validar campos obrigatórios por tipo de evento (se tipo for alterado)
    const eventType = dto.eventType ?? existing.eventType;
    this.validateEventFields(eventType, { ...existing, ...dto });

    const event = await this.prisma.institutionalEvent.update({
      where: { id },
      data: {
        eventType: dto.eventType,
        visibility: dto.visibility,
        title: dto.title,
        description: dto.description,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        scheduledTime: dto.scheduledTime,
        allDay: dto.allDay,
        status: dto.status,
        completedAt: dto.completedAt,
        notes: dto.notes,
        // Campos específicos para documentos
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        responsible: dto.responsible,
        // Campos específicos para treinamentos
        trainingTopic: dto.trainingTopic,
        instructor: dto.instructor,
        targetAudience: dto.targetAudience,
        location: dto.location,
        // Metadados
        metadata: dto.metadata,
        updatedBy: userId,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.info('Evento institucional atualizado', {
      eventId: event.id,
      tenantId,
      userId,
    });

    // Criar notificação de atualização
    try {
      await this.notificationsService.createInstitutionalEventUpdatedNotification(
        tenantId,
        event.id,
        event.title,
        event.eventType,
        event.scheduledDate,
        event.updatedByUser?.name || 'Usuário',
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
  async remove(id: string, tenantId: string, userId: string) {
    // Verificar se evento existe
    await this.findOne(id, tenantId);

    await this.prisma.institutionalEvent.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    this.logger.info('Evento institucional deletado', {
      eventId: id,
      tenantId,
      userId,
    });

    return { message: 'Evento institucional deletado com sucesso' };
  }

  /**
   * Marcar evento como concluído
   */
  async markAsCompleted(id: string, tenantId: string, userId: string) {
    // Verificar se evento existe
    await this.findOne(id, tenantId);

    const event = await this.prisma.institutionalEvent.update({
      where: { id },
      data: {
        status: ScheduledEventStatus.COMPLETED,
        completedAt: new Date(),
        updatedBy: userId,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.info('Evento institucional marcado como concluído', {
      eventId: id,
      tenantId,
      userId,
    });

    return event;
  }

  /**
   * Buscar documentos com vencimento próximo
   */
  async findExpiringDocuments(tenantId: string, daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const events = await this.prisma.institutionalEvent.findMany({
      where: {
        tenantId,
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
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
  private validateEventFields(eventType: InstitutionalEventType, data: any) {
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
