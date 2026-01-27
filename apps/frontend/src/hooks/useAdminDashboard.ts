import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'

// ============================================================================
// TYPES
// ============================================================================

export interface MonthlyResidentCount {
  month: string // 'YYYY-MM'
  count: number
}

export interface ResidentsGrowthData {
  data: MonthlyResidentCount[]
}

export interface DailyMedicationStats {
  day: string // 'YYYY-MM-DD'
  scheduled: number
  administered: number
}

export interface MedicationsHistoryData {
  data: DailyMedicationStats[]
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook para buscar dados de crescimento de residentes (últimos 6 meses)
 * Usado no gráfico de área do AdminDashboard
 */
export function useResidentsGrowth() {
  return useQuery<ResidentsGrowthData>({
    queryKey: tenantKey('admin-residents-growth'),
    queryFn: async () => {
      const response = await api.get('/admin-dashboard/residents-growth')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - dados mudam lentamente
    refetchInterval: 10 * 60 * 1000, // Atualiza a cada 10 minutos
  })
}

/**
 * Hook para buscar histórico de medicações (últimos 7 dias)
 * Usado no gráfico de barras do AdminDashboard
 */
export function useMedicationsHistory() {
  return useQuery<MedicationsHistoryData>({
    queryKey: tenantKey('admin-medications-history'),
    queryFn: async () => {
      const response = await api.get('/admin-dashboard/medications-history')
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
  })
}
