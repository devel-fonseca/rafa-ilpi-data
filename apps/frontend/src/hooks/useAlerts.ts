import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAlerts,
  getUnreadCount,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
  type AlertFilters,
} from '@/api/alerts.api'
import { toast } from 'sonner'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para buscar lista de alertas
 */
export function useAlerts(filters: AlertFilters = {}) {
  return useQuery({
    queryKey: tenantKey('alerts', JSON.stringify(filters)),
    queryFn: () => getAlerts(filters),
    staleTime: 1000 * 30, // 30 segundos (alertas mudam frequentemente)
  })
}

/**
 * Hook para buscar contagem de alertas não lidos
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: tenantKey('alerts', 'unread-count'),
    queryFn: getUnreadCount,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // Refetch a cada 1 minuto
  })
}

/**
 * Hook para marcar alerta como lido
 */
export function useMarkAlertAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAlertAsRead,
    onSuccess: () => {
      // Invalidar queries de alertas
      queryClient.invalidateQueries({ queryKey: tenantKey('alerts') })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao marcar alerta como lido', {
        description: errorResponse?.data?.message || 'Tente novamente',
      })
    },
  })
}

/**
 * Hook para marcar todos os alertas como lidos
 */
export function useMarkAllAlertsAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAllAlertsAsRead,
    onSuccess: () => {
      toast.success('Todos os alertas foram marcados como lidos')
      // Invalidar queries de alertas
      queryClient.invalidateQueries({ queryKey: tenantKey('alerts') })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao marcar alertas como lidos', {
        description: errorResponse?.data?.message || 'Tente novamente',
      })
    },
  })
}

/**
 * Hook para deletar alerta
 */
export function useDeleteAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      toast.success('Alerta deletado com sucesso')
      // Invalidar queries de alertas
      queryClient.invalidateQueries({ queryKey: tenantKey('alerts') })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao deletar alerta', {
        description: errorResponse?.data?.message || 'Tente novamente',
      })
    },
  })
}
