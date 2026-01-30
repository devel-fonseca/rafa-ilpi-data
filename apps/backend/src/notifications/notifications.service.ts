import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TenantContextService } from '../prisma/tenant-context.service'
import {
  SystemNotificationType,
  NotificationCategory,
  NotificationSeverity,
  Prisma,
} from '@prisma/client'
import { CreateNotificationDto } from './dto/create-notification.dto'
import { QueryNotificationDto } from './dto/query-notification.dto'
import { formatDateOnly } from '../utils/date.helpers'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
  ) {}

  /**
   * Criar nova notificação
   * NOTA: userId foi removido do schema - agora todas notificações são broadcast por padrão
   *       e o rastreamento de leitura é feito via NotificationRead
   */
  async create(dto: CreateNotificationDto) {
    this.logger.log(
      `Creating notification for tenant ${this.tenantContext.tenantId}, type: ${dto.type}`,
    )

    const notification = await this.tenantContext.client.notification.create({
      data: {
        tenantId: this.tenantContext.tenantId,
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

    this.logger.log(`Notification created: ${notification.id}`)
    return notification
  }

  /**
   * Buscar notificações com filtros e paginação
   * Agora usa NotificationRead para determinar se usuário leu ou não
   */
  async findAll(userId: string, query: QueryNotificationDto) {
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

    // Construir filtros base (todas notificações não expiradas)
    // IMPORTANTE: Filtrar apenas notificações que o usuário pode ver:
    // 1. Notificações broadcast (sem recipients)
    // 2. Notificações direcionadas para este userId
    const where: Prisma.NotificationWhereInput = {
      AND: [
        {
          OR: [
            { expiresAt: { gt: new Date() } },
            { expiresAt: null },
          ],
        },
        {
          OR: [
            { recipients: { none: {} } }, // Broadcast (sem recipients)
            { recipients: { some: { userId } } }, // Direcionada para este usuário
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
    const notifications = await this.tenantContext.client.notification.findMany({
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
    const total = await this.tenantContext.client.notification.count({
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
  async countUnread(userId: string) {
    // Buscar IDs de notificações que o usuário já leu
    const readNotificationIds = await this.tenantContext.client.notificationRead.findMany({
      where: { userId },
      select: { notificationId: true },
    })

    const readIds = readNotificationIds.map((r) => r.notificationId)

    // Contar notificações que NÃO estão na lista de lidas e não expiraram
    // IMPORTANTE: Filtrar apenas notificações que o usuário pode ver:
    // 1. Notificações broadcast (sem recipients)
    // 2. Notificações direcionadas para este userId
    const count = await this.tenantContext.client.notification.count({
      where: {
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
          {
            OR: [
              { recipients: { none: {} } }, // Broadcast (sem recipients)
              { recipients: { some: { userId } } }, // Direcionada para este usuário
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
  async markAsRead(userId: string, id: string) {
    // Verificar se a notificação existe
    const notification = await this.tenantContext.client.notification.findFirst({
      where: {
        id,
      },
    })

    if (!notification) {
      throw new NotFoundException('Notification not found')
    }

    // Criar registro em NotificationRead (upsert para evitar duplicatas)
    await this.tenantContext.client.notificationRead.upsert({
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
   * Marcar notificação como não lida (deletar registro em NotificationRead)
   */
  async markAsUnread(userId: string, id: string) {
    // Verificar se a notificação existe
    const notification = await this.tenantContext.client.notification.findFirst({
      where: {
        id,
      },
    })

    if (!notification) {
      throw new NotFoundException('Notification not found')
    }

    // Deletar registro em NotificationRead para marcar como não lida
    await this.tenantContext.client.notificationRead.deleteMany({
      where: {
        notificationId: id,
        userId,
      },
    })

    this.logger.log(`Notification ${id} marked as unread by user ${userId}`)

    // Retornar notificação com campo read adicionado
    return {
      ...notification,
      read: false,
      readAt: null,
    }
  }

  /**
   * Marcar todas as notificações como lidas (criar registros em NotificationRead para todas não lidas)
   */
  async markAllAsRead(userId: string) {
    // Buscar IDs de notificações que o usuário já leu
    const readNotificationIds = await this.tenantContext.client.notificationRead.findMany({
      where: { userId },
      select: { notificationId: true },
    })

    const readIds = readNotificationIds.map((r) => r.notificationId)

    // Buscar todas notificações não lidas
    const unreadNotifications = await this.tenantContext.client.notification.findMany({
      where: {
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
      await this.tenantContext.client.notificationRead.createMany({
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
  async delete(userId: string, id: string) {
    // Verificar se a notificação existe
    const notification = await this.tenantContext.client.notification.findFirst({
      where: {
        id,
      },
    })

    if (!notification) {
      throw new NotFoundException('Notification not found')
    }

    await this.tenantContext.client.notification.delete({
      where: { id },
    })

    this.logger.log(`Notification ${id} deleted by user ${userId}`)
    return { success: true }
  }

  /**
   * Limpar notificações expiradas (chamado por cron - sem contexto de tenant)
   * IMPORTANTE: Este método acessa TODOS os tenants
   */
  async cleanupExpired() {
    // Buscar todos os tenants ativos
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, schemaName: true },
    })

    let totalCount = 0

    // Iterar sobre cada tenant e limpar suas notificações expiradas
    for (const tenant of tenants) {
      try {
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName)
        const result = await tenantClient.notification.deleteMany({
          where: {
            expiresAt: {
              lte: new Date(),
            },
          },
        })

        totalCount += result.count
        this.logger.log(`Cleaned up ${result.count} expired notifications for tenant ${tenant.id}`)
      } catch (error) {
        this.logger.error(`Error cleaning notifications for tenant ${tenant.id}:`, error)
      }
    }

    this.logger.log(`Total cleaned up: ${totalCount} expired notifications across ${tenants.length} tenants`)
    return { count: totalCount }
  }

  // ============================================
  // HELPERS - Criar notificações específicas
  // ============================================

  /**
   * Criar notificação de prescrição vencida
   */
  async createPrescriptionExpiredNotification(
    prescriptionId: string,
    residentName: string,
  ) {
    return this.create({
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
    prescriptionId: string,
    residentName: string,
    daysLeft: number,
  ) {
    return this.create({
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
    vitalSignId: string,
    residentName: string,
    vitalType: string,
    value: string,
  ) {
    return this.create({
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
    documentId: string,
    documentName: string,
    entityType: 'TENANT_DOCUMENT' | 'RESIDENT_DOCUMENT',
  ) {
    return this.create({
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
    documentId: string,
    documentName: string,
    daysLeft: number,
    entityType: 'TENANT_DOCUMENT' | 'RESIDENT_DOCUMENT',
  ) {
    return this.create({
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

    return this.create({
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
    eventId: string,
    residentId: string,
    residentName: string,
    eventTitle: string,
    scheduledTime: string,
  ) {
    return this.create({
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
    eventId: string,
    residentId: string,
    residentName: string,
    eventTitle: string,
    scheduledDate: Date,
  ) {
    // eslint-disable-next-line no-restricted-syntax -- Formatting display string, not storing in DATE field
    const dateStr = new Date(scheduledDate).toLocaleDateString('pt-BR')

    return this.create({
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
    eventId: string,
    eventTitle: string,
    eventType: string,
    scheduledDate: Date,
    createdByName: string,
  ) {
    // ✅ Usar formatDateOnly para evitar timezone shift em campo DATE
    const dateOnlyStr = formatDateOnly(scheduledDate) // YYYY-MM-DD
    const [year, month, day] = dateOnlyStr.split('-')
    const dateStr = `${day}/${month}/${year}` // DD/MM/YYYY

    return this.create({
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
    eventId: string,
    eventTitle: string,
    eventType: string,
    scheduledDate: Date,
    updatedByName: string,
  ) {
    // ✅ Usar formatDateOnly para evitar timezone shift em campo DATE
    const dateOnlyStr = formatDateOnly(scheduledDate) // YYYY-MM-DD
    const [year, month, day] = dateOnlyStr.split('-')
    const dateStr = `${day}/${month}/${year}` // DD/MM/YYYY

    return this.create({
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

  // ========================================================================
  // MÉTODOS AUXILIARES PARA USO EM CRONJOBS (não dependem de REQUEST)
  // ========================================================================

  /**
   * Criar notificação DIRETAMENTE em schema de tenant específico
   * Uso: CronJobs e outros contextos sem HTTP REQUEST
   *
   * ⚠️ IMPORTANTE: Esses métodos NÃO usam tenantContext (REQUEST-scoped)
   * e recebem tenantId explicitamente para usar getTenantClient()
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
   * Buscar IDs dos usuários que devem receber notificações de intercorrências:
   * - Todos usuários com role ADMIN
   * - Responsável Técnico (TODO: adicionar campo no schema quando implementado)
   * - Usuário autor da intercorrência (createdByUserId)
   *
   * @param tenantId - ID do tenant
   * @param createdByUserId - ID do usuário que criou a intercorrência
   * @returns Array de IDs únicos dos destinatários
   */
  async getIncidentNotificationRecipients(
    tenantId: string,
    createdByUserId: string,
  ): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} não encontrado`)
    }

    const tenantClient = this.prisma.getTenantClient(tenant.schemaName)

    // Buscar:
    // 1. Todos ADMINs
    // 2. Autor (createdByUserId)
    const users = await tenantClient.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { role: 'ADMIN' },
          { id: createdByUserId },
        ],
      },
      select: { id: true },
    })

    // Retornar IDs únicos (caso o autor seja ADMIN, não duplicar)
    const uniqueIds = [...new Set(users.map((u) => u.id))]
    this.logger.log(
      `Found ${uniqueIds.length} recipients for incident notification in tenant ${tenantId}`,
    )
    return uniqueIds
  }

  /**
   * Criar notificação DIRECIONADA para usuários específicos do tenant
   *
   * @param tenantId - ID do tenant
   * @param recipientUserIds - Array de IDs dos usuários que devem receber a notificação
   * @param dto - Dados da notificação
   * @returns Notificação criada com recipients
   */
  async createDirectedNotification(
    tenantId: string,
    recipientUserIds: string[],
    dto: CreateNotificationDto,
  ) {
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

    // Criar notificação com recipients em transação
    const notification = await tenantClient.$transaction(async (prisma) => {
      // 1. Criar notificação
      const createdNotification = await prisma.notification.create({
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

      // 2. Criar recipients (destinatários)
      if (recipientUserIds.length > 0) {
        await prisma.notificationRecipient.createMany({
          data: recipientUserIds.map((userId) => ({
            notificationId: createdNotification.id,
            userId,
          })),
          skipDuplicates: true,
        })
      }

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
}
