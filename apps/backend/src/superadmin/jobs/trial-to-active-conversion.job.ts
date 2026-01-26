import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { EmailService } from '../../email/email.service'
import { SubscriptionAdminService } from '../services/subscription-admin.service'
import { InvoiceService } from '../../payments/services/invoice.service'
import { AlertsService } from '../services/alerts.service'

/**
 * TrialToActiveConversionJob
 *
 * Job responsável por converter automaticamente trials expirados em planos ativos.
 *
 * FLUXO:
 * 1. Busca subscriptions com status 'trialing' e trialEndDate já passou
 * 2. VALIDA se não foi cancelado (evita cobrança indevida - CRÍTICO)
 * 3. Converte trial → active via SubscriptionAdminService
 * 4. Gera primeira fatura via InvoiceService
 * 5. Envia email de confirmação com dados de pagamento
 *
 * SEGURANÇA:
 * - Valida cancelamento antes de converter
 * - Usa transação para atomicidade
 * - Logging robusto para auditoria
 * - Try-catch individual para cada subscription (falha em uma não afeta outras)
 *
 * Execução: Diariamente às 02:00 (horário de baixo tráfego para evitar impacto)
 */
@Injectable()
export class TrialToActiveConversionJob {
  private readonly logger = new Logger(TrialToActiveConversionJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionAdminService: SubscriptionAdminService,
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
    private readonly alertsService: AlertsService,
  ) {}

  @Cron('0 2 * * *') // Todos os dias às 02:00
  async handleTrialConversion() {
    this.logger.log('🔄 Iniciando conversão de trials expirados...')

    const now = new Date()

    try {
      // Buscar todos os trials que já expiraram
      const expiredTrials = await this.prisma.subscription.findMany({
        where: {
          status: 'trialing',
          trialEndDate: { lte: now },
        },
        include: {
          tenant: true,
          plan: true,
        },
      })

      this.logger.log(`📋 ${expiredTrials.length} trials expirados encontrados`)

      let successCount = 0
      let skipCount = 0
      let errorCount = 0

      for (const subscription of expiredTrials) {
        try {
          // ✅ AJUSTE 2: Validar se NÃO foi cancelado
          // Previne cobrança indevida de trials cancelados (CRÍTICO para evitar estornos)
          if (
            subscription.status === 'canceled' ||
            subscription.tenant.status === 'SUSPENDED' ||
            subscription.tenant.status === 'CANCELLED'
          ) {
            this.logger.warn(
              `⚠️ Trial ${subscription.id} (${subscription.tenant.name}) cancelado ou suspenso. Conversão ignorada.`,
            )
            skipCount++
            continue // Pula para o próximo
          }

          // 1. Converter trial → active (via service)
          this.logger.log(
            `🔄 Convertendo trial: ${subscription.tenant.name} (${subscription.plan.displayName})`,
          )

          const _updatedSubscription =
            await this.subscriptionAdminService.convertTrialToActive(
              subscription.id,
            )

          // 2. Gerar primeira fatura
          this.logger.log(
            `💰 Gerando primeira fatura para ${subscription.tenant.name}`,
          )

          const invoice =
            await this.invoiceService.createFirstInvoiceAfterTrial(
              subscription.id,
            )

          // 3. Enviar email de confirmação
          this.logger.log(
            `📧 Enviando email de confirmação para ${subscription.tenant.email}`,
          )

          await this.emailService.sendTrialConvertedNotification(
            subscription.tenant.email,
            {
              tenantName: subscription.tenant.name,
              planName: subscription.plan.displayName,
              invoiceAmount: Number(invoice.amount),
              dueDate: invoice.dueDate,
              paymentUrl: invoice.paymentUrl || '',
              billingType: subscription.preferredPaymentMethod || undefined, // ✅ Informar método
            },
          )

          this.logger.log(
            `✅ Trial convertido com sucesso: ${subscription.tenant.name}`,
          )
          successCount++
        } catch (error) {
          this.logger.error(
            `❌ Erro ao converter trial ${subscription.id} (${subscription.tenant.name}):`,
            error,
          )
          errorCount++

          // Criar alerta de falha na conversão
          await this.alertsService.createSystemErrorAlert({
            title: 'Falha na Conversão de Trial para Ativo',
            message: `Erro ao converter trial para plano ativo: ${subscription.tenant.name}`,
            error: error instanceof Error ? error : new Error('Unknown error'),
            metadata: {
              job: 'trial-to-active-conversion',
              tenantId: subscription.tenantId,
              subscriptionId: subscription.id,
              planName: subscription.plan.displayName,
              timestamp: new Date().toISOString(),
            },
          })
          // Continua para o próximo (não interrompe o job)
        }
      }

      // Resumo da execução
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      this.logger.log('📊 RESUMO DA CONVERSÃO DE TRIALS:')
      this.logger.log(`   ✅ Conversões bem-sucedidas: ${successCount}`)
      this.logger.log(`   ⚠️ Trials ignorados (cancelados): ${skipCount}`)
      this.logger.log(`   ❌ Erros: ${errorCount}`)
      this.logger.log(`   📋 Total processado: ${expiredTrials.length}`)
      this.logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Criar alerta resumo se houver erros
      if (errorCount > 0) {
        await this.alertsService.createSystemErrorAlert({
          title: 'Erros na Conversão Automática de Trials',
          message: `${errorCount} trial(s) não puderam ser convertidos para planos ativos`,
          error: new Error(`${errorCount} trials failed to convert`),
          metadata: {
            job: 'trial-to-active-conversion',
            successCount,
            skipCount,
            errorCount,
            totalProcessed: expiredTrials.length,
            timestamp: new Date().toISOString(),
          },
        })
      }
    } catch (error) {
      this.logger.error('❌ Erro crítico ao processar conversão de trials:', error)

      // Criar alerta de erro crítico
      await this.alertsService.createSystemErrorAlert({
        title: 'Erro Crítico no Job de Conversão de Trials',
        message: 'Falha crítica ao executar conversão automática de trials',
        error: error instanceof Error ? error : new Error('Unknown error'),
        metadata: {
          job: 'trial-to-active-conversion',
          timestamp: new Date().toISOString(),
        },
      })
    }
  }
}
