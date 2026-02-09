import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'

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

interface DailyRecordsPaginatedResponse {
  data?: DailyRecord[]
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
}

const DAILY_RECORDS_PAGE_SIZE = 200

function normalizeDailyRecordsResponse(payload: unknown): DailyRecordsPaginatedResponse {
  if (Array.isArray(payload)) {
    return {
      data: payload as DailyRecord[],
      meta: {
        total: payload.length,
        page: 1,
        limit: payload.length,
        totalPages: 1,
      },
    }
  }

  const response = (payload || {}) as DailyRecordsPaginatedResponse
  return {
    data: Array.isArray(response.data) ? response.data : [],
    meta: {
      total: Number(response.meta?.total ?? 0),
      page: Number(response.meta?.page ?? 1),
      limit: Number(response.meta?.limit ?? DAILY_RECORDS_PAGE_SIZE),
      totalPages: Number(response.meta?.totalPages ?? 1),
    },
  }
}

/**
 * Hook para buscar o último registro de cada residente
 * Usado na tela de seleção de residentes
 */
export function useLatestRecordsByResidents() {
  return useQuery<LatestRecord[]>({
    queryKey: tenantKey('daily-records', 'latest-by-residents'),
    queryFn: async () => {
      const response = await api.get('/daily-records/latest/by-residents')
      return response.data
    },
    staleTime: 0, // Sempre considerar como stale para refetch imediato
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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
    queryKey: tenantKey('daily-records', 'resident', residentId, date),
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

/**
 * Hook para buscar todos os registros diários de hoje
 * Usado para contar o total de atividades do dia (não apenas últimos registros)
 */
export function useDailyRecordsByDate(date: string) {
  return useQuery<DailyRecord[]>({
    queryKey: tenantKey('daily-records', 'by-date', date),
    queryFn: async () => {
      const firstPageResponse = await api.get('/daily-records', {
        params: { date, page: '1', limit: String(DAILY_RECORDS_PAGE_SIZE) }
      })

      const firstPage = normalizeDailyRecordsResponse(firstPageResponse.data)
      const firstRecords = firstPage.data ?? []
      const totalPages = Math.max(1, Number(firstPage.meta?.totalPages ?? 1))

      if (totalPages <= 1) {
        return firstRecords
      }

      const remainingPageRequests = Array.from({ length: totalPages - 1 }, (_, index) =>
        api.get('/daily-records', {
          params: { date, page: String(index + 2), limit: String(DAILY_RECORDS_PAGE_SIZE) }
        })
      )

      const remainingResponses = await Promise.all(remainingPageRequests)
      const remainingRecords = remainingResponses.flatMap((response) => {
        const normalized = normalizeDailyRecordsResponse(response.data)
        return normalized.data ?? []
      })

      return [...firstRecords, ...remainingRecords]
    },
    staleTime: 0, // Sempre considerar como stale para refetch imediato
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}

/**
 * Hook para buscar somente o total de registros diários de uma data
 * Evita erro de contagem causado por paginação do endpoint.
 */
export function useDailyRecordsCountByDate(date: string) {
  return useQuery<number>({
    queryKey: tenantKey('daily-records', 'by-date-total', date),
    queryFn: async () => {
      const response = await api.get('/daily-records', {
        params: { date, page: '1', limit: '1' }
      })

      const normalized = normalizeDailyRecordsResponse(response.data)
      return Number(normalized.meta?.total ?? normalized.data?.length ?? 0)
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })
}
