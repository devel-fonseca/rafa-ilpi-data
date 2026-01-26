import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { InvoiceService } from '../services/invoice.service'
import { InvoiceCreationMode } from '../dto/create-invoice.dto'
import { AlertsService } from '../../superadmin/services/alerts.service'

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
    private readonly alertsService: AlertsService,
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

          // Calcular valor com prioridade: customPrice > discountPercent > plan.price
          const basePrice = subscription.plan.price?.toNumber() || 0
          let amount: number
          let originalAmount: number | null = null
          let discountPercent: number | null = null
          let discountReason: string | null = null

          // Prioridade 1: Preço customizado
          if (subscription.customPrice) {
            amount = subscription.customPrice.toNumber()
            originalAmount = basePrice
            discountReason = subscription.discountReason || 'Preço customizado'
          }
          // Prioridade 2: Desconto percentual da subscription
          else if (subscription.discountPercent) {
            discountPercent = subscription.discountPercent.toNumber()
            originalAmount = basePrice
            amount = basePrice * (1 - discountPercent / 100)
            discountReason = subscription.discountReason || `Desconto de ${discountPercent}%`
          }
          // Prioridade 3: Preço do plano
          else {
            amount = basePrice
          }

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

            // Aplicar desconto anual do plano SE não houver desconto customizado
            if (!subscription.customPrice && !subscription.discountPercent && subscription.plan.annualDiscountPercent) {
              const annualDiscount = subscription.plan.annualDiscountPercent.toNumber()
              originalAmount = basePrice
              discountPercent = annualDiscount
              amount = basePrice * (1 - annualDiscount / 100)
              discountReason = `Desconto anual do plano (${annualDiscount}%)`
            }
          }

          // Gerar fatura com informações de desconto
          await this.invoiceService.generateInvoice({
            tenantId: subscription.tenantId,
            subscriptionId: subscription.id,
            amount,
            originalAmount: originalAmount ?? undefined,
            discountPercent: discountPercent ?? undefined,
            discountReason: discountReason ?? undefined,
            billingCycle: subscription.plan.billingCycle ?? undefined,
            description: `Mensalidade ${subscription.plan.displayName} - ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
            mode: InvoiceCreationMode.AUTOMATIC,
          })

          successCount++
          this.logger.log(`✓ Invoice created for ${subscription.tenant.name}`)
        } catch (error: unknown) {
          errorCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push({
            tenantId: subscription.tenantId,
            error: errorMessage,
          })
          this.logger.error(
            `❌ Failed to create invoice for ${subscription.tenant.name}: ${errorMessage}`,
          )
        }
      }

      // Log final
      this.logger.log(
        `✅ Monthly invoice generation completed: ${successCount} success, ${errorCount} errors`,
      )

      if (errors.length > 0) {
        this.logger.warn(`Errors details:`, errors)

        // Criar alerta para erros de geração de faturas
        await this.alertsService.createSystemErrorAlert({
          title: 'Falhas na Geração Automática de Faturas',
          message: `Falha ao gerar ${errors.length} fatura(s) mensais`,
          error: new Error(`${errors.length} invoices failed to generate`),
          metadata: {
            job: 'invoice-generation',
            successCount,
            errorCount,
            errors: errors.slice(0, 10), // Limitar a 10 para não sobrecarregar
            timestamp: new Date().toISOString(),
          },
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`❌ Critical error in invoice generation job: ${errorMessage}`)

      // Criar alerta crítico de falha no job
      await this.alertsService.createSystemErrorAlert({
        title: 'Erro Crítico no Job de Geração de Faturas',
        message: 'Falha crítica ao executar geração automática mensal de faturas',
        error: error instanceof Error ? error : new Error(errorMessage),
        metadata: {
          job: 'invoice-generation',
          timestamp: new Date().toISOString(),
        },
      })
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
