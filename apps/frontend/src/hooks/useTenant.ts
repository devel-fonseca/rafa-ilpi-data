import { useQuery } from '@tanstack/react-query'
import { getCurrentTenant, getMySubscription } from '@/api/tenants.api'

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

/**
 * Hook para buscar subscription ativa do tenant com contagens de uso
 */
export const useMySubscription = () => {
  return useQuery({
    queryKey: ['tenant', 'subscription'],
    queryFn: getMySubscription,
    staleTime: 2 * 60 * 1000, // 2 minutos (uso pode mudar com mais frequência)
  })
}
