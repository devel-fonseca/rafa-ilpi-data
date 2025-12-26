import { api } from '@/services/api'

/**
 * Invoices API Client
 *
 * Client para comunicação com o backend de Invoices/Faturas.
 * Todas as requisições requerem autenticação com role SUPERADMIN.
 */

// ============================================
// TYPES
// ============================================

export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE'

export interface Invoice {
  id: string
  tenantId: string
  subscriptionId: string
  invoiceNumber: string
  amount: number
  originalAmount?: number
  discountPercent?: number
  discountReason?: string
  billingCycle?: string
  description?: string
  currency: string
  status: InvoiceStatus
  dueDate: string
  paidAt: string | null
  asaasInvoiceId: string | null
  paymentUrl: string | null
  createdAt: string
  updatedAt: string
  tenant: {
    id: string
    name: string
    email: string
  }
  subscription: {
    id: string
    plan: {
      id: string
      displayName: string
    }
  }
  payments: Payment[]
}

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  currency: string
  gateway: string
  gatewayId: string | null
  method: string
  status: string
  paidAt: string | null
  createdAt: string
}

export interface InvoiceFilters {
  tenantId?: string
  status?: InvoiceStatus
  limit?: number
  offset?: number
}

export interface CreateInvoiceData {
  tenantId: string
  subscriptionId: string
  amount: number
  description?: string
}

export interface InvoicesListResponse {
  data: Invoice[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

// ============================================
// API METHODS
// ============================================

/**
 * Lista invoices com filtros
 */
export const getInvoices = async (filters: InvoiceFilters = {}): Promise<InvoicesListResponse> => {
  const params = new URLSearchParams()
  if (filters.tenantId) params.append('tenantId', filters.tenantId)
  if (filters.status) params.append('status', filters.status)
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.offset) params.append('offset', filters.offset.toString())

  const response = await api.get<InvoicesListResponse>(
    `/superadmin/invoices?${params.toString()}`
  )
  return response.data
}

/**
 * Busca detalhes de uma invoice
 */
export const getInvoice = async (id: string): Promise<Invoice> => {
  const response = await api.get<Invoice>(`/superadmin/invoices/${id}`)
  return response.data
}

/**
 * Cria uma invoice manualmente
 */
export const createInvoice = async (invoiceData: CreateInvoiceData): Promise<Invoice> => {
  const response = await api.post<Invoice>('/superadmin/invoices', invoiceData)
  return response.data
}

/**
 * Sincroniza status da invoice com Asaas
 */
export const syncInvoice = async (id: string): Promise<Invoice> => {
  const response = await api.post<Invoice>(`/superadmin/invoices/${id}/sync`)
  return response.data
}

/**
 * Cancela uma invoice
 */
export const cancelInvoice = async (id: string): Promise<Invoice> => {
  const response = await api.delete<Invoice>(`/superadmin/invoices/${id}`)
  return response.data
}

/**
 * Busca todas as invoices de um tenant
 */
export const getTenantInvoices = async (tenantId: string): Promise<Invoice[]> => {
  const response = await api.get<Invoice[]>(`/superadmin/tenants/${tenantId}/invoices`)
  return response.data
}
