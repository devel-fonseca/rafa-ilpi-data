import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { InvoiceService } from '../services/invoice.service'
import { InvoiceStatus } from '@prisma/client'

/**
 * Job para sincronizar status de pagamentos com Asaas
 *
 * Executa diariamente às 03:00 (3h da manhã)
 * Sincroniza todas as faturas pendentes (OPEN) com o gateway
 */
@Injectable()
export class PaymentSyncJob {
  private readonly logger = new Logger(PaymentSyncJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Cron job executado diariamente às 03:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyPaymentSync() {
    this.logger.log('🔄 Starting daily payment sync job...')

    try {
      // Buscar todas as faturas pendentes (OPEN) que têm asaasInvoiceId
      const pendingInvoices = await this.prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.OPEN,
          asaasInvoiceId: {
            not: null,
          },
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
      })

      this.logger.log(`📊 Found ${pendingInvoices.length} pending invoices to sync`)

      let syncedCount = 0
      let paidCount = 0
      let overdueCount = 0
      let errorCount = 0
      const errors: Array<{ invoiceId: string; error: string }> = []

      // Sincronizar cada fatura
      for (const invoice of pendingInvoices) {
        try {
          const syncedInvoice = await this.invoiceService.syncInvoiceStatus(invoice.id)

          syncedCount++

          // Contar por status
          if (syncedInvoice.status === InvoiceStatus.PAID) {
            paidCount++
            this.logger.log(`✓ Invoice ${invoice.invoiceNumber} marked as PAID`)
          } else {
            // Verificar se está vencida
            const now = new Date()
            if (new Date(invoice.dueDate) < now) {
              overdueCount++
              this.logger.warn(`⚠️  Invoice ${invoice.invoiceNumber} is OVERDUE`)
            }
          }
        } catch (error: any) {
          errorCount++
          errors.push({
            invoiceId: invoice.id,
            error: error.message,
          })
          this.logger.error(
            `❌ Failed to sync invoice ${invoice.invoiceNumber}: ${error.message}`,
          )
        }
      }

      // Log final
      this.logger.log(
        `✅ Daily payment sync completed: ${syncedCount} synced (${paidCount} paid, ${overdueCount} overdue), ${errorCount} errors`,
      )

      if (errors.length > 0) {
        this.logger.warn(`Errors details:`, errors)
      }

      // TODO: Criar alertas para faturas vencidas (Fase 5)
      // if (overdueCount > 0) {
      //   await this.alertsService.create({
      //     type: 'PAYMENT_OVERDUE',
      //     severity: 'WARNING',
      //     message: `${overdueCount} invoices are overdue`,
      //   })
      // }
    } catch (error: any) {
      this.logger.error(`❌ Critical error in payment sync job: ${error.message}`)
      // TODO: Criar alerta crítico (Fase 5)
    }
  }

  /**
   * Sincronizar apenas faturas vencidas (para ser chamado sob demanda)
   */
  async syncOverdueInvoices() {
    this.logger.log('🔧 Syncing overdue invoices...')

    const now = new Date()

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.OPEN,
        asaasInvoiceId: {
          not: null,
        },
        dueDate: {
          lt: now,
        },
      },
    })

    this.logger.log(`Found ${overdueInvoices.length} overdue invoices`)

    for (const invoice of overdueInvoices) {
      try {
        await this.invoiceService.syncInvoiceStatus(invoice.id)
        this.logger.log(`✓ Synced overdue invoice ${invoice.invoiceNumber}`)
      } catch (error: any) {
        this.logger.error(`❌ Failed to sync ${invoice.invoiceNumber}: ${error.message}`)
      }
    }
  }

  /**
   * Método manual para testar o job
   */
  async runManually() {
    this.logger.log('🔧 Running payment sync job manually...')
    await this.handleDailyPaymentSync()
  }
}
