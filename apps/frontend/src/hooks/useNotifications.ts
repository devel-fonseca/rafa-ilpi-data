import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  createNotification,
  QueryNotificationsParams,
} from '@/api/notifications.api'
import { toast } from 'sonner'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para buscar notificações com filtros e paginação
 */
export function useNotifications(params: QueryNotificationsParams = {}) {
  return useQuery({
    queryKey: tenantKey('notifications', 'list', JSON.stringify(params)),
    queryFn: () => getNotifications(params),
    staleTime: 1000 * 60, // 1 minuto - dados podem ser reaproveitados
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Desabilitar refetch ao focar janela
    refetchInterval: 1000 * 120, // Polling a cada 2 minutos (reduzido de 30s)
    refetchIntervalInBackground: false, // Não pollar quando aba estiver em background
  })
}

/**
 * Hook para contar notificações não lidas
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: tenantKey('notifications', 'unread-count'),
    queryFn: getUnreadCount,
    staleTime: 1000 * 60, // 1 minuto - contador pode ser reaproveitado
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Desabilitar refetch ao focar janela (evita polling desnecessário)
    refetchInterval: 1000 * 60, // Polling a cada 1 minuto (reduzido de 15s)
    refetchIntervalInBackground: false, // Não pollar quando aba estiver em background
  })
}

/**
 * Hook para marcar notificação como lida
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: tenantKey('notifications') })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error('Erro ao marcar notificação como lida', {
        description: err.response?.data?.message || err.message,
      })
    },
  })
}

/**
 * Hook para marcar notificação como não lida
 */
export function useMarkAsUnread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAsUnread,
    onSuccess: () => {
      // Invalidar queries para atualizar UI
      queryClient.invalidateQueries({ queryKey: tenantKey('notifications') })
      toast.success('Notificação marcada como não lida')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error('Erro ao marcar notificação como não lida', {
        description: err.response?.data?.message || err.message,
      })
    },
  })
}

/**
 * Hook para marcar todas as notificações como lidas
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('notifications') })
      toast.success(`${data.count} notificações marcadas como lidas`)
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error('Erro ao marcar notificações como lidas', {
        description: err.response?.data?.message || err.message,
      })
    },
  })
}

/**
 * Hook para deletar notificação
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('notifications') })
      toast.success('Notificação removida')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      toast.error('Erro ao remover notificação', {
        description: err.response?.data?.message || err.message,
      })
    },
  })
}

/**
 * Hook para criar nova notificação
 */
export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('notifications') })
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      console.error('Erro ao criar notificação:', err)
    },
  })
}
