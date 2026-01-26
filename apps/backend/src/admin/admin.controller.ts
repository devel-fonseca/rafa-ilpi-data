import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface'
import { PlansService } from '../plans/plans.service'
import { InvoiceService } from '../payments/services/invoice.service'
import { SubscriptionAdminService } from '../superadmin/services/subscription-admin.service'
import { ContractsService } from '../contracts/contracts.service'
import { PrismaService } from '../prisma/prisma.service'
import { InvoiceStatus } from '@prisma/client'
import { InvoiceCreationMode } from '../payments/dto/create-invoice.dto'
import { ACTIVE_STATUSES } from '../payments/types/subscription-status.enum'

interface SubscriptionChangeMetadata {
  oldPlanId?: string
  newPlanId?: string
  reason?: string
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name)

  constructor(
    private readonly plansService: PlansService,
    private readonly invoiceService: InvoiceService,
    private readonly subscriptionAdminService: SubscriptionAdminService,
    private readonly contractsService: ContractsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper para validar e extrair tenantId do usuário
   */
  private validateTenantId(user?: JwtPayload): string {
    const tenantId = user?.tenantId
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID não encontrado')
    }
    return tenantId
  }

  /**
   * 1. Obter planos disponíveis para upgrade
   * Retorna apenas planos >= plano atual (sem downgrade)
   */
  @Get('plans/available')
  @Roles('ADMIN', 'MANAGER')
  async getAvailablePlans(@CurrentUser() user: JwtPayload) {
    const tenantId = this.validateTenantId(user)

    // Buscar subscription ativa do tenant
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ACTIVE_STATUSES },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription || !subscription.plan) {
      throw new NotFoundException('Nenhuma subscription ativa encontrada')
    }

    // Buscar todos os planos
    const allPlans = await this.plansService.findAll()

    // Filtrar apenas upgrades (maxResidents >= plano atual)
    const upgradePlans = allPlans.filter(
      (plan) => plan.maxResidents >= subscription.plan!.maxResidents,
    )

    return {
      currentPlan: subscription.plan,
      availablePlans: upgradePlans,
    }
  }

  /**
   * 2. Comparar plano atual com plano target
   */
  @Get('plans/compare/:targetPlanId')
  @Roles('ADMIN', 'MANAGER')
  async comparePlans(@Param('targetPlanId') targetPlanId: string, @CurrentUser() user: JwtPayload) {
    const tenantId = this.validateTenantId(user)

    // Buscar subscription ativa
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ACTIVE_STATUSES },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      throw new NotFoundException('Nenhuma subscription ativa encontrada')
    }

    // Comparar planos
    const comparison = await this.plansService.comparePlans(
      subscription.plan.id,
      targetPlanId,
    )

    // Validar se é upgrade (sem downgrade)
    if (comparison.isDowngrade) {
      throw new BadRequestException(
        'Downgrade não permitido. Entre em contato com o suporte.',
      )
    }

    return comparison
  }

  /**
   * 3. Solicitar upgrade de plano (self-service)
   */
  @Post('subscription/upgrade')
  @Roles('ADMIN', 'MANAGER')
  async upgradeSubscription(
    @Body() dto: { newPlanId: string; acceptedContractId?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = this.validateTenantId(user)

    // Buscar subscription ativa
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ACTIVE_STATUSES },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription || !subscription.plan) {
      throw new BadRequestException('Tenant não possui subscription ativa')
    }

    // Validar que é upgrade (sem downgrade)
    const targetPlan = await this.plansService.findOne(dto.newPlanId)
    if (targetPlan.maxResidents < subscription.plan.maxResidents) {
      throw new BadRequestException(
        'Downgrade não permitido. Entre em contato com o suporte.',
      )
    }

    // Verificar se mesmo plano
    if (subscription.planId === dto.newPlanId) {
      throw new BadRequestException('Você já está neste plano')
    }

    // TODO: Validar contrato aceito (futuro)
    // if (!dto.acceptedContractId) {
    //   throw new BadRequestException('É necessário aceitar o contrato antes do upgrade')
    // }

    // Log de auditoria ANTES da operação
    this.logger.log(
      `[TENANT-SELF-SERVICE] Upgrade solicitado: ${tenantId} (${subscription.plan.name} → ${targetPlan.name}) user=${user.email}`
    )

    // Mudar plano usando o service do SuperAdmin
    const newSubscription = await this.subscriptionAdminService.changePlan(
      tenantId,
      dto.newPlanId,
      'Upgrade solicitado pelo tenant admin (self-service)',
    )

    // Buscar valor do novo plano
    const newPlan = await this.plansService.findOne(dto.newPlanId)
    const planPrice = Number(newPlan.price) || 0

    // Gerar fatura para o novo plano
    const invoice = await this.invoiceService.generateInvoice({
      tenantId,
      subscriptionId: newSubscription.id,
      amount: planPrice,
      mode: InvoiceCreationMode.MANUAL, // Manual pois foi solicitado pelo admin
      description: `Upgrade de plano - ${newPlan.displayName}`,
    })

    // Log de auditoria APÓS sucesso
    this.logger.log(
      `[TENANT-SELF-SERVICE] Upgrade concluído: ${tenantId} → fatura=${invoice.invoiceNumber} amount=R$${planPrice}`
    )

    return {
      subscription: newSubscription,
      invoice,
      message: 'Upgrade realizado com sucesso. Fatura gerada.',
    }
  }

  /**
   * 4. Histórico de faturas do tenant
   */
  @Get('invoices')
  @Roles('ADMIN', 'MANAGER')
  async getTenantInvoices(
    @Query('status') status?: InvoiceStatus,
    @Query('limit') limit?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const tenantId = this.validateTenantId(user)

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        ...(status && { status }),
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    })

    return {
      data: invoices,
      meta: {
        total: invoices.length,
      },
    }
  }

  /**
   * 5. Detalhes de uma fatura específica
   */
  @Get('invoices/:id')
  @Roles('ADMIN', 'MANAGER')
  async getInvoiceDetails(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const tenantId = this.validateTenantId(user)

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        tenant: true,
      },
    })

    if (!invoice) {
      throw new NotFoundException('Fatura não encontrada')
    }

    // Validar que a fatura pertence ao tenant
    if (invoice.tenantId !== tenantId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta fatura')
    }

    return invoice
  }

  /**
   * 6. Atualizar método de pagamento preferido
   */
  @Patch('subscription/payment-method')
  @Roles('ADMIN', 'MANAGER')
  async updatePaymentMethod(
    @Body() dto: { preferredPaymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD' },
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = this.validateTenantId(user)

    // Buscar subscription ativa
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      throw new NotFoundException('Nenhuma subscription ativa encontrada')
    }

    // Log de auditoria ANTES da operação
    this.logger.log(
      `[TENANT-SELF-SERVICE] Método de pagamento alterado: ${tenantId} (${subscription.preferredPaymentMethod || 'NENHUM'} → ${dto.preferredPaymentMethod}) user=${user.email}`
    )

    // Atualizar método preferido
    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        preferredPaymentMethod: dto.preferredPaymentMethod,
      },
      include: { plan: true },
    })

    return {
      subscription: updated,
      message: 'Método de pagamento atualizado com sucesso',
    }
  }

  /**
   * 7. Cancelar subscription durante trial
   */
  @Post('subscription/cancel-trial')
  @Roles('ADMIN', 'MANAGER')
  async cancelTrial(@CurrentUser() user: JwtPayload) {
    const tenantId = this.validateTenantId(user)

    // Buscar subscription em trial
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: 'trialing',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      throw new BadRequestException(
        'Nenhuma subscription em trial encontrada. Apenas trials podem ser cancelados pelo tenant.',
      )
    }

    // Verificar se trial ainda está ativo
    if (subscription.trialEndDate && new Date() > subscription.trialEndDate) {
      throw new BadRequestException('O período de trial já expirou')
    }

    // Log de auditoria ANTES da operação
    this.logger.log(
      `[TENANT-SELF-SERVICE] Cancelamento de trial solicitado: ${tenantId} user=${user.email}`
    )

    // Cancelar usando o service do SuperAdmin
    await this.subscriptionAdminService.cancel(
      subscription.id,
      'Cancelamento solicitado pelo tenant admin durante trial (self-service)',
    )

    // Atualizar status do tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'CANCELLED' },
    })

    // Log de auditoria APÓS sucesso
    this.logger.log(
      `[TENANT-SELF-SERVICE] Trial cancelado com sucesso: ${tenantId} subscription=${subscription.id}`
    )

    return {
      message: 'Trial cancelado com sucesso. Sua conta foi desativada.',
    }
  }

  /**
   * 8. Obter contrato ativo para aceite
   */
  @Get('contracts/active/:planId')
  @Roles('ADMIN', 'MANAGER')
  async getActiveContract(@Param('planId') planId: string) {
    const contract = await this.contractsService.getActiveContractForPlan(planId)

    if (!contract) {
      throw new NotFoundException('Nenhum contrato ativo encontrado para este plano')
    }

    return contract
  }

  /**
   * 9. Registrar aceite de contrato (antes do upgrade)
   */
  @Post('contracts/accept')
  @Roles('ADMIN', 'MANAGER')
  async acceptContract(
    @Body() dto: { contractId: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const tenantId = this.validateTenantId(user)

    // Buscar contrato
    const contract = await this.prisma.serviceContract.findUnique({
      where: { id: dto.contractId },
    })

    if (!contract) {
      throw new NotFoundException('Contrato não encontrado')
    }

    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException('Apenas contratos ativos podem ser aceitos')
    }

    // Verificar se já foi aceito
    const existingAcceptance = await this.prisma.contractAcceptance.findFirst({
      where: {
        contractId: dto.contractId,
        tenantId,
      },
    })

    if (existingAcceptance) {
      this.logger.log(
        `[TENANT-SELF-SERVICE] Tentativa de aceite duplicado: ${tenantId} contract=${dto.contractId} user=${user.email}`
      )
      return {
        acceptance: existingAcceptance,
        message: 'Contrato já foi aceito anteriormente',
      }
    }

    // Log de auditoria ANTES da operação
    this.logger.log(
      `[TENANT-SELF-SERVICE] Aceite de contrato: ${tenantId} contract=${dto.contractId} version=${contract.version} user=${user.email}`
    )

    // Criar aceite
    const acceptance = await this.prisma.contractAcceptance.create({
      data: {
        contractId: dto.contractId,
        tenantId,
        userId: user.id,
        contractVersion: contract.version,
        contractContent: contract.content,
        contractHash: contract.contentHash,
        ipAddress: '0.0.0.0', // TODO: Capturar IP real do request
        userAgent: 'Unknown', // TODO: Capturar User-Agent real do request
      },
      include: {
        contract: true,
        // NOTA: Relação 'user' removida (incompatível com multi-tenancy)
        // userId aponta para tenant_xyz.users, não public.users
      },
    })

    return {
      acceptance,
      message: 'Contrato aceito com sucesso',
    }
  }

  /**
   * 10. Histórico de mudanças de plano (SystemAlerts)
   */
  @Get('subscription/change-history')
  @Roles('ADMIN', 'MANAGER')
  async getSubscriptionChangeHistory(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string) {
    const tenantId = this.validateTenantId(user)

    // Buscar alertas de mudança de plano do tenant
    const alerts = await this.prisma.systemAlert.findMany({
      where: {
        tenantId,
        title: 'Plano Alterado', // Filtra apenas mudanças de plano
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit ? parseInt(limit) : 5, // Padrão: 5 mudanças mais recentes
    })

    // Transformar metadata para incluir informações de origem
    const history = alerts.map((alert) => {
      const metadata = alert.metadata as SubscriptionChangeMetadata
      const isSelfService = metadata?.reason?.includes('self-service') || false

      return {
        id: alert.id,
        date: alert.createdAt,
        oldPlanId: metadata?.oldPlanId,
        newPlanId: metadata?.newPlanId,
        reason: metadata?.reason,
        source: isSelfService ? 'SELF_SERVICE' : 'SUPERADMIN',
        message: alert.message,
      }
    })

    return {
      data: history,
      meta: {
        total: history.length,
      },
    }
  }
}
