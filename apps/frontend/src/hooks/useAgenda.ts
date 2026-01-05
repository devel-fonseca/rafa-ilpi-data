import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { AgendaItem, ContentFilterType, InstitutionalEvent, ViewType, StatusFilterType } from '@/types/agenda'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { useMemo } from 'react'

interface GetAgendaItemsParams {
  viewType: ViewType
  selectedDate: Date
  residentId?: string | null
  filters?: ContentFilterType[]
  statusFilter?: StatusFilterType
}

/**
 * Busca itens da agenda (medicamentos + eventos + registros) consolidados
 * Para scopes: general e resident
 *
 * Suporta 3 modos baseados no viewType:
 * - 'daily': busca apenas o dia selecionado (single date query)
 * - 'weekly': busca a semana inteira (range query)
 * - 'monthly': busca o mês inteiro (range query)
 */
export function useAgendaItems({ viewType, selectedDate, residentId, filters, statusFilter }: GetAgendaItemsParams) {
  // Calcular intervalo baseado no viewType
  const dateRange = useMemo(() => {
    if (viewType === 'daily') {
      return {
        mode: 'single' as const,
        date: format(selectedDate, 'yyyy-MM-dd'),
      }
    } else if (viewType === 'weekly') {
      return {
        mode: 'range' as const,
        startDate: format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      }
    } else if (viewType === 'monthly') {
      return {
        mode: 'range' as const,
        startDate: format(startOfMonth(selectedDate), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(selectedDate), 'yyyy-MM-dd'),
      }
    }
    // Fallback para daily
    return {
      mode: 'single' as const,
      date: format(selectedDate, 'yyyy-MM-dd'),
    }
  }, [viewType, selectedDate])

  return useQuery({
    queryKey: [
      'agenda-items',
      viewType,
      dateRange.mode === 'single' ? dateRange.date : `${dateRange.startDate}-${dateRange.endDate}`,
      residentId,
      filters,
      statusFilter,
    ],
    queryFn: async () => {
      const params: Record<string, string> = {}

      if (dateRange.mode === 'single') {
        params.date = dateRange.date
      } else {
        params.startDate = dateRange.startDate
        params.endDate = dateRange.endDate
      }

      if (residentId) {
        params.residentId = residentId
      }

      if (filters && filters.length > 0) {
        params.filters = filters.join(',')
      }

      if (statusFilter && statusFilter !== 'all') {
        params.statusFilter = statusFilter
      }

      const response = await api.get<AgendaItem[]>('/resident-schedule/agenda/items', {
        params,
      })

      return response.data
    },
    staleTime: 1000 * 60, // 1 minuto
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

interface GetInstitutionalEventsParams {
  viewType: ViewType
  selectedDate: Date
}

/**
 * Busca eventos institucionais (vencimentos, treinamentos, reuniões, etc.)
 * Para scope: institutional
 *
 * Suporta 3 modos baseados no viewType:
 * - 'daily': busca apenas o dia selecionado (single date query)
 * - 'weekly': busca a semana inteira (range query)
 * - 'monthly': busca o mês inteiro (range query)
 */
export function useInstitutionalEvents({ viewType, selectedDate }: GetInstitutionalEventsParams) {
  // Calcular intervalo baseado no viewType (reutilizar mesma lógica)
  const dateRange = useMemo(() => {
    if (viewType === 'daily') {
      return {
        mode: 'single' as const,
        date: format(selectedDate, 'yyyy-MM-dd'),
      }
    } else if (viewType === 'weekly') {
      return {
        mode: 'range' as const,
        startDate: format(startOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        endDate: format(endOfWeek(selectedDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      }
    } else if (viewType === 'monthly') {
      return {
        mode: 'range' as const,
        startDate: format(startOfMonth(selectedDate), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(selectedDate), 'yyyy-MM-dd'),
      }
    }
    // Fallback para daily
    return {
      mode: 'single' as const,
      date: format(selectedDate, 'yyyy-MM-dd'),
    }
  }, [viewType, selectedDate])

  return useQuery({
    queryKey: [
      'institutional-events',
      viewType,
      dateRange.mode === 'single' ? dateRange.date : `${dateRange.startDate}-${dateRange.endDate}`,
    ],
    queryFn: async () => {
      const params: Record<string, string> = {}

      if (dateRange.mode === 'single') {
        params.date = dateRange.date
      } else {
        params.startDate = dateRange.startDate
        params.endDate = dateRange.endDate
      }

      const response = await api.get<AgendaItem[]>(
        '/resident-schedule/agenda/institutional-events',
        { params },
      )

      return response.data
    },
    staleTime: 1000 * 60, // 1 minuto
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

/**
 * Mutations para eventos institucionais (CRUD)
 */
export function useInstitutionalEventMutations() {
  const queryClient = useQueryClient()

  const createEvent = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post<InstitutionalEvent>('/institutional-events', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutional-events'] })
      toast.success('Evento criado com sucesso!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao criar evento'
      toast.error(message)
    },
  })

  const updateEvent = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch<InstitutionalEvent>(`/institutional-events/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutional-events'] })
      toast.success('Evento atualizado com sucesso!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao atualizar evento'
      toast.error(message)
    },
  })

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/institutional-events/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutional-events'] })
      toast.success('Evento removido com sucesso!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao remover evento'
      toast.error(message)
    },
  })

  const markComplete = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<InstitutionalEvent>(`/institutional-events/${id}/complete`, {})
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutional-events'] })
      toast.success('Evento marcado como concluído!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao marcar evento como concluído'
      toast.error(message)
    },
  })

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    markComplete,
  }
}
