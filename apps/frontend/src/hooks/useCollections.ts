import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import {
  sendReminder,
  suspendTenant,
  renegotiateInvoice,
  type SendReminderData,
  type SuspendTenantData,
  type RenegotiateData,
} from '@/api/collections.api'

/**
 * Hook para enviar lembrete de pagamento
 *
 * Após o sucesso, invalida cache de:
 * - overdue (atualiza dashboard de inadimplência)
 * - invoices (atualiza lista de faturas)
 */
export function useSendReminder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: sendReminder,
    onSuccess: (response) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: ['overdue'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })

      // Toast de sucesso
      toast({
        title: 'Lembrete Enviado',
        description: response.message || 'Lembrete de pagamento enviado com sucesso',
      })
    },
    onError: (error: any) => {
      // Toast de erro
      toast({
        title: 'Erro ao Enviar Lembrete',
        description: error.response?.data?.message || 'Ocorreu um erro ao enviar o lembrete',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para suspender tenant por inadimplência
 *
 * Após o sucesso, invalida cache de:
 * - overdue (atualiza dashboard de inadimplência)
 * - tenants (atualiza lista de tenants)
 * - alerts (pode ter criado novo alerta)
 */
export function useSuspendTenant() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: suspendTenant,
    onSuccess: (response) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: ['overdue'] })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })

      // Toast de sucesso
      toast({
        title: 'Tenant Suspenso',
        description: response.message || 'Tenant suspenso com sucesso',
      })
    },
    onError: (error: any) => {
      // Toast de erro
      toast({
        title: 'Erro ao Suspender Tenant',
        description: error.response?.data?.message || 'Ocorreu um erro ao suspender o tenant',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook para renegociar fatura
 *
 * Após o sucesso, invalida cache de:
 * - overdue (atualiza valores e métricas)
 * - invoices (atualiza lista de faturas)
 * - analytics (atualiza métricas financeiras)
 */
export function useRenegotiate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: renegotiateInvoice,
    onSuccess: (response) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: ['overdue'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })

      // Toast de sucesso
      toast({
        title: 'Fatura Renegociada',
        description: response.message || 'Fatura renegociada com sucesso',
      })
    },
    onError: (error: any) => {
      // Toast de erro
      toast({
        title: 'Erro ao Renegociar',
        description: error.response?.data?.message || 'Ocorreu um erro ao renegociar a fatura',
        variant: 'destructive',
      })
    },
  })
}
