import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AlertType, AlertSeverity } from '@prisma/client'

/**
 * AlertsService
 *
 * Service responsável por criar e gerenciar alertas do sistema para o SuperAdmin.
 * Alertas são gerados por background jobs e eventos importantes.
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um alerta de pagamento falhado
   */
  async createPaymentFailedAlert(data: {
    tenantId: string
    invoiceId: string
    amount: number
    reason?: string
  }) {
    this.logger.log(
      `Creating PAYMENT_FAILED alert for tenant ${data.tenantId}, invoice ${data.invoiceId}`,
    )

    return this.prisma.systemAlert.create({
      data: {
        type: AlertType.PAYMENT_FAILED,
        severity: AlertSeverity.CRITICAL,
        title: 'Pagamento Falhou',
        message: `Pagamento de R$ ${data.amount.toFixed(2)} falhou para o tenant. ${data.reason ? `Motivo: ${data.reason}` : ''}`,
        metadata: {
          tenantId: data.tenantId,
          invoiceId: data.invoiceId,
          amount: data.amount,
          reason: data.reason,
        },
        tenantId: data.tenantId,
      },
    })
  }

  /**
   * Cria um alerta de pagamento em atraso
   */
  async createPaymentOverdueAlert(data: {
    tenantId: string
    invoiceId: string
    amount: number
    daysOverdue: number
  }) {
    this.logger.log(
      `Creating PAYMENT_OVERDUE alert for tenant ${data.tenantId}, invoice ${data.invoiceId}, ${data.daysOverdue} days overdue`,
    )

    // Determinar severidade progressiva
    let severity: AlertSeverity
    if (data.daysOverdue >= 30) {
      severity = AlertSeverity.CRITICAL
    } else if (data.daysOverdue >= 7) {
      severity = AlertSeverity.WARNING
    } else {
      severity = AlertSeverity.INFO
    }

    return this.prisma.systemAlert.create({
      data: {
        type: AlertType.PAYMENT_OVERDUE,
        severity,
        title: 'Fatura Vencida',
        message: `Fatura de R$ ${data.amount.toFixed(2)} está vencida há ${data.daysOverdue} ${data.daysOverdue === 1 ? 'dia' : 'dias'}`,
        metadata: {
          tenantId: data.tenantId,
          invoiceId: data.invoiceId,
          amount: data.amount,
          daysOverdue: data.daysOverdue,
        },
        tenantId: data.tenantId,
      },
    })
  }

  /**
   * Cria um alerta de subscription expirando
   */
  async createSubscriptionExpiringAlert(data: {
    tenantId: string
    subscriptionId: string
    expiresAt: Date
    daysUntilExpiration: number
  }) {
    this.logger.log(
      `Creating SUBSCRIPTION_EXPIRING alert for tenant ${data.tenantId}, expires in ${data.daysUntilExpiration} days`,
    )

    return this.prisma.systemAlert.create({
      data: {
        type: AlertType.SUBSCRIPTION_EXPIRING,
        severity: data.daysUntilExpiration <= 3 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        title: 'Assinatura Próxima do Vencimento',
        message: `A assinatura expira em ${data.daysUntilExpiration} ${data.daysUntilExpiration === 1 ? 'dia' : 'dias'} (${data.expiresAt.toLocaleDateString('pt-BR')})`,
        metadata: {
          tenantId: data.tenantId,
          subscriptionId: data.subscriptionId,
          expiresAt: data.expiresAt,
          daysUntilExpiration: data.daysUntilExpiration,
        },
        tenantId: data.tenantId,
      },
    })
  }

  /**
   * Cria um alerta de subscription cancelada
   */
  async createSubscriptionCancelledAlert(data: {
    tenantId: string
    subscriptionId: string
    reason?: string
  }) {
    this.logger.log(`Creating SUBSCRIPTION_CANCELLED alert for tenant ${data.tenantId}`)

    return this.prisma.systemAlert.create({
      data: {
        type: AlertType.SUBSCRIPTION_CANCELLED,
        severity: AlertSeverity.CRITICAL,
        title: 'Assinatura Cancelada',
        message: `A assinatura foi cancelada. ${data.reason ? `Motivo: ${data.reason}` : 'Entre em contato com o tenant.'}`,
        metadata: {
          tenantId: data.tenantId,
          subscriptionId: data.subscriptionId,
          reason: data.reason,
        },
        tenantId: data.tenantId,
      },
    })
  }

  /**
   * Cria um alerta de tenant suspenso
   */
  async createTenantSuspendedAlert(data: {
    tenantId: string
    reason: string
  }) {
    this.logger.log(`Creating TENANT_SUSPENDED alert for tenant ${data.tenantId}`)

    return this.prisma.systemAlert.create({
      data: {
        type: AlertType.TENANT_SUSPENDED,
        severity: AlertSeverity.CRITICAL,
        title: 'Tenant Suspenso',
        message: `O tenant foi suspenso. Motivo: ${data.reason}`,
        metadata: {
          tenantId: data.tenantId,
          reason: data.reason,
        },
        tenantId: data.tenantId,
      },
    })
  }

  /**
   * Cria um alerta de erro do sistema
   */
  async createSystemErrorAlert(data: {
    title: string
    message: string
    error?: any
    metadata?: Record<string, any>
  }) {
    this.logger.error(`Creating SYSTEM_ERROR alert: ${data.title}`)

    return this.prisma.systemAlert.create({
      data: {
        type: AlertType.SYSTEM_ERROR,
        severity: AlertSeverity.CRITICAL,
        title: data.title,
        message: data.message,
        metadata: {
          ...data.metadata,
          error: data.error?.message || data.error,
          stack: data.error?.stack,
        },
      },
    })
  }

  /**
   * Lista todos os alertas (com paginação)
   */
  async findAll(params?: {
    read?: boolean
    type?: AlertType
    severity?: AlertSeverity
    tenantId?: string
    limit?: number
    offset?: number
  }) {
    const { read, type, severity, tenantId, limit = 50, offset = 0 } = params || {}

    const where: any = {}
    if (read !== undefined) where.read = read
    if (type) where.type = type
    if (severity) where.severity = severity
    if (tenantId) where.tenantId = tenantId

    const [alerts, total] = await Promise.all([
      this.prisma.systemAlert.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.systemAlert.count({ where }),
    ])

    return {
      data: alerts,
      meta: {
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
      },
    }
  }

  /**
   * Conta alertas não lidos
   */
  async countUnread(params?: { type?: AlertType; severity?: AlertSeverity }) {
    const where: any = { read: false }
    if (params?.type) where.type = params.type
    if (params?.severity) where.severity = params.severity

    return this.prisma.systemAlert.count({ where })
  }

  /**
   * Marca um alerta como lido
   */
  async markAsRead(id: string) {
    return this.prisma.systemAlert.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    })
  }

  /**
   * Marca todos os alertas como lidos
   */
  async markAllAsRead() {
    return this.prisma.systemAlert.updateMany({
      where: { read: false },
      data: {
        read: true,
        readAt: new Date(),
      },
    })
  }

  /**
   * Deleta um alerta
   */
  async delete(id: string) {
    return this.prisma.systemAlert.delete({
      where: { id },
    })
  }

  /**
   * Deleta alertas antigos (mais de X dias)
   */
  async deleteOld(daysToKeep: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await this.prisma.systemAlert.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        read: true, // Só deleta alertas já lidos
      },
    })

    this.logger.log(`Deleted ${result.count} old alerts (older than ${daysToKeep} days)`)
    return result
  }
}
