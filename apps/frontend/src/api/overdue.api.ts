import { api } from '@/services/api'
import { extractDateOnly } from '@/utils/dateHelpers'

/**
 * Overdue/Inadimplência API Client
 *
 * Client para comunicação com endpoints de análise de inadimplência.
 * Requer autenticação com role SUPERADMIN.
 */

// ============================================
// TYPES
// ============================================

/**
 * Métricas consolidadas de inadimplência
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
 * Tenant inadimplente
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
    dueDate: Date | string
    daysOverdue: number
  }>
}

/**
 * Tendência temporal de inadimplência
 */
export interface OverdueTrend {
  month: string // formato: "2024-12"
  overdueInvoices: number
  overdueAmount: number
  overdueRate: number
}

/**
 * Filtros para métricas de overdue
 */
export interface OverdueFilters {
  startDate?: string // YYYY-MM-DD (data civil)
  endDate?: string // YYYY-MM-DD (data civil)
}

/**
 * Opções para lista de tenants inadimplentes
 */
export interface OverdueTenantsOptions {
  limit?: number
  sortBy?: 'amount' | 'days' | 'count'
}

/**
 * Opções para tendências
 */
export interface OverdueTrendsOptions {
  months?: number
}

// ============================================
// API METHODS
// ============================================

/**
 * Busca métricas consolidadas de inadimplência
 * Endpoint: GET /superadmin/analytics/overdue/summary
 */
export const getOverdueSummary = async (filters?: OverdueFilters): Promise<OverdueMetrics> => {
  const params = new URLSearchParams()

  if (filters?.startDate) {
    params.append('startDate', extractDateOnly(filters.startDate))
  }

  if (filters?.endDate) {
    params.append('endDate', extractDateOnly(filters.endDate))
  }

  const queryString = params.toString()
  const url = `/superadmin/analytics/overdue/summary${queryString ? `?${queryString}` : ''}`

  const response = await api.get<OverdueMetrics>(url)
  return response.data
}

/**
 * Busca lista de tenants inadimplentes
 * Endpoint: GET /superadmin/analytics/overdue/tenants
 */
export const getOverdueTenants = async (
  options?: OverdueTenantsOptions,
): Promise<OverdueTenant[]> => {
  const params = new URLSearchParams()

  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.sortBy) params.append('sortBy', options.sortBy)

  const queryString = params.toString()
  const url = `/superadmin/analytics/overdue/tenants${queryString ? `?${queryString}` : ''}`

  const response = await api.get<OverdueTenant[]>(url)
  return response.data
}

/**
 * Busca tendências temporais de inadimplência
 * Endpoint: GET /superadmin/analytics/overdue/trends
 */
export const getOverdueTrends = async (
  options?: OverdueTrendsOptions,
): Promise<OverdueTrend[]> => {
  const params = new URLSearchParams()

  if (options?.months) params.append('months', options.months.toString())

  const queryString = params.toString()
  const url = `/superadmin/analytics/overdue/trends${queryString ? `?${queryString}` : ''}`

  const response = await api.get<OverdueTrend[]>(url)
  return response.data
}
