import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { VitalSign } from '@/api/vitalSigns.api'

// Usar endpoint de Daily Records para obter sinais vitais
async function getLastVitalSignFromDailyRecords(residentId: string): Promise<VitalSign | null> {
  const response = await api.get<VitalSign | null>(
    `/daily-records/resident/${residentId}/last-vital-sign`
  )
  return response.data
}

/**
 * Hook para buscar o último sinal vital de um residente
 *
 * @param residentId - ID do residente
 * @returns Query com último sinal vital ou null
 */
export function useLastVitalSign(residentId: string | undefined) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<VitalSign | null>({
    queryKey: ['vital-signs', 'last', residentId],
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return getLastVitalSignFromDailyRecords(residentId)
    },
    enabled,
    staleTime: 1000 * 60, // 1 minuto (sinais vitais mudam com frequência)
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar sinais vitais de um residente por período
 *
 * @param residentId - ID do residente
 * @param startDate - Data inicial (opcional)
 * @param endDate - Data final (opcional)
 */
export function useVitalSignsByResident(
  residentId: string | undefined,
  startDate?: string,
  endDate?: string
) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<VitalSign[]>({
    queryKey: ['vital-signs', 'resident', residentId, startDate, endDate],
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return getVitalSignsByResident(residentId, startDate, endDate)
    },
    enabled,
    initialData: [],
    staleTime: 1000 * 60, // 1 minuto
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar estatísticas de sinais vitais
 *
 * @param residentId - ID do residente
 * @param days - Número de dias para análise (padrão: 30)
 */
export function useVitalSignsStatistics(
  residentId: string | undefined,
  days: number = 30
) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<VitalSignsStatistics>({
    queryKey: ['vital-signs', 'statistics', residentId, days],
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return getVitalSignsStatistics(residentId, days)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos (estatísticas mudam menos)
    refetchOnWindowFocus: false,
  })
}
