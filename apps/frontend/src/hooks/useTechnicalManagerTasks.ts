import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { getCurrentDate, extractDateOnly } from '@/utils/dateHelpers'
import type { DailyTask } from './useResidentSchedule'
import type { MedicationTask } from './useCaregiverTasks'
import { tenantKey } from '@/lib/query-keys'

// ──────────────────────────────────────────────────────────────────────────
// INTERFACES
// ──────────────────────────────────────────────────────────────────────────

export interface TechnicalManagerTasksStats {
  totalPending: number
  recordsPending: number
  medicationsPending: number
  eventsScheduled: number
}

export interface TechnicalManagerTasksSummary {
  recurringTasks: DailyTask[]
  scheduledEvents: DailyTask[]
  medications: MedicationTask[]
  stats: TechnicalManagerTasksStats
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
    scheduledTimes: string[]
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

// ──────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────

/**
 * Hook para buscar tarefas PENDENTES do dia para Responsável Técnico
 *
 * Diferença do useCaregiverTasks:
 * - Retorna APENAS tarefas pendentes (não completadas)
 * - Foco em supervisão, não em execução
 * - Estatísticas ajustadas para visão gerencial
 *
 * Busca:
 * 1. Tarefas obrigatórias recorrentes PENDENTES
 * 2. Agendamentos pontuais AGENDADOS
 * 3. Medicações NÃO ADMINISTRADAS
 */
export function useTechnicalManagerTasks(date?: string) {
  const today = date || getCurrentDate()

  return useQuery<TechnicalManagerTasksSummary>({
    queryKey: tenantKey('technical-manager-tasks', today),
    queryFn: async () => {
      console.log('🔄 [useTechnicalManagerTasks] Fetching pending tasks for:', today)

      // ────────────────────────────────────────────────────────────────
      // 1. Buscar tarefas obrigatórias + agendamentos pontuais
      // ────────────────────────────────────────────────────────────────
      const tasksResponse = await api.get<DailyTask[]>(
        '/resident-schedule/tasks/daily',
        { params: { date: today } },
      )
      const allTasks = tasksResponse.data

      // Separar por tipo E filtrar apenas pendentes
      const recurringTasks = allTasks.filter(
        (task) => task.type === 'RECURRING' && !task.isCompleted
      )

      const scheduledEvents = allTasks.filter(
        (task) => task.type === 'EVENT' && task.status === 'SCHEDULED'
      )

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

      // ────────────────────────────────────────────────────────────────
      // 3. Processar medicações: APENAS NÃO ADMINISTRADAS
      // ────────────────────────────────────────────────────────────────
      const medications: MedicationTask[] = []

      prescriptions.forEach((prescription) => {
        prescription.medications.forEach((medication) => {
          // Para cada horário programado
          medication.scheduledTimes.forEach((scheduledTime) => {
            // Verificar se existe administração para ESTE horário HOJE
            const todayAdmin = medication.administrations.find(
              (admin) =>
                extractDateOnly(admin.date) === today &&
                admin.scheduledTime === scheduledTime,
            )

            // APENAS adicionar se NÃO foi administrada
            if (!todayAdmin?.wasAdministered) {
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
                wasAdministered: false,
                prescriptionId: prescription.id,
                requiresDoubleCheck: medication.requiresDoubleCheck,
                scheduledTimes: medication.scheduledTimes,
              })
            }
          })
        })
      })

      // Ordenar medicações por horário
      medications.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

      // ────────────────────────────────────────────────────────────────
      // 4. Calcular estatísticas (apenas pendentes)
      // ────────────────────────────────────────────────────────────────
      const stats: TechnicalManagerTasksStats = {
        totalPending: recurringTasks.length + scheduledEvents.length + medications.length,
        recordsPending: recurringTasks.length,
        medicationsPending: medications.length,
        eventsScheduled: scheduledEvents.length,
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
