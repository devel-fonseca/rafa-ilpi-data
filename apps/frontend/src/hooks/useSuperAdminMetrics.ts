import { useQuery } from '@tanstack/react-query'
import {
  getOverviewMetrics,
  getRevenueMetrics,
  getTenantMetrics,
  getTrends,
  type OverviewMetrics,
  type RevenueMetrics,
  type TenantMetrics,
  type TrendsResponse,
} from '@/api/superadmin.api'

/**
 * Hooks React Query para métricas do SuperAdmin
 *
 * Configuração:
 * - refetchInterval: 5 minutos (métricas não mudam com frequência)
 * - staleTime: 5 minutos (considerar dados frescos por 5min)
 */

const FIVE_MINUTES = 5 * 60 * 1000

/**
 * Hook para buscar visão geral das métricas
 */
export function useOverviewMetrics() {
  return useQuery<OverviewMetrics>({
    queryKey: ['superadmin', 'metrics', 'overview'],
    queryFn: getOverviewMetrics,
    refetchInterval: FIVE_MINUTES,
    staleTime: FIVE_MINUTES,
  })
}

/**
 * Hook para buscar métricas de receita
 */
export function useRevenueMetrics() {
  return useQuery<RevenueMetrics>({
    queryKey: ['superadmin', 'metrics', 'revenue'],
    queryFn: getRevenueMetrics,
    refetchInterval: FIVE_MINUTES,
    staleTime: FIVE_MINUTES,
  })
}

/**
 * Hook para buscar métricas de tenants
 */
export function useTenantMetrics() {
  return useQuery<TenantMetrics>({
    queryKey: ['superadmin', 'metrics', 'tenants'],
    queryFn: getTenantMetrics,
    refetchInterval: FIVE_MINUTES,
    staleTime: FIVE_MINUTES,
  })
}

/**
 * Hook para buscar tendências de MRR
 * @param months - Número de meses (padrão: 12)
 */
export function useTrendsMetrics(months: number = 12) {
  return useQuery<TrendsResponse>({
    queryKey: ['superadmin', 'metrics', 'trends', months],
    queryFn: () => getTrends(months),
    refetchInterval: FIVE_MINUTES,
    staleTime: FIVE_MINUTES,
  })
}
