import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

export interface AccessLog {
  id: string
  action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGED' | 'SESSION_REVOKED' | 'FORCE_PASSWORD_CHANGE'
  status: string
  reason?: string
  ipAddress: string
  device?: string
  createdAt: string
}

export interface AccessLogsResponse {
  logs: AccessLog[]
  total: number
  hasMore: boolean
}

export interface AccessLogsParams {
  limit?: number
  offset?: number
  action?: string
}

// Query keys
export const accessLogKeys = {
  all: ['access-logs'] as const,
  user: (userId: string) => [...accessLogKeys.all, userId] as const,
  userWithParams: (userId: string, params: AccessLogsParams) =>
    [...accessLogKeys.user(userId), params] as const,
}

/**
 * Hook para buscar logs de acesso do usuário com paginação
 */
export function useAccessLogs(
  userId: string,
  params: AccessLogsParams = {}
) {
  const { limit = 30, offset = 0, action } = params

  return useQuery({
    queryKey: accessLogKeys.userWithParams(userId, { limit, offset, action }),
    queryFn: async (): Promise<AccessLogsResponse> => {
      const queryParams = new URLSearchParams()
      queryParams.append('limit', limit.toString())
      queryParams.append('offset', offset.toString())
      if (action) {
        queryParams.append('action', action)
      }

      const { data } = await api.get(
        `/users/${userId}/access-logs?${queryParams.toString()}`
      )
      return data
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minuto
  })
}
