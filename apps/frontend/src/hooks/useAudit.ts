import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { QUERY_KEYS } from '@/constants/queryKeys'

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
 *
 * ✅ NOVO PADRÃO: Sem polling! Usa invalidação inteligente.
 * Queries são invalidadas automaticamente quando:
 * - Criar/editar/deletar qualquer registro
 * - Helpers invalidateGlobalQueries() cuidam disso
 */
export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: QUERY_KEYS.audit.recent(limit),
    queryFn: async () => {
      const response = await api.get<AuditLog[]>(`/audit/recent?limit=${limit}`)
      return response.data
    },
    // ✅ Removido refetchInterval - invalidação via mutations é mais eficiente
    staleTime: 5 * 60 * 1000, // 5 minutos - dados ficam frescos
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
    queryKey: QUERY_KEYS.audit.logs(filters),
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
    queryKey: QUERY_KEYS.audit.stats(startDate, endDate),
    queryFn: async () => {
      const response = await api.get(`/audit/stats?${queryParams.toString()}`)
      return response.data
    },
  })
}
