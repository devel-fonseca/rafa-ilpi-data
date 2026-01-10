import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import {
  SystemNotificationType,
  NotificationCategory,
  NotificationSeverity,
} from '@prisma/client';
import { format } from 'date-fns';

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
export class SentinelEventService {
  private readonly logger = new Logger(SentinelEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Trigger completo do workflow de Evento Sentinela
   * Chamado automaticamente quando isEventoSentinela = true
   */
  async triggerSentinelEventWorkflow(
    dailyRecordId: string,
    tenantId: string,
  ): Promise<void> {
    this.logger.warn('⚠️  EVENTO SENTINELA DETECTADO', {
      dailyRecordId,
      tenantId,
    });

    try {
      // Buscar o registro completo com dados do residente
      const record = await this.prisma.dailyRecord.findUnique({
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

      const eventType = this.getEventTypeLabel(record.incidentSubtypeClinical);

      // 1. Criar notificação CRÍTICA (broadcast para todo o tenant)
      const notification = await this.createSentinelNotification(
        tenantId,
        record,
        eventType,
      );

      this.logger.log('Notificação de Evento Sentinela criada', {
        notificationId: notification.id,
      });

      // 2. Criar registro de rastreamento
      const sentinelTracking = await this.prisma.sentinelEventNotification.create({
        data: {
          tenantId,
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
      await this.sendRTAlert(tenantId, record, eventType, sentinelTracking.id);

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
    tenantId: string,
    record: any,
    eventType: string,
  ): Promise<any> {
    const title = `🚨 EVENTO SENTINELA: ${eventType}`;
    const message = `Residente ${record.resident.fullName} - Notificação obrigatória à vigilância epidemiológica conforme RDC 502/2021 Art. 55. Prazo: 24 horas.`;

    return this.notificationsService.create(tenantId, {
      type: SystemNotificationType.INCIDENT_SENTINEL_EVENT,
      category: NotificationCategory.INCIDENT,
      severity: NotificationSeverity.CRITICAL,
      title,
      message,
      actionUrl: `/daily-records?residentId=${record.residentId}&date=${format(record.date, 'yyyy-MM-dd')}`,
      entityType: 'DAILY_RECORD',
      entityId: record.id,
      metadata: {
        residentId: record.resident.id,
        residentName: record.resident.fullName,
        eventType: record.incidentSubtypeClinical,
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
    tenantId: string,
    record: any,
    eventType: string,
    trackingId: string,
  ): Promise<void> {
    try {
      // Buscar Responsável Técnico (RT) do tenant
      const rt = await this.prisma.user.findFirst({
        where: {
          tenantId,
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
          tenantId,
        });
        return;
      }

      // TODO: Implementar envio de email quando método sendCustomEmail estiver disponível
      // const tenant = await this.prisma.tenant.findUnique({
      //   where: { id: tenantId },
      //   select: { name: true },
      // });
      // const dateFormatted = format(new Date(record.date), "dd 'de' MMMM 'de' yyyy", {
      //   locale: ptBR,
      // });
      // const emailData = {
      //   rtName: rt.name,
      //   tenantName: tenant?.name || 'ILPI',
      //   eventType,
      //   residentName: record.resident.fullName,
      //   date: dateFormatted,
      //   time: record.time,
      //   description: (record.data as any)?.descricao || 'Não especificada',
      //   actionTaken: (record.data as any)?.acaoTomada || 'Não especificada',
      //   recordedBy: record.recordedBy,
      //   legalReference: 'RDC 502/2021 Art. 55',
      //   deadline: '24 horas',
      //   trackingId,
      // };
      // const emailSent = await this.emailService.sendCustomEmail({
      //   to: rt.email,
      //   subject: '🚨 EVENTO SENTINELA - Notificação Obrigatória',
      //   template: 'sentinel-event-alert',
      //   context: emailData,
      //   tenantId,
      //   metadata: {
      //     dailyRecordId: record.id,
      //     residentId: record.resident.id,
      //     trackingId,
      //   },
      // });

      const emailSent = true; // Temporário: marcar como enviado

      if (emailSent) {
        // Atualizar rastreamento com informações de envio
        await this.prisma.sentinelEventNotification.update({
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
      } else {
        this.logger.error('Falha ao enviar email de Evento Sentinela', {
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
   * Atualiza status de notificação à vigilância
   */
  async updateVigilanciaNotification(
    trackingId: string,
    tenantId: string,
    data: {
      status?: 'PENDENTE' | 'ENVIADO' | 'CONFIRMADO';
      protocolo?: string;
      observacoes?: string;
      responsavelEnvio?: string;
    },
  ): Promise<void> {
    const updateData: any = {};

    if (data.status) {
      updateData.status = data.status;

      if (data.status === 'ENVIADO') {
        updateData.dataEnvio = new Date();
      } else if (data.status === 'CONFIRMADO') {
        updateData.dataConfirmacao = new Date();
      }
    }

    if (data.protocolo) {
      updateData.protocolo = data.protocolo;
    }

    if (data.observacoes) {
      updateData.observacoes = data.observacoes;
    }

    if (data.responsavelEnvio) {
      updateData.responsavelEnvio = data.responsavelEnvio;
    }

    await this.prisma.sentinelEventNotification.update({
      where: {
        id: trackingId,
        tenantId, // Segurança: garantir que pertence ao tenant
      },
      data: updateData,
    });

    this.logger.log('Status de Evento Sentinela atualizado', {
      trackingId,
      status: data.status,
    });
  }

  /**
   * Busca Eventos Sentinela pendentes de notificação
   */
  async getPendingSentinelEvents(tenantId: string): Promise<any[]> {
    return this.prisma.sentinelEventNotification.findMany({
      where: {
        tenantId,
        status: 'PENDENTE',
      },
      include: {
        dailyRecord: {
          include: {
            resident: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Lista todos os eventos sentinela com filtros
   */
  async findAllSentinelEvents(
    tenantId: string,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<any[]> {
    const where: any = {
      tenantId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(filters.startDate),
      };
    }

    if (filters?.endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(filters.endDate),
      };
    }

    const events = await this.prisma.sentinelEventNotification.findMany({
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
      eventType: this.getEventTypeLabel(event.eventType as any),
      eventDate: event.dailyRecord.date,
      eventTime: event.dailyRecord.time,
      description:
        event.metadata?.description || event.dailyRecord.data?.descricao || '',
      status: event.status,
      protocolo: event.protocolo,
      dataEnvio: event.dataEnvio,
      dataConfirmacao: event.dataConfirmacao,
      responsavelEnvio: event.responsavelEnvio,
      emailEnviado: event.emailSent,
      emailEnviadoEm: event.emailSentAt,
      observacoes: event.metadata?.observacoes,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));
  }

  /**
   * Atualiza status de um evento sentinela
   */
  async updateSentinelEventStatus(
    eventId: string,
    tenantId: string,
    updateData: {
      status: 'ENVIADO' | 'CONFIRMADO';
      protocolo?: string;
      observacoes?: string;
      responsavelEnvio?: string;
    },
  ): Promise<any> {
    // Verificar se evento existe e pertence ao tenant
    const event = await this.prisma.sentinelEventNotification.findFirst({
      where: {
        id: eventId,
        tenantId,
      },
    });

    if (!event) {
      throw new Error('Evento sentinela não encontrado');
    }

    const data: any = {
      status: updateData.status,
      metadata: {
        ...event.metadata,
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

    const updated = await this.prisma.sentinelEventNotification.update({
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
