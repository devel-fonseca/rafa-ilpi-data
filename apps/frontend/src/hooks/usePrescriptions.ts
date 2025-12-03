import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  prescriptionsApi,
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  QueryPrescriptionParams,
  AdministerMedicationDto,
  AdministerSOSDto,
} from '../api/prescriptions.api'
import { useState } from 'react'

// ========== CRUD HOOKS ==========

// Hook para listar prescrições
export function usePrescriptions(initialQuery?: QueryPrescriptionParams) {
  const [query, setQuery] = useState<QueryPrescriptionParams>(
    initialQuery || { page: 1, limit: 10 }
  )

  const result = useQuery({
    queryKey: ['prescriptions', query],
    queryFn: () => prescriptionsApi.findAll(query),
    placeholderData: keepPreviousData,
  })

  return {
    ...result,
    query,
    setQuery,
    prescriptions: result.data?.data.data || [],
    meta: result.data?.data.meta,
  }
}

// Hook para buscar uma prescrição específica
export function usePrescription(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: ['prescription', id],
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
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['critical-alerts'] })
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
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      queryClient.invalidateQueries({ queryKey: ['prescription', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// Hook para remover prescrição
export function useDeletePrescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => prescriptionsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// ========== DASHBOARD & STATS HOOKS ==========

// Hook para estatísticas do dashboard
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => prescriptionsApi.getDashboardStats(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 60 * 1000, // Refetch a cada 1 minuto
  })
}

// Hook para alertas críticos
export function useCriticalAlerts() {
  return useQuery({
    queryKey: ['critical-alerts'],
    queryFn: () => prescriptionsApi.getCriticalAlerts(),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 30 * 1000, // Refetch a cada 30 segundos
  })
}

// Hook para prescrições próximas do vencimento
export function useExpiringPrescriptions(days: number = 5) {
  return useQuery({
    queryKey: ['expiring-prescriptions', days],
    queryFn: () => prescriptionsApi.getExpiringPrescriptions(days),
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para residentes com controlados
export function useResidentsWithControlled() {
  return useQuery({
    queryKey: ['residents-with-controlled'],
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
      queryClient.invalidateQueries({ queryKey: ['medication-administrations'] })
      // Invalidar prescrições para atualizar status em tempo real
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      // Invalidar prescrição específica também
      queryClient.invalidateQueries({ queryKey: ['prescription'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
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
      queryClient.invalidateQueries({ queryKey: ['sos-administrations'] })
      // Invalidar prescrições para atualizar status em tempo real
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
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
    stats: stats.data?.data,
    alerts: alerts.data?.data,
    expiring: expiring.data?.data,
    controlled: controlled.data?.data,
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
