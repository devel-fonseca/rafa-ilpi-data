import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { AlertsService } from '../services/alerts.service'
import { SubscriptionStatus } from '@prisma/client'

/**
 * SubscriptionAlertsJob
 *
 * Background job que verifica subscriptions próximas de expirar
 * e cria alertas para o SuperAdmin.
 *
 * Execução: Diariamente às 08:00
 *
 * Alertas criados:
 * - SUBSCRIPTION_EXPIRING (WARNING): 7 dias antes
 * - SUBSCRIPTION_EXPIRING (CRITICAL): 3 dias antes
 */
@Injectable()
export class SubscriptionAlertsJob {
  private readonly logger = new Logger(SubscriptionAlertsJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Verifica subscriptions próximas de expirar
   * Executa diariamente às 08:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkExpiringSubscriptions() {
    this.logger.log('Running checkExpiringSubscriptions job...')

    try {
      const now = new Date()

      // Buscar subscriptions ativas
      const subscriptions = await this.prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: {
            select: {
              displayName: true,
            },
          },
        },
      })

      this.logger.log(`Found ${subscriptions.length} active subscriptions`)

      let alertsCreated = 0

      for (const subscription of subscriptions) {
        const endsAt = new Date(subscription.currentPeriodEnd)
        const daysUntilExpiration = Math.ceil(
          (endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )

        // Criar alerta se estiver próximo de expirar
        // 7 dias ou 3 dias antes (sem duplicar)
        if (daysUntilExpiration === 7 || daysUntilExpiration === 3) {
          // Verificar se já existe alerta para este subscription hoje
          const existingAlert = await this.prisma.systemAlert.findFirst({
            where: {
              tenantId: subscription.tenantId,
              type: 'SUBSCRIPTION_EXPIRING',
              metadata: {
                path: ['subscriptionId'],
                equals: subscription.id,
              },
              createdAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              },
            },
          })

          if (!existingAlert) {
            await this.alertsService.createSubscriptionExpiringAlert({
              tenantId: subscription.tenantId,
              subscriptionId: subscription.id,
              expiresAt: endsAt,
              daysUntilExpiration,
            })

            this.logger.log(
              `Created SUBSCRIPTION_EXPIRING alert for tenant ${subscription.tenant.name} (${daysUntilExpiration} days)`,
            )
            alertsCreated++
          }
        }
      }

      this.logger.log(`✓ checkExpiringSubscriptions completed. Alerts created: ${alertsCreated}`)
    } catch (error) {
      this.logger.error('Error in checkExpiringSubscriptions job:', error)

      // Criar alerta de erro do sistema
      await this.alertsService.createSystemErrorAlert({
        title: 'Erro no Job de Subscriptions Expirando',
        message: 'Falha ao verificar subscriptions próximas de expirar',
        error,
        metadata: {
          job: 'checkExpiringSubscriptions',
          timestamp: new Date().toISOString(),
        },
      })
    }
  }

  /**
   * Limpa alertas antigos (mais de 30 dias e já lidos)
   * Executa semanalmente aos domingos às 03:00
   */
  @Cron('0 3 * * 0')
  async cleanOldAlerts() {
    this.logger.log('Running cleanOldAlerts job...')

    try {
      const result = await this.alertsService.deleteOld(30)
      this.logger.log(`✓ cleanOldAlerts completed. Deleted ${result.count} alerts`)
    } catch (error) {
      this.logger.error('Error in cleanOldAlerts job:', error)
    }
  }
}
