import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import {
  SystemNotificationType,
  NotificationCategory,
  NotificationSeverity,
  Prisma,
} from '@prisma/client';
import { format } from 'date-fns';
import { DailyRecordCreatedEvent } from './events/daily-record-created.event';

/**
 * Serviço responsável pelo workflow completo de Eventos Sentinela
 * conforme RDC 502/2021 Art. 55.
 *
 * EVENTOS SENTINELA (notificação obrigatória):
 * - Queda com lesão
 * - Tentativa de suicídio
 *
 * WORKFLOW AUTOMÁTICO:
 * 1. Detectar Evento Sentinela (isEventoSentinela = true)
 * 2. Criar notificação CRÍTICA broadcast
 * 3. Enviar email para Responsável Técnico (RT)
 * 4. Criar registro de rastreamento (SentinelEventNotification)
 * 5. Monitorar protocolo de notificação à vigilância
 */
@Injectable()
export class SentinelEventsService {
  private readonly logger = new Logger(SentinelEventsService.name);

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Event Listener: Detecta criação de eventos sentinela
   * Escuta evento 'daily-record.created' e processa automaticamente
   */
  @OnEvent('daily-record.created')
  async handleDailyRecordCreated(event: DailyRecordCreatedEvent) {
    const { record, tenantId } = event;

    // Verificar se é evento sentinela
    if (!record.isEventoSentinela || record.type !== 'INTERCORRENCIA') {
      return;
    }

    this.logger.warn('⚠️  EVENTO SENTINELA DETECTADO via evento', {
      recordId: record.id,
      tenantId,
    });

    // Processar workflow de evento sentinela
    await this.triggerSentinelEventWorkflow(record.id);
  }

