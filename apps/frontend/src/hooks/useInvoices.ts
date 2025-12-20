import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInvoices,
  getInvoice,
  createInvoice,
  syncInvoice,
  cancelInvoice,
  getTenantInvoices,
  type InvoiceStatus,
  type InvoiceFilters,
  type CreateInvoiceData,
} from '@/api/invoices.api'

// Re-export types for convenience
export type { InvoiceStatus, InvoiceFilters, CreateInvoiceData }

// ============================================
// HOOKS
// ============================================

/**
 * Hook para listar invoices com filtros
 */
export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: ['superadmin', 'invoices', filters],
    queryFn: () => getInvoices(filters),
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

/**
 * Hook para buscar detalhes de uma invoice
 */
export function useInvoice(id: string, enabled = true) {
  return useQuery({
    queryKey: ['superadmin', 'invoice', id],
    queryFn: () => getInvoice(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

/**
 * Hook para buscar invoices de um tenant
 */
export function useTenantInvoices(tenantId: string, enabled = true) {
  return useQuery({
    queryKey: ['superadmin', 'tenant', tenantId, 'invoices'],
    queryFn: () => getTenantInvoices(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

/**
 * Hook para criar invoice manualmente
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      // Invalidar lista de invoices
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'invoices'] })
    },
  })
}

/**
 * Hook para sincronizar invoice com Asaas
 */
export function useSyncInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncInvoice,
    onSuccess: (updatedInvoice) => {
      // Invalidar lista de invoices
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'invoices'] })
      // Atualizar cache da invoice específica
      queryClient.setQueryData(
        ['superadmin', 'invoice', updatedInvoice.id],
        updatedInvoice
      )
    },
  })
}

/**
 * Hook para cancelar invoice
 */
export function useCancelInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: cancelInvoice,
    onSuccess: () => {
      // Invalidar lista de invoices
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'invoices'] })
    },
  })
}
