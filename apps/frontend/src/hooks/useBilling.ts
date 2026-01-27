import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'

// GET /admin/plans/available
export function useAvailablePlans() {
  return useQuery({
    queryKey: tenantKey('admin', 'plans', 'available'),
    queryFn: async () => {
      const response = await api.get('/admin/plans/available')
      return response.data
    },
  })
}

// GET /admin/plans/compare/:targetPlanId
export function useComparePlans(targetPlanId: string | null) {
  return useQuery({
    queryKey: tenantKey('admin', 'plans', 'compare', targetPlanId || 'none'),
    queryFn: async () => {
      const response = await api.get(`/admin/plans/compare/${targetPlanId}`)
      return response.data
    },
    enabled: !!targetPlanId,
  })
}

// POST /admin/subscription/upgrade
export function useUpgradeSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { newPlanId: string; acceptedContractId?: string }) => {
      const response = await api.post('/admin/subscription/upgrade', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('tenant', 'subscription') })
      queryClient.invalidateQueries({ queryKey: tenantKey('admin', 'invoices') })
      queryClient.invalidateQueries({ queryKey: tenantKey('admin', 'plans', 'available') })
    },
  })
}

// GET /admin/invoices
export function useTenantInvoices(filters?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: tenantKey('admin', 'invoices', JSON.stringify(filters)),
    queryFn: async () => {
      const response = await api.get('/admin/invoices', { params: filters })
      return response.data
    },
  })
}

// GET /admin/invoices/:id
export function useInvoiceDetails(id: string | null) {
  return useQuery({
    queryKey: tenantKey('admin', 'invoice', id || 'none'),
    queryFn: async () => {
      const response = await api.get(`/admin/invoices/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

// PATCH /admin/subscription/payment-method
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (method: 'PIX' | 'BOLETO' | 'CREDIT_CARD') => {
      const response = await api.patch('/admin/subscription/payment-method', {
        preferredPaymentMethod: method,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('tenant', 'subscription') })
    },
  })
}

// PATCH /admin/subscription/billing-cycle
export function useUpdateBillingCycle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (billingCycle: 'MONTHLY' | 'ANNUAL') => {
      const response = await api.patch('/admin/subscription/billing-cycle', {
        billingCycle,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('tenant', 'subscription') })
    },
  })
}

// POST /admin/subscription/cancel-trial
export function useCancelTrial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/admin/subscription/cancel-trial')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('tenant', 'subscription') })
      queryClient.invalidateQueries({ queryKey: tenantKey('tenant', 'me') })
    },
  })
}

// GET /admin/contracts/active/:planId
export function useActiveContract(planId: string | null) {
  return useQuery({
    queryKey: tenantKey('admin', 'contract', 'active', planId || 'none'),
    queryFn: async () => {
      const response = await api.get(`/admin/contracts/active/${planId}`)
      return response.data
    },
    enabled: !!planId,
  })
}

// POST /admin/contracts/accept
export function useAcceptContract() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (contractId: string) => {
      const response = await api.post('/admin/contracts/accept', { contractId })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('admin', 'contract') })
    },
  })
}

// GET /admin/subscription/change-history
export function useSubscriptionChangeHistory(limit?: number) {
  return useQuery({
    queryKey: tenantKey('admin', 'subscription', 'change-history', limit?.toString() || 'all'),
    queryFn: async () => {
      const response = await api.get('/admin/subscription/change-history', {
        params: { limit },
      })
      return response.data
    },
  })
}
