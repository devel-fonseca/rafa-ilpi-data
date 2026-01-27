import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { subDays } from 'date-fns'
import { PrismaService } from '../../prisma/prisma.service'
import { AsaasService } from '../services/asaas.service'
import { InvoiceService } from '../services/invoice.service'

/**
 * Job de Sincronização Bidirecional Asaas ↔ Local (Fase 3)
 *
 * OBJETIVO:
 * - Garantir consistência entre dados no Asaas e no banco local
 * - Recuperar eventos que não chegaram via webhook
 * - Sincronizar status de subscriptions e payments
 *
 * EXECUÇÃO: A cada 6 horas
 */
@Injectable()
export class AsaasSyncJob {
  private readonly logger = new Logger(AsaasSyncJob.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaasService: AsaasService,
    private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Executa sincronização a cada 6 horas
   * Horários: 00:00, 06:00, 12:00, 18:00
   */
  @Cron('0 0 */6 * * *', {
    name: 'asaas-bidirectional-sync',
    timeZone: 'America/Sao_Paulo',
  })
  async handleCron() {
    this.logger.log('🔄 Iniciando sincronização bidirecional Asaas ↔ Local...')

    const startTime = new Date().getTime()

    try {
      // 1. Sincronizar subscriptions
      const subscriptionsResult = await this.syncSubscriptions()

      // 2. Sincronizar payments/invoices pendentes
      const paymentsResult = await this.syncPendingPayments()

      const duration = new Date().getTime() - startTime

      this.logger.log(
        `✅ Sincronização concluída em ${duration}ms | ` +
          `Subscriptions: ${subscriptionsResult.synced}/${subscriptionsResult.total} | ` +
          `Payments: ${paymentsResult.synced}/${paymentsResult.total}`,
      )
    } catch (error) {
      this.logger.error('❌ Erro na sincronização:', error)
      // Não lançar exceção para não bloquear próximas execuções
    }
  }

  /**
   * Sincroniza status de subscriptions ativas com Asaas
   */
  private async syncSubscriptions(): Promise<{ total: number; synced: number; errors: number }> {
    this.logger.log('📋 Sincronizando subscriptions...')

    // Buscar subscriptions ativas que têm ID no Asaas
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: {
          in: ['active', 'trialing', 'past_due'],
        },
        asaasSubscriptionId: {
          not: null,
        },
      },
      select: {
        id: true,
        asaasSubscriptionId: true,
        status: true,
        tenantId: true,
      },
    })

    let synced = 0
    let errors = 0

    for (const subscription of subscriptions) {
      try {
        // Buscar dados atualizados no Asaas
        const asaasSubscription = await this.asaasService.getSubscription(
          subscription.asaasSubscriptionId!,
        )

        // Mapear status do Asaas para status local
        const statusMap: Record<string, string> = {
          ACTIVE: 'active',
          INACTIVE: 'canceled',
          EXPIRED: 'canceled',
        }

        const newStatus = statusMap[asaasSubscription.status] || subscription.status

        // Atualizar se status mudou
        if (newStatus !== subscription.status) {
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: newStatus,
              lastSyncedAt: new Date(),
              asaasSyncError: null,
            },
          })

          this.logger.log(
            `✓ Subscription ${subscription.asaasSubscriptionId}: ${subscription.status} → ${newStatus}`,
          )
          synced++
        } else {
          // Mesmo sem mudança, atualizar lastSyncedAt
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              lastSyncedAt: new Date(),
              asaasSyncError: null,
            },
          })
        }
      } catch (error) {
        errors++
        this.logger.error(
          `❌ Erro ao sincronizar subscription ${subscription.asaasSubscriptionId}:`,
          error.message,
        )

        // Salvar erro no banco para retry manual
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            asaasSyncError: error.message,
          },
        })
      }
    }

    return { total: subscriptions.length, synced, errors }
  }

  /**
   * Sincroniza payments pendentes (invoices OPEN) com Asaas
   * Processa TODOS os tenants, limitando invoices POR TENANT
   */
  private async syncPendingPayments(): Promise<{ total: number; synced: number; errors: number }> {
    this.logger.log('💰 Sincronizando payments pendentes...')

    // 1. Buscar todos os tenants que têm invoices abertas
    const tenantsWithOpenInvoices = await this.prisma.invoice.groupBy({
      by: ['tenantId'],
      where: {
        status: 'OPEN',
        asaasInvoiceId: {
          not: null,
        },
        // Apenas invoices recentes (últimos 90 dias)
        createdAt: {
          gte: subDays(new Date(), 90),
        },
      },
    })

    this.logger.log(`📊 Encontrados ${tenantsWithOpenInvoices.length} tenants com invoices abertas`)

    let totalInvoices = 0
    let synced = 0
    let errors = 0

    // 2. Para cada tenant, sincronizar até 50 invoices mais recentes
    for (const { tenantId } of tenantsWithOpenInvoices) {
      try {
        const invoices = await this.prisma.invoice.findMany({
          where: {
            tenantId,
            status: 'OPEN',
            asaasInvoiceId: {
              not: null,
            },
            createdAt: {
              gte: subDays(new Date(), 90),
            },
          },
          select: {
            id: true,
            asaasInvoiceId: true,
            status: true,
            amount: true,
          },
          orderBy: {
            createdAt: 'desc', // Mais recentes primeiro
          },
          take: 50, // Limitar POR TENANT para evitar sobrecarga
        })

        totalInvoices += invoices.length

        for (const invoice of invoices) {
          try {
            // Buscar status atualizado no Asaas
            const asaasPayment = await this.asaasService.getPayment(invoice.asaasInvoiceId!)

            // Se payment foi recebido, atualizar invoice
            if (asaasPayment.status === 'RECEIVED' || asaasPayment.status === 'CONFIRMED') {
              await this.prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                  status: 'PAID',
                  paidAt: asaasPayment.paymentDate
                    ? new Date(asaasPayment.paymentDate)
                    : new Date(),
                },
              })

              this.logger.log(
                `✓ Invoice ${invoice.asaasInvoiceId}: OPEN → PAID (R$ ${invoice.amount})`,
              )
              synced++
            }
          } catch (error) {
            errors++
            this.logger.error(
              `❌ Erro ao sincronizar payment ${invoice.asaasInvoiceId}:`,
              error.message,
            )
          }
        }
      } catch (error) {
        errors++
        this.logger.error(`❌ Erro ao processar tenant ${tenantId}:`, error.message)
      }
    }

    return { total: totalInvoices, synced, errors }
  }

  /**
   * Método público para executar sincronização manualmente (via endpoint)
   */
  async runManualSync() {
    this.logger.log('🔧 Sincronização manual iniciada...')
    return await this.handleCron()
  }
}
