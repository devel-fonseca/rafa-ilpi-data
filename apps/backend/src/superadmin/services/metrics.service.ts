import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * MetricsService
 *
 * Serviço responsável por calcular métricas de negócio para o SuperAdmin:
 * - MRR (Monthly Recurring Revenue) - Receita recorrente mensal
 * - ARR (Annual Recurring Revenue) - Receita recorrente anual
 * - Churn Rate - Taxa de cancelamento
 * - LTV (Lifetime Value) - Valor vitalício do cliente
 * - Total de Tenants por status
 * - Tendências de receita ao longo do tempo
 */
@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna visão geral das métricas principais
   */
  async getOverview() {
    // Buscar todos os tenants e suas subscriptions ativas (incluindo TRIAL)
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'active', 'TRIAL', 'trialing'],
        },
      },
      include: {
        plan: true,
        tenant: true,
      },
    })

    const totalTenants = await this.prisma.tenant.count({
      where: { deletedAt: null },
    })

    const activeTenants = subscriptions.filter(
      (s) => s.tenant.status === 'ACTIVE' || s.tenant.status === 'TRIAL',
    ).length

    // Calcular MRR com lógica correta (customPrice, descontos, normalização anual)
    let mrr = 0
    subscriptions.forEach((subscription) => {
      let monthlyValue = 0

      // Preço base (customPrice ou plan.price)
      const basePrice = subscription.customPrice
        ? subscription.customPrice.toNumber()
        : subscription.plan.price
        ? subscription.plan.price.toNumber()
        : 0

      // Aplicar desconto
      const discount = subscription.discountPercent
        ? subscription.discountPercent.toNumber()
        : 0
      const priceWithDiscount = basePrice * (1 - discount / 100)

      // Normalizar para mensal (se anual, divide por 12)
      if (subscription.billing_cycle === 'ANNUAL') {
        monthlyValue = priceWithDiscount / 12
      } else {
        monthlyValue = priceWithDiscount
      }

      mrr += monthlyValue
    })

    // ARR = MRR × 12
    const arr = mrr * 12

    // Calcular Churn Rate (tenants cancelados no último mês / total no início do mês)
    const churn = await this.calculateChurnRate()

    // LTV = MRR médio / Churn Rate
    const avgMrr = activeTenants > 0 ? mrr / activeTenants : 0
    // Se churn = 0, retornar null (dados insuficientes para calcular LTV)
    const ltv = churn > 0 ? avgMrr / (churn / 100) : null

    return {
      totalTenants,
      activeTenants,
      mrr: Math.round(mrr * 100) / 100, // Arredondar para 2 casas decimais
      arr: Math.round(arr * 100) / 100,
      churn: Math.round(churn * 100) / 100,
      ltv: ltv !== null ? Math.round(ltv * 100) / 100 : null,
    }
  }

  /**
   * Retorna métricas detalhadas de receita
   */
  async getRevenueMetrics() {
    const now = new Date()
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // MRR atual
    const currentMrr = await this.calculateMrrForPeriod(firstDayCurrentMonth)

    // MRR do mês passado
    const lastMonthMrr = await this.calculateMrrForPeriod(
      firstDayLastMonth,
      lastDayLastMonth,
    )

    // Crescimento percentual
    const growth =
      lastMonthMrr > 0
        ? ((currentMrr - lastMonthMrr) / lastMonthMrr) * 100
        : 0

    return {
      mrr: Math.round(currentMrr * 100) / 100,
      arr: Math.round(currentMrr * 12 * 100) / 100,
      lastMonthMrr: Math.round(lastMonthMrr * 100) / 100,
      growth: Math.round(growth * 100) / 100,
    }
  }

  /**
   * Retorna métricas de tenants por status
   */
  async getTenantMetrics() {
    const tenants = await this.prisma.tenant.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
      },
      _count: true,
    })

    const metrics = {
      total: 0,
      active: 0,
      trial: 0,
      suspended: 0,
      cancelled: 0,
    }

    tenants.forEach((group) => {
      metrics.total += group._count
      switch (group.status) {
        case 'ACTIVE':
          metrics.active = group._count
          break
        case 'TRIAL':
          metrics.trial = group._count
          break
        case 'SUSPENDED':
          metrics.suspended = group._count
          break
        case 'CANCELLED':
          metrics.cancelled = group._count
          break
      }
    })

    return metrics
  }

  /**
   * Retorna tendências de MRR ao longo dos últimos N meses
   */
  async getTrends(months: number = 12) {
    const trends = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const mrr = await this.calculateMrrForPeriod(targetDate, nextMonth)

      trends.push({
        month: targetDate.toISOString().slice(0, 7), // YYYY-MM
        mrr: Math.round(mrr * 100) / 100,
      })
    }

    return {
      period: `${months} months`,
      data: trends,
    }
  }

  /**
   * HELPER: Calcula MRR para um período específico
   *
   * Considera subscriptions que estavam ativas naquele período,
   * incluindo customPrice, descontos e normalização de planos anuais.
   */
  private async calculateMrrForPeriod(
    startDate: Date,
    endDate?: Date,
  ): Promise<number> {
    const targetDate = endDate || new Date()

    // Buscar subscriptions que estavam ativas no período
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'active', 'TRIAL', 'trialing'],
        },
        startDate: {
          lte: targetDate,
        },
        OR: [
          { endDate: null },
          {
            endDate: {
              gte: startDate,
            },
          },
        ],
      },
      include: {
        plan: true,
        tenant: true,
      },
    })

    let mrr = 0
    subscriptions.forEach((subscription) => {
      // Preço base (customPrice ou plan.price)
      const basePrice = subscription.customPrice
        ? subscription.customPrice.toNumber()
        : subscription.plan.price
        ? subscription.plan.price.toNumber()
        : 0

      // Aplicar desconto
      const discount = subscription.discountPercent
        ? subscription.discountPercent.toNumber()
        : 0
      const priceWithDiscount = basePrice * (1 - discount / 100)

      // Normalizar para mensal (se anual, divide por 12)
      let monthlyValue = 0
      if (subscription.billing_cycle === 'ANNUAL') {
        monthlyValue = priceWithDiscount / 12
      } else {
        monthlyValue = priceWithDiscount
      }

      mrr += monthlyValue
    })

    return mrr
  }

  /**
   * HELPER: Calcula taxa de churn do último mês
   */
  private async calculateChurnRate(): Promise<number> {
    const now = new Date()
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Total de tenants ativos no início do mês passado
    const tenantsStartOfMonth = await this.prisma.tenant.count({
      where: {
        deletedAt: null,
        createdAt: {
          lt: firstDayLastMonth,
        },
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
      },
    })

    // Tenants que cancelaram durante o mês passado
    const cancelledDuringMonth = await this.prisma.tenant.count({
      where: {
        status: 'CANCELLED',
        updatedAt: {
          gte: firstDayLastMonth,
          lte: lastDayLastMonth,
        },
      },
    })

    if (tenantsStartOfMonth === 0) {
      return 0
    }

    return (cancelledDuringMonth / tenantsStartOfMonth) * 100
  }
}
