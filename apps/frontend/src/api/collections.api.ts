import { api } from '@/services/api'

/**
 * Collections API Client
 *
 * Client para comunicação com endpoints de cobrança e gestão de inadimplência.
 * Requer autenticação com role SUPERADMIN.
 */

// ============================================
// TYPES
// ============================================

/**
 * Dados para envio de lembrete
 */
export interface SendReminderData {
  invoiceId: string
}

/**
 * Dados para suspensão de tenant
 */
export interface SuspendTenantData {
  tenantId: string
  invoiceIds: string[]
  reason?: string
}

/**
 * Dados para renegociação de fatura
 */
export interface RenegotiateData {
  invoiceId: string
  discountPercent?: number // 0-100
  extensionDays?: number // >= 1
  reason?: string
}

/**
 * Resposta padrão das ações de cobrança
 */
export interface CollectionActionResponse {
  success: boolean
  message: string
  data: Record<string, unknown>
}

// ============================================
// API METHODS
// ============================================

/**
 * Envia lembrete de pagamento por email
 * Endpoint: POST /superadmin/collections/send-reminder
 */
export const sendReminder = async (data: SendReminderData): Promise<CollectionActionResponse> => {
  const response = await api.post<CollectionActionResponse>('/superadmin/collections/send-reminder', data)
  return response.data
}

/**
 * Suspende tenant por inadimplência
 * Endpoint: POST /superadmin/collections/suspend-tenant
 */
export const suspendTenant = async (data: SuspendTenantData): Promise<CollectionActionResponse> => {
  const response = await api.post<CollectionActionResponse>('/superadmin/collections/suspend-tenant', data)
  return response.data
}

/**
 * Renegocia fatura aplicando desconto e/ou extensão de prazo
 * Endpoint: POST /superadmin/collections/renegotiate
 */
export const renegotiateInvoice = async (data: RenegotiateData): Promise<CollectionActionResponse> => {
  const response = await api.post<CollectionActionResponse>('/superadmin/collections/renegotiate', data)
  return response.data
}
