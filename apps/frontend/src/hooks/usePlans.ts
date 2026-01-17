import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPlans,
  getPlan,
  updatePlan,
  togglePlanPopular,
  togglePlanActive,
  getPlanStats,
  applySubscriptionDiscount,
  applySubscriptionCustomPrice,
  removeSubscriptionDiscount,
  type UpdatePlanDto,
  type ApplyDiscountDto,
  type ApplyCustomPriceDto,
} from '@/api/plans.api'
import { toast } from 'sonner'

/**
 * Hook para buscar lista de planos
 */
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
    staleTime: 1000 * 60 * 5, // 5 minutos (planos mudam raramente)
  })
}

/**
 * Hook para buscar detalhes de um plano
 */
export function usePlan(id: string) {
  return useQuery({
    queryKey: ['plans', id],
    queryFn: () => getPlan(id),
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
  })
}

/**
 * Hook para buscar estatísticas de um plano
 */
export function usePlanStats(id: string) {
  return useQuery({
    queryKey: ['plans', id, 'stats'],
    queryFn: () => getPlanStats(id),
    staleTime: 1000 * 60, // 1 minuto
    enabled: !!id,
  })
}

/**
 * Hook para atualizar um plano
 */
export function useUpdatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlanDto }) => updatePlan(id, data),
    onSuccess: (_, variables) => {
      toast.success('Plano atualizado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['plans', variables.id] })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao atualizar plano', {
        description: errorResponse?.data?.message || 'Tente novamente',
      })
    },
  })
}

/**
 * Hook para toggle isPopular de um plano
 */
export function useTogglePlanPopular() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: togglePlanPopular,
    onSuccess: (data) => {
      toast.success(
        data.isPopular ? 'Plano marcado como popular' : 'Plano desmarcado como popular',
      )
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['plans', data.id] })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao atualizar plano', {
        description: errorResponse?.data?.message || 'Tente novamente',
      })
    },
  })
}

/**
 * Hook para toggle isActive de um plano
 */
export function useTogglePlanActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: togglePlanActive,
    onSuccess: (data) => {
      toast.success(
        data.isActive ? 'Plano ativado com sucesso' : 'Plano desativado com sucesso',
      )
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['plans', data.id] })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao atualizar plano', {
        description: errorResponse?.data?.message || 'Tente novamente',
      })
    },
  })
}

// ============================================
// SUBSCRIPTION PRICING HOOKS
// ============================================

/**
 * Hook para aplicar desconto a uma subscription
 */
export function useApplySubscriptionDiscount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ subscriptionId, data }: { subscriptionId: string; data: ApplyDiscountDto }) =>
      applySubscriptionDiscount(subscriptionId, data),
    onSuccess: () => {
      toast.success('Desconto aplicado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao aplicar desconto', {
        description: errorResponse?.data?.message || 'Tente novamente',
      })
    },
  })
}

/**
 * Hook para aplicar preço customizado a uma subscription
 */
export function useApplySubscriptionCustomPrice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      subscriptionId,
      data,
    }: {
      subscriptionId: string
      data: ApplyCustomPriceDto
    }) => applySubscriptionCustomPrice(subscriptionId, data),
    onSuccess: () => {
      toast.success('Preço customizado aplicado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao aplicar preço customizado', {
        description: errorResponse?.data?.message || 'Tente novamente',
      })
    },
  })
}

/**
 * Hook para remover desconto/preço customizado de uma subscription
 */
export function useRemoveSubscriptionDiscount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeSubscriptionDiscount,
    onSuccess: () => {
      toast.success('Desconto removido com sucesso')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error('Erro ao remover desconto', {
        description: errorResponse?.data?.message || 'Tente novamente',
      })
    },
  })
}