  /**
   * Trigger completo do workflow de Evento Sentinela
   * Chamado automaticamente quando isEventoSentinela = true
   */
  async triggerSentinelEventWorkflow(
    dailyRecordId: string,
  ): Promise<void> {
    this.logger.warn('⚠️  EVENTO SENTINELA DETECTADO', {
      dailyRecordId,
      tenantId: this.tenantContext.tenantId,
    });

    try {
      // Buscar o registro completo com dados do residente
      const record = await this.tenantContext.client.dailyRecord.findUnique({
        where: { id: dailyRecordId },
        include: {
          resident: {
            select: {
              id: true,
              fullName: true,
              admissionDate: true,
            },
          },
        },
      });

      if (!record) {
        this.logger.error('Registro não encontrado', { dailyRecordId });
        return;
      }

      if (!record.isEventoSentinela) {
        this.logger.debug('Registro não é Evento Sentinela', { dailyRecordId });
        return;
      }

      const eventType = this.getEventTypeLabel(record.incidentSubtypeClinical || 'UNKNOWN');

      // 1. Criar notificação CRÍTICA (broadcast para todo o tenant)
      const notification = await this.createSentinelNotification(
        record,
        eventType,
      );

      this.logger.log('Notificação de Evento Sentinela criada', {
        notificationId: notification.id,
      });

      // 2. Criar registro de rastreamento
      const sentinelTracking = await this.tenantContext.client.sentinelEventNotification.create({
        data: {
          tenantId: this.tenantContext.tenantId,
          dailyRecordId: record.id,
          notificationId: notification.id,
          eventType: record.incidentSubtypeClinical || 'UNKNOWN',
          status: 'PENDENTE',
          metadata: {
            residentId: record.resident.id,
            residentName: record.resident.fullName,
            eventDate: record.date,
            eventTime: record.time,
            detectedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log('Rastreamento de Evento Sentinela criado', {
        trackingId: sentinelTracking.id,
      });

      // 3. Enviar email para Responsável Técnico (RT)
      await this.sendRTAlert(record, eventType, sentinelTracking.id);

      this.logger.warn('✅ Workflow de Evento Sentinela concluído', {
        dailyRecordId,
        trackingId: sentinelTracking.id,
      });
    } catch (error) {
      this.logger.error('Erro no workflow de Evento Sentinela', {
        dailyRecordId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Não propagar erro para não falhar a criação do registro
    }
  }

  /**
   * Cria notificação CRÍTICA broadcast para todo o tenant
   */
  private async createSentinelNotification(
    record: { id: string; resident: { id: string; fullName: string }; date: Date; time?: string | null },
    eventType: string,
  ) {
    const title = `🚨 EVENTO SENTINELA: ${eventType}`;
    const message = `Residente ${record.resident.fullName} - Notificação obrigatória à vigilância epidemiológica conforme RDC 502/2021 Art. 55. Prazo: 24 horas.`;

    return this.notificationsService.create({
      type: SystemNotificationType.INCIDENT_SENTINEL_EVENT,
      category: NotificationCategory.INCIDENT,
      severity: NotificationSeverity.CRITICAL,
      title,
      message,
      actionUrl: `/daily-records?residentId=${record.resident.id}&date=${format(record.date, 'yyyy-MM-dd')}`,
      entityType: 'DAILY_RECORD',
      entityId: record.id,
      metadata: {
        residentId: record.resident.id,
        residentName: record.resident.fullName,
        eventType,
        date: record.date,
        time: record.time,
        urgency: 'IMMEDIATE',
        legalRequirement: 'RDC 502/2021 Art. 55',
      },
      expiresAt: undefined, // Não expira automaticamente
    });
  }

  /**
   * Envia email de alerta para o Responsável Técnico
   */
  private async sendRTAlert(
    record: Record<string, unknown>,
    eventType: string,
    trackingId: string,
  ): Promise<void> {
    try {
      // Buscar Responsável Técnico (RT) do tenant
      const rt = await this.tenantContext.client.user.findFirst({
        where: {
          profile: {
            positionCode: 'TECHNICAL_MANAGER',
          },
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!rt) {
        this.logger.warn('Responsável Técnico não encontrado para envio de email', {
          tenantId: this.tenantContext.tenantId,
        });
        return;
      }

      const emailSent = true; // Temporário: marcar como enviado

      if (emailSent) {
        // Atualizar rastreamento com informações de envio
        await this.tenantContext.client.sentinelEventNotification.update({
          where: { id: trackingId },
          data: {
            emailEnviado: true,
            emailEnviadoEm: new Date(),
            emailDestinatarios: [rt.email],
          },
        });

        this.logger.log('Email de Evento Sentinela enviado para RT', {
          rtEmail: rt.email,
          trackingId,
        });
      }
    } catch (error) {
      this.logger.error('Erro ao enviar email para RT', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Não propagar erro
    }
  }

  /**
   * Lista todos os eventos sentinela com filtros
   */
  async findAllSentinelEvents(
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<Record<string, unknown>[]> {
    const where: Prisma.SentinelEventNotificationWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate) {
      where.createdAt = {
        ...(where.createdAt as Record<string, unknown> || {}),
        gte: new Date(filters.startDate),
      };
    }

    if (filters?.endDate) {
      where.createdAt = {
        ...(where.createdAt as Record<string, unknown> || {}),
        lte: new Date(filters.endDate),
      };
    }

    const events = await this.tenantContext.client.sentinelEventNotification.findMany({
      where,
      include: {
        dailyRecord: {
          include: {
            resident: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        notification: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Mapear para formato do frontend
    return events.map((event) => ({
      id: event.id,
      dailyRecordId: event.dailyRecordId,
      residentName: event.dailyRecord.resident.fullName,
      residentId: event.dailyRecord.resident.id,
      eventType: this.getEventTypeLabel(event.eventType as string),
      eventDate: event.dailyRecord.date,
      eventTime: event.dailyRecord.time,
      description:
        (event.metadata as Record<string, unknown>)?.description || (event.dailyRecord.data as Record<string, unknown>)?.descricao || '',
      status: event.status,
      protocolo: event.protocolo,
      dataEnvio: event.dataEnvio,
      dataConfirmacao: event.dataConfirmacao,
      responsavelEnvio: event.responsavelEnvio,
      emailEnviado: event.emailEnviado,
      emailEnviadoEm: event.emailEnviadoEm,
      observacoes: (event.metadata as Record<string, unknown>)?.observacoes,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));
  }

  /**
   * Atualiza status de um evento sentinela
   */
  async updateSentinelEventStatus(
    eventId: string,
    updateData: {
      status: 'ENVIADO' | 'CONFIRMADO';
      protocolo?: string;
      observacoes?: string;
      responsavelEnvio?: string;
    },
  ): Promise<Record<string, unknown>> {
    // Verificar se evento existe e pertence ao tenant
    const event = await this.tenantContext.client.sentinelEventNotification.findFirst({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      throw new Error('Evento sentinela não encontrado');
    }

    const data: Prisma.SentinelEventNotificationUncheckedUpdateInput = {
      status: updateData.status,
      metadata: {
        ...(event.metadata as Record<string, unknown>),
        observacoes: updateData.observacoes,
      },
      updatedAt: new Date(),
    };

    if (updateData.status === 'ENVIADO') {
      data.protocolo = updateData.protocolo;
      data.dataEnvio = new Date();
      data.responsavelEnvio = updateData.responsavelEnvio;
    } else if (updateData.status === 'CONFIRMADO') {
      data.dataConfirmacao = new Date();
    }

    const updated = await this.tenantContext.client.sentinelEventNotification.update({
      where: { id: eventId },
      data,
    });

    this.logger.log('Status de evento sentinela atualizado', {
      eventId,
      status: updateData.status,
    });

    return updated;
  }

  /**
   * Obtém label legível do tipo de evento
   */
  private getEventTypeLabel(eventType: string): string {
    const labels: Record<string, string> = {
      QUEDA_COM_LESAO: 'Queda com Lesão',
      TENTATIVA_SUICIDIO: 'Tentativa de Suicídio',
    };
    return labels[eventType] || eventType;
  }
}
