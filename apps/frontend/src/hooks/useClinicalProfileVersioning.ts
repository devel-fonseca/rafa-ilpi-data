import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getClinicalProfileHistory,
  updateClinicalProfile,
  deleteClinicalProfile,
  type UpdateClinicalProfileVersionedDto,
} from '@/api/clinical-profiles.api'
import { useToast } from '@/components/ui/use-toast'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para buscar histórico de um perfil clínico
 */
export function useClinicalProfileHistory(clinicalProfileId: string | null) {
  return useQuery({
    queryKey: tenantKey('clinical-profile-history', clinicalProfileId || 'none'),
    queryFn: () => getClinicalProfileHistory(clinicalProfileId!),
    enabled: !!clinicalProfileId,
  })
}

/**
 * Hook para atualizar um perfil clínico com versionamento
 */
export function useUpdateClinicalProfile() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClinicalProfileVersionedDto }) =>
      updateClinicalProfile(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('clinical-profiles') })
      queryClient.invalidateQueries({ queryKey: tenantKey('clinical-profile-history', variables.id) })
      toast({
        title: 'Perfil clínico atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: errorResponse?.data?.message || 'Não foi possível atualizar o perfil clínico.',
      })
    },
  })
}

/**
 * Hook para excluir um perfil clínico com versionamento
 */
export function useDeleteClinicalProfile() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteClinicalProfile(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('clinical-profiles') })
      toast({
        title: 'Perfil clínico excluído',
        description: 'O perfil clínico foi excluído com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: errorResponse?.data?.message || 'Não foi possível excluir o perfil clínico.',
      })
    },
  })
}

/**
 * Hook agregado para versionamento de perfis clínicos
 * Combina histórico, atualização e exclusão em um único hook
 */
export function useClinicalProfileVersioning(clinicalProfileId: string | null) {
  const history = useClinicalProfileHistory(clinicalProfileId)
  const update = useUpdateClinicalProfile()
  const remove = useDeleteClinicalProfile()

  return {
    history,
    update,
    remove,
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
