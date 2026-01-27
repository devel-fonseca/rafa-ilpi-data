import { Controller, Post, Body, Logger, Headers, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { PaymentService } from './services/payment.service'
import { InvoiceService } from './services/invoice.service'
import { AsaasWebhookDto, AsaasEventType } from './dto/asaas-webhook.dto'
import { PaymentGateway, PaymentMethod, Prisma } from '@prisma/client'

/**
 * Controller para receber webhooks do Asaas
 * URL: https://seu-dominio.com/api/webhooks/asaas
 */
@Controller('webhooks')
@ApiTags('Webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly invoiceService: InvoiceService,
    private readonly configService: ConfigService,
  ) {}

  @Post('asaas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recebe webhooks do Asaas' })
  async handleAsaasWebhook(
    @Body() webhook: AsaasWebhookDto,
    @Headers('asaas-access-token') accessToken: string,
  ) {
    this.logger.log(`📥 Received Asaas webhook: ${webhook.event} (${webhook.id})`)

    // Validação opcional de token
    const configuredToken = this.configService.get<string>('ASAAS_WEBHOOK_TOKEN')

    if (configuredToken && accessToken !== configuredToken) {
      this.logger.warn(`❌ Invalid webhook token`)
      throw new BadRequestException('Invalid webhook token')
    }

    // Verificar idempotência (webhook já processado?)
    const existingEvent = await this.prisma.webhookEvent.findFirst({
      where: {
        gateway: PaymentGateway.ASAAS,
        eventType: webhook.event,
        payload: {
          path: ['id'],
          equals: webhook.id,
        },
      },
    })

    if (existingEvent && existingEvent.processed) {
      this.logger.log(`⚠️  Event ${webhook.id} already processed. Skipping.`)
      return { status: 'already_processed', eventId: webhook.id }
    }

    // Salvar evento no banco para auditoria
    const event = await this.prisma.webhookEvent.create({
      data: {
        gateway: PaymentGateway.ASAAS,
        eventType: webhook.event,
        payload: webhook as unknown as Prisma.InputJsonValue,
        processed: false,
      },
    })

    try {
      // Processar evento
      await this.processWebhookEvent(webhook)

      // Marcar como processado
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      })

      this.logger.log(`✓ Event ${webhook.id} processed successfully`)

      return { status: 'processed', eventId: webhook.id }
    } catch (error) {
      this.logger.error(`❌ Error processing event ${webhook.id}:`, error)

      // Salvar erro
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          error: error.message,
        },
      })

      // Retornar 200 mesmo com erro (para Asaas não reenviar infinitamente)
      return { status: 'error', eventId: webhook.id, error: error.message }
    }
  }

  /**
   * Processa evento de webhook baseado no tipo
   */
  private async processWebhookEvent(webhook: AsaasWebhookDto) {
    switch (webhook.event) {
      case AsaasEventType.PAYMENT_CREATED:
        await this.handlePaymentCreated(webhook)
        break

      case AsaasEventType.PAYMENT_RECEIVED:
      case AsaasEventType.PAYMENT_CONFIRMED:
        await this.handlePaymentReceived(webhook)
        break

      case AsaasEventType.PAYMENT_OVERDUE:
        await this.handlePaymentOverdue(webhook)
        break

      case AsaasEventType.PAYMENT_DELETED:
        await this.handlePaymentDeleted(webhook)
        break

      case AsaasEventType.PAYMENT_REFUNDED:
        await this.handlePaymentRefunded(webhook)
        break

      case AsaasEventType.SUBSCRIPTION_CREATED:
      case AsaasEventType.SUBSCRIPTION_UPDATED:
      case AsaasEventType.SUBSCRIPTION_INACTIVATED:
        await this.handleSubscriptionEvent(webhook)
        break

      default:
        this.logger.log(`ℹ️  Unhandled event type: ${webhook.event}`)
    }
  }

  /**
   * Trata criação de pagamento/fatura
   * (Fase 2 - Sincronizar invoices criadas pelo Asaas Subscription)
   */
  private async handlePaymentCreated(webhook: AsaasWebhookDto) {
    const paymentData = webhook.payment as Record<string, unknown> | undefined

    if (!paymentData) {
      this.logger.warn('No payment data in webhook')
      return
    }

    this.logger.log(
      `📝 Payment created: ${paymentData.id} | Subscription: ${paymentData.subscription || 'N/A'} | Due: ${paymentData.dueDate}`,
    )

    // Se for de subscription, buscar subscription local pelo asaasSubscriptionId
    if (paymentData.subscription) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { asaasSubscriptionId: paymentData.subscription as string },
        include: { tenant: true },
      })

      if (!subscription) {
        this.logger.warn(`Subscription not found: ${paymentData.subscription}`)
        return
      }

      // Criar invoice local para rastrear essa cobrança
      const invoice = await this.invoiceService.createInvoiceFromAsaasPayment({
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        asaasPaymentData: paymentData,
      })

      this.logger.log(
        `✓ Invoice created from Asaas subscription payment: ${invoice.invoiceNumber}`,
      )
    } else {
      // Pagamento avulso (não é de subscription)
      this.logger.log(`ℹ️  Standalone payment created (not from subscription): ${paymentData.id}`)
    }
  }

  /**
   * Trata eventos de subscription (CREATED, UPDATED, INACTIVATED)
   */
  private async handleSubscriptionEvent(webhook: AsaasWebhookDto) {
    const subscriptionData = webhook.subscription as Record<string, unknown> | undefined

    if (!subscriptionData) {
      this.logger.warn('No subscription data in webhook')
      return
    }

    this.logger.log(
      `📋 Subscription event: ${webhook.event} | ID: ${subscriptionData.id} | Status: ${subscriptionData.status}`,
    )

    // Buscar subscription local
    const subscription = await this.prisma.subscription.findUnique({
      where: { asaasSubscriptionId: subscriptionData.id as string },
    })

    if (!subscription) {
      this.logger.warn(`Subscription not found locally: ${subscriptionData.id}`)
      return
    }

    // Atualizar lastSyncedAt e asaasSyncError (limpar erro se houver)
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        lastSyncedAt: new Date(),
        asaasSyncError: null,
      },
    })

    this.logger.log(`✓ Subscription ${subscription.id} synced via webhook`)
  }

  /**
   * Trata pagamento recebido/confirmado
   */
  private async handlePaymentReceived(webhook: AsaasWebhookDto) {
    const paymentData = webhook.payment as Record<string, unknown> | undefined

    if (!paymentData) {
      this.logger.warn('No payment data in webhook')
      return
    }

    // Buscar invoice pelo asaasInvoiceId
    const invoice = await this.prisma.invoice.findUnique({
      where: { asaasInvoiceId: paymentData.id as string | undefined },
    })

    if (!invoice) {
      this.logger.warn(`Invoice not found for Asaas payment ${paymentData.id}`)
      return
    }

    // Registrar pagamento
    await this.paymentService.recordPayment({
      invoiceId: invoice.id,
      amount: paymentData.value as number,
      gateway: PaymentGateway.ASAAS,
      gatewayId: paymentData.id as string,
      method: this.mapBillingTypeToPaymentMethod(paymentData.billingType as string),
      paidAt: paymentData.paymentDate ? new Date(paymentData.paymentDate as string) : new Date(),
      metadata: paymentData,
    })

    this.logger.log(`✓ Payment received for invoice ${invoice.invoiceNumber}`)
  }

  /**
   * Trata pagamento vencido
   */
  private async handlePaymentOverdue(webhook: AsaasWebhookDto) {
    const paymentData = webhook.payment as Record<string, unknown> | undefined

    if (!paymentData) return

    const invoice = await this.prisma.invoice.findUnique({
      where: { asaasInvoiceId: paymentData.id as string | undefined },
    })

    if (!invoice) return

    // Atualizar status (permanece OPEN mas poderia criar alerta)
    this.logger.log(`⚠️  Invoice ${invoice.invoiceNumber} is overdue`)

    // TODO: Criar alerta de pagamento vencido
    // await this.alertsService.create({
    //   type: 'PAYMENT_OVERDUE',
    //   tenantId: invoice.tenantId,
    //   ...
    // })
  }

  /**
   * Trata pagamento deletado/cancelado
   */
  private async handlePaymentDeleted(webhook: AsaasWebhookDto) {
    const paymentData = webhook.payment as Record<string, unknown> | undefined

    if (!paymentData) return

    const invoice = await this.prisma.invoice.findUnique({
      where: { asaasInvoiceId: paymentData.id as string | undefined },
    })

    if (!invoice) return

    // Cancelar invoice
    await this.invoiceService.cancelInvoice(invoice.id)

    this.logger.log(`✓ Invoice ${invoice.invoiceNumber} canceled`)
  }

  /**
   * Trata estorno de pagamento
   */
  private async handlePaymentRefunded(webhook: AsaasWebhookDto) {
    const paymentData = webhook.payment as Record<string, unknown> | undefined

    if (!paymentData) return

    // Buscar pagamento
    const payment = await this.paymentService.findByGatewayId(paymentData.id as string)

    if (!payment) {
      this.logger.warn(`Payment not found for Asaas payment ${paymentData.id}`)
      return
    }

    // Processar estorno
    await this.paymentService.processRefund(payment.id)

    this.logger.log(`✓ Payment ${payment.id} refunded`)
  }

  /**
   * Mapeia billingType do Asaas para PaymentMethod
   */
  private mapBillingTypeToPaymentMethod(billingType: string): PaymentMethod {
    const methodMap: Record<string, PaymentMethod> = {
      BOLETO: PaymentMethod.BOLETO,
      CREDIT_CARD: PaymentMethod.CREDIT_CARD,
      DEBIT_CARD: PaymentMethod.DEBIT_CARD,
      PIX: PaymentMethod.PIX,
      TRANSFER: PaymentMethod.TRANSFER,
    }

    return methodMap[billingType] || PaymentMethod.TRANSFER
  }
}
