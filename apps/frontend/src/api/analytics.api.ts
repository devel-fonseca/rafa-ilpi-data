import { api } from '@/services/api'

/**
 * Analytics API Client
 *
 * Client para comunicação com endpoints de analytics financeiros.
 */

// ============================================
// TYPES
// ============================================

export interface PaymentMethodMetrics {
  billingType: string
  totalInvoices: number
  paidInvoices: number
  totalAmount: number
  paidAmount: number
  conversionRate: number // Percentual
  averageValue: number
}

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

export interface MrrByMethod {
  billingType: string
  mrr: number
  percentage: number
}

export interface MrrBreakdown {
  total: number
  byMethod: MrrByMethod[]
}

export interface FinancialMetricsFilters {
  startDate?: string // YYYY-MM-DD (data civil)
  endDate?: string // YYYY-MM-DD (data civil)
  tenantId?: string
}

// ============================================
// API METHODS
// ============================================

/**
 * Busca métricas financeiras consolidadas
 * Endpoint: GET /superadmin/analytics/financial
 */
export const getFinancialMetrics = async (
  filters?: FinancialMetricsFilters,
): Promise<FinancialMetrics> => {
  const params = new URLSearchParams()

  if (filters?.startDate) params.append('startDate', filters.startDate)
  if (filters?.endDate) params.append('endDate', filters.endDate)
  if (filters?.tenantId) params.append('tenantId', filters.tenantId)

  const response = await api.get<FinancialMetrics>(
    `/superadmin/analytics/financial?${params.toString()}`,
  )
  return response.data
}

/**
 * Busca breakdown de MRR por método de pagamento
 * Endpoint: GET /superadmin/analytics/mrr-breakdown
 */
export const getMrrBreakdown = async (): Promise<MrrBreakdown> => {
  const response = await api.get<MrrBreakdown>('/superadmin/analytics/mrr-breakdown')
  return response.data
}
