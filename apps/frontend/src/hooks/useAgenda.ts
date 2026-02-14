import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { AgendaItem, AgendaItemType, ContentFilterType, InstitutionalEvent, ViewType, StatusFilterType } from '@/types/agenda'
import { CalendarSummaryResponse } from '@/types/calendar-summary'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'
import { useMemo } from 'react'
import { tenantKey } from '@/lib/query-keys'
import { invalidateAfterAgendaMutation } from '@/utils/queryInvalidation'

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
    queryKey: tenantKey(
      'agenda',
      'items',
      viewType,
      dateRange.mode === 'single' ? dateRange.date : `${dateRange.startDate}-${dateRange.endDate}`,
      residentId || 'all',
      JSON.stringify(filters || []),
      statusFilter || 'all'
    ),
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
 * Busca eventos institucionais
 * Para scope: institutional
 *
 * Suporta 3 modos baseados no viewType:
 * - 'daily': busca apenas o dia selecionado (single date query)
 * - 'weekly': busca a semana inteira (range query)
 * - 'monthly': busca o mês inteiro (range query)
 *
 * Retorna eventos institucionais (vencimentos, treinamentos, reuniões)
 */
export function useInstitutionalEvents({ viewType, selectedDate }: GetInstitutionalEventsParams) {
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
    queryKey: tenantKey(
      'agenda',
      'institutional-events',
      viewType,
      dateRange.mode === 'single' ? dateRange.date : `${dateRange.startDate}-${dateRange.endDate}`
    ),
    queryFn: async () => {
      const params: Record<string, string> = {}

      if (dateRange.mode === 'single') {
        params.date = dateRange.date
      } else {
        params.startDate = dateRange.startDate
        params.endDate = dateRange.endDate
      }

      const response = await api.get<InstitutionalEvent[]>('/institutional-events', { params })

      // Transformar InstitutionalEvent[] em AgendaItem[]
      const items: AgendaItem[] = response.data.map((event) => {
        // Mapear status do backend para o formato esperado
        const statusMap: Record<string, AgendaItem['status']> = {
          'COMPLETED': 'completed',
          'CANCELLED': 'canceled',
          'MISSED': 'missed',
          'completed': 'completed',
          'canceled': 'canceled',
          'missed': 'missed',
          'pending': 'pending',
        }

        return {
          id: event.id,
          type: AgendaItemType.SCHEDULED_EVENT,
          category: 'institutional',
          residentId: '',
          residentName: 'Institucional',
          title: event.title,
          description: event.description,
          scheduledDate: event.scheduledDate,
          scheduledTime: event.scheduledTime || '00:00',
          status: statusMap[event.status] || 'pending',
          completedAt: event.completedAt,
          metadata: {
            eventType: event.eventType,
            visibility: event.visibility,
            documentType: event.documentType,
            documentNumber: event.documentNumber,
            expiryDate: event.expiryDate,
            responsible: event.responsible,
            trainingTopic: event.trainingTopic,
            instructor: event.instructor,
            targetAudience: event.targetAudience,
            location: event.location,
          },
        }
      })

      return items.sort((a, b) => {
        const dateA = typeof a.scheduledDate === 'string' ? a.scheduledDate : a.scheduledDate.toISOString()
        const dateB = typeof b.scheduledDate === 'string' ? b.scheduledDate : b.scheduledDate.toISOString()
        const dateCompare = dateA.localeCompare(dateB)
        if (dateCompare !== 0) return dateCompare
        return (a.scheduledTime || '00:00').localeCompare(b.scheduledTime || '00:00')
      })
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
    mutationFn: async (data: Partial<InstitutionalEvent>) => {
      const response = await api.post<InstitutionalEvent>('/institutional-events', data)
      return response.data
    },
    onSuccess: () => {
      // ✅ Helper cuida de TUDO: agenda, audit, notifications
      invalidateAfterAgendaMutation(queryClient)
      toast.success('Evento criado com sucesso!')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast.error(errorMessage || 'Erro ao criar evento')
    },
  })

  const updateEvent = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InstitutionalEvent> }) => {
      const response = await api.patch<InstitutionalEvent>(`/institutional-events/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      // ✅ Helper cuida de TUDO: agenda, audit, notifications
      invalidateAfterAgendaMutation(queryClient)
      toast.success('Evento atualizado com sucesso!')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast.error(errorMessage || 'Erro ao atualizar evento')
    },
  })

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/institutional-events/${id}`)
    },
    onSuccess: () => {
      // ✅ Helper cuida de TUDO: agenda, audit, notifications
      invalidateAfterAgendaMutation(queryClient)
      toast.success('Evento removido com sucesso!')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast.error(errorMessage || 'Erro ao remover evento')
    },
  })

  const markComplete = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<InstitutionalEvent>(`/institutional-events/${id}/complete`, {})
      return response.data
    },
    onSuccess: () => {
      // ✅ Helper cuida de TUDO: agenda, audit, notifications
      invalidateAfterAgendaMutation(queryClient)
      toast.success('Evento marcado como concluído!')
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast.error(errorMessage || 'Erro ao marcar evento como concluído')
    },
  })

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    markComplete,
  }
}

/**
 * Busca sumário do calendário (otimizado para visualização mensal)
 *
 * Retorna apenas agregados por dia ao invés de itens completos
 * Isso reduz ~98% do payload e número de queries
 *
 * Estratégia:
 * - Use este hook para renderizar o calendário mensal
 * - Quando usuário clicar em um dia, use useAgendaItems com single date query
 */
export function useCalendarSummary({ selectedDate, residentId }: { selectedDate: Date; residentId?: string | null }) {
  const startDate = useMemo(() => format(startOfMonth(selectedDate), 'yyyy-MM-dd'), [selectedDate])
  const endDate = useMemo(() => format(endOfMonth(selectedDate), 'yyyy-MM-dd'), [selectedDate])

  return useQuery({
    queryKey: tenantKey(
      'agenda',
      'calendar-summary',
      `${startDate}-${endDate}`,
      residentId || 'all'
    ),
    queryFn: async () => {
      const params: Record<string, string> = {
        startDate,
        endDate,
      }

      if (residentId) {
        params.residentId = residentId
      }

      const response = await api.get<CalendarSummaryResponse>('/resident-schedule/agenda/calendar-summary', {
        params,
      })

      return response.data
    },
    staleTime: 1000 * 60, // 1 minuto
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  })
}
