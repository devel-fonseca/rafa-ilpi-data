import { useQuery } from '@tanstack/react-query'
import { bedsAPI } from '../api/beds.api'

// Hook para buscar a hierarquia completa de leitos (mapa)
export function useBedsHierarchy() {
  return useQuery({
    queryKey: ['beds-hierarchy'],
    queryFn: () => bedsAPI.getBedsHierarchy(),
    staleTime: 1000 * 60, // 1 minuto
  })
}
