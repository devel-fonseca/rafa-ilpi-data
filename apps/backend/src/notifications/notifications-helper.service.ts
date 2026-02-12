import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  SystemNotificationType,
  NotificationCategory,
  NotificationSeverity,
  Prisma,
} from '@prisma/client'
import { CreateNotificationDto } from './dto/create-notification.dto'

/**
 * Service auxiliar para criar notificações em contextos SEM REQUEST SCOPE
 * (CronJobs, background jobs, etc.)
 *
 * ⚠️ IMPORTANTE: Este service NÃO é REQUEST-scoped e recebe tenantId explicitamente
 * para usar getTenantClient() diretamente
 */
@Injectable()
export class NotificationsHelperService {
  private readonly logger = new Logger(NotificationsHelperService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar notificação DIRETAMENTE em schema de tenant específico
   * Uso: CronJobs e outros contextos sem HTTP REQUEST
   */
  async createForTenant(tenantId: string, dto: CreateNotificationDto) {
    // Buscar schema do tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} não encontrado`)
    }

    // Obter client do tenant
    const tenantClient = this.prisma.getTenantClient(tenant.schemaName)

    // Criar notificação diretamente no schema do tenant
    const notification = await tenantClient.notification.create({
      data: {
        tenantId,
        type: dto.type,
        category: dto.category,
        severity: dto.severity,
        title: dto.title,
        message: dto.message,
        actionUrl: dto.actionUrl,
        entityType: dto.entityType,
        entityId: dto.entityId,
        metadata: (dto.metadata || {}) as unknown as Prisma.InputJsonValue,
        expiresAt: dto.expiresAt,
      },
    })

    this.logger.log(`Notification created for tenant ${tenantId}: ${notification.id}`)
    return notification
  }

