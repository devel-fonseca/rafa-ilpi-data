import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import type { DailyTask } from './useResidentSchedule'
import type { InstitutionalEvent } from '@/types/agenda'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Hook universal para buscar TODOS os eventos do dia
 *
 * Consolida:
 * 1. Eventos de residentes (consultas, vacinas, procedimentos, etc.)
 * 2. Eventos institucionais (vencimentos, treinamentos, reuniões, etc.)
 *
 * Filtra eventos institucionais por visibilidade baseado no cargo do usuário:
 * - ADMIN_ONLY: Apenas ADMINISTRATOR
 * - RT_ONLY: ADMINISTRATOR + TECHNICAL_MANAGER
 * - ALL_USERS: Todos os usuários
 */
export function useDailyEvents(date: string) {
  const { user } = useAuthStore()
  const userPosition = user?.profile?.positionCode

  return useQuery({
    queryKey: tenantKey('daily-events', date, userPosition || 'unknown'),
    enabled: !!user, // Aguardar usuário estar carregado
    queryFn: async () => {
      console.log('🔄 [useDailyEvents] Fetching events for:', date, 'Position:', userPosition)

      // ────────────────────────────────────────────────────────────────
      // 1. Buscar eventos de residentes
      // ────────────────────────────────────────────────────────────────
      const residentEventsResponse = await api.get<DailyTask[]>(
        '/resident-schedule/tasks/daily',
        { params: { date } },
      )
      const residentEvents = residentEventsResponse.data.filter(
        (task) => task.type === 'EVENT'
      )
      console.log('📅 [useDailyEvents] Resident events:', residentEvents.length)

      // ────────────────────────────────────────────────────────────────
      // 2. Buscar eventos institucionais
      // ────────────────────────────────────────────────────────────────
      const institutionalEventsResponse = await api.get<InstitutionalEvent[]>(
        '/institutional-events',
        { params: { startDate: date, endDate: date } }, // API espera startDate/endDate
      )
      console.log('🏢 [useDailyEvents] Institutional events (raw):', institutionalEventsResponse.data.length)

      // ────────────────────────────────────────────────────────────────
      // 3. Filtrar eventos institucionais por visibilidade
      // ────────────────────────────────────────────────────────────────
      const filteredInstitutionalEvents = institutionalEventsResponse.data.filter((event) => {
        // ALL_USERS: Todos veem
        if (event.visibility === 'ALL_USERS') return true

        // RT_ONLY: Apenas RT e ADMIN
        if (event.visibility === 'RT_ONLY') {
          return userPosition === 'TECHNICAL_MANAGER' || userPosition === 'ADMINISTRATOR'
        }

        // ADMIN_ONLY: Apenas ADMIN
        if (event.visibility === 'ADMIN_ONLY') {
          return userPosition === 'ADMINISTRATOR'
        }

        return false
      })
      console.log('🏢 [useDailyEvents] Institutional events (filtered by visibility):', filteredInstitutionalEvents.length)

      // ────────────────────────────────────────────────────────────────
      // 4. Transformar eventos institucionais para formato DailyTask
      // ────────────────────────────────────────────────────────────────
      const institutionalEventsAsTasks: DailyTask[] = filteredInstitutionalEvents.map((event) => ({
        type: 'EVENT' as const,
        residentId: '', // Eventos institucionais não têm residentId
        residentName: 'Institucional',
        eventId: event.id,
        eventType: event.eventType,
        scheduledTime: event.scheduledTime || '00:00',
        title: event.title,
        description: event.description,
        status: (() => {
          const normalizedStatus = String(event.status || '').toUpperCase()
          if (normalizedStatus === 'COMPLETED') return 'COMPLETED'
          if (normalizedStatus === 'CANCELED' || normalizedStatus === 'CANCELLED') return 'CANCELLED'
          if (normalizedStatus === 'MISSED') return 'MISSED'
          return 'SCHEDULED'
        })(),
      }))

      // ────────────────────────────────────────────────────────────────
      // 5. Consolidar e ordenar por horário
      // ────────────────────────────────────────────────────────────────
      const allEvents = [...residentEvents, ...institutionalEventsAsTasks]
      allEvents.sort((a, b) => {
        const timeA = a.scheduledTime || '00:00'
        const timeB = b.scheduledTime || '00:00'
        return timeA.localeCompare(timeB)
      })

      console.log('✅ [useDailyEvents] Total consolidated events:', allEvents.length, {
        residents: residentEvents.length,
        institutional: institutionalEventsAsTasks.length,
      })

      return allEvents
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })
}
