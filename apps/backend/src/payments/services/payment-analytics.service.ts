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
   */
  async getMrrByPaymentMethod(): Promise<{
    total: number
    byMethod: Array<{ billingType: string; mrr: number; percentage: number }>
  }> {
    // Buscar invoices do mês atual que estão pagas
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.PAID,
        paidAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        payments: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    })

    // Calcular MRR total
    const totalMrr = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

    // Agrupar por billing type
    const mrrByMethod = new Map<string, number>()

    invoices.forEach((invoice) => {
      const billingType = invoice.payments[0]?.method || 'UNDEFINED'
      const current = mrrByMethod.get(billingType) || 0
      mrrByMethod.set(billingType, current + Number(invoice.amount))
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
}
