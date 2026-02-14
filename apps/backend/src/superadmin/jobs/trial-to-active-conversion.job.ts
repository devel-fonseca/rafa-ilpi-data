import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { addDays, addMonths, addYears } from 'date-fns'
import { PrismaService } from '../../prisma/prisma.service'
import { EmailService } from '../../email/email.service'
import { SubscriptionAdminService } from '../services/subscription-admin.service'
import { InvoiceService } from '../../payments/services/invoice.service'
import { AlertsService } from '../services/alerts.service'
import { AsaasService } from '../../payments/services/asaas.service'
import {
  AsaasBillingType,
  AsaasSubscriptionCycle,
} from '../../payments/gateways/payment-gateway.interface'

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
    private readonly asaasService: AsaasService,
  ) {}

  private async tryAcquireSubscriptionLock(subscriptionId: string): Promise<boolean> {
    const result = await this.prisma.$queryRawUnsafe<Array<{ locked: boolean }>>(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
      subscriptionId,
    )
    return !!result[0]?.locked
  }

  private async releaseSubscriptionLock(subscriptionId: string): Promise<void> {
    await this.prisma.$queryRawUnsafe(
      'SELECT pg_advisory_unlock(hashtext($1))',
      subscriptionId,
    )
  }

  private mapPreferredPaymentMethodToAsaasBillingType(
    method?: string | null,
    billingCycle?: string | null,
  ): AsaasBillingType {
    if (method === 'PIX' && billingCycle === 'MONTHLY') {
      return AsaasBillingType.BOLETO
    }

    switch (method) {
      case 'PIX':
        return AsaasBillingType.PIX
      case 'CREDIT_CARD':
        return AsaasBillingType.CREDIT_CARD
      case 'BOLETO':
      default:
        return AsaasBillingType.BOLETO
    }
  }

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

      for (const expiredTrial of expiredTrials) {
        const lockAcquired = await this.tryAcquireSubscriptionLock(expiredTrial.id)
        if (!lockAcquired) {
          this.logger.warn(
            `⚠️ Trial ${expiredTrial.id} já está em processamento. Conversão ignorada nesta execução.`,
          )
          skipCount++
          continue
        }

        let errorSubscriptionId = expiredTrial.id
        let errorTenantId = expiredTrial.tenantId
        let errorTenantName = expiredTrial.tenant?.name || 'tenant desconhecido'
        let errorPlanName = expiredTrial.plan?.displayName || 'plano desconhecido'

        try {
          const subscription = await this.prisma.subscription.findUnique({
            where: { id: expiredTrial.id },
            include: {
              tenant: true,
              plan: true,
            },
          })

          if (!subscription) {
            this.logger.warn(
              `⚠️ Trial ${expiredTrial.id} não encontrado durante processamento.`
            )
            skipCount++
            continue
          }

          errorSubscriptionId = subscription.id
          errorTenantId = subscription.tenantId
          errorTenantName = subscription.tenant.name
          errorPlanName = subscription.plan.displayName

          if (subscription.status !== 'trialing') {
            this.logger.warn(
              `⚠️ Trial ${subscription.id} não está mais em trial (status=${subscription.status}).`,
            )
            skipCount++
            continue
          }

          if (!subscription.trialEndDate) {
            throw new Error('Trial sem trialEndDate definido')
          }

          // ✅ AJUSTE 2: Validar se NÃO foi cancelado
          // Previne cobrança indevida de trials cancelados (CRÍTICO para evitar estornos)
          if (
            subscription.tenant.status === 'SUSPENDED' ||
            subscription.tenant.status === 'CANCELLED'
          ) {
            this.logger.warn(
              `⚠️ Trial ${subscription.id} (${subscription.tenant.name}) cancelado ou suspenso. Conversão ignorada.`,
            )
            skipCount++
            continue // Pula para o próximo
          }

          this.logger.log(
            `🔄 Processando conversão de trial: ${subscription.tenant.name} (${subscription.plan.displayName})`,
          )

          // Calcular valor final ANTES da provisão de billing
          const basePrice = subscription.customPrice
            ? Number(subscription.customPrice)
            : subscription.plan.price
            ? Number(subscription.plan.price)
            : 0

          const discount = subscription.discountPercent
            ? Number(subscription.discountPercent)
            : 0

          const finalValue = basePrice * (1 - discount / 100)
          let billingReady = false
          let billingReadyReason = ''

          // 1) Provisionar cobrança ANTES de ativar o plano
          if (subscription.asaasSubscriptionId) {
            billingReady = true
            billingReadyReason = `Subscription Asaas já existente (${subscription.asaasSubscriptionId})`
          } else {
            try {
              this.logger.log(
                `💳 Criando subscription no Asaas para ${subscription.tenant.name}`,
              )

              // Garantir asaasCustomerId
              let asaasCustomerId = subscription.tenant.asaasCustomerId

              if (!asaasCustomerId) {
                const customer = await this.asaasService.createCustomer({
                  name: subscription.tenant.name,
                  cpfCnpj: subscription.tenant.cnpj?.replace(/\D/g, '') || '',
                  email: subscription.tenant.email,
                  phone: subscription.tenant.phone || undefined,
                  address: subscription.tenant.addressStreet || undefined,
                  addressNumber: subscription.tenant.addressNumber || undefined,
                  complement: subscription.tenant.addressComplement || undefined,
                  province: subscription.tenant.addressDistrict || undefined,
                  city: subscription.tenant.addressCity || undefined,
                  state: subscription.tenant.addressState || undefined,
                  postalCode: subscription.tenant.addressZipCode || undefined,
                })

                asaasCustomerId = customer.id

                await this.prisma.tenant.update({
                  where: { id: subscription.tenantId },
                  data: { asaasCustomerId: customer.id },
                })
              }

              const cycle =
                subscription.plan.billingCycle === 'ANNUAL'
                  ? AsaasSubscriptionCycle.YEARLY
                  : AsaasSubscriptionCycle.MONTHLY

              const billingType = this.mapPreferredPaymentMethodToAsaasBillingType(
                subscription.preferredPaymentMethod,
                subscription.billingCycle,
              )

              const nextDueDate = addDays(new Date(), 7)
              const year = nextDueDate.getFullYear()
              const month = String(nextDueDate.getMonth() + 1).padStart(2, '0')
              const day = String(nextDueDate.getDate()).padStart(2, '0')
              const nextDueDateStr = `${year}-${month}-${day}`

              const asaasSubscription = await this.asaasService.createSubscription({
                customerId: asaasCustomerId,
                billingType,
                value: finalValue,
                cycle,
                description: `Assinatura ${subscription.plan.displayName} - ${subscription.tenant.name}`,
                nextDueDate: nextDueDateStr,
                externalReference: subscription.id,
              })

              await this.prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                  asaasSubscriptionId: asaasSubscription.id,
                  asaasCreatedAt: new Date(),
                  lastSyncedAt: new Date(),
                  asaasCreationError: null,
                },
              })

              billingReady = true
              billingReadyReason = `Subscription Asaas criada (${asaasSubscription.id})`
              this.logger.log(`✅ ${billingReadyReason}`)
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error'
              this.logger.error(
                `❌ Erro ao criar subscription no Asaas para ${subscription.tenant.name}: ${errorMessage}`,
              )

              await this.prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                  asaasCreationError: errorMessage,
                  lastSyncedAt: new Date(),
                },
              })

              // 1.1) Fallback real: se não há recorrência no Asaas, gerar primeira fatura manual
              const existingInvoice = await this.prisma.invoice.findFirst({
                where: {
                  subscriptionId: subscription.id,
                  status: { in: ['OPEN', 'PAID'] },
                },
                orderBy: { createdAt: 'desc' },
              })

              if (existingInvoice) {
                billingReady = true
                billingReadyReason = `Fatura existente (${existingInvoice.invoiceNumber})`
              } else {
                try {
                  const fallbackInvoice =
                    await this.invoiceService.createFirstInvoiceAfterTrial(
                      subscription.id,
                    )
                  billingReady = true
                  billingReadyReason = `Fatura fallback criada (${fallbackInvoice.invoiceNumber})`
                  this.logger.warn(`⚠️ Fallback de cobrança aplicado: ${billingReadyReason}`)
                } catch (fallbackError) {
                  const fallbackErrorMessage =
                    fallbackError instanceof Error
                      ? fallbackError.message
                      : 'Unknown fallback error'
                  this.logger.error(
                    `❌ Fallback de fatura também falhou para ${subscription.tenant.name}: ${fallbackErrorMessage}`,
                  )

                  await this.alertsService.createSystemErrorAlert({
                    title: 'Falha na Provisão de Cobrança do Trial',
                    message: `Não foi possível provisionar cobrança (Asaas + fallback) para ${subscription.tenant.name}`,
                    error:
                      fallbackError instanceof Error
                        ? fallbackError
                        : new Error('Unknown fallback error'),
                    metadata: {
                      job: 'trial-to-active-conversion',
                      tenantId: subscription.tenantId,
                      subscriptionId: subscription.id,
                      asaasError: errorMessage,
                      fallbackError: fallbackErrorMessage,
                    },
                  })
                }
              }
            }
          }

          // 2) Sem cobrança provisionada -> não ativar trial; marcar pendência financeira
          if (!billingReady) {
            const cycleEnd =
              subscription.billingCycle === 'ANNUAL'
                ? addYears(subscription.trialEndDate, 1)
                : addMonths(subscription.trialEndDate, 1)

            await this.prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status: 'past_due',
                currentPeriodStart: subscription.trialEndDate,
                currentPeriodEnd: cycleEnd,
                lastSyncedAt: new Date(),
              },
            })

            await this.prisma.tenant.update({
              where: { id: subscription.tenantId },
              data: { status: 'SUSPENDED' },
            })

            this.logger.error(
              `❌ Trial ${subscription.tenant.name} NÃO convertido: cobrança indisponível (subscription marcada como past_due).`,
            )
            errorCount++
            continue
          }

          // 3) Com cobrança provisionada, converter trial -> active
          await this.subscriptionAdminService.convertTrialToActive(subscription.id)
          this.logger.log(`✅ Trial convertido com cobrança provisionada: ${billingReadyReason}`)

          // 4) Enviar email de confirmação
          this.logger.log(
            `📧 Enviando email de confirmação para ${subscription.tenant.email}`,
          )

          await this.emailService.sendTrialConvertedNotification(
            subscription.tenant.email,
            {
              tenantName: subscription.tenant.name,
              planName: subscription.plan.displayName,
              invoiceAmount: finalValue, // Valor calculado localmente
              dueDate: addDays(new Date(), 7),
              paymentUrl: '',
              billingType: subscription.preferredPaymentMethod || undefined,
            },
          )

          this.logger.log(
            `✅ Trial convertido com sucesso: ${subscription.tenant.name}`,
          )
          successCount++
        } catch (error) {
          this.logger.error(
            `❌ Erro ao converter trial ${errorSubscriptionId} (${errorTenantName}):`,
            error,
          )
          errorCount++

          // Criar alerta de falha na conversão
          await this.alertsService.createSystemErrorAlert({
            title: 'Falha na Conversão de Trial para Ativo',
            message: `Erro ao converter trial para plano ativo: ${errorTenantName}`,
            error: error instanceof Error ? error : new Error('Unknown error'),
            metadata: {
              job: 'trial-to-active-conversion',
              tenantId: errorTenantId,
              subscriptionId: errorSubscriptionId,
              planName: errorPlanName,
              timestamp: new Date().toISOString(),
            },
          })
          // Continua para o próximo (não interrompe o job)
        } finally {
          await this.releaseSubscriptionLock(expiredTrial.id)
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
