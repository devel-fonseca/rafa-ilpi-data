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

export interface ScheduledRecordsHistoryData {
  data: DailyRecordStats[]
}

// Backward compatibility alias
export type MandatoryRecordsHistoryData = ScheduledRecordsHistoryData

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

export interface AdminDashboardOverviewData {
  timezone: string
  generatedAt: string
  dailySummary: {
    activeResidents: number
    residentsWithSchedules: number
    medications: {
      scheduled: number
      administered: number
      total: number
    }
    scheduledRecords?: {
      expected: number
      completed: number
    }
    mandatoryRecords: {
      expected: number
      completed: number
    }
  }
  residentsGrowth: MonthlyResidentCount[]
  medicationsHistory: DailyMedicationStats[]
  scheduledRecordsHistory: DailyRecordStats[]
  occupancyRate: OccupancyRateData
  pendingActivities: Array<{
    id: string
    type: 'PRESCRIPTION_EXPIRING' | 'DAILY_RECORD_MISSING' | 'NOTIFICATION_UNREAD' | 'VITAL_SIGNS_DUE'
    title: string
    description: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    dueDate?: string
    relatedEntity?: {
      id: string
      name: string
    }
  }>
  recentActivities: Array<{
    id: string
    tenantId: string
    entityType: string
    entityId: string | null
    action: string
    userId: string
    userName: string
    details: Record<string, unknown>
    ipAddress: string | null
    userAgent: string | null
    createdAt: string
  }>
  footerStats: {
    totalResidents: number
    totalUsers: number
    totalRecordsToday: number
    totalPrescriptions: number
  }
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
 * Hook agregado do dashboard administrativo
 * Reduz múltiplas requisições paralelas para uma única chamada de overview.
 */
export function useAdminDashboardOverview() {
  return useQuery<AdminDashboardOverviewData>({
    queryKey: tenantKey('admin-dashboard-overview'),
    queryFn: async () => {
      const response = await api.get('/admin-dashboard/overview')
      return response.data
    },
    staleTime: 45 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 3 * 60 * 1000,
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
 * Hook para buscar histórico de registros programados (últimos 7 dias)
 * Usado no gráfico de barras do AdminDashboard
 */
export function useScheduledRecordsHistory() {
  return useQuery<ScheduledRecordsHistoryData>({
    queryKey: tenantKey('admin-scheduled-records-history'),
    queryFn: async () => {
      const response = await api.get('/admin-dashboard/scheduled-records-history')
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos
    refetchIntervalInBackground: false,
  })
}

/**
 * @deprecated Use useScheduledRecordsHistory
 */
export function useMandatoryRecordsHistory() {
  return useScheduledRecordsHistory()
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
