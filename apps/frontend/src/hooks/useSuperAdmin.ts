/**
 * ============================================
 * 🔐 HOOKS SUPERADMIN - CROSS-TENANT
 * ============================================
 *
 * ⚠️ IMPORTANTE: Este arquivo contém hooks do portal SUPERADMIN.
 *
 * Diferente dos hooks tenant-scoped que usam tenantKey() para isolamento
 * de cache por tenant, TODOS os hooks deste arquivo são CROSS-TENANT
 * por design e NÃO devem usar tenantKey().
 *
 * Cache Keys Pattern:
 * - ✅ CORRETO:   ['superadmin', 'tenants', filters]
 * - ✅ CORRETO:   ['superadmin', 'tenant', id]
 * - ❌ INCORRETO: tenantKey('tenants') - NUNCA usar aqui!
 *
 * Motivo: SuperAdmin precisa acessar dados de TODOS os tenants
 * simultaneamente para gestão da plataforma (billing, métricas, etc).
 *
 * Se você está adicionando um novo hook aqui, pergunte-se:
 * - Este dado é específico de um tenant? → Use hook tenant-scoped com tenantKey()
 * - Este dado é cross-tenant (superadmin)? → Use ['superadmin', ...] sem tenantKey()
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getTenants,
  getTenant,
  updateTenant,
  suspendTenant,
  reactivateTenant,
  deleteTenant,
  getTenantStats,
  changePlan,
  extendSubscription,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionHistory,
  getSubscription,
  customizeTenantLimits,
  getTenantEffectiveLimits,
  type TenantFilters,
  type UpdateTenantData,
  type SuspendData,
  type ChangePlanData,
  type ExtendPeriodData,
  type CancelData,
  type CustomizeLimitsData,
} from '@/api/superadmin.api'

// ============================================
// TENANT QUERIES
// ============================================

/**
 * Hook para listar tenants com filtros e paginação
 */
export function useTenants(filters: TenantFilters = {}) {
  return useQuery({
    queryKey: ['superadmin', 'tenants', filters],
    queryFn: () => getTenants(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar detalhes de um tenant específico
 */
export function useTenant(id: string, enabled = true) {
  return useQuery({
    queryKey: ['superadmin', 'tenant', id],
    queryFn: () => getTenant(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

/**
 * Hook para buscar estatísticas de um tenant
 */
export function useTenantStats(id: string, enabled = true) {
  return useQuery({
    queryKey: ['superadmin', 'tenant', id, 'stats'],
    queryFn: () => getTenantStats(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// ============================================
// SUBSCRIPTION QUERIES
// ============================================

/**
 * Hook para buscar histórico de subscriptions de um tenant
 */
export function useSubscriptionHistory(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: ['superadmin', 'tenant', tenantId, 'subscriptions'],
    queryFn: () => getSubscriptionHistory(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

/**
 * Hook para buscar detalhes de uma subscription
 */
export function useSubscription(id: string, enabled = true) {
  return useQuery({
    queryKey: ['superadmin', 'subscription', id],
    queryFn: () => getSubscription(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

// ============================================
// TENANT MUTATIONS
// ============================================

/**
 * Hook para atualizar dados de um tenant
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantData }) =>
      updateTenant(id, data),
    onSuccess: (updatedTenant) => {
      // Invalidar lista de tenants
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenants'] })
      // Atualizar cache do tenant específico
      queryClient.setQueryData(
        ['superadmin', 'tenant', updatedTenant.id],
        updatedTenant
      )
    },
  })
}

/**
 * Hook para suspender um tenant
 */
export function useSuspendTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SuspendData }) =>
      suspendTenant(id, data),
    onSuccess: (suspendedTenant) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenants'] })
      queryClient.setQueryData(
        ['superadmin', 'tenant', suspendedTenant.id],
        suspendedTenant
      )
      // Invalidar estatísticas globais
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'metrics', 'tenants'],
      })
    },
  })
}

/**
 * Hook para reativar um tenant
 */
export function useReactivateTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => reactivateTenant(id),
    onSuccess: (reactivatedTenant) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenants'] })
      queryClient.setQueryData(
        ['superadmin', 'tenant', reactivatedTenant.id],
        reactivatedTenant
      )
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'metrics', 'tenants'],
      })
    },
  })
}

/**
 * Hook para deletar um tenant (soft delete)
 */
export function useDeleteTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteTenant(id),
    onSuccess: () => {
      // Invalidar lista de tenants
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenants'] })
      // Invalidar métricas
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'metrics'] })
    },
  })
}

// ============================================
// SUBSCRIPTION MUTATIONS
// ============================================

/**
 * Hook para mudar plano de um tenant
 */
export function useChangePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: ChangePlanData }) =>
      changePlan(tenantId, data),
    onSuccess: (_newSubscription, variables) => {
      // Invalidar tenant
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenant', variables.tenantId],
      })
      // Invalidar histórico de subscriptions
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenant', variables.tenantId, 'subscriptions'],
      })
      // Invalidar métricas de receita
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'metrics', 'revenue'],
      })
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'metrics', 'overview'],
      })
    },
  })
}

/**
 * Hook para estender período de subscription
 */
export function useExtendSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExtendPeriodData }) =>
      extendSubscription(id, data),
    onSuccess: (extendedSub) => {
      // Invalidar subscription
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'subscription', extendedSub.id],
      })
      // Invalidar tenant
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenant', extendedSub.tenantId],
      })
      // Invalidar histórico
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenant', extendedSub.tenantId, 'subscriptions'],
      })
    },
  })
}

/**
 * Hook para cancelar subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelData }) =>
      cancelSubscription(id, data),
    onSuccess: (cancelledSub) => {
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'subscription', cancelledSub.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenant', cancelledSub.tenantId],
      })
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenant', cancelledSub.tenantId, 'subscriptions'],
      })
      // Invalidar métricas de churn e receita
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'metrics'] })
    },
  })
}

/**
 * Hook para reativar subscription
 */
export function useReactivateSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => reactivateSubscription(id),
    onSuccess: (newSubscription) => {
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'subscription', newSubscription.id],
      })
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenant', newSubscription.tenantId],
      })
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenant', newSubscription.tenantId, 'subscriptions'],
      })
      // Invalidar métricas
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'metrics'] })
    },
  })
}

// ============================================
// TENANT CUSTOMIZATION
// ============================================

/**
 * Hook para buscar limites efetivos de um tenant
 * Retorna base limits + custom overrides + effective limits
 */
export function useTenantEffectiveLimits(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: ['superadmin', 'tenant', tenantId, 'effective-limits'],
    queryFn: () => getTenantEffectiveLimits(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

/**
 * Hook para customizar limites de um tenant
 */
export function useCustomizeTenantLimits() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: CustomizeLimitsData }) =>
      customizeTenantLimits(tenantId, data),
    onSuccess: (updatedTenant) => {
      // Invalidar tenant específico
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenant', updatedTenant.id],
      })
      // Invalidar effective limits
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenant', updatedTenant.id, 'effective-limits'],
      })
      // Invalidar lista de tenants (para atualizar badges)
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'tenants'],
      })
    },
  })
}
