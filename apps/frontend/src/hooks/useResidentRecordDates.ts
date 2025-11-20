import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

/**
 * Hook para buscar as datas que possuem registros diários para um residente
 * Usado para indicadores de preenchimento no calendário
 */
export function useResidentRecordDates(
  residentId: string | null | undefined,
  year: number,
  month: number,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ['resident-record-dates', residentId, year, month],
    queryFn: async () => {
      const response = await api.get(
        `/daily-records/resident/${residentId}/dates?year=${year}&month=${month}`,
      )
      return response.data as string[] // Array de datas em formato YYYY-MM-DD
    },
    enabled: !!residentId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}
