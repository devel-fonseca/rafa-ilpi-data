import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AsaasService } from './asaas.service'
import { CreateInvoiceDto, InvoiceCreationMode } from '../dto/create-invoice.dto'
import { Invoice, InvoiceStatus, Prisma } from '@prisma/client'
import { AsaasBillingType } from '../gateways/payment-gateway.interface'

/**
 * Service para gerenciar faturas (invoices)
 */
@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaasService: AsaasService,
  ) {}

  /**
   * Gera uma nova fatura para um tenant/subscription
   */
  async generateInvoice(dto: CreateInvoiceDto): Promise<Invoice> {
    this.logger.log(
      `Generating invoice for tenant ${dto.tenantId} (${dto.mode || InvoiceCreationMode.AUTOMATIC})`,
    )

    // Validar tenant e subscription
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: dto.subscriptionId,
        tenantId: dto.tenantId,
      },
      include: {
        tenant: true,
        plan: true,
      },
    })

    if (!subscription) {
      throw new NotFoundException(
        `Subscription ${dto.subscriptionId} not found for tenant ${dto.tenantId}`,
      )
    }

    // Verificar se tenant já tem customer no Asaas
    let asaasCustomerId = subscription.tenant.asaasCustomerId

    if (!asaasCustomerId) {
      // Primeiro, buscar se já existe customer com esse CPF/CNPJ no Asaas
      const cpfCnpj = subscription.tenant.cnpj || '00000000000000'
      const existingCustomer = await this.asaasService.findCustomerByCpfCnpj(cpfCnpj)

      if (existingCustomer) {
        // Customer já existe no Asaas, apenas vincular ao tenant
        asaasCustomerId = existingCustomer.id

        await this.prisma.tenant.update({
          where: { id: dto.tenantId },
          data: { asaasCustomerId: existingCustomer.id },
        })

        this.logger.log(
          `✓ Found existing Asaas customer: ${existingCustomer.id} (CPF/CNPJ: ${cpfCnpj})`,
        )
      } else {
        // Customer não existe, criar novo
        const customer = await this.asaasService.createCustomer({
          name: subscription.tenant.name,
          email: subscription.tenant.email,
          cpfCnpj,
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

        // Atualizar tenant com asaasCustomerId
        await this.prisma.tenant.update({
          where: { id: dto.tenantId },
          data: { asaasCustomerId: customer.id },
        })

        this.logger.log(`✓ Created Asaas customer: ${customer.id}`)
      }
    }

    // Gerar número da fatura
    const invoiceNumber = await this.generateInvoiceNumber()

    // Calcular data de vencimento
    // Asaas recomenda: cobranças recorrentes são geradas 40 dias antes do vencimento
    // Isso dá tempo para o cliente se organizar e permite melhor gestão de fluxo de caixa
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 40) // 40 dias a partir de hoje

    // Criar cobrança no Asaas
    // Se billingType não for especificado, usar UNDEFINED (permite cliente escolher)
    const payment = await this.asaasService.createPayment({
      customerId: asaasCustomerId,
      billingType: dto.billingType || AsaasBillingType.UNDEFINED,
      value: dto.amount,
      dueDate,
      description: dto.description || `Fatura ${invoiceNumber} - ${subscription.plan.displayName}`,
      externalReference: invoiceNumber,
    })

    // Criar invoice no banco com informações de desconto
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: dto.tenantId,
        subscriptionId: dto.subscriptionId,
        invoiceNumber,
        amount: new Prisma.Decimal(dto.amount),
        originalAmount: dto.originalAmount ? new Prisma.Decimal(dto.originalAmount) : null,
        discountPercent: dto.discountPercent ? new Prisma.Decimal(dto.discountPercent) : null,
        discountReason: dto.discountReason || null,
        billingCycle: dto.billingCycle || null,
        description: dto.description || null,
        currency: 'BRL',
        status: this.mapAsaasStatusToInvoiceStatus(payment.status),
        dueDate,
        asaasInvoiceId: payment.id,
        paymentUrl: payment.invoiceUrl || payment.bankSlipUrl,
      },
      include: {
        tenant: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    })

    this.logger.log(`✓ Invoice created: ${invoice.invoiceNumber} (${payment.id})`)

    return invoice
  }

  /**
   * Gera número único de fatura no formato INV-YYYY-NNNN
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `INV-${year}-`

    // Buscar última fatura do ano
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    let sequence = 1

    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10)
      sequence = lastSequence + 1
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`
  }

  /**
   * Mapeia status do Asaas para status de Invoice
   */
  private mapAsaasStatusToInvoiceStatus(asaasStatus: string): InvoiceStatus {
    const statusMap: Record<string, InvoiceStatus> = {
      PENDING: InvoiceStatus.OPEN,
      CONFIRMED: InvoiceStatus.PAID,
      RECEIVED: InvoiceStatus.PAID,
      OVERDUE: InvoiceStatus.OPEN,
      REFUNDED: InvoiceStatus.VOID,
      RECEIVED_IN_CASH: InvoiceStatus.PAID,
    }

    return statusMap[asaasStatus] || InvoiceStatus.OPEN
  }

  /**
   * Lista todas as faturas com filtros e paginação profissional
   * Retorna: data, total, offset, limit, hasMore
   */
  async findAll(filters: {
    tenantId?: string
    status?: InvoiceStatus
    limit?: number
    offset?: number
  }) {
    const { tenantId, status, limit = 10, offset = 0 } = filters

    const where: Prisma.InvoiceWhereInput = {}

    if (tenantId) where.tenantId = tenantId
    if (status) where.status = status

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
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
                  id: true,
                  displayName: true,
                },
              },
            },
          },
          payments: true, // Incluir payments para analytics
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.invoice.count({ where }),
    ])

    // Paginação profissional conforme especificação Asaas
    return {
      data: invoices,
      meta: {
        total, // totalCount
        offset,
        limit,
        hasMore: offset + limit < total, // Indica se há mais páginas
      },
    }
  }

  /**
   * Busca uma fatura por ID
   */
  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        tenant: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        payments: true,
      },
    })

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`)
    }

    return invoice
  }

  /**
   * Sincroniza status de invoice com Asaas
   */
  async syncInvoiceStatus(invoiceId: string): Promise<Invoice> {
    const invoice = await this.findOne(invoiceId)

    if (!invoice.asaasInvoiceId) {
      throw new BadRequestException('Invoice has no Asaas ID')
    }

    // Buscar status atualizado no Asaas
    const payment = await this.asaasService.getPayment(invoice.asaasInvoiceId)

    // Atualizar invoice
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: this.mapAsaasStatusToInvoiceStatus(payment.status),
        paidAt: payment.status === 'RECEIVED' || payment.status === 'CONFIRMED'
          ? new Date()
          : null,
      },
      include: {
        tenant: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        payments: true,
      },
    })

    this.logger.log(`✓ Invoice ${invoiceId} synced: ${payment.status}`)

    return updatedInvoice
  }

  /**
   * Marca fatura como paga (usado por webhook)
   */
  async markAsPaid(invoiceId: string): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
    })
  }

  /**
   * Cancela uma fatura
   */
  async cancelInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.findOne(invoiceId)

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid invoice')
    }

    // Cancelar no Asaas (se existir)
    if (invoice.asaasInvoiceId) {
      try {
        await this.asaasService.refundPayment(invoice.asaasInvoiceId)
      } catch (error) {
        this.logger.warn(`Failed to cancel payment in Asaas: ${error.message}`)
      }
    }

    // Marcar como void
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.VOID,
      },
    })
  }
}
