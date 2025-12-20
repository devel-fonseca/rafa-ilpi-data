import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { InvoiceService } from '../services/invoice.service'
import { InvoiceCreationMode } from '../dto/create-invoice.dto'

/**
 * Job para geração automática de faturas mensais
 *
 * Executa todo dia 1 de cada mês às 00:00 (meia-noite)
 * Cria faturas para todas as subscriptions ativas
 */
@Injectable()
export class InvoiceGenerationJob {
  private readonly logger = new Logger(InvoiceGenerationJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Cron job executado todo dia 1 às 00:00
   * @see https://docs.nestjs.com/techniques/task-scheduling
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyInvoiceGeneration() {
    this.logger.log('🔄 Starting monthly invoice generation job...')

    try {
      // Buscar todas as subscriptions ativas
      const activeSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'active',
        },
        include: {
          tenant: true,
          plan: true,
        },
      })

      this.logger.log(`📊 Found ${activeSubscriptions.length} active subscriptions`)

      let successCount = 0
      let errorCount = 0
      const errors: Array<{ tenantId: string; error: string }> = []

      // Gerar fatura para cada subscription
      for (const subscription of activeSubscriptions) {
        try {
          // Verificar se já existe fatura gerada este mês
          const now = new Date()
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
          const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

          const existingInvoice = await this.prisma.invoice.findFirst({
            where: {
              subscriptionId: subscription.id,
              createdAt: {
                gte: firstDayOfMonth,
                lte: lastDayOfMonth,
              },
            },
          })

          if (existingInvoice) {
            this.logger.log(
              `⏭️  Skipping ${subscription.tenant.name} - invoice already exists for this month`,
            )
            continue
          }

          // Calcular valor baseado no ciclo de cobrança
          let amount = subscription.plan.price?.toNumber() || 0

          // Se o plano for anual, cobrar apenas se for o mês de aniversário da subscription
          if (subscription.plan.billingCycle === 'ANNUAL') {
            const subscriptionStartMonth = new Date(subscription.startDate).getMonth()
            const currentMonth = now.getMonth()

            if (subscriptionStartMonth !== currentMonth) {
              this.logger.log(
                `⏭️  Skipping ${subscription.tenant.name} - annual plan, not anniversary month`,
              )
              continue
            }

            // Para planos anuais, multiplicar por 12 (ou usar o preço já configurado)
            // Assumindo que o price do plano anual já está correto
          }

          // Gerar fatura
          await this.invoiceService.generateInvoice({
            tenantId: subscription.tenantId,
            subscriptionId: subscription.id,
            amount,
            description: `Mensalidade ${subscription.plan.displayName} - ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
            mode: InvoiceCreationMode.AUTOMATIC,
          })

          successCount++
          this.logger.log(`✓ Invoice created for ${subscription.tenant.name}`)
        } catch (error: any) {
          errorCount++
          errors.push({
            tenantId: subscription.tenantId,
            error: error.message,
          })
          this.logger.error(
            `❌ Failed to create invoice for ${subscription.tenant.name}: ${error.message}`,
          )
        }
      }

      // Log final
      this.logger.log(
        `✅ Monthly invoice generation completed: ${successCount} success, ${errorCount} errors`,
      )

      if (errors.length > 0) {
        this.logger.warn(`Errors details:`, errors)
      }

      // TODO: Criar alertas para erros (Fase 5)
      // if (errors.length > 0) {
      //   await this.alertsService.create({
      //     type: 'INVOICE_GENERATION_FAILED',
      //     severity: 'WARNING',
      //     message: `Failed to generate ${errors.length} invoices`,
      //     metadata: { errors },
      //   })
      // }
    } catch (error: any) {
      this.logger.error(`❌ Critical error in invoice generation job: ${error.message}`)
      // TODO: Criar alerta crítico (Fase 5)
    }
  }

  /**
   * Método manual para testar o job (pode ser chamado via endpoint de debug)
   */
  async runManually() {
    this.logger.log('🔧 Running invoice generation job manually...')
    await this.handleMonthlyInvoiceGeneration()
  }
}
