import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

/**
 * Hook para buscar as datas que possuem administrações de medicamentos para um residente
 * Usado para indicadores de preenchimento no calendário de medicações
 */
export function useResidentMedicationDates(
  residentId: string | null | undefined,
  year: number,
  month: number,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: ['resident-medication-dates', residentId, year, month],
    queryFn: async () => {
      const response = await api.get(
        `/prescriptions/medication-administrations/resident/${residentId}/dates?year=${year}&month=${month}`,
      )
      return response.data as string[] // Array de datas em formato YYYY-MM-DD
    },
    enabled: !!residentId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}
