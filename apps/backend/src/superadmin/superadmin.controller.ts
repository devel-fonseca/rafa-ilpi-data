import { Controller, Get, Query, UseGuards, Patch, Post, Delete, Param, Body } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from './guards/superadmin.guard'
import { MetricsService } from './services/metrics.service'
import { TenantAdminService } from './services/tenant-admin.service'
import { SubscriptionAdminService } from './services/subscription-admin.service'
import { PlansAdminService } from './services/plans-admin.service'
import { AlertsService } from './services/alerts.service'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { SuspendTenantDto } from './dto/suspend-tenant.dto'
import { ChangePlanDto } from './dto/change-plan.dto'
import { ExtendPeriodDto } from './dto/extend-period.dto'
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto'
import { CreatePlanDto } from './dto/create-plan.dto'
import { UpdatePlanDto } from './dto/update-plan.dto'
import { ApplyDiscountDto } from './dto/apply-discount.dto'
import { ApplyCustomPriceDto } from './dto/apply-custom-price.dto'
import { SendReminderDto, SuspendTenantForNonPaymentDto, RenegotiateDto } from './dto/collections.dto'
import { InvoiceService } from '../payments/services/invoice.service'
import { PaymentAnalyticsService } from '../payments/services/payment-analytics.service'
import { CreateInvoiceDto } from '../payments/dto/create-invoice.dto'
import { AlertType, AlertSeverity, ContractStatus, TenantStatus, InvoiceStatus } from '@prisma/client'
import { ContractsService } from '../contracts/contracts.service'
import { CollectionsService } from './services/collections.service'
import { CreateContractDto } from '../contracts/dto/create-contract.dto'
import { UpdateContractDto } from '../contracts/dto/update-contract.dto'
import { PublishContractDto } from '../contracts/dto/publish-contract.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { PrismaService } from '../prisma/prisma.service'
import { TrialExpirationAlertsJob } from './jobs/trial-expiration-alerts.job'
import { TrialToActiveConversionJob } from './jobs/trial-to-active-conversion.job'
import { parseISO } from 'date-fns'

/**
 * SuperAdminController
 *
 * Controller para rotas exclusivas do Super Administrador.
 * Todas as rotas são protegidas por JwtAuthGuard + SuperAdminGuard.
 *
 * Rotas implementadas:
 * - GET /superadmin/metrics/overview - Visão geral (MRR, ARR, Churn, LTV)
 * - GET /superadmin/metrics/revenue - Métricas de receita detalhadas
 * - GET /superadmin/metrics/tenants - Contagem de tenants por status
 * - GET /superadmin/metrics/trends - Tendências de MRR ao longo do tempo
 *
 * TODO: Adicionar nas próximas fases:
 * - Fase 3: Gestão de tenants e subscriptions
 * - Fase 4: Faturas e pagamentos
 * - Fase 5: Alertas e notificações
 */
