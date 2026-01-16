import { useQuery } from '@tanstack/react-query'
import { bedsAPI } from '../api/beds.api'
import { tenantKey } from '@/lib/query-keys'

// Hook para buscar a hierarquia completa de leitos (mapa)
export function useBedsHierarchy() {
  return useQuery({
    queryKey: tenantKey('beds-hierarchy'),
    queryFn: () => bedsAPI.getBedsHierarchy(),
    staleTime: 1000 * 60, // 1 minuto
  })
}
