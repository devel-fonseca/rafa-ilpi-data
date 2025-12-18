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
   */
  async create(tenantId: string, dto: CreateNotificationDto) {
    this.logger.log(
      `Creating notification for tenant ${tenantId}, type: ${dto.type}`,
    )

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId: dto.userId || null,
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    this.logger.log(`Notification created: ${notification.id}`)
    return notification
  }

  /**
   * Buscar notificações com filtros e paginação
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

    // Construir filtros
    const where: any = {
      tenantId,
      OR: [{ userId }, { userId: null }], // Notificações do usuário ou broadcast
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

    if (read !== undefined) {
      where.read = read
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

    // 🐛 DEBUG: Log dos filtros
    console.log('🔍 [DEBUG] findAll - Filters:', JSON.stringify(where, null, 2))
    console.log('🔍 [DEBUG] findAll - tenantId:', tenantId)
    console.log('🔍 [DEBUG] findAll - userId:', userId)
    console.log('🔍 [DEBUG] findAll - query:', query)

    // Buscar total e dados
    const [total, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ])

    // 🐛 DEBUG: Log dos resultados
    console.log('🔍 [DEBUG] findAll - Total found:', total)
    console.log('🔍 [DEBUG] findAll - Data length:', data.length)
    console.log('🔍 [DEBUG] findAll - First notification:', data[0])

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
   * Contar notificações não lidas
   */
  async countUnread(tenantId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        tenantId,
        OR: [
          { userId },
          { userId: null },
        ],
        read: false,
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
   * Marcar notificação como lida
   */
  async markAsRead(tenantId: string, userId: string, id: string) {
    // Verificar se a notificação existe e pertence ao tenant/user
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        tenantId,
        OR: [{ userId }, { userId: null }],
      },
    })

    if (!notification) {
      throw new NotFoundException('Notification not found')
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    this.logger.log(`Notification ${id} marked as read by user ${userId}`)
    return updated
  }

  /**
   * Marcar todas as notificações como lidas
   */
  async markAllAsRead(tenantId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        tenantId,
        OR: [{ userId }, { userId: null }],
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    this.logger.log(`${result.count} notifications marked as read for user ${userId}`)
    return { count: result.count }
  }

  /**
   * Deletar notificação
   */
  async delete(tenantId: string, userId: string, id: string) {
    // Verificar se a notificação existe e pertence ao tenant/user
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        tenantId,
        OR: [{ userId }, { userId: null }],
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
      actionUrl: `/dashboard/residentes/${residentName}/agenda`,
      entityType: 'SCHEDULED_EVENT',
      entityId: eventId,
      metadata: { residentName, eventTitle, scheduledTime },
    })
  }

  /**
   * Criar notificação de evento perdido (não concluído)
   */
  async createScheduledEventMissedNotification(
    tenantId: string,
    eventId: string,
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
      actionUrl: `/dashboard/residentes/${residentName}/agenda`,
      entityType: 'SCHEDULED_EVENT',
      entityId: eventId,
      metadata: { residentName, eventTitle, scheduledDate: dateStr },
    })
  }
}
