import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

export interface LatestRecord {
  residentId: string
  type: string
  date: string
  time: string
  createdAt: string
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
