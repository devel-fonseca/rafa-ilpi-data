import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { AlertsService } from '../services/alerts.service'
import { InvoiceStatus } from '@prisma/client'

/**
 * PaymentAlertsJob
 *
 * Background job que monitora pagamentos e faturas
 * e cria alertas para o SuperAdmin.
 *
 * Execução: Diariamente às 09:00
 *
 * Alertas criados:
 * - PAYMENT_FAILED (CRITICAL): Quando invoice.status === VOID
 * - Invoices vencidas (OVERDUE) são detectadas pelo webhook PAYMENT_OVERDUE
 */
@Injectable()
export class PaymentAlertsJob {
  private readonly logger = new Logger(PaymentAlertsJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Verifica invoices VOID (pagamentos falhados)
   * Executa diariamente às 09:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkFailedPayments() {
    this.logger.log('Running checkFailedPayments job...')

    try {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)

      // Buscar invoices que mudaram para VOID nas últimas 24h
      const voidInvoices = await this.prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.VOID,
          updatedAt: {
            gte: yesterday,
          },
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          subscription: {
            include: {
              plan: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      })

      this.logger.log(`Found ${voidInvoices.length} VOID invoices from last 24h`)

      let alertsCreated = 0

      for (const invoice of voidInvoices) {
        // Verificar se já existe alerta para esta invoice
        const existingAlert = await this.prisma.systemAlert.findFirst({
          where: {
            tenantId: invoice.tenantId,
            type: 'PAYMENT_FAILED',
            metadata: {
              path: ['invoiceId'],
              equals: invoice.id,
            },
          },
        })

        if (!existingAlert) {
          await this.alertsService.createPaymentFailedAlert({
            tenantId: invoice.tenantId,
            invoiceId: invoice.id,
            amount: Number(invoice.amount),
            reason: 'Fatura marcada como VOID',
          })

          this.logger.log(
            `Created PAYMENT_FAILED alert for tenant ${invoice.tenant.name}, invoice ${invoice.invoiceNumber}`,
          )
          alertsCreated++
        }
      }

      this.logger.log(`✓ checkFailedPayments completed. Alerts created: ${alertsCreated}`)
    } catch (error) {
      this.logger.error('Error in checkFailedPayments job:', error)

      // Criar alerta de erro do sistema
      await this.alertsService.createSystemErrorAlert({
        title: 'Erro no Job de Pagamentos Falhados',
        message: 'Falha ao verificar pagamentos falhados',
        error,
        metadata: {
          job: 'checkFailedPayments',
          timestamp: new Date().toISOString(),
        },
      })
    }
  }

  /**
   * Verifica invoices vencidas e cria alertas progressivos
   * Executa diariamente às 08:00
   *
   * Marcos de alerta: 1, 7, 15, 30, 60 dias de atraso
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkOverdueInvoices() {
    this.logger.log('Running checkOverdueInvoices job...')

    try {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)

      // Buscar todas as faturas vencidas e ainda abertas
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.OPEN,
          dueDate: {
            lt: now,
          },
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      this.logger.log(`Found ${overdueInvoices.length} overdue invoices`)

      let alertsCreated = 0
      const milestones = [1, 7, 15, 30, 60] // Marcos em dias

      for (const invoice of overdueInvoices) {
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
        )

        // Verificar se hoje é um marco de alerta
        const isMilestone = milestones.includes(daysOverdue)

        if (isMilestone) {
          // Verificar se já existe alerta para este marco específico
          const existingAlert = await this.prisma.systemAlert.findFirst({
            where: {
              tenantId: invoice.tenantId,
              type: 'PAYMENT_OVERDUE',
              metadata: {
                path: ['invoiceId'],
                equals: invoice.id,
              },
              createdAt: {
                gte: yesterday, // Criado nas últimas 24h
              },
            },
          })

          if (!existingAlert) {
            await this.alertsService.createPaymentOverdueAlert({
              tenantId: invoice.tenantId,
              invoiceId: invoice.id,
              amount: Number(invoice.amount),
              daysOverdue,
            })

            this.logger.log(
              `Created PAYMENT_OVERDUE alert for tenant ${invoice.tenant.name}, invoice ${invoice.invoiceNumber}, ${daysOverdue} days overdue`,
            )
            alertsCreated++
          }
        }
      }

      this.logger.log(`✓ checkOverdueInvoices completed. Alerts created: ${alertsCreated}`)
    } catch (error) {
      this.logger.error('Error in checkOverdueInvoices job:', error)

      // Criar alerta de erro do sistema
      await this.alertsService.createSystemErrorAlert({
        title: 'Erro no Job de Faturas Vencidas',
        message: 'Falha ao verificar faturas vencidas',
        error,
        metadata: {
          job: 'checkOverdueInvoices',
          timestamp: new Date().toISOString(),
        },
      })
    }
  }

  /**
   * Verifica invoices próximas do vencimento (ainda abertas)
   * Executa diariamente às 10:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkUpcomingDueDates() {
    this.logger.log('Running checkUpcomingDueDates job...')

    try {
      const now = new Date()
      const threeDaysFromNow = new Date(now)
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      // Buscar invoices OPEN que vencem nos próximos 3 dias
      const upcomingInvoices = await this.prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.OPEN,
          dueDate: {
            gte: now,
            lte: threeDaysFromNow,
          },
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      this.logger.log(`Found ${upcomingInvoices.length} invoices due in next 3 days`)

      // Log para análise (não cria alertas, apenas monitora)
      for (const invoice of upcomingInvoices) {
        const daysUntilDue = Math.ceil(
          (new Date(invoice.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        )
        this.logger.log(
          `Invoice ${invoice.invoiceNumber} for ${invoice.tenant.name} due in ${daysUntilDue} days`,
        )
      }

      this.logger.log(`✓ checkUpcomingDueDates completed.`)
    } catch (error) {
      this.logger.error('Error in checkUpcomingDueDates job:', error)
    }
  }
}
