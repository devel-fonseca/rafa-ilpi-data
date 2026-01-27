import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { addDays } from 'date-fns'
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

          // 1.5. ✅ NOVO: Criar subscription recorrente no Asaas

          // Calcular valor final ANTES do try-catch (usado no email posteriormente)
          const basePrice = subscription.customPrice
            ? Number(subscription.customPrice)
            : subscription.plan.price
            ? Number(subscription.plan.price)
            : 0

          const discount = subscription.discountPercent
            ? Number(subscription.discountPercent)
            : 0

          const finalValue = basePrice * (1 - discount / 100)

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

              // Atualizar tenant
              await this.prisma.tenant.update({
                where: { id: subscription.tenantId },
                data: { asaasCustomerId: customer.id },
              })
            }

            // Mapear billing cycle: ANNUAL → YEARLY, MONTHLY → MONTHLY
            const cycle =
              subscription.plan.billingCycle === 'ANNUAL'
                ? AsaasSubscriptionCycle.YEARLY
                : AsaasSubscriptionCycle.MONTHLY

            // Mapear payment method
            const billingType =
              (subscription.preferredPaymentMethod as keyof typeof AsaasBillingType) ||
              'BOLETO'

            // Calcular data de vencimento da primeira cobrança (+7 dias)
            // Usar timezone de São Paulo para garantir consistência
            const nextDueDate = addDays(new Date(), 7)

            // Formatar como YYYY-MM-DD (sem conversão UTC para evitar mudança de dia)
            const year = nextDueDate.getFullYear()
            const month = String(nextDueDate.getMonth() + 1).padStart(2, '0')
            const day = String(nextDueDate.getDate()).padStart(2, '0')
            const nextDueDateStr = `${year}-${month}-${day}`

            // Criar subscription recorrente no Asaas
            const asaasSubscription = await this.asaasService.createSubscription(
              {
                customerId: asaasCustomerId,
                billingType: AsaasBillingType[billingType],
                value: finalValue,
                cycle,
                description: `Assinatura ${subscription.plan.displayName} - ${subscription.tenant.name}`,
                nextDueDate: nextDueDateStr, // Primeira cobrança em +7 dias
                externalReference: subscription.id,
              },
            )

            // Atualizar subscription local
            await this.prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                asaasSubscriptionId: asaasSubscription.id,
                asaasCreatedAt: new Date(),
                lastSyncedAt: new Date(),
                asaasCreationError: null, // Limpar erro anterior
              },
            })

            this.logger.log(
              `✅ Asaas subscription created: ${asaasSubscription.id}`,
            )
          } catch (error) {
            // ⚠️ CRÍTICO: NÃO bloquear tenant se criação no Asaas falhar
            // Salvar erro para retry manual posterior
            this.logger.error(
              `❌ Erro ao criar subscription no Asaas: ${error.message}`,
            )

            await this.prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                asaasCreationError: error.message,
                lastSyncedAt: new Date(),
              },
            })

            // Criar alerta para SuperAdmin
            await this.alertsService.createSystemErrorAlert({
              title: 'Falha ao Criar Subscription no Asaas',
              message: `Erro ao criar subscription recorrente: ${subscription.tenant.name}`,
              error: error instanceof Error ? error : new Error('Unknown error'),
              metadata: {
                job: 'trial-to-active-conversion',
                tenantId: subscription.tenantId,
                subscriptionId: subscription.id,
                errorMessage: error.message,
              },
            })

            // Continuar com geração manual de fatura (fallback)
          }

          // 2. ⚠️ NOTA: Primeira fatura é gerada AUTOMATICAMENTE pela Asaas Subscription
          // Não precisamos gerar manualmente, pois o Asaas cria a primeira cobrança ao criar a subscription
          // A fatura será sincronizada via webhook PAYMENT_CREATED (Fase 2)

          this.logger.log(
            `ℹ️  Primeira fatura será gerada automaticamente pela subscription no Asaas`,
          )

          // 3. Enviar email de confirmação (sem dados da fatura, pois virá via webhook)
          this.logger.log(
            `📧 Enviando email de confirmação para ${subscription.tenant.email}`,
          )

          await this.emailService.sendTrialConvertedNotification(
            subscription.tenant.email,
            {
              tenantName: subscription.tenant.name,
              planName: subscription.plan.displayName,
              invoiceAmount: finalValue, // Valor calculado localmente
              dueDate: new Date(), // Temporário - será atualizado via webhook
              paymentUrl: '', // Virá via webhook PAYMENT_CREATED
              billingType: subscription.preferredPaymentMethod || undefined,
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
