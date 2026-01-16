import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as contractsApi from '@/api/contracts.api'
import type {
  ContractFilters,
  CreateContractDto,
  UpdateContractDto,
  PublishContractDto,
} from '@/api/contracts.api'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para listar contratos com filtros
 */
export function useContracts(filters?: ContractFilters) {
  return useQuery({
    queryKey: tenantKey('contracts', JSON.stringify(filters)),
    queryFn: () => contractsApi.listContracts(filters),
  })
}

/**
 * Hook para buscar detalhes de um contrato
 */
export function useContract(id: string) {
  return useQuery({
    queryKey: tenantKey('contracts', id),
    queryFn: () => contractsApi.getContract(id),
    enabled: !!id,
  })
}

/**
 * Hook para criar contrato
 */
export function useCreateContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateContractDto) => contractsApi.createContract(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('contracts') })
      toast.success('Contrato criado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao criar contrato')
    },
  })
}

/**
 * Hook para atualizar contrato
 */
export function useUpdateContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateContractDto }) =>
      contractsApi.updateContract(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('contracts') })
      queryClient.invalidateQueries({ queryKey: tenantKey('contracts', variables.id) })
      toast.success('Contrato atualizado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao atualizar contrato')
    },
  })
}

/**
 * Hook para publicar contrato
 */
export function usePublishContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: PublishContractDto }) =>
      contractsApi.publishContract(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('contracts') })
      queryClient.invalidateQueries({ queryKey: tenantKey('contracts', variables.id) })
      toast.success('Contrato publicado com sucesso!', {
        description: 'O contrato agora está ATIVO e disponível para novos cadastros.',
      })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao publicar contrato')
    },
  })
}

/**
 * Hook para deletar contrato
 */
export function useDeleteContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => contractsApi.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('contracts') })
      toast.success('Contrato deletado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao deletar contrato')
    },
  })
}

/**
 * Hook para listar aceites de um contrato
 */
export function useContractAcceptances(contractId: string) {
  return useQuery({
    queryKey: tenantKey('contracts', contractId, 'acceptances'),
    queryFn: () => contractsApi.getContractAcceptances(contractId),
    enabled: !!contractId,
  })
}

/**
 * Hook para buscar aceite de contrato de um tenant
 */
export function useTenantContractAcceptance(tenantId: string) {
  return useQuery({
    queryKey: tenantKey('tenants', tenantId, 'contract-acceptance'),
    queryFn: () => contractsApi.getTenantContractAcceptance(tenantId),
    enabled: !!tenantId,
  })
}

/**
 * Hook para buscar aceite da Política de Privacidade de um tenant
 */
export function useTenantPrivacyPolicyAcceptance(tenantId: string) {
  return useQuery({
    queryKey: tenantKey('tenants', tenantId, 'privacy-policy-acceptance'),
    queryFn: () => contractsApi.getTenantPrivacyPolicyAcceptance(tenantId),
    enabled: !!tenantId,
  })
}

/**
 * Hook para buscar contrato ACTIVE (público)
 */
export function useActiveContract(planId?: string) {
  return useQuery({
    queryKey: tenantKey('contracts', 'active', planId || 'no-plan'),
    queryFn: () => contractsApi.getActiveContract(planId),
  })
}
