import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AlertsService } from './alerts.service'
import { EmailService } from '../../email/email.service'
import { TenantStatus } from '@prisma/client'

/**
 * CollectionsService
 *
 * Service responsável por ações de cobrança e gestão de inadimplência.
 * Fornece métodos para enviar lembretes, suspender tenants e renegociar faturas.
 */
@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Envia lembrete de pagamento por email
   *
   * @param invoiceId - ID da fatura vencida
   * @returns Confirmação de envio
   */
  async sendReminder(invoiceId: string) {
    this.logger.log(`Sending payment reminder for invoice ${invoiceId}`)

    // Buscar invoice com tenant e subscription
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
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
                displayName: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`)
    }

    // Calcular dias de atraso
    const now = new Date()
    const daysOverdue = Math.floor(
      (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
    )

    // Enviar email de lembrete
    const emailSent = await this.emailService.sendPaymentReminder(invoice.tenant.email, {
      tenantName: invoice.tenant.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      dueDate: new Date(invoice.dueDate),
      daysOverdue,
    })

    if (emailSent) {
      this.logger.log(
        `Payment reminder sent successfully to ${invoice.tenant.name} (${invoice.tenant.email}) for invoice ${invoice.invoiceNumber}`,
      )
    } else {
      this.logger.warn(
        `Failed to send payment reminder to ${invoice.tenant.email} for invoice ${invoice.invoiceNumber}`,
      )
    }

    return {
      success: true,
      message: 'Lembrete enviado com sucesso',
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        tenantName: invoice.tenant.name,
        tenantEmail: invoice.tenant.email,
        amount: Number(invoice.amount),
        daysOverdue,
        emailSent,
      },
    }
  }

  /**
   * Suspende tenant por inadimplência
   *
   * @param tenantId - ID do tenant
   * @param invoiceIds - IDs das faturas vencidas
   * @param reason - Motivo da suspensão (opcional)
   * @returns Tenant suspenso
   */
  async suspendTenantForNonPayment(
    tenantId: string,
    invoiceIds: string[],
    reason?: string,
  ) {
    this.logger.log(`Suspending tenant ${tenantId} for non-payment`)

    // Buscar tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`)
    }

    // Verificar se já está suspenso
    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new BadRequestException('Tenant já está suspenso')
    }

    const suspensionReason = reason || `Inadimplência de ${invoiceIds.length} fatura(s)`

    // Atualizar status do tenant
    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: TenantStatus.SUSPENDED,
      },
    })

    // Criar alerta de tenant suspenso
    await this.alertsService.createTenantSuspendedAlert({
      tenantId,
      reason: suspensionReason,
    })

    this.logger.log(`Tenant ${tenant.name} suspended successfully. Reason: ${suspensionReason}`)

    return {
      success: true,
      message: 'Tenant suspenso com sucesso',
      data: {
        tenantId: updatedTenant.id,
        tenantName: updatedTenant.name,
        status: updatedTenant.status,
        suspensionReason,
        invoiceIds,
      },
    }
  }

  /**
   * Renegocia fatura aplicando desconto e/ou extensão de prazo
   *
   * @param invoiceId - ID da fatura
   * @param discountPercent - Percentual de desconto (0-100)
   * @param extensionDays - Dias de extensão do prazo
   * @param reason - Motivo da renegociação
   * @returns Fatura renegociada
   */
  async renegotiate(
    invoiceId: string,
    discountPercent?: number,
    extensionDays?: number,
    reason?: string,
  ) {
    this.logger.log(`Renegotiating invoice ${invoiceId}`)

    // Validação: pelo menos desconto OU extensão
    if (!discountPercent && !extensionDays) {
      throw new BadRequestException(
        'Deve fornecer pelo menos desconto ou extensão de prazo',
      )
    }

    // Validação de desconto
    if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
      throw new BadRequestException('Desconto deve estar entre 0 e 100%')
    }

    // Validação de extensão
    if (extensionDays !== undefined && extensionDays < 1) {
      throw new BadRequestException('Extensão de prazo deve ser de pelo menos 1 dia')
    }

    // Buscar invoice
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`)
    }

    // Preparar dados de atualização
    const updateData: any = {}

    // Aplicar desconto
    if (discountPercent !== undefined && discountPercent > 0) {
      const originalAmount = Number(invoice.amount)
      const discountAmount = (originalAmount * discountPercent) / 100
      const newAmount = originalAmount - discountAmount

      updateData.originalAmount = originalAmount
      updateData.amount = newAmount
      updateData.discountPercent = discountPercent
    }

    // Estender prazo
    if (extensionDays !== undefined && extensionDays > 0) {
      const currentDueDate = new Date(invoice.dueDate)
      const newDueDate = new Date(currentDueDate)
      newDueDate.setDate(newDueDate.getDate() + extensionDays)

      updateData.dueDate = newDueDate
    }

    // Atualizar invoice
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
    })

    // Log da renegociação
    const logDetails = []
    if (discountPercent) {
      logDetails.push(`desconto de ${discountPercent}%`)
    }
    if (extensionDays) {
      logDetails.push(`extensão de ${extensionDays} dias`)
    }

    this.logger.log(
      `Invoice ${invoice.invoiceNumber} renegotiated: ${logDetails.join(' + ')}. Reason: ${reason || 'Not specified'}`,
    )

    return {
      success: true,
      message: 'Fatura renegociada com sucesso',
      data: {
        invoiceId: updatedInvoice.id,
        invoiceNumber: invoice.invoiceNumber,
        tenantName: invoice.tenant.name,
        originalAmount: Number(invoice.amount),
        newAmount: Number(updatedInvoice.amount),
        discountPercent: discountPercent || 0,
        newDueDate: updatedInvoice.dueDate,
        extensionDays: extensionDays || 0,
        reason: reason || 'Não especificado',
      },
    }
  }
}
