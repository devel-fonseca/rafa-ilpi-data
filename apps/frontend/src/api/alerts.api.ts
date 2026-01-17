import { api } from '@/services/api'

/**
 * Alerts API Client
 *
 * Client para comunicação com endpoints de alertas do SuperAdmin.
 */

// ============================================
// TYPES
// ============================================

export type AlertType =
  | 'PAYMENT_FAILED'
  | 'SUBSCRIPTION_EXPIRING'
  | 'SUBSCRIPTION_CANCELLED'
  | 'USAGE_LIMIT_EXCEEDED'
  | 'TENANT_SUSPENDED'
  | 'SYSTEM_ERROR'

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  metadata?: Record<string, unknown>
  tenantId: string | null
  read: boolean
  readAt: string | null
  createdAt: string
  tenant?: {
    id: string
    name: string
    email: string
  }
}

export interface AlertsListResponse {
  data: Alert[]
  meta: {
    total: number
    offset: number
    limit: number
    hasMore: boolean
  }
}

export interface AlertFilters {
  read?: boolean
  type?: AlertType
  severity?: AlertSeverity
  tenantId?: string
  limit?: number
  offset?: number
}

// ============================================
// API METHODS
// ============================================

/**
 * Busca todos os alertas com filtros
 * Endpoint: GET /superadmin/alerts
 */
export const getAlerts = async (filters: AlertFilters = {}): Promise<AlertsListResponse> => {
  const params = new URLSearchParams()

  if (filters.read !== undefined) params.append('read', String(filters.read))
  if (filters.type) params.append('type', filters.type)
  if (filters.severity) params.append('severity', filters.severity)
  if (filters.tenantId) params.append('tenantId', filters.tenantId)
  if (filters.limit) params.append('limit', String(filters.limit))
  if (filters.offset) params.append('offset', String(filters.offset))

  const response = await api.get<AlertsListResponse>(`/superadmin/alerts?${params.toString()}`)
  return response.data
}

/**
 * Busca contagem de alertas não lidos
 * Endpoint: GET /superadmin/alerts/unread-count
 */
export const getUnreadCount = async (filters?: {
  type?: AlertType
  severity?: AlertSeverity
}): Promise<number> => {
  const params = new URLSearchParams()

  if (filters?.type) params.append('type', filters.type)
  if (filters?.severity) params.append('severity', filters.severity)

  const response = await api.get<{ count: number }>(
    `/superadmin/alerts/unread-count?${params.toString()}`,
  )
  return response.data.count
}

/**
 * Marca um alerta como lido
 * Endpoint: PATCH /superadmin/alerts/:id/read
 */
export const markAlertAsRead = async (id: string): Promise<Alert> => {
  const response = await api.patch<Alert>(`/superadmin/alerts/${id}/read`)
  return response.data
}

/**
 * Marca todos os alertas como lidos
 * Endpoint: POST /superadmin/alerts/mark-all-read
 */
export const markAllAlertsAsRead = async (): Promise<void> => {
  await api.post('/superadmin/alerts/mark-all-read')
}

/**
 * Deleta um alerta
 * Endpoint: DELETE /superadmin/alerts/:id
 */
export const deleteAlert = async (id: string): Promise<void> => {
  await api.delete(`/superadmin/alerts/${id}`)
}
