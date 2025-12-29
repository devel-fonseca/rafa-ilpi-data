import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { InvoiceStatus } from '@prisma/client'

/**
 * Interface para métricas de pagamento por método
 */
export interface PaymentMethodMetrics {
  billingType: string
  totalInvoices: number
  paidInvoices: number
  totalAmount: number
  paidAmount: number
  conversionRate: number // % de faturas pagas
  averageValue: number
}

/**
 * Interface para métricas financeiras consolidadas
 */
export interface FinancialMetrics {
  overview: {
    totalInvoices: number
    paidInvoices: number
    pendingInvoices: number
    overdueInvoices: number
    totalRevenue: number
    pendingRevenue: number
  }
  byPaymentMethod: PaymentMethodMetrics[]
  topPerformingMethod: {
    billingType: string
    conversionRate: number
  }
}

/**
 * Interface para métricas de inadimplência consolidadas
 */
export interface OverdueMetrics {
  totalOverdueInvoices: number
  totalOverdueAmount: number
  overdueRate: number // % de faturas em atraso
  averageDaysOverdue: number
  aging: {
    '0-30': { count: number; amount: number }
    '30-60': { count: number; amount: number }
    '60+': { count: number; amount: number }
  }
}

/**
 * Interface para tenants inadimplentes
 */
export interface OverdueTenant {
  tenantId: string
  tenantName: string
  tenantEmail: string
  planName: string
  overdueInvoices: number
  totalOverdueAmount: number
  maxDaysOverdue: number
  invoices: Array<{
    id: string
    invoiceNumber: string
    amount: number
    dueDate: Date
    daysOverdue: number
  }>
}

/**
 * Interface para tendências de inadimplência
 */
export interface OverdueTrend {
  month: string // formato: "2024-12"
  overdueInvoices: number
  overdueAmount: number
  overdueRate: number
}

/**
 * Service para analytics e relatórios financeiros
 */