  /**
   * Criar notificação direcionada para destinatários específicos em contexto sem REQUEST.
   * Se recipientUserIds estiver vazio, cai para broadcast padrão.
   */
  async createDirectedForTenant(
    tenantId: string,
    recipientUserIds: string[],
    dto: CreateNotificationDto,
  ) {
    if (recipientUserIds.length === 0) {
      return this.createForTenant(tenantId, dto)
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} não encontrado`)
    }

    const tenantClient = this.prisma.getTenantClient(tenant.schemaName)

    const notification = await tenantClient.$transaction(async (tx) => {
      const createdNotification = await tx.notification.create({
        data: {
          tenantId,
          type: dto.type,
          category: dto.category,
          severity: dto.severity,
          title: dto.title,
          message: dto.message,
          actionUrl: dto.actionUrl,
          entityType: dto.entityType,
          entityId: dto.entityId,
          metadata: (dto.metadata || {}) as unknown as Prisma.InputJsonValue,
          expiresAt: dto.expiresAt,
        },
      })

      await tx.notificationRecipient.createMany({
        data: recipientUserIds.map((userId) => ({
          notificationId: createdNotification.id,
          userId,
        })),
        skipDuplicates: true,
      })

      return createdNotification
    })

    this.logger.log(
      `Directed notification created for tenant ${tenantId}: ${notification.id} (${recipientUserIds.length} recipients)`,
    )
    return notification
  }

  /**
   * Versão para CronJob: Criar notificação de evento agendado para hoje
   */
  async createScheduledEventDueNotificationForTenant(
    tenantId: string,
    eventId: string,
    residentId: string,
    residentName: string,
    eventTitle: string,
    scheduledTime: string,
  ) {
    return this.createForTenant(tenantId, {
      type: SystemNotificationType.SCHEDULED_EVENT_DUE,
      category: NotificationCategory.SCHEDULED_EVENT,
      severity: NotificationSeverity.INFO,
      title: 'Evento Agendado Hoje',
      message: `${residentName} tem um agendamento hoje às ${scheduledTime}: ${eventTitle}`,
      actionUrl: `/dashboard/residentes/${residentId}`,
      entityType: 'SCHEDULED_EVENT',
      entityId: eventId,
      metadata: { residentId, residentName, eventTitle, scheduledTime },
    })
  }

  /**
   * Versão para CronJob: Criar notificação de evento agendado perdido
   */
  async createScheduledEventMissedNotificationForTenant(
    tenantId: string,
    eventId: string,
    residentId: string,
    residentName: string,
    eventTitle: string,
    scheduledDate: string,
  ) {
    return this.createForTenant(tenantId, {
      type: SystemNotificationType.SCHEDULED_EVENT_MISSED,
      category: NotificationCategory.SCHEDULED_EVENT,
      severity: NotificationSeverity.WARNING,
      title: 'Evento Agendado Perdido',
      message: `${residentName} perdeu o agendamento de ${scheduledDate}: ${eventTitle}`,
      actionUrl: `/dashboard/residentes/${residentId}`,
      entityType: 'SCHEDULED_EVENT',
      entityId: eventId,
      metadata: { residentId, residentName, eventTitle, scheduledDate },
    })
  }

  /**
   * Versão para CronJob: Criar notificação de prescrição vencida
   */
  async createPrescriptionExpiredNotificationForTenant(
    tenantId: string,
    prescriptionId: string,
    residentName: string,
  ) {
    return this.createForTenant(tenantId, {
      type: SystemNotificationType.PRESCRIPTION_EXPIRED,
      category: NotificationCategory.PRESCRIPTION,
      severity: NotificationSeverity.CRITICAL,
      title: 'Prescrição Médica Vencida',
      message: `A prescrição médica de ${residentName} está vencida e precisa ser renovada.`,
      actionUrl: `/dashboard/medicacoes`,
      entityType: 'PRESCRIPTION',
      entityId: prescriptionId,
      metadata: { prescriptionId, residentName },
    })
  }

  /**
   * Versão para CronJob: Criar notificação de prescrição vencendo
   */
  async createPrescriptionExpiringNotificationForTenant(
    tenantId: string,
    prescriptionId: string,
    residentName: string,
    daysLeft: number,
  ) {
    return this.createForTenant(tenantId, {
      type: SystemNotificationType.PRESCRIPTION_EXPIRING,
      category: NotificationCategory.PRESCRIPTION,
      severity: NotificationSeverity.WARNING,
      title: 'Prescrição Médica Vencendo',
      message: `A prescrição médica de ${residentName} vence em ${daysLeft} dia(s). Providencie renovação.`,
      actionUrl: `/dashboard/medicacoes`,
      entityType: 'PRESCRIPTION',
      entityId: prescriptionId,
      metadata: { prescriptionId, residentName, daysLeft },
    })
  }

  /**
   * Versão para CronJob: Criar notificação de documento vencido
   */
  async createDocumentExpiredNotificationForTenant(
    tenantId: string,
    documentId: string,
    documentName: string,
    entityType: 'TENANT_DOCUMENT' | 'RESIDENT_DOCUMENT',
  ) {
    return this.createForTenant(tenantId, {
      type: SystemNotificationType.DOCUMENT_EXPIRED,
      category: NotificationCategory.DOCUMENT,
      severity: NotificationSeverity.CRITICAL,
      title: 'Documento Vencido',
      message: `O documento "${documentName}" está vencido.`,
      actionUrl: `/dashboard/documentos`,
      entityType,
      entityId: documentId,
      metadata: { documentId, documentName },
    })
  }

  /**
   * Versão para CronJob: Criar notificação de documento vencendo
   */
  async createDocumentExpiringNotificationForTenant(
    tenantId: string,
    documentId: string,
    documentName: string,
    daysLeft: number,
    entityType: 'TENANT_DOCUMENT' | 'RESIDENT_DOCUMENT',
  ) {
    return this.createForTenant(tenantId, {
      type: SystemNotificationType.DOCUMENT_EXPIRING,
      category: NotificationCategory.DOCUMENT,
      severity: NotificationSeverity.WARNING,
      title: 'Documento Vencendo',
      message: `O documento "${documentName}" vence em ${daysLeft} dia(s).`,
      actionUrl: `/dashboard/documentos`,
      entityType,
      entityId: documentId,
      metadata: { documentId, documentName, daysLeft },
    })
  }

  /**
   * Versão para CronJob: Criar notificação de POP que precisa revisão
   */
  async createPopReviewNotificationForTenant(
    tenantId: string,
    popId: string,
    popTitle: string,
    daysUntilReview: number,
  ) {
    let message: string
    if (daysUntilReview <= 0) {
      message = `O POP "${popTitle}" precisa de revisão hoje.`
    } else {
      message = `O POP "${popTitle}" precisa de revisão em ${daysUntilReview} dia(s).`
    }

    return this.createForTenant(tenantId, {
      type: SystemNotificationType.POP_REVIEW_DUE,
      category: NotificationCategory.POP,
      severity: daysUntilReview <= 0 ? NotificationSeverity.WARNING : NotificationSeverity.INFO,
      title: 'POP Precisa de Revisão',
      message,
      actionUrl: `/dashboard/pops`,
      entityType: 'POP',
      entityId: popId,
      metadata: { popId, popTitle, daysUntilReview },
    })
  }

  /**
   * Limpeza de notificações expiradas (executa em TODOS os tenants)
   * IMPORTANTE: Este método acessa TODOS os tenants
   */
  async cleanupExpired() {
    // Buscar todos os tenants ativos
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, schemaName: true },
    })

    let totalDeleted = 0

    for (const tenant of tenants) {
      const tenantClient = this.prisma.getTenantClient(tenant.schemaName)

      const result = await tenantClient.notification.deleteMany({
        where: {
          expiresAt: {
            lte: new Date(), // Expirado
          },
        },
      })

      totalDeleted += result.count
    }

    this.logger.log(`🧹 Limpeza concluída: ${totalDeleted} notificações expiradas removidas`)

    return {
      tenantsProcessed: tenants.length,
      notificationsDeleted: totalDeleted,
    }
  }
}
