import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Payment, PaymentGateway, PaymentMethod, PaymentStatus, InvoiceStatus, Prisma } from '@prisma/client'
import { InvoiceService } from './invoice.service'

/**
 * Service para gerenciar pagamentos
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Registra um pagamento recebido (chamado por webhook)
   */
  async recordPayment(data: {
    invoiceId: string
    amount: number
    gateway: PaymentGateway
    gatewayId: string
    method: PaymentMethod
    paidAt?: Date
    metadata?: Record<string, unknown>
  }): Promise<Payment> {
    this.logger.log(`Recording payment for invoice ${data.invoiceId}`)

    // Criar registro de pagamento
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        currency: 'BRL',
        gateway: data.gateway,
        gatewayId: data.gatewayId,
        method: data.method,
        status: PaymentStatus.SUCCEEDED,
        paidAt: data.paidAt || new Date(),
        metadata: (data.metadata || {}) as unknown as Prisma.InputJsonValue,
      },
    })

    // Marcar invoice como paga
    await this.invoiceService.markAsPaid(data.invoiceId)

    this.logger.log(`✓ Payment recorded: ${payment.id}`)

    return payment
  }

  /**
   * Lista pagamentos de uma fatura
   */
  async findByInvoice(invoiceId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Busca um pagamento por gateway ID (Asaas payment ID)
   */
  async findByGatewayId(gatewayId: string): Promise<Payment | null> {
    return this.prisma.payment.findFirst({
      where: {
        gateway: PaymentGateway.ASAAS,
        gatewayId,
      },
      include: {
        invoice: true,
      },
    })
  }

  /**
   * Marca pagamento como falhado
   */
  async markAsFailed(paymentId: string): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
      },
    })
  }

  /**
   * Processa estorno de pagamento
   */
  async processRefund(paymentId: string): Promise<Payment> {
    this.logger.log(`Processing refund for payment ${paymentId}`)

    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.REFUNDED,
      },
      include: {
        invoice: true,
      },
    })

    // Marcar invoice como void
    await this.prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        status: 'VOID' as InvoiceStatus,
      },
    })

    this.logger.log(`✓ Payment refunded: ${paymentId}`)

    return payment
  }
}
