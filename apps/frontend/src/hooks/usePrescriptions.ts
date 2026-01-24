import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  prescriptionsApi,
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  MedicalReviewPrescriptionDto,
  QueryPrescriptionParams,
  AdministerMedicationDto,
  AdministerSOSDto,
} from '../api/prescriptions.api'
import { useState } from 'react'
import { tenantKey } from '@/lib/query-keys'
import { QUERY_KEYS } from '@/constants/queryKeys'

// ========== CRUD HOOKS ==========

// Hook para listar prescrições
export function usePrescriptions(initialQuery?: QueryPrescriptionParams) {
  const [query, setQuery] = useState<QueryPrescriptionParams>(
    initialQuery || { page: 1, limit: 10 }
  )

  const result = useQuery({
    queryKey: tenantKey('prescriptions', 'list', JSON.stringify(query)),
    queryFn: () => prescriptionsApi.findAll(query),
    placeholderData: keepPreviousData,
  })

  return {
    ...result,
    query,
    setQuery,
    prescriptions: result.data?.data || [],
    meta: result.data?.meta,
  }
}

// Hook para buscar uma prescrição específica
export function usePrescription(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: tenantKey('prescriptions', id),
    queryFn: () => {
      if (!id) {
        throw new Error('ID is required')
      }
      return prescriptionsApi.findOne(id)
    },
    enabled: shouldFetch,
  })
}

// Hook para criar prescrição
export function useCreatePrescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePrescriptionDto) => prescriptionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('prescriptions') })
      queryClient.invalidateQueries({ queryKey: tenantKey('dashboard', 'stats') })
      queryClient.invalidateQueries({ queryKey: tenantKey('dashboard', 'critical-alerts') })
    },
  })
}

// Hook para atualizar prescrição
export function useUpdatePrescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePrescriptionDto }) =>
      prescriptionsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('prescriptions') })
      queryClient.invalidateQueries({ queryKey: tenantKey('prescriptions', variables.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('dashboard', 'stats') })
    },
  })
}

// Hook para registrar revisão médica
export function useRecordMedicalReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MedicalReviewPrescriptionDto }) =>
      prescriptionsApi.recordMedicalReview(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('prescriptions') })
      queryClient.invalidateQueries({ queryKey: tenantKey('prescriptions', variables.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('prescriptions', 'calendar') })
      queryClient.invalidateQueries({ queryKey: tenantKey('dashboard', 'critical-alerts') })
      queryClient.invalidateQueries({ queryKey: tenantKey('dashboard', 'stats') })
    },
  })
}

// Hook para remover prescrição
export function useDeletePrescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      prescriptionsApi.remove(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('prescriptions') })
      queryClient.invalidateQueries({ queryKey: tenantKey('dashboard', 'stats') })
    },
  })
}

// ========== DASHBOARD & STATS HOOKS ==========

// Hook para estatísticas do dashboard
export function useDashboardStats() {
  return useQuery({
    queryKey: tenantKey('dashboard', 'stats'),
    queryFn: () => prescriptionsApi.getDashboardStats(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 60 * 1000, // Refetch a cada 1 minuto
  })
}

// Hook para alertas críticos
export function useCriticalAlerts() {
  return useQuery({
    queryKey: tenantKey('dashboard', 'critical-alerts'),
    queryFn: () => prescriptionsApi.getCriticalAlerts(),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 30 * 1000, // Refetch a cada 30 segundos
  })
}

// Hook para prescrições próximas do vencimento
export function useExpiringPrescriptions(days: number = 5) {
  return useQuery({
    queryKey: tenantKey('prescriptions', 'expiring', days),
    queryFn: () => prescriptionsApi.getExpiringPrescriptions(days),
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para residentes com controlados
export function useResidentsWithControlled() {
  return useQuery({
    queryKey: tenantKey('prescriptions', 'residents-with-controlled'),
    queryFn: () => prescriptionsApi.getResidentsWithControlled(),
    staleTime: 15 * 60 * 1000, // 15 minutos
  })
}

// ========== ADMINISTRATION HOOKS ==========

// Hook para administrar medicamento contínuo
export function useAdministerMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AdministerMedicationDto) =>
      prescriptionsApi.administerMedication(data),
    onSuccess: () => {
      // Invalidar queries relacionadas a administração
      queryClient.invalidateQueries({ queryKey: tenantKey('medication-administrations') })
      // Invalidar prescrições para atualizar status em tempo real
      queryClient.invalidateQueries({ queryKey: tenantKey('prescriptions') })
      // Invalidar prescrição específica também
      queryClient.invalidateQueries({ queryKey: tenantKey('prescriptions') })
      queryClient.invalidateQueries({ queryKey: tenantKey('dashboard', 'stats') })
      // Invalidar dashboard do cuidador (lista de tarefas diárias)
      queryClient.invalidateQueries({ queryKey: tenantKey('caregiver-tasks') })
      // Invalidar atividades recentes para mostrar a administração
      queryClient.invalidateQueries({ queryKey: tenantKey(QUERY_KEYS.audit.recent(10)) })
    },
  })
}

