import { useQuery } from '@tanstack/react-query'
import {
  getFinancialMetrics,
  getMrrBreakdown,
  type FinancialMetricsFilters,
} from '@/api/analytics.api'

/**
 * Hook para buscar métricas financeiras consolidadas
 *
 * Retorna overview, breakdown por método e top performing method
 */
export function useFinancialMetrics(filters?: FinancialMetricsFilters) {
  return useQuery({
    queryKey: ['analytics', 'financial', filters],
    queryFn: () => getFinancialMetrics(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos (dados financeiros mudam menos)
  })
}

/**
 * Hook para buscar MRR breakdown por método de pagamento
 *
 * Retorna MRR total e divisão por PIX, Boleto, Cartão, etc
 */
export function useMrrBreakdown() {
  return useQuery({
    queryKey: ['analytics', 'mrr-breakdown'],
    queryFn: getMrrBreakdown,
    staleTime: 1000 * 60 * 10, // 10 minutos (MRR muda ainda menos)
  })
}