@Controller('superadmin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly tenantAdminService: TenantAdminService,
    private readonly subscriptionAdminService: SubscriptionAdminService,
    private readonly plansAdminService: PlansAdminService,
    private readonly invoiceService: InvoiceService,
    private readonly analyticsService: PaymentAnalyticsService,
    private readonly alertsService: AlertsService,
    private readonly contractsService: ContractsService,
    private readonly collectionsService: CollectionsService,
    private readonly prismaService: PrismaService,
    private readonly trialAlertsJob: TrialExpirationAlertsJob,
    private readonly trialConversionJob: TrialToActiveConversionJob,
  ) {}

  /**
   * GET /superadmin/metrics/overview
   *
   * Retorna visão geral das métricas principais:
   * - Total de tenants (todos os status)
   * - Tenants ativos (com subscription ativa)
   * - MRR (Monthly Recurring Revenue)
   * - ARR (Annual Recurring Revenue)
   * - Churn Rate (taxa de cancelamento)
   * - LTV (Lifetime Value)
   */
  @Get('metrics/overview')
  async getOverviewMetrics() {
    return this.metricsService.getOverview()
  }

  /**
   * GET /superadmin/metrics/revenue
   *
   * Retorna métricas detalhadas de receita:
   * - MRR atual
   * - ARR atual
   * - MRR do mês anterior
   * - Crescimento percentual (MoM)
   */
  @Get('metrics/revenue')
  async getRevenueMetrics() {
    return this.metricsService.getRevenueMetrics()
  }

  /**
   * GET /superadmin/metrics/tenants
   *
   * Retorna contagem de tenants por status:
   * - Total
   * - Ativos
   * - Em trial
   * - Suspensos
   * - Cancelados
   */
  @Get('metrics/tenants')
  async getTenantMetrics() {
    return this.metricsService.getTenantMetrics()
  }

  /**
   * GET /superadmin/metrics/trends
   *
   * Retorna tendências de MRR ao longo do tempo
   * Query params:
   * - months: Número de meses para retornar (padrão: 12)
   */
  @Get('metrics/trends')
  async getTrends(@Query('months') months?: string) {
    const monthsNum = months ? parseInt(months, 10) : 12
    return this.metricsService.getTrends(monthsNum)
  }

  // ========================================
  // TENANT MANAGEMENT
  // ========================================

  /**
   * GET /superadmin/tenants
   * Listar todos os tenants com filtros e paginação
   */
  @Get('tenants')
  async listTenants(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('planId') planId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      status: status as TenantStatus | undefined,
      search,
      planId
    }
    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    }
    return this.tenantAdminService.findAll(filters, pagination)
  }

  /**
   * GET /superadmin/tenants/:id
   * Buscar detalhes completos de um tenant
   */
  @Get('tenants/:id')
  async getTenant(@Param('id') id: string) {
    return this.tenantAdminService.findOne(id)
  }

  /**
   * PATCH /superadmin/tenants/:id
   * Atualizar dados básicos de um tenant
   */
  @Patch('tenants/:id')
  async updateTenant(@Param('id') id: string, @Body() updateDto: UpdateTenantDto) {
    return this.tenantAdminService.update(id, updateDto)
  }

  /**
   * POST /superadmin/tenants/:id/suspend
   * Suspender tenant
   */
  @Post('tenants/:id/suspend')
  async suspendTenant(@Param('id') id: string, @Body() suspendDto: SuspendTenantDto) {
    return this.tenantAdminService.suspend(id, suspendDto.reason)
  }

  /**
   * POST /superadmin/tenants/:id/reactivate
   * Reativar tenant suspenso
   */
  @Post('tenants/:id/reactivate')
  async reactivateTenant(@Param('id') id: string) {
    return this.tenantAdminService.reactivate(id)
  }

  /**
   * DELETE /superadmin/tenants/:id
   * Soft delete de tenant
   */
  @Delete('tenants/:id')
  async deleteTenant(@Param('id') id: string) {
    return this.tenantAdminService.delete(id)
  }

  /**
   * GET /superadmin/tenants/:id/stats
   * Buscar estatísticas de um tenant
   */
  @Get('tenants/:id/stats')
  async getTenantStats(@Param('id') id: string) {
    return this.tenantAdminService.getStats(id)
  }

  // ========================================
  // SUBSCRIPTION MANAGEMENT
  // ========================================

  /**
   * POST /superadmin/tenants/:tenantId/change-plan
   * Mudar plano de um tenant
   */
  @Post('tenants/:tenantId/change-plan')
  async changePlan(@Param('tenantId') tenantId: string, @Body() changePlanDto: ChangePlanDto) {
    return this.subscriptionAdminService.changePlan(tenantId, changePlanDto.newPlanId, changePlanDto.reason)
  }

  /**
   * POST /superadmin/subscriptions/:id/extend
   * Estender período de uma subscription
   */
  @Post('subscriptions/:id/extend')
  async extendSubscription(@Param('id') id: string, @Body() extendDto: ExtendPeriodDto) {
    return this.subscriptionAdminService.extendPeriod(id, extendDto.days)
  }

  /**
   * POST /superadmin/subscriptions/:id/cancel
   * Cancelar subscription
   */
  @Post('subscriptions/:id/cancel')
  async cancelSubscription(@Param('id') id: string, @Body() cancelDto: CancelSubscriptionDto) {
    return this.subscriptionAdminService.cancel(id, cancelDto.reason)
  }

  /**
   * POST /superadmin/subscriptions/:id/reactivate
   * Reativar subscription cancelada
   */
  @Post('subscriptions/:id/reactivate')
  async reactivateSubscription(@Param('id') id: string) {
    return this.subscriptionAdminService.reactivate(id)
  }

  /**
   * GET /superadmin/tenants/:tenantId/subscriptions/history
   * Listar histórico de subscriptions de um tenant
   */
  @Get('tenants/:tenantId/subscriptions/history')
  async getSubscriptionHistory(@Param('tenantId') tenantId: string) {
    return this.subscriptionAdminService.getHistory(tenantId)
  }

  /**
   * GET /superadmin/subscriptions/:id
   * Buscar detalhes de uma subscription
   */
  @Get('subscriptions/:id')
  async getSubscription(@Param('id') id: string) {
    return this.subscriptionAdminService.findOne(id)
  }

  /**
   * POST /superadmin/subscriptions/:id/apply-discount
   * Aplicar desconto percentual a uma subscription
   */
  @Post('subscriptions/:id/apply-discount')
  async applyDiscount(@Param('id') id: string, @Body() dto: ApplyDiscountDto) {
    return this.subscriptionAdminService.applyDiscount(id, dto.discountPercent, dto.reason)
  }

  /**
   * POST /superadmin/subscriptions/:id/apply-custom-price
   * Aplicar preço customizado a uma subscription
   */
  @Post('subscriptions/:id/apply-custom-price')
  async applyCustomPrice(@Param('id') id: string, @Body() dto: ApplyCustomPriceDto) {
    return this.subscriptionAdminService.applyCustomPrice(id, dto.customPrice, dto.reason)
  }

  /**
   * DELETE /superadmin/subscriptions/:id/discount
   * Remover desconto/preço customizado de uma subscription
   */
  @Delete('subscriptions/:id/discount')
  async removeDiscount(@Param('id') id: string) {
    return this.subscriptionAdminService.removeDiscount(id)
  }

  // ========================================
  // PLAN MANAGEMENT
  // ========================================

  /**
   * POST /superadmin/plans
   * Criar novo plano
   */
  @Post('plans')
  async createPlan(@Body() createDto: CreatePlanDto) {
    return this.plansAdminService.create(createDto)
  }

  /**
   * GET /superadmin/plans
   * Listar todos os planos (templates globais)
   */
  @Get('plans')
  async listPlans() {
    return this.plansAdminService.findAll()
  }

  /**
   * GET /superadmin/plans/:id
   * Buscar detalhes de um plano
   */
  @Get('plans/:id')
  async getPlan(@Param('id') id: string) {
    return this.plansAdminService.findOne(id)
  }

  /**
   * PATCH /superadmin/plans/:id
   * Atualizar plano (preço, limites, features)
   */
  @Patch('plans/:id')
  async updatePlan(@Param('id') id: string, @Body() updateDto: UpdatePlanDto) {
    return this.plansAdminService.update(id, updateDto)
  }

  /**
   * POST /superadmin/plans/:id/toggle-popular
   * Toggle flag isPopular de um plano
   */
  @Post('plans/:id/toggle-popular')
  async togglePopular(@Param('id') id: string) {
    return this.plansAdminService.togglePopular(id)
  }

  /**
   * POST /superadmin/plans/:id/toggle-active
   * Toggle flag isActive de um plano (desativação visual apenas)
   */
  @Post('plans/:id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.plansAdminService.toggleActive(id)
  }

  /**
   * GET /superadmin/plans/:id/stats
   * Buscar estatísticas de um plano
   */
  @Get('plans/:id/stats')
  async getPlanStats(@Param('id') id: string) {
    return this.plansAdminService.getStats(id)
  }

  // ========================================
  // INVOICE MANAGEMENT
  // ========================================

  /**
   * GET /superadmin/invoices
   * Listar todas as faturas com filtros
   */
  @Get('invoices')
  async listInvoices(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.invoiceService.findAll({
      tenantId,
      status: status as InvoiceStatus | undefined,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    })
  }

  /**
   * GET /superadmin/invoices/:id
   * Buscar detalhes de uma fatura
   */
  @Get('invoices/:id')
  async getInvoice(@Param('id') id: string) {
    return this.invoiceService.findOne(id)
  }

  /**
   * POST /superadmin/invoices
   * Gerar fatura manualmente para um tenant/subscription
   */
  @Post('invoices')
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.generateInvoice(createInvoiceDto)
  }

  /**
   * POST /superadmin/invoices/:id/sync
   * Sincronizar status da fatura com Asaas
   */
  @Post('invoices/:id/sync')
  async syncInvoice(@Param('id') id: string) {
    return this.invoiceService.syncInvoiceStatus(id)
  }

  /**
   * DELETE /superadmin/invoices/:id
   * Cancelar uma fatura
   */
  @Delete('invoices/:id')
  async cancelInvoice(@Param('id') id: string) {
    return this.invoiceService.cancelInvoice(id)
  }

  /**
   * GET /superadmin/tenants/:tenantId/invoices
   * Listar todas as faturas de um tenant
   */
  @Get('tenants/:tenantId/invoices')
  async getTenantInvoices(@Param('tenantId') tenantId: string) {
    return this.invoiceService.findAll({ tenantId })
  }

  // ============================================
  // PAYMENT ANALYTICS ROUTES
  // ============================================

  /**
   * GET /superadmin/analytics/financial
   * Métricas financeiras consolidadas
   *
   * Retorna:
   * - Overview: total invoices, paid, pending, overdue, revenue
   * - Breakdown por método de pagamento (PIX, Boleto, Cartão)
   * - Método com melhor taxa de conversão
   *
   * Query params:
   * - startDate: filtrar por data inicial (ISO 8601)
   * - endDate: filtrar por data final (ISO 8601)
   * - tenantId: filtrar por tenant específico
   */
  @Get('analytics/financial')
  async getFinancialMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const filters = {
      startDate: startDate ? parseISO(`${startDate}T12:00:00.000`) : undefined,
      endDate: endDate ? parseISO(`${endDate}T12:00:00.000`) : undefined,
      tenantId,
    }

    return this.analyticsService.getFinancialMetrics(filters)
  }

  /**
   * GET /superadmin/analytics/mrr-breakdown
   * MRR breakdown por método de pagamento
   *
   * Retorna o MRR do mês atual dividido por:
   * - Total MRR
   * - MRR por billing type (PIX, Boleto, Cartão)
   * - Percentual de cada método
   */
  @Get('analytics/mrr-breakdown')
  async getMrrBreakdown() {
    return this.analyticsService.getMrrByPaymentMethod()
  }

  /**
   * GET /superadmin/analytics/overdue/summary
   * Métricas consolidadas de inadimplência
   *
   * Retorna:
   * - Total de faturas vencidas (quantidade + valor)
   * - Taxa de inadimplência (%)
   * - Média de dias de atraso
   * - Aging breakdown (0-30, 30-60, 60+ dias)
   *
   * Query params:
   * - startDate: filtrar por data inicial (ISO 8601)
   * - endDate: filtrar por data final (ISO 8601)
   */
  @Get('analytics/overdue/summary')
  async getOverdueSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      startDate: startDate ? parseISO(`${startDate}T12:00:00.000`) : undefined,
      endDate: endDate ? parseISO(`${endDate}T12:00:00.000`) : undefined,
    }

    return this.analyticsService.getOverdueMetrics(filters)
  }

  /**
   * GET /superadmin/analytics/overdue/tenants
   * Lista de tenants inadimplentes
   *
   * Retorna lista ordenada de tenants com faturas vencidas, incluindo:
   * - Nome e email do tenant
   * - Plano contratado
   * - Quantidade de faturas vencidas
   * - Valor total em atraso
   * - Maior número de dias de atraso
   * - Lista detalhada de cada fatura vencida
   *
   * Query params:
   * - limit: número máximo de resultados (default: 100)
   * - sortBy: ordenação - 'amount' (default), 'days', ou 'count'
   */
  @Get('analytics/overdue/tenants')
  async getOverdueTenants(
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: 'amount' | 'days' | 'count',
  ) {
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
    }

    return this.analyticsService.getOverdueTenants(options)
  }

  /**
   * GET /superadmin/analytics/overdue/trends
   * Evolução temporal de inadimplência
   *
   * Retorna série temporal com dados mensais de inadimplência:
   * - Quantidade de faturas vencidas por mês
   * - Valor total em atraso por mês
   * - Taxa de inadimplência (%) por mês
   *
   * Query params:
   * - months: número de meses retroativos (default: 6)
   */
  @Get('analytics/overdue/trends')
  async getOverdueTrends(@Query('months') months?: string) {
    const options = {
      months: months ? parseInt(months, 10) : undefined,
    }

    return this.analyticsService.getOverdueTrends(options)
  }

  // ============================================
  // ALERTS ENDPOINTS (Fase 5)
  // ============================================

  /**
   * GET /superadmin/alerts
   * Lista todos os alertas com filtros e paginação
   *
   * Query params:
   * - read?: boolean - Filtrar por lidos/não lidos
   * - type?: AlertType - Filtrar por tipo
   * - severity?: AlertSeverity - Filtrar por severidade
   * - tenantId?: string - Filtrar por tenant
   * - limit?: number - Limite de resultados (default: 50)
   * - offset?: number - Offset para paginação (default: 0)
   */
  @Get('alerts')
  async getAlerts(
    @Query('read') read?: string,
    @Query('type') type?: AlertType,
    @Query('severity') severity?: AlertSeverity,
    @Query('tenantId') tenantId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.alertsService.findAll({
      read: read ? read === 'true' : undefined,
      type,
      severity,
      tenantId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    })
  }

  /**
   * GET /superadmin/alerts/unread-count
   * Conta alertas não lidos
   *
   * Query params:
   * - type?: AlertType - Filtrar por tipo
   * - severity?: AlertSeverity - Filtrar por severidade
   */
  @Get('alerts/unread-count')
  async getUnreadCount(
    @Query('type') type?: AlertType,
    @Query('severity') severity?: AlertSeverity,
  ) {
    const count = await this.alertsService.countUnread({ type, severity })
    return { count }
  }

  /**
   * PATCH /superadmin/alerts/:id/read
   * Marca um alerta como lido
   */
  @Patch('alerts/:id/read')
  async markAlertAsRead(@Param('id') id: string) {
    return this.alertsService.markAsRead(id)
  }

  /**
   * POST /superadmin/alerts/mark-all-read
   * Marca todos os alertas como lidos
   */
  @Post('alerts/mark-all-read')
  async markAllAlertsAsRead() {
    return this.alertsService.markAllAsRead()
  }

  /**
   * DELETE /superadmin/alerts/:id
   * Deleta um alerta
   */
  @Delete('alerts/:id')
  async deleteAlert(@Param('id') id: string) {
    return this.alertsService.delete(id)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CONTRATOS DE SERVIÇO
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * GET /superadmin/contracts
   * Lista contratos com filtros opcionais
   */
  @Get('contracts')
  async listContracts(
    @Query('status') status?: ContractStatus,
    @Query('planId') planId?: string,
  ) {
    return this.contractsService.findAll({ status, planId })
  }

  /**
   * GET /superadmin/contracts/:id
   * Busca detalhes de um contrato específico
   */
  @Get('contracts/:id')
  async getContract(@Param('id') id: string) {
    return this.contractsService.findOne(id)
  }

  /**
   * POST /superadmin/contracts
   * Cria novo contrato DRAFT
   */
  @Post('contracts')
  async createContract(
    @Body() dto: CreateContractDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.contractsService.create(dto, user.sub)
  }

  /**
   * PATCH /superadmin/contracts/:id
   * Atualiza contrato DRAFT
   */
  @Patch('contracts/:id')
  async updateContract(
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
  ) {
    return this.contractsService.update(id, dto)
  }

  /**
   * POST /superadmin/contracts/:id/publish
   * Publica contrato (DRAFT → ACTIVE)
   */
  @Post('contracts/:id/publish')
  async publishContract(
    @Param('id') id: string,
    @Body() dto: PublishContractDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.contractsService.publish(id, dto, user.sub)
  }

  /**
   * DELETE /superadmin/contracts/:id
   * Deleta contrato DRAFT sem aceites
   */
  @Delete('contracts/:id')
  async deleteContract(@Param('id') id: string) {
    return this.contractsService.delete(id)
  }

  /**
   * GET /superadmin/contracts/:id/acceptances
   * Lista aceites de um contrato
   */
  @Get('contracts/:id/acceptances')
  async getContractAcceptances(@Param('id') id: string) {
    return this.contractsService.getAcceptances(id)
  }

  /**
   * GET /superadmin/tenants/:id/contract-acceptance
   * Busca aceite de contrato de um tenant específico
   */
  @Get('tenants/:id/contract-acceptance')
  async getTenantContractAcceptance(@Param('id') tenantId: string) {
    return this.contractsService.getTenantAcceptance(tenantId)
  }

  /**
   * GET /superadmin/tenants/:id/privacy-policy-acceptance
   * Busca aceite da Política de Privacidade de um tenant específico
   */
  @Get('tenants/:id/privacy-policy-acceptance')
  async getTenantPrivacyPolicyAcceptance(@Param('id') tenantId: string) {
    const acceptance = await this.prismaService.privacyPolicyAcceptance.findUnique({
      where: { tenantId },
      include: {
        tenant: {
          select: {
            schemaName: true,
          },
        },
        // NOTA: Relação 'user' removida (incompatível com multi-tenancy)
        // userId aponta para tenant_xyz.users, não public.users
      },
    })

    if (!acceptance) {
      return null
    }

    // Buscar dados do usuário no schema do tenant
    let user: { name: string; email: string } | null = null
    if (acceptance.userId && acceptance.tenant?.schemaName) {
      try {
        const userResult = await this.prismaService.$queryRawUnsafe<[{ name: string; email: string }]>(
          `SELECT name, email FROM "${acceptance.tenant.schemaName}"."users" WHERE id = $1 LIMIT 1`,
          acceptance.userId
        )
        if (userResult[0]) {
          user = {
            name: userResult[0].name,
            email: userResult[0].email,
          }
        }
      } catch (_error) {
        // Se falhar, deixar user como null
      }
    }

    return {
      ...acceptance,
      user,
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // COLLECTIONS / COBRANÇA
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /superadmin/collections/send-reminder
   * Envia lembrete de pagamento por email
   *
   * Body: { invoiceId: string }
   */
  @Post('collections/send-reminder')
  async sendPaymentReminder(@Body() dto: SendReminderDto) {
    return this.collectionsService.sendReminder(dto.invoiceId)
  }

  /**
   * POST /superadmin/collections/suspend-tenant
   * Suspende tenant por inadimplência
   *
   * Body: { tenantId: string, invoiceIds: string[], reason?: string }
   */
  @Post('collections/suspend-tenant')
  async suspendTenantForNonPayment(@Body() dto: SuspendTenantForNonPaymentDto) {
    return this.collectionsService.suspendTenantForNonPayment(
      dto.tenantId,
      dto.invoiceIds,
      dto.reason,
    )
  }

  /**
   * POST /superadmin/collections/renegotiate
   * Renegocia fatura aplicando desconto e/ou extensão de prazo
   *
   * Body: {
   *   invoiceId: string
   *   discountPercent?: number (0-100)
   *   extensionDays?: number (>= 1)
   *   reason?: string
   * }
   */
  @Post('collections/renegotiate')
  async renegotiateInvoice(@Body() dto: RenegotiateDto) {
    return this.collectionsService.renegotiate(
      dto.invoiceId,
      dto.discountPercent,
      dto.extensionDays,
      dto.reason,
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // JOBS MANUAIS (TRIAL)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /superadmin/jobs/trial-expiration-alerts
   *
   * Dispara manualmente o job de avisos de expiração de trial.
   * Envia emails para trials que expiram em 7, 3 ou 1 dia.
   *
   * ⚠️  Uso: Testes, correção de falhas, ou disparo emergencial
   *
   * Retorna: { success: boolean, message: string }
   */
  @Post('jobs/trial-expiration-alerts')
  async triggerTrialExpirationAlerts() {
    try {
      await this.trialAlertsJob.handleTrialExpirationAlerts()
      return {
        success: true,
        message: 'Trial expiration alerts job executado com sucesso',
      }
    } catch (error) {
      return {
        success: false,
        message: `Erro ao executar job: ${error.message}`,
      }
    }
  }

  /**
   * POST /superadmin/jobs/trial-conversion
   *
   * Dispara manualmente o job de conversão de trials expirados.
   * Converte trials vencidos para active, gera fatura e envia email.
   *
   * ⚠️  Uso: Testes, correção de falhas, ou disparo emergencial
   *
   * Retorna: { success: boolean, message: string }
   */
  @Post('jobs/trial-conversion')
  async triggerTrialConversion() {
    try {
      await this.trialConversionJob.handleTrialConversion()
      return {
        success: true,
        message: 'Trial conversion job executado com sucesso',
      }
    } catch (error) {
      return {
        success: false,
        message: `Erro ao executar job: ${error.message}`,
      }
    }
  }
}
