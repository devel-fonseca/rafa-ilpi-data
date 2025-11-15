import { useQuery } from '@tanstack/react-query'
import { getCurrentTenant } from '@/api/tenants.api'

/**
 * Hook para buscar os dados do tenant atual
 */
export const useTenant = () => {
  return useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: getCurrentTenant,
    staleTime: 5 * 60 * 1000, // 5 minutos (dados do tenant não mudam com frequência)
  })
}
