import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { User } from '@/stores/auth.store'
import {
  dismissVitalSignAlertIncident,
  confirmVitalSignAlertIncident,
  DecideVitalSignAlertIncidentDto,
  getVitalSignAlerts,
  getVitalSignAlert,
  getActiveAlertsByResident,
  getAlertStats,
  updateVitalSignAlert,
  prefillFromAlert,
  getAlertHistory,
  QueryVitalSignAlertsDto,
  UpdateVitalSignAlertDto,
} from '@/api/vitalSignAlerts.api'
import { tenantKey } from '@/lib/query-keys'

// ──────────────────────────────────────────────────────────────────────────────
// QUERY KEYS
// ──────────────────────────────────────────────────────────────────────────────

export const vitalSignAlertsKeys = {
  all: ['vital-sign-alerts'] as const,
  lists: () => [...vitalSignAlertsKeys.all, 'list'] as const,
  list: (filters?: QueryVitalSignAlertsDto) =>
    [...vitalSignAlertsKeys.lists(), filters] as const,
  details: () => [...vitalSignAlertsKeys.all, 'detail'] as const,
  detail: (id: string) => [...vitalSignAlertsKeys.details(), id] as const,
  byResident: (residentId: string) =>
    [...vitalSignAlertsKeys.all, 'resident', residentId] as const,
  stats: () => [...vitalSignAlertsKeys.all, 'stats'] as const,
  prefill: (alertId: string) =>
    [...vitalSignAlertsKeys.all, 'prefill', alertId] as const,
  history: (alertId: string) =>
    [...vitalSignAlertsKeys.all, 'history', alertId] as const,
}

// ──────────────────────────────────────────────────────────────────────────────
// HOOKS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Hook para listar alertas com filtros e paginação
 */
export function useVitalSignAlerts(filters?: QueryVitalSignAlertsDto) {
  return useQuery({
    queryKey: vitalSignAlertsKeys.list(filters),
    queryFn: () => getVitalSignAlerts(filters),
    staleTime: 30000, // 30 segundos
  })
}

/**
 * Hook para buscar um alerta específico
 */
export function useVitalSignAlert(id: string, enabled = true) {
  return useQuery({
    queryKey: vitalSignAlertsKeys.detail(id),
    queryFn: () => getVitalSignAlert(id),
    enabled: enabled && !!id,
    staleTime: 60000, // 1 minuto
  })
}

/**
 * Hook para buscar alertas ativos de um residente
 */
export function useActiveAlertsByResident(residentId: string, enabled = true) {
  return useQuery({
    queryKey: vitalSignAlertsKeys.byResident(residentId),
    queryFn: () => getActiveAlertsByResident(residentId),
    enabled: enabled && !!residentId,
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000, // Refetch a cada 1 minuto
  })
}

/**
 * Hook para buscar estatísticas de alertas
 */
export function useAlertStats() {
  return useQuery({
    queryKey: vitalSignAlertsKeys.stats(),
    queryFn: getAlertStats,
    staleTime: 60000, // 1 minuto
    refetchInterval: 120000, // Refetch a cada 2 minutos
  })
}

/**
 * Hook para atualizar um alerta
 */
export function useUpdateAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVitalSignAlertDto }) =>
      updateVitalSignAlert(id, data),
    onSuccess: (updatedAlert) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: vitalSignAlertsKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: vitalSignAlertsKeys.detail(updatedAlert.id),
      })
      queryClient.invalidateQueries({
        queryKey: vitalSignAlertsKeys.byResident(updatedAlert.residentId),
      })
      queryClient.invalidateQueries({
        queryKey: vitalSignAlertsKeys.stats(),
      })
      queryClient.invalidateQueries({
        queryKey: vitalSignAlertsKeys.history(updatedAlert.id),
      })

      toast.success('Alerta atualizado com sucesso')
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || 'Erro ao atualizar alerta'
      toast.error(message)
    },
  })
}

/**
 * Hook para confirmar intercorrência a partir de alerta de sinal vital
 */
