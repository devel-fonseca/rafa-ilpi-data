import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  getOverdueSummary,
  getOverdueTenants,
  getOverdueTrends,
  type OverdueMetrics,
  type OverdueTenant,
  type OverdueTrend,
  type OverdueFilters,
  type OverdueTenantsOptions,
  type OverdueTrendsOptions,
} from '@/api/overdue.api'

/**
 * Hook para buscar métricas consolidadas de inadimplência
 */
export function useOverdueMetrics(
  filters?: OverdueFilters,
): UseQueryResult<OverdueMetrics, Error> {
  return useQuery({
    queryKey: ['overdue', 'summary', filters],
    queryFn: () => getOverdueSummary(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar lista de tenants inadimplentes
 */
export function useOverdueTenants(
  options?: OverdueTenantsOptions,
): UseQueryResult<OverdueTenant[], Error> {
  return useQuery({
    queryKey: ['overdue', 'tenants', options],
    queryFn: () => getOverdueTenants(options),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar tendências temporais de inadimplência
 */
export function useOverdueTrends(
  options?: OverdueTrendsOptions,
): UseQueryResult<OverdueTrend[], Error> {
  return useQuery({
    queryKey: ['overdue', 'trends', options],
    queryFn: () => getOverdueTrends(options),
    staleTime: 1000 * 60 * 10, // 10 minutos (dados históricos mudam menos)
  })
}