@Injectable()
export class PaymentAnalyticsService {
  private readonly logger = new Logger(PaymentAnalyticsService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtém métricas financeiras consolidadas
   */
  async getFinancialMetrics(filters?: {
    startDate?: Date
    endDate?: Date
    tenantId?: string
  }): Promise<FinancialMetrics> {
    const { startDate, endDate, tenantId } = filters || {}

    // Construir filtro de data
    const dateFilter: any = {}
    if (startDate || endDate) {
      dateFilter.createdAt = {}
      if (startDate) dateFilter.createdAt.gte = startDate
      if (endDate) dateFilter.createdAt.lte = endDate
    }

    // Filtro de tenant
    const tenantFilter = tenantId ? { tenantId } : {}

    // Buscar todas as invoices com payments
    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...dateFilter,
        ...tenantFilter,
      },
      include: {
        payments: true,
      },
    })

    // Calcular overview
    const totalInvoices = invoices.length
    const paidInvoices = invoices.filter((inv) => inv.status === InvoiceStatus.PAID).length
    const pendingInvoices = invoices.filter((inv) => inv.status === InvoiceStatus.OPEN).length
    const overdueInvoices = invoices.filter(
      (inv) => inv.status === InvoiceStatus.OPEN && new Date(inv.dueDate) < new Date(),
    ).length

    const totalRevenue = invoices
      .filter((inv) => inv.status === InvoiceStatus.PAID)
      .reduce((sum, inv) => sum + Number(inv.amount), 0)

    const pendingRevenue = invoices
      .filter((inv) => inv.status === InvoiceStatus.OPEN)
      .reduce((sum, inv) => sum + Number(inv.amount), 0)

    // Calcular métricas por método de pagamento
    // Como não armazenamos billingType na invoice, vamos usar os payments
    const paymentsByMethod = new Map<string, PaymentMethodMetrics>()

    invoices.forEach((invoice) => {
      // Pegar método de pagamento do primeiro payment (se existir)
      const billingType = invoice.payments[0]?.method || 'UNDEFINED'

      if (!paymentsByMethod.has(billingType)) {
        paymentsByMethod.set(billingType, {
          billingType,
          totalInvoices: 0,
          paidInvoices: 0,
          totalAmount: 0,
          paidAmount: 0,
          conversionRate: 0,
          averageValue: 0,
        })
      }

      const metrics = paymentsByMethod.get(billingType)!
      metrics.totalInvoices++
      metrics.totalAmount += Number(invoice.amount)

      if (invoice.status === InvoiceStatus.PAID) {
        metrics.paidInvoices++
        metrics.paidAmount += Number(invoice.amount)
      }
    })

    // Calcular conversion rate e average value
    const byPaymentMethod = Array.from(paymentsByMethod.values()).map((metrics) => ({
      ...metrics,
      conversionRate: metrics.totalInvoices > 0
        ? (metrics.paidInvoices / metrics.totalInvoices) * 100
        : 0,
      averageValue: metrics.totalInvoices > 0
        ? metrics.totalAmount / metrics.totalInvoices
        : 0,
    }))

    // Encontrar método com melhor conversão
    const topPerformingMethod = byPaymentMethod.reduce(
      (best, current) => {
        return current.conversionRate > best.conversionRate ? current : best
      },
      { billingType: 'N/A', conversionRate: 0 },
    )

    return {
      overview: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalRevenue,
        pendingRevenue,
      },
      byPaymentMethod,
      topPerformingMethod: {
        billingType: topPerformingMethod.billingType,
        conversionRate: topPerformingMethod.conversionRate,
      },
    }
  }

  /**
   * Obtém MRR breakdown por método de pagamento
   *
   * MRR (Monthly Recurring Revenue) é calculado com base em:
   * - Subscriptions ATIVAS (não canceladas/trial/suspensas)
   * - Valor normalizado para mensal (planos anuais divididos por 12)
   * - Método de pagamento baseado na última fatura paga de cada subscription
   */
  async getMrrByPaymentMethod(): Promise<{
    total: number
    byMethod: Array<{ billingType: string; mrr: number; percentage: number }>
  }> {
    // Buscar todas as subscriptions ativas (incluindo TRIAL para MRR potencial)
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'active', 'TRIAL', 'trialing'], // Incluir trials no MRR
        },
      },
      include: {
        plan: true,
        invoices: {
          where: {
            status: InvoiceStatus.PAID,
          },
          include: {
            payments: true,
          },
          orderBy: {
            paidAt: 'desc',
          },
          take: 1, // Pegar apenas a última fatura paga
        },
      },
    })

    let totalMrr = 0
    const mrrByMethod = new Map<string, number>()

    activeSubscriptions.forEach((subscription) => {
      // Calcular valor mensal normalizado
      let monthlyValue = 0

      // Se tem customPrice, usar ele; senão usar o valor do plano
      const basePrice = subscription.customPrice
        ? Number(subscription.customPrice)
        : subscription.plan.price
        ? Number(subscription.plan.price)
        : 0

      // Aplicar desconto se houver
      const discount = subscription.discountPercent || 0
      const priceWithDiscount = basePrice * (1 - discount / 100)

      // Normalizar para mensal (se for anual, dividir por 12)
      if (subscription.billing_cycle === 'ANNUAL') {
        monthlyValue = priceWithDiscount / 12
      } else {
        monthlyValue = priceWithDiscount
      }

      totalMrr += monthlyValue

      // Determinar método de pagamento da última fatura paga
      const lastInvoice = subscription.invoices[0]
      const billingType = lastInvoice?.payments[0]?.method || 'UNDEFINED'

      const current = mrrByMethod.get(billingType) || 0
      mrrByMethod.set(billingType, current + monthlyValue)
    })

    const byMethod = Array.from(mrrByMethod.entries()).map(([billingType, mrr]) => ({
      billingType,
      mrr,
      percentage: totalMrr > 0 ? (mrr / totalMrr) * 100 : 0,
    }))

    return {
      total: totalMrr,
      byMethod,
    }
  }

  /**
   * Obtém métricas consolidadas de inadimplência
   */
  async getOverdueMetrics(filters?: {
    startDate?: Date
    endDate?: Date
  }): Promise<OverdueMetrics> {
    const { startDate, endDate } = filters || {}

    // Construir filtro de data
    const dateFilter: any = {}
    if (startDate || endDate) {
      dateFilter.createdAt = {}
      if (startDate) dateFilter.createdAt.gte = startDate
      if (endDate) dateFilter.createdAt.lte = endDate
    }

    // Buscar faturas vencidas
    const now = new Date()
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        ...dateFilter,
        status: InvoiceStatus.OPEN,
        dueDate: {
          lt: now,
        },
      },
    })

    // Buscar total de faturas para calcular taxa
    const totalInvoices = await this.prisma.invoice.count({
      where: {
        ...dateFilter,
        status: {
          in: [InvoiceStatus.OPEN, InvoiceStatus.PAID],
        },
      },
    })

    // Calcular métricas
    const totalOverdueInvoices = overdueInvoices.length
    const totalOverdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0,
    )

    // Calcular aging breakdown
    const aging = {
      '0-30': { count: 0, amount: 0 },
      '30-60': { count: 0, amount: 0 },
      '60+': { count: 0, amount: 0 },
    }

    let totalDaysOverdue = 0

    overdueInvoices.forEach((invoice) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
      )
      totalDaysOverdue += daysOverdue

      const amount = Number(invoice.amount)

      if (daysOverdue <= 30) {
        aging['0-30'].count++
        aging['0-30'].amount += amount
      } else if (daysOverdue <= 60) {
        aging['30-60'].count++
        aging['30-60'].amount += amount
      } else {
        aging['60+'].count++
        aging['60+'].amount += amount
      }
    })

    return {
      totalOverdueInvoices,
      totalOverdueAmount,
      overdueRate: totalInvoices > 0 ? (totalOverdueInvoices / totalInvoices) * 100 : 0,
      averageDaysOverdue: totalOverdueInvoices > 0 ? totalDaysOverdue / totalOverdueInvoices : 0,
      aging,
    }
  }

  /**
   * Obtém lista de tenants inadimplentes
   */
  async getOverdueTenants(options?: {
    limit?: number
    sortBy?: 'amount' | 'days' | 'count'
  }): Promise<OverdueTenant[]> {
    const { limit = 100, sortBy = 'amount' } = options || {}

    const now = new Date()

    // Buscar faturas vencidas com tenant e plano
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.OPEN,
        dueDate: {
          lt: now,
        },
      },
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
      orderBy: {
        dueDate: 'asc',
      },
    })

    // Agrupar por tenant
    const tenantMap = new Map<string, OverdueTenant>()

    overdueInvoices.forEach((invoice) => {
      const tenantId = invoice.tenantId
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
      )

      if (!tenantMap.has(tenantId)) {
        tenantMap.set(tenantId, {
          tenantId,
          tenantName: invoice.tenant.name,
          tenantEmail: invoice.tenant.email,
          planName: invoice.subscription.plan.displayName,
          overdueInvoices: 0,
          totalOverdueAmount: 0,
          maxDaysOverdue: 0,
          invoices: [],
        })
      }

      const tenantData = tenantMap.get(tenantId)!
      tenantData.overdueInvoices++
      tenantData.totalOverdueAmount += Number(invoice.amount)
      tenantData.maxDaysOverdue = Math.max(tenantData.maxDaysOverdue, daysOverdue)
      tenantData.invoices.push({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        dueDate: invoice.dueDate,
        daysOverdue,
      })
    })

    // Converter para array e ordenar
    const tenants = Array.from(tenantMap.values())

    if (sortBy === 'amount') {
      tenants.sort((a, b) => b.totalOverdueAmount - a.totalOverdueAmount)
    } else if (sortBy === 'days') {
      tenants.sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue)
    } else {
      tenants.sort((a, b) => b.overdueInvoices - a.overdueInvoices)
    }

    return tenants.slice(0, limit)
  }

  /**
   * Obtém evolução temporal de inadimplência
   *
   * Para cada mês nos últimos N meses, calcula:
   * - Quantas faturas estavam vencidas no final daquele mês
   * - Valor total em atraso
   * - Taxa de inadimplência (% de faturas abertas que estavam vencidas)
   */
  async getOverdueTrends(options?: { months?: number }): Promise<OverdueTrend[]> {
    const { months = 6 } = options || {}

    const trends: OverdueTrend[] = []
    const now = new Date()

    // Gerar dados para cada mês
    for (let i = months - 1; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59)

      // Buscar TODAS as faturas que existiam até o final daquele mês
      const allInvoices = await this.prisma.invoice.findMany({
        where: {
          createdAt: {
            lte: monthEnd,
          },
        },
      })

      // Separar faturas por status no final daquele mês
      // (uma fatura está vencida se: status=OPEN AND dueDate < monthEnd)
      const openInvoices = allInvoices.filter((inv) => {
        // Se foi paga DEPOIS do final do mês, considerar como aberta naquele mês
        if (inv.status === InvoiceStatus.PAID && inv.paidAt && new Date(inv.paidAt) > monthEnd) {
          return true
        }
        // Se está aberta E foi criada antes do final do mês
        return inv.status === InvoiceStatus.OPEN
      })

      // Faturas vencidas = abertas E com dueDate anterior ao final do mês
      const overdueInvoices = openInvoices.filter(
        (inv) => new Date(inv.dueDate) < monthEnd,
      )

      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

      trends.push({
        month: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
        overdueInvoices: overdueInvoices.length,
        overdueAmount,
        overdueRate: openInvoices.length > 0
          ? (overdueInvoices.length / openInvoices.length) * 100
          : 0,
      })
    }

    return trends
  }
}
