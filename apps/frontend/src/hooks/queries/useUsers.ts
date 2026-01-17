import { useQuery } from '@tanstack/react-query'
import { listUsers } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'

// Query keys
export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...usersKeys.lists(), filters] as const,
  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
}

/**
 * Hook para listar todos os usuários do tenant
 */
export function useUsers() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: usersKeys.list(),
    queryFn: listUsers,
    enabled: !!user, // Só busca se tiver usuário logado
    staleTime: 1000 * 60, // 1 minuto
  })
}