// Hook para administrar medicação SOS
export function useAdministerSOS() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AdministerSOSDto) =>
      prescriptionsApi.administerSOS(data),
    onSuccess: () => {
      // Invalidar queries relacionadas a administração
      queryClient.invalidateQueries({ queryKey: tenantKey('sos-administrations') })
      // Invalidar prescrições para atualizar status em tempo real
      queryClient.invalidateQueries({ queryKey: tenantKey('prescriptions') })
      queryClient.invalidateQueries({ queryKey: tenantKey('dashboard', 'stats') })
      // Invalidar atividades recentes para mostrar a administração SOS
      queryClient.invalidateQueries({ queryKey: tenantKey(QUERY_KEYS.audit.recent(10)) })
    },
  })
}

// ========== CUSTOM HOOKS ==========

// Hook combinado para dashboard completo
export function usePrescriptionsDashboard() {
  const stats = useDashboardStats()
  const alerts = useCriticalAlerts()
  const expiring = useExpiringPrescriptions(5)
  const controlled = useResidentsWithControlled()

  return {
    stats: stats.data,
    alerts: alerts.data,
    expiring: expiring.data,
    controlled: controlled.data,
    isLoading: stats.isLoading || alerts.isLoading || expiring.isLoading || controlled.isLoading,
    isError: stats.isError || alerts.isError || expiring.isError || controlled.isError,
    refetchAll: () => {
      stats.refetch()
      alerts.refetch()
      expiring.refetch()
      controlled.refetch()
    },
  }
}

// ========== HOOKS PARA VISUALIZAÇÃO DE AGENDA ==========

import { PrescriptionCalendarItem, PrescriptionFilterType, PrescriptionType, PrescriptionStatus } from '@/types/agenda'
import { differenceInDays } from 'date-fns'
import { extractDateOnly } from '@/utils/dateHelpers'

// Função auxiliar: Calcular status da prescrição
function calculatePrescriptionStatus(
  validUntil?: string,
  reviewDate?: string,
  isActive?: boolean
): PrescriptionStatus {
  if (!isActive) return PrescriptionStatus.EXPIRED

  const now = new Date()

  // Verificar validade (para antibióticos e controlados)
  if (validUntil) {
    const expiryDate = new Date(extractDateOnly(validUntil) + 'T12:00:00')
    const daysUntilExpiry = differenceInDays(expiryDate, now)

    if (daysUntilExpiry < 0) {
      return PrescriptionStatus.EXPIRED
    }
    if (daysUntilExpiry <= 7) {
      return PrescriptionStatus.EXPIRING_SOON
    }
  }

  // Verificar data de revisão
  if (reviewDate) {
    const reviewDateParsed = new Date(extractDateOnly(reviewDate) + 'T12:00:00')
    const daysUntilReview = differenceInDays(reviewDateParsed, now)

    if (daysUntilReview <= 0) {
      return PrescriptionStatus.NEEDS_REVIEW
    }
  }

  return PrescriptionStatus.ACTIVE
}

// Função auxiliar: Transformar prescrição do backend para calendário
function transformPrescriptionForCalendar(prescription: Record<string, unknown>): PrescriptionCalendarItem {
  const now = new Date()
  const validUntil = prescription.validUntil ? new Date(extractDateOnly(prescription.validUntil as string) + 'T12:00:00') : undefined
  const reviewDate = prescription.reviewDate ? new Date(extractDateOnly(prescription.reviewDate as string) + 'T12:00:00') : undefined

  const daysUntilExpiry = validUntil ? differenceInDays(validUntil, now) : undefined
  const daysUntilReview = reviewDate ? differenceInDays(reviewDate, now) : undefined

  const medications = prescription.medications as Array<{ isControlled?: boolean; name?: string }> | undefined
  const hasControlledMedication = medications?.some((m) => m.isControlled) || false

  return {
    id: prescription.id as string,
    residentId: prescription.residentId as string,
    residentName: (prescription.resident as { fullName?: string })?.fullName || 'Nome não disponível',
    prescriptionType: prescription.prescriptionType as PrescriptionType,
    status: calculatePrescriptionStatus(
      prescription.validUntil as string | undefined,
      prescription.reviewDate as string | undefined,
      prescription.isActive as boolean
    ),
    doctorName: prescription.doctorName as string,
    doctorCrm: prescription.doctorCrm as string,
    prescriptionDate: prescription.prescriptionDate as string,
    validUntil: prescription.validUntil as string | undefined,
    reviewDate: prescription.reviewDate as string | undefined,
    daysUntilExpiry,
    daysUntilReview,
    medicationCount: medications?.length || 0,
    medicationNames: medications?.map((m) => m.name as string) || [],
    isControlled: hasControlledMedication || prescription.prescriptionType === 'CONTROLADO',
    controlledClass: prescription.controlledClass as string | undefined,
    notes: prescription.notes as string | undefined,
  }
}