export function useConfirmAlertIncident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: DecideVitalSignAlertIncidentDto }) =>
      confirmVitalSignAlertIncident(id, data),
    onSuccess: (result) => {
      const updatedAlert = result.alert

      queryClient.invalidateQueries({ queryKey: vitalSignAlertsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vitalSignAlertsKeys.detail(updatedAlert.id) })
      queryClient.invalidateQueries({
        queryKey: vitalSignAlertsKeys.byResident(updatedAlert.residentId),
      })
      queryClient.invalidateQueries({ queryKey: vitalSignAlertsKeys.stats() })
      queryClient.invalidateQueries({ queryKey: vitalSignAlertsKeys.history(updatedAlert.id) })

      queryClient.invalidateQueries({ queryKey: tenantKey('resident-incidents') })
      queryClient.invalidateQueries({ queryKey: tenantKey('resident-clinical-events') })
      queryClient.invalidateQueries({ queryKey: tenantKey('vital-signs', 'record-alerts') })
      queryClient.invalidateQueries({ queryKey: tenantKey('daily-records') })

      toast.success('Intercorrência confirmada com sucesso')
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Erro ao confirmar intercorrência'
      toast.error(message)
    },
  })
}

/**
 * Hook para descartar intercorrência a partir de alerta de sinal vital
 */
export function useDismissAlertIncident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: DecideVitalSignAlertIncidentDto }) =>
      dismissVitalSignAlertIncident(id, data),
    onSuccess: (result) => {
      const updatedAlert = result.alert

      queryClient.invalidateQueries({ queryKey: vitalSignAlertsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: vitalSignAlertsKeys.detail(updatedAlert.id) })
      queryClient.invalidateQueries({
        queryKey: vitalSignAlertsKeys.byResident(updatedAlert.residentId),
      })
      queryClient.invalidateQueries({ queryKey: vitalSignAlertsKeys.stats() })
      queryClient.invalidateQueries({ queryKey: vitalSignAlertsKeys.history(updatedAlert.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('resident-clinical-events') })
      queryClient.invalidateQueries({ queryKey: tenantKey('vital-signs', 'record-alerts') })

      toast.success('Intercorrência descartada para este alerta')
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Erro ao descartar intercorrência'
      toast.error(message)
    },
  })
}

/**
 * Hook para pré-preencher evolução a partir de alerta
 */
export function usePrefillFromAlert(alertId: string, enabled = false) {
  return useQuery({
    queryKey: vitalSignAlertsKeys.prefill(alertId),
    queryFn: () => prefillFromAlert(alertId),
    enabled: enabled && !!alertId,
    staleTime: Infinity, // Não refazer automaticamente
  })
}

/**
 * Hook para buscar histórico de alterações de um alerta
 */
export function useAlertHistory(alertId: string, enabled = true) {
  return useQuery({
    queryKey: vitalSignAlertsKeys.history(alertId),
    queryFn: () => getAlertHistory(alertId),
    enabled: enabled && !!alertId,
    staleTime: 30000, // 30 segundos
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Verifica se o usuário pode gerenciar alertas de sinais vitais
 *
 * Podem gerenciar:
 * - Médicos (DOCTOR)
 * - Enfermeiros (NURSE, NURSING_COORDINATOR)
 * - Responsável Técnico com COREN ou CRM (TECHNICAL_MANAGER)
 */
export function canManageVitalSignAlerts(user: User | null): boolean {
  if (!user) return false

  const medicalPositions = ['DOCTOR', 'NURSE', 'NURSING_COORDINATOR']

  // Se é um cargo médico/enfermagem direto
  if (medicalPositions.includes(user.profile?.positionCode)) {
    return true
  }

  // Se é RT, verificar se tem registro de saúde (COREN, CRM, etc)
  if (user.profile?.positionCode === 'TECHNICAL_MANAGER') {
    const hasHealthRegistration =
      user.profile?.registrationType === 'COREN' ||
      user.profile?.registrationType === 'CRM'
    return hasHealthRegistration
  }

  return false
}

/**
 * Decisão de intercorrência (confirmar/descartar) é exclusiva de Admin/RT.
 */
export function canDecideVitalAlertIncident(user: User | null): boolean {
  if (!user) return false
  const positionCode = user.profile?.positionCode
  return positionCode === 'ADMINISTRATOR' || positionCode === 'TECHNICAL_MANAGER'
}
