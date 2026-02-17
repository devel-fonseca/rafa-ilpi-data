import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'

export interface ConsolidatedVitalSigns {
  bloodPressure: {
    systolic: number
    diastolic: number
    timestamp: string
  } | null
  bloodGlucose: {
    value: number
    timestamp: string
  } | null
  temperature: {
    value: number
    timestamp: string
  } | null
  oxygenSaturation: {
    value: number
    timestamp: string
  } | null
  heartRate: {
    value: number
    timestamp: string
  } | null
}

export function useConsolidatedVitalSigns(residentId: string | undefined) {
  return useQuery<ConsolidatedVitalSigns | null>({
    queryKey: tenantKey('daily-records', 'resident', residentId, 'consolidated-vital-signs'),
    queryFn: async () => {
      const response = await api.get(`/daily-records/resident/${residentId}/consolidated-vital-signs`)
      return response.data || null
    },
    enabled: !!residentId,
    staleTime: 5 * 60 * 1000,
  })
}