/**
 * Hook otimizado para buscar prescrições para visualização de calendário
 * Usa filtros no backend para reduzir payload e melhorar performance
 */
export function usePrescriptionsForCalendar(
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  residentId?: string,
  filter: PrescriptionFilterType = 'all',
  enabled: boolean = true
) {
  // Construir query params otimizada
  const queryParams: QueryPrescriptionParams = {
    page: 1,
    limit: 100, // Suficiente para calendário mensal
    residentId,
    isActive: filter === 'expired' ? undefined : true, // Apenas ativas exceto quando filtro é 'expired'
  }

  return useQuery({
    queryKey: tenantKey('prescriptions', 'calendar', startDate, endDate, residentId || 'all', filter),
    queryFn: async () => {
      const response = await prescriptionsApi.findAll(queryParams)

      // Transformar dados
      let prescriptions = response.data.map(transformPrescriptionForCalendar)

      // Filtrar por período (validUntil ou reviewDate dentro do intervalo)
      const start = new Date(`${startDate}T00:00:00`)
      const end = new Date(`${endDate}T23:59:59`)

      prescriptions = prescriptions.filter(p => {
        // SEMPRE incluir prescrições que precisam de ação URGENTE (vencidas, vencendo, precisam revisão)
        if (
          p.status === PrescriptionStatus.EXPIRED ||
          p.status === PrescriptionStatus.EXPIRING_SOON ||
          p.status === PrescriptionStatus.NEEDS_REVIEW
        ) {
          return true
        }

        // Para prescrições ATIVAS, verificar se têm evento no período
        // Incluir se validUntil está no período
        if (p.validUntil) {
          const validDate = new Date(extractDateOnly(p.validUntil as string) + 'T12:00:00')
          if (validDate >= start && validDate <= end) return true
        }

        // Incluir se reviewDate está no período
        if (p.reviewDate) {
          const review = new Date(extractDateOnly(p.reviewDate as string) + 'T12:00:00')
          if (review >= start && review <= end) return true
        }

        // Incluir prescrições ativas sem datas específicas (regulares sem validade)
        if (p.status === PrescriptionStatus.ACTIVE && !p.validUntil && !p.reviewDate) {
          return true
        }

        return false
      })

      // Aplicar filtro de status
      if (filter !== 'all') {
        prescriptions = prescriptions.filter(p => {
          switch (filter) {
            case 'active':
              return p.status === PrescriptionStatus.ACTIVE
            case 'expiring':
              return p.status === PrescriptionStatus.EXPIRING_SOON
            case 'expired':
              return p.status === PrescriptionStatus.EXPIRED
            case 'needs_review':
              return p.status === PrescriptionStatus.NEEDS_REVIEW
            default:
              return true
          }
        })
      }

      // Ordenar por prioridade
      const statusPriority = {
        [PrescriptionStatus.EXPIRED]: 0,
        [PrescriptionStatus.EXPIRING_SOON]: 1,
        [PrescriptionStatus.NEEDS_REVIEW]: 2,
        [PrescriptionStatus.ACTIVE]: 3,
      }

      prescriptions.sort((a, b) => {
        const priorityDiff = statusPriority[a.status] - statusPriority[b.status]
        if (priorityDiff !== 0) return priorityDiff

        // Ordenar por dias até vencimento/revisão
        if (a.daysUntilExpiry !== undefined && b.daysUntilExpiry !== undefined) {
          return a.daysUntilExpiry - b.daysUntilExpiry
        }
        if (a.daysUntilReview !== undefined && b.daysUntilReview !== undefined) {
          return a.daysUntilReview - b.daysUntilReview
        }

        return 0
      })

      return prescriptions
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}
