import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  SystemNotificationType,
  NotificationCategory,
  NotificationSeverity,
} from '@prisma/client'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { QueryNotificationDto } from './dto/query-notification.dto'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar nova notificação
   * NOTA: userId foi removido do schema - agora todas notificações são broadcast por padrão
   *       e o rastreamento de leitura é feito via NotificationRead
   */
  async create(tenantId: string, dto: CreateNotificationDto) {
    this.logger.log(
      `Creating notification for tenant ${tenantId}, type: ${dto.type}`,
    )

    const notification = await this.prisma.notification.create({
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
        metadata: dto.metadata || {},
        expiresAt: dto.expiresAt,
      },
    })

    this.logger.log(`Notification created: ${notification.id}`)
    return notification
  }

  /**
   * Buscar notificações com filtros e paginação
   * Agora usa NotificationRead para determinar se usuário leu ou não
   */
  async findAll(tenantId: string, userId: string, query: QueryNotificationDto) {
    const {
      page = 1,
      limit = 20,
      category,
      severity,
      read,
      type,
      search,
    } = query

    const skip = (page - 1) * limit

    // Construir filtros base (todas notificações do tenant não expiradas)
    const where: any = {
      tenantId,
      AND: [
        {
          OR: [
            { expiresAt: { gt: new Date() } },
            { expiresAt: null },
          ],
        },
      ],
    }

    if (category) {
      where.category = category
    }

    if (severity) {
      where.severity = severity
    }

    if (type) {
      where.type = type
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Se filtro `read` foi especificado, aplicar ANTES na query do Prisma
    if (read !== undefined) {
      if (read === false) {
        // Buscar apenas NÃO lidas: notifications SEM registro em NotificationRead
        where.reads = {
          none: {
            userId,
          },
        }
      } else {
        // Buscar apenas lidas: notifications COM registro em NotificationRead
        where.reads = {
          some: {
            userId,
          },
        }
      }
    }

    // Buscar notificações com LEFT JOIN para NotificationRead
    const notifications = await this.prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reads: {
          where: { userId }, // Apenas reads deste usuário
          select: {
            readAt: true,
          },
        },
      },
    })

    // Mapear adicionando campo `read` baseado em NotificationRead
    const data = notifications.map((n) => ({
      ...n,
      read: n.reads.length > 0, // Se tem registro em NotificationRead, foi lida
      readAt: n.reads[0]?.readAt || null,
    }))

    // Contar total (sem paginação) - já filtrado pela query `where`
    const total = await this.prisma.notification.count({
      where,
    })

    const totalPages = Math.ceil(total / limit)

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  }

  /**
   * Contar notificações não lidas (que NÃO têm registro em NotificationRead para este usuário)
   */
  async countUnread(tenantId: string, userId: string) {
    // Buscar IDs de notificações que o usuário já leu
    const readNotificationIds = await this.prisma.notificationRead.findMany({
      where: { userId },
      select: { notificationId: true },
    })

    const readIds = readNotificationIds.map((r) => r.notificationId)

    // Contar notificações do tenant que NÃO estão na lista de lidas e não expiraram
    const count = await this.prisma.notification.count({
      where: {
        tenantId,
        id: {
          notIn: readIds.length > 0 ? readIds : undefined, // Se não leu nada, não filtrar
        },
        AND: [
          {
            OR: [
              { expiresAt: { gt: new Date() } },
              { expiresAt: null },
            ],
          },
        ],
      },
    })

    return { count }
  }

  /**
   * Marcar notificação como lida (criar registro em NotificationRead)
   */
  async markAsRead(tenantId: string, userId: string, id: string) {
    // Verificar se a notificação existe e pertence ao tenant
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        tenantId,
      },
    })

    if (!notification) {
      throw new NotFoundException('Notification not found')
    }

    // Criar registro em NotificationRead (upsert para evitar duplicatas)
    await this.prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId: id,
          userId,
        },
      },
      create: {
        notificationId: id,
        userId,
        readAt: new Date(),
      },
      update: {
        readAt: new Date(), // Atualizar data de leitura se já existir
      },
    })

    this.logger.log(`Notification ${id} marked as read by user ${userId}`)

    // Retornar notificação com campo read adicionado
    return {
      ...notification,
      read: true,
      readAt: new Date(),
    }
  }

  /**
   * Marcar todas as notificações como lidas (criar registros em NotificationRead para todas não lidas)
   */
  async markAllAsRead(tenantId: string, userId: string) {
    // Buscar IDs de notificações que o usuário já leu
    const readNotificationIds = await this.prisma.notificationRead.findMany({
      where: { userId },
      select: { notificationId: true },
    })

    const readIds = readNotificationIds.map((r) => r.notificationId)

    // Buscar todas notificações não lidas do tenant
    const unreadNotifications = await this.prisma.notification.findMany({
      where: {
        tenantId,
        id: {
          notIn: readIds.length > 0 ? readIds : undefined,
        },
        AND: [
          {
            OR: [
              { expiresAt: { gt: new Date() } },
              { expiresAt: null },
            ],
          },
        ],
      },
      select: {
        id: true,
      },
    })

    // Criar registros em NotificationRead para todas as não lidas
    if (unreadNotifications.length > 0) {
      await this.prisma.notificationRead.createMany({
        data: unreadNotifications.map((n) => ({
          notificationId: n.id,
          userId,
          readAt: new Date(),
        })),
        skipDuplicates: true, // Evitar erro se alguma já foi marcada
      })
    }

    this.logger.log(`${unreadNotifications.length} notifications marked as read for user ${userId}`)
    return { count: unreadNotifications.length }
  }

  /**
   * Deletar notificação
   * NOTA: CASCADE irá deletar automaticamente os registros em NotificationRead
   */
  async delete(tenantId: string, userId: string, id: string) {
    // Verificar se a notificação existe e pertence ao tenant
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        tenantId,
      },
    })

    if (!notification) {
      throw new NotFoundException('Notification not found')
    }

    await this.prisma.notification.delete({
      where: { id },
    })

    this.logger.log(`Notification ${id} deleted by user ${userId}`)
    return { success: true }
  }

  /**
   * Limpar notificações expiradas (chamado por cron)
   */
  async cleanupExpired() {
    const result = await this.prisma.notification.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    })

    this.logger.log(`Cleaned up ${result.count} expired notifications`)
    return { count: result.count }
  }

  // ============================================
  // HELPERS - Criar notificações específicas
  // ============================================

  /**
   * Criar notificação de prescrição vencida
   */
  async createPrescriptionExpiredNotification(
    tenantId: string,
    prescriptionId: string,
    residentName: string,
  ) {
    return this.create(tenantId, {
      type: SystemNotificationType.PRESCRIPTION_EXPIRED,
      category: NotificationCategory.PRESCRIPTION,
      severity: NotificationSeverity.CRITICAL,
      title: 'Prescrição Vencida',
      message: `A prescrição do residente ${residentName} está vencida e requer renovação imediata.`,
      actionUrl: `/dashboard/prescricoes/${prescriptionId}`,
      entityType: 'PRESCRIPTION',
      entityId: prescriptionId,
      metadata: { residentName },
    })
  }

  /**
   * Criar notificação de prescrição vencendo
   */
  async createPrescriptionExpiringNotification(
    tenantId: string,
    prescriptionId: string,
    residentName: string,
    daysLeft: number,
  ) {
    return this.create(tenantId, {
      type: SystemNotificationType.PRESCRIPTION_EXPIRING,
      category: NotificationCategory.PRESCRIPTION,
      severity: NotificationSeverity.WARNING,
      title: 'Prescrição Vencendo',
      message: `A prescrição do residente ${residentName} vencerá em ${daysLeft} dias.`,
      actionUrl: `/dashboard/prescricoes/${prescriptionId}`,
      entityType: 'PRESCRIPTION',
      entityId: prescriptionId,
      metadata: { residentName, daysLeft },
    })
  }

  /**
   * Criar notificação de sinal vital anormal
   */
  async createAbnormalVitalSignNotification(
    tenantId: string,
    vitalSignId: string,
    residentName: string,
    vitalType: string,
    value: string,
  ) {
    return this.create(tenantId, {
      type: SystemNotificationType.VITAL_SIGN_ABNORMAL_BP,
      category: NotificationCategory.VITAL_SIGN,
      severity: NotificationSeverity.CRITICAL,
      title: 'Sinal Vital Anormal',
      message: `${vitalType} anormal detectado para ${residentName}: ${value}`,
      actionUrl: `/dashboard/residentes/${vitalSignId}`,
      entityType: 'VITAL_SIGN',
      entityId: vitalSignId,
      metadata: { residentName, vitalType, value },
    })
  }

  /**
   * Criar notificação de documento vencido
   */
  async createDocumentExpiredNotification(
    tenantId: string,
    documentId: string,
    documentName: string,
    entityType: 'TENANT_DOCUMENT' | 'RESIDENT_DOCUMENT',
  ) {
    return this.create(tenantId, {
      type: SystemNotificationType.DOCUMENT_EXPIRED,
      category: NotificationCategory.DOCUMENT,
      severity: NotificationSeverity.CRITICAL,
      title: 'Documento Vencido',
      message: `O documento "${documentName}" está vencido e requer renovação.`,
      actionUrl: `/dashboard/documentos`,
      entityType,
      entityId: documentId,
      metadata: { documentName },
    })
  }

  /**
   * Criar notificação de documento vencendo
   */
  async createDocumentExpiringNotification(
    tenantId: string,
    documentId: string,
    documentName: string,
    daysLeft: number,
    entityType: 'TENANT_DOCUMENT' | 'RESIDENT_DOCUMENT',
  ) {
    return this.create(tenantId, {
      type: SystemNotificationType.DOCUMENT_EXPIRING,
      category: NotificationCategory.DOCUMENT,
      severity: NotificationSeverity.WARNING,
      title: 'Documento Vencendo',
      message: `O documento "${documentName}" vencerá em ${daysLeft} dias.`,
      actionUrl: `/dashboard/documentos`,
      entityType,
      entityId: documentId,
      metadata: { documentName, daysLeft },
    })
  }

  /**
   * Cria notificação para POP que precisa de revisão
   */
  async createPopReviewNotification(
    tenantId: string,
    popId: string,
    popTitle: string,
    daysUntilReview: number,
  ) {
    let message: string
    let severity: NotificationSeverity

    if (daysUntilReview <= 0) {
      message = `O POP "${popTitle}" está vencido e precisa ser revisado urgentemente.`
      severity = NotificationSeverity.CRITICAL
    } else if (daysUntilReview <= 7) {
      message = `O POP "${popTitle}" precisa ser revisado em ${daysUntilReview} dia${daysUntilReview > 1 ? 's' : ''}.`
      severity = NotificationSeverity.WARNING
    } else {
      message = `O POP "${popTitle}" precisa ser revisado em ${daysUntilReview} dias.`
      severity = NotificationSeverity.INFO
    }

    return this.create(tenantId, {
      type: SystemNotificationType.POP_REVIEW_DUE,
      category: NotificationCategory.POP,
      severity,
      title: 'POP Precisa de Revisão',
      message,
      actionUrl: `/dashboard/pops/${popId}`,
      entityType: 'POP',
      entityId: popId,
      metadata: { popTitle, daysUntilReview },
    })
  }

  /**
   * Criar notificação de evento agendado (hoje)
   */
  async createScheduledEventDueNotification(
    tenantId: string,
    eventId: string,
    residentId: string,
    residentName: string,
    eventTitle: string,
    scheduledTime: string,
  ) {
    return this.create(tenantId, {
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
   * Criar notificação de evento perdido (não concluído)
   */
  async createScheduledEventMissedNotification(
    tenantId: string,
    eventId: string,
    residentId: string,
    residentName: string,
    eventTitle: string,
    scheduledDate: Date,
  ) {
    const dateStr = new Date(scheduledDate).toLocaleDateString('pt-BR')

    return this.create(tenantId, {
      type: SystemNotificationType.SCHEDULED_EVENT_MISSED,
      category: NotificationCategory.SCHEDULED_EVENT,
      severity: NotificationSeverity.WARNING,
      title: 'Evento Não Concluído',
      message: `O agendamento "${eventTitle}" de ${residentName} em ${dateStr} não foi marcado como concluído.`,
      actionUrl: `/dashboard/residentes/${residentId}`,
      entityType: 'SCHEDULED_EVENT',
      entityId: eventId,
      metadata: { residentId, residentName, eventTitle, scheduledDate: dateStr },
    })
  }

  /**
   * Criar notificação de novo evento institucional
   * A notificação é broadcast (vai para todos do tenant)
   */
  async createInstitutionalEventCreatedNotification(
    tenantId: string,
    eventId: string,
    eventTitle: string,
    eventType: string,
    scheduledDate: Date,
    createdByName: string,
  ) {
    const dateStr = new Date(scheduledDate).toLocaleDateString('pt-BR')

    return this.create(tenantId, {
      type: SystemNotificationType.INSTITUTIONAL_EVENT_CREATED,
      category: NotificationCategory.INSTITUTIONAL_EVENT,
      severity: NotificationSeverity.INFO,
      title: 'Novo Evento Institucional',
      message: `${createdByName} criou o evento "${eventTitle}" agendado para ${dateStr}.`,
      actionUrl: `/dashboard/agenda`,
      entityType: 'INSTITUTIONAL_EVENT',
      entityId: eventId,
      metadata: { eventTitle, eventType, scheduledDate: dateStr, createdByName },
    })
  }

  /**
   * Criar notificação de evento institucional atualizado
   */
  async createInstitutionalEventUpdatedNotification(
    tenantId: string,
    eventId: string,
    eventTitle: string,
    eventType: string,
    scheduledDate: Date,
    updatedByName: string,
  ) {
    const dateStr = new Date(scheduledDate).toLocaleDateString('pt-BR')

    return this.create(tenantId, {
      type: SystemNotificationType.INSTITUTIONAL_EVENT_UPDATED,
      category: NotificationCategory.INSTITUTIONAL_EVENT,
      severity: NotificationSeverity.INFO,
      title: 'Evento Institucional Atualizado',
      message: `${updatedByName} atualizou o evento "${eventTitle}" agendado para ${dateStr}.`,
      actionUrl: `/dashboard/agenda`,
      entityType: 'INSTITUTIONAL_EVENT',
      entityId: eventId,
      metadata: { eventTitle, eventType, scheduledDate: dateStr, updatedByName },
    })
  }
}
