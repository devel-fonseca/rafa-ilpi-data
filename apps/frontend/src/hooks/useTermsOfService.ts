import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as termsOfServiceApi from '@/api/terms-of-service.api'
import type {
  TermsOfServiceFilters,
  CreateTermsOfServiceDto,
  UpdateTermsOfServiceDto,
  PublishTermsOfServiceDto,
} from '@/api/terms-of-service.api'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para listar termos de uso com filtros
 */
export function useTermsOfService(filters?: TermsOfServiceFilters) {
  return useQuery({
    queryKey: tenantKey('terms-of-service', JSON.stringify(filters)),
    queryFn: () => termsOfServiceApi.listTermsOfService(filters),
  })
}

/**
 * Hook para buscar detalhes de um termo de uso
 */
export function useTermsOfServiceById(id: string) {
  return useQuery({
    queryKey: tenantKey('terms-of-service', id),
    queryFn: () => termsOfServiceApi.getTermsOfService(id),
    enabled: !!id,
  })
}

/**
 * Hook para criar termo de uso
 */
export function useCreateTermsOfService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateTermsOfServiceDto) => termsOfServiceApi.createTermsOfService(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('terms-of-service') })
      toast.success('Termo de uso criado com sucesso!')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error(errorResponse?.data?.message || 'Erro ao criar termo de uso')
    },
  })
}

/**
 * Hook para atualizar termo de uso
 */
export function useUpdateTermsOfService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTermsOfServiceDto }) =>
      termsOfServiceApi.updateTermsOfService(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('terms-of-service') })
      queryClient.invalidateQueries({ queryKey: tenantKey('terms-of-service', variables.id) })
      toast.success('Termo de uso atualizado com sucesso!')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error(errorResponse?.data?.message || 'Erro ao atualizar termo de uso')
    },
  })
}

/**
 * Hook para publicar termo de uso
 */
export function usePublishTermsOfService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: PublishTermsOfServiceDto }) =>
      termsOfServiceApi.publishTermsOfService(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('terms-of-service') })
      queryClient.invalidateQueries({ queryKey: tenantKey('terms-of-service', variables.id) })
      toast.success('Termo de uso publicado com sucesso!', {
        description: 'O termo de uso agora está ATIVO e disponível para novos cadastros.',
      })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error(errorResponse?.data?.message || 'Erro ao publicar termo de uso')
    },
  })
}

/**
 * Hook para deletar termo de uso
 */
export function useDeleteTermsOfService() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => termsOfServiceApi.deleteTermsOfService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('terms-of-service') })
      toast.success('Termo de uso deletado com sucesso!')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast.error(errorResponse?.data?.message || 'Erro ao deletar termo de uso')
    },
  })
}

/**
 * Hook para listar aceites de um termo de uso
 */
export function useTermsOfServiceAcceptances(termsId: string) {
  return useQuery({
    queryKey: tenantKey('terms-of-service', termsId, 'acceptances'),
    queryFn: () => termsOfServiceApi.getTermsOfServiceAcceptances(termsId),
    enabled: !!termsId,
  })
}

/**
 * Hook para buscar aceite de termo de uso de um tenant
 */
export function useTenantTermsOfServiceAcceptance(tenantId: string) {
  return useQuery({
    queryKey: tenantKey('tenants', tenantId, 'terms-of-service-acceptance'),
    queryFn: () => termsOfServiceApi.getTenantTermsOfServiceAcceptance(tenantId),
    enabled: !!tenantId,
  })
}

/**
 * Hook para buscar termo de uso ACTIVE (público)
 */
export function useActiveTermsOfService(planId?: string) {
  return useQuery({
    queryKey: tenantKey('terms-of-service', 'active', planId || 'no-plan'),
    queryFn: () => termsOfServiceApi.getActiveTermsOfService(planId),
  })
}
