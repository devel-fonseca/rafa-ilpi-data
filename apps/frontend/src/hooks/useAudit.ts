import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

export interface AuditLog {
  id: number
  tenantId: string
  entityType: string
  entityId: string | null
  action: string
  userId: string
  userName: string
  details: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

/**
 * Hook para buscar atividades recentes
 */
export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: ['audit', 'recent', limit],
    queryFn: async () => {
      const response = await api.get<AuditLog[]>(`/audit/recent?limit=${limit}`)
      return response.data
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  })
}

/**
 * Hook para buscar logs de auditoria com filtros
 */
export function useAuditLogs(filters?: {
  entityType?: string
  userId?: string
  action?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}) {
  const queryParams = new URLSearchParams()

  if (filters?.entityType) queryParams.append('entityType', filters.entityType)
  if (filters?.userId) queryParams.append('userId', filters.userId)
  if (filters?.action) queryParams.append('action', filters.action)
  if (filters?.startDate) queryParams.append('startDate', filters.startDate)
  if (filters?.endDate) queryParams.append('endDate', filters.endDate)
  if (filters?.page) queryParams.append('page', String(filters.page))
  if (filters?.limit) queryParams.append('limit', String(filters.limit))

  return useQuery({
    queryKey: ['audit', 'logs', filters],
    queryFn: async () => {
      const response = await api.get<AuditLog[]>(`/audit/logs?${queryParams.toString()}`)
      return response.data
    },
  })
}

/**
 * Hook para buscar estatísticas de auditoria
 */
export function useAuditStats(startDate?: string, endDate?: string) {
  const queryParams = new URLSearchParams()

  if (startDate) queryParams.append('startDate', startDate)
  if (endDate) queryParams.append('endDate', endDate)

  return useQuery({
    queryKey: ['audit', 'stats', startDate, endDate],
    queryFn: async () => {
      const response = await api.get(`/audit/stats?${queryParams.toString()}`)
      return response.data
    },
  })
}
