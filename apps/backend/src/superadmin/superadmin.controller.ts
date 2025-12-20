import { Controller, Get, Query, UseGuards, Patch, Post, Delete, Param, Body } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SuperAdminGuard } from './guards/superadmin.guard'
import { MetricsService } from './services/metrics.service'
import { TenantAdminService } from './services/tenant-admin.service'
import { SubscriptionAdminService } from './services/subscription-admin.service'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { SuspendTenantDto } from './dto/suspend-tenant.dto'
import { ChangePlanDto } from './dto/change-plan.dto'
import { ExtendPeriodDto } from './dto/extend-period.dto'
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto'
import { InvoiceService } from '../payments/services/invoice.service'
import { PaymentAnalyticsService } from '../payments/services/payment-analytics.service'
import { CreateInvoiceDto } from '../payments/dto/create-invoice.dto'

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
    private readonly invoiceService: InvoiceService,
    private readonly analyticsService: PaymentAnalyticsService,
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
      status: status as any, // Cast to TenantStatus
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
      status: status as any,
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
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
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
}
