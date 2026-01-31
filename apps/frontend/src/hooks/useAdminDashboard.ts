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

export interface DailyRecordStats {
  day: string // 'YYYY-MM-DD'
  expected: number
  completed: number
}

export interface MandatoryRecordsHistoryData {
  data: DailyRecordStats[]
}

export interface MonthlyOccupancy {
  month: string // 'YYYY-MM'
  residents: number
  capacity: number
  occupancyRate: number | null
}

export interface OccupancyRateData {
  data: MonthlyOccupancy[]
  hasBedsConfigured: boolean
  capacityDeclared: number | null
  capacityLicensed: number | null
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
    refetchOnWindowFocus: false,
    refetchInterval: 10 * 60 * 1000, // Atualiza a cada 10 minutos
    refetchIntervalInBackground: false,
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
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
    refetchIntervalInBackground: false,
  })
}

/**
 * Hook para buscar histórico de registros obrigatórios (últimos 7 dias)
 * Usado no gráfico de barras do AdminDashboard
 */
export function useMandatoryRecordsHistory() {
  return useQuery<MandatoryRecordsHistoryData>({
    queryKey: tenantKey('admin-mandatory-records-history'),
    queryFn: async () => {
      const response = await api.get('/admin-dashboard/mandatory-records-history')
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
    refetchIntervalInBackground: false,
  })
}

/**
 * Hook para buscar taxa de ocupação (últimos 6 meses)
 * Usado no gráfico de área do AdminDashboard
 */
export function useOccupancyRate() {
  return useQuery<OccupancyRateData>({
    queryKey: tenantKey('admin-occupancy-rate'),
    queryFn: async () => {
      const response = await api.get('/admin-dashboard/occupancy-rate')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - dados mudam lentamente
    refetchOnWindowFocus: false,
    refetchInterval: 10 * 60 * 1000, // Atualiza a cada 10 minutos
    refetchIntervalInBackground: false,
  })
}
