import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

export interface LatestRecord {
  residentId: string
  type: string
  date: string
  time: string
  createdAt: string
}

export interface DailyRecord {
  id: string
  residentId: string
  date: string
  shift: string
  type: string
  description?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/**
 * Hook para buscar o último registro de cada residente
 * Usado na tela de seleção de residentes
 */
export function useLatestRecordsByResidents() {
  return useQuery<LatestRecord[]>({
    queryKey: ['daily-records', 'latest-by-residents'],
    queryFn: async () => {
      const response = await api.get('/daily-records/latest/by-residents')
      return response.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar registros diários de um residente específico
 * @param residentId - ID do residente
 * @param date - Data específica (formato YYYY-MM-DD) - opcional
 */
export function useDailyRecordsByResident(residentId: string | undefined, date?: string) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<DailyRecord[]>({
    queryKey: ['daily-records', 'resident', residentId, date],
    queryFn: async () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }

      if (date) {
        // Buscar registros de uma data específica
        const response = await api.get(`/daily-records/resident/${residentId}/date/${date}`)
        return response.data
      } else {
        // Buscar todos os registros do residente
        const response = await api.get('/daily-records', {
          params: { residentId }
        })
        return response.data
      }
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnWindowFocus: true,
  })
}
