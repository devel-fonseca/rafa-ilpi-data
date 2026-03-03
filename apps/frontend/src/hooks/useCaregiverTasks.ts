import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { getCurrentDate, extractDateOnly } from '@/utils/dateHelpers'
import type { DailyTask } from './useResidentSchedule'
import { tenantKey } from '@/lib/query-keys'
import { useDailyEvents } from './useDailyEvents'
import { isMedicationScheduledForDate } from '@/utils/medicationSchedule'

// ──────────────────────────────────────────────────────────────────────────
// INTERFACES
// ──────────────────────────────────────────────────────────────────────────

export interface MedicationTask {
  residentId: string
  residentName: string
  medicationId: string
  medicationName: string
  presentation: string
  concentration: string
  dose: string
  route: string
  scheduledTime: string
  wasAdministered: boolean
  administeredBy?: string
  actualTime?: string
  prescriptionId: string
  requiresDoubleCheck?: boolean
  scheduledTimes?: string[] // Lista completa de horários programados
}

export interface CaregiverTasksStats {
  totalPending: number
  recordsPending: number
  medicationsCount: number
  eventsCount: number
}

export interface CaregiverTasksSummary {
  recurringTasks: DailyTask[]
  scheduledEvents: DailyTask[]
  medications: MedicationTask[]
  stats: CaregiverTasksStats
}

interface Prescription {
  id: string
  residentId: string
  resident: {
    id: string
    fullName: string
  }
  medications: Array<{
    id: string
    name: string
    presentation: string
    concentration: string
    dose: string
    route: string
    frequency: string
    scheduledTimes: string[]
    scheduledWeekDays?: number[]
    requiresDoubleCheck?: boolean
    administrations: Array<{
      id: string
      date: string
      scheduledTime: string
      wasAdministered: boolean
      administeredBy?: string
      actualTime?: string
    }>
  }>
}

interface ScheduledRecordsStatsResponse {
  date: string
  expected: number
  completed: number
  pending: number
  compliancePercentage: number
}

// ──────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────

/**
 * Hook para buscar todas as tarefas do dia para cuidadores
 *
 * Busca:
 * 1. Tarefas obrigatórias recorrentes (HIGIENE, ALIMENTACAO, etc)
 * 2. Agendamentos pontuais (consultas, vacinas, etc) + Eventos institucionais
 * 3. Medicações agendadas (horários programados)
 *
 * Retorna:
 * - Lista de tarefas separadas por tipo
 * - Estatísticas (contadores de pendentes)
 */
export function useCaregiverTasks(date?: string) {
  const today = date || getCurrentDate()

  // Buscar TODOS os eventos do dia (residentes + institucionais) via hook universal
  const { data: scheduledEvents = [] } = useDailyEvents(today)

  return useQuery<CaregiverTasksSummary>({
    queryKey: tenantKey('caregiver-tasks', today, scheduledEvents.length),
    queryFn: async () => {
      console.log('🔄 [useCaregiverTasks] Fetching tasks for:', today)
      // ────────────────────────────────────────────────────────────────
      // 1. Buscar tarefas obrigatórias recorrentes
      // ────────────────────────────────────────────────────────────────
      const tasksResponse = await api.get<DailyTask[]>(
        '/resident-schedule/tasks/daily',
        { params: { date: today } },
      )
      const allTasks = tasksResponse.data

      // Separar apenas tarefas recorrentes (eventos já vêm do useDailyEvents)
      const recurringTasks = allTasks.filter((task) => task.type === 'RECURRING')

      // ────────────────────────────────────────────────────────────────
      // 2. Buscar prescrições ativas (para medicações)
      // ────────────────────────────────────────────────────────────────
      const prescriptionsResponse = await api.get<{
        data: Prescription[]
        meta: { total: number; page: number; limit: number; totalPages: number }
      }>('/prescriptions', {
        params: {
          isActive: true,
          page: 1,
          limit: 1000, // Buscar todas
        },
      })

      const prescriptions = prescriptionsResponse.data.data

      const scheduledRecordsStatsResponse = await api.get<ScheduledRecordsStatsResponse>(
        '/resident-schedule/scheduled-records/stats',
        { params: { date: today } },
      )

      // ────────────────────────────────────────────────────────────────
      // 3. Processar medicações: verificar quais estão pendentes hoje
      // ────────────────────────────────────────────────────────────────
      const medications: MedicationTask[] = []

      prescriptions.forEach((prescription) => {
        prescription.medications.forEach((medication) => {
          if (!isMedicationScheduledForDate(medication.frequency, medication.scheduledWeekDays, today)) {
            return
          }

          // Para cada horário programado
          medication.scheduledTimes.forEach((scheduledTime) => {
            // Verificar se existe administração para ESTE horário HOJE
            const todayAdmin = medication.administrations.find(
              (admin) =>
                extractDateOnly(admin.date) === today &&
                admin.scheduledTime === scheduledTime,
            )

            medications.push({
              residentId: prescription.residentId,
              residentName: prescription.resident.fullName,
              medicationId: medication.id,
              medicationName: medication.name,
              presentation: medication.presentation,
              concentration: medication.concentration,
              dose: medication.dose,
              route: medication.route,
              scheduledTime,
              wasAdministered: todayAdmin?.wasAdministered || false,
              administeredBy: todayAdmin?.administeredBy,
              actualTime: todayAdmin?.actualTime,
              prescriptionId: prescription.id,
              requiresDoubleCheck: medication.requiresDoubleCheck,
              scheduledTimes: medication.scheduledTimes,
            })
          })
        })
      })

      // Ordenar medicações por horário
      medications.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

      // ────────────────────────────────────────────────────────────────
      // 4. Calcular estatísticas
      // ────────────────────────────────────────────────────────────────
      const recordsPending = scheduledRecordsStatsResponse.data.pending

      const eventsPending = scheduledEvents.filter(
        (event) => event.status === 'SCHEDULED',
      ).length

      // Contar apenas medicações PENDENTES (não administradas)
      const medicationsPending = medications.filter(
        (med) => !med.wasAdministered,
      ).length

      const stats: CaregiverTasksStats = {
        totalPending: recordsPending + eventsPending,
        recordsPending,
        medicationsCount: medicationsPending,
        eventsCount: scheduledEvents.length,
      }

      // ────────────────────────────────────────────────────────────────
      // 5. Retornar resumo completo
      // ────────────────────────────────────────────────────────────────
      return {
        recurringTasks,
        scheduledEvents,
        medications,
        stats,
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })
}
