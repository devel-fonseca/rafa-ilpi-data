import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'

export interface ActiveSession {
  id: string
  device: string
  ipAddress: string
  loginAt: string
  lastActivityAt: string
  expiresAt: string
  isCurrent: boolean
}

export interface ActiveSessionsResponse {
  sessions: ActiveSession[]
}

// Query keys
export const sessionKeys = {
  all: ['active-sessions'] as const,
  user: (userId: string) => [...sessionKeys.all, userId] as const,
}

/**
 * Hook para buscar sessões ativas do usuário
 */
export function useActiveSessions(userId: string) {
  return useQuery({
    queryKey: sessionKeys.user(userId),
    queryFn: async (): Promise<ActiveSessionsResponse> => {
      const { data } = await api.get(`/users/${userId}/sessions`)
      return data
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 segundos
  })
}

/**
 * Hook para revogar sessão específica
 */
export function useRevokeSession(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.delete(`/users/${userId}/sessions/${sessionId}`)
      return data
    },
    onSuccess: () => {
      // Invalidar cache de sessões após revogar
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userId) })
    },
  })
}

/**
 * Hook para revogar todas as outras sessões
 */
export function useRevokeAllOtherSessions(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete(`/users/${userId}/sessions`)
      return data
    },
    onSuccess: () => {
      // Invalidar cache de sessões após revogar
      queryClient.invalidateQueries({ queryKey: sessionKeys.user(userId) })
    },
  })
}
