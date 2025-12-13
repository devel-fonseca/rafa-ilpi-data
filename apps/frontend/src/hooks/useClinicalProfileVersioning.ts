import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getClinicalProfileHistory,
  updateClinicalProfile,
  deleteClinicalProfile,
  type UpdateClinicalProfileVersionedDto,
} from '@/api/clinical-profiles.api'
import { useToast } from '@/components/ui/use-toast'

/**
 * Hook para buscar histórico de um perfil clínico
 */
export function useClinicalProfileHistory(clinicalProfileId: string | null) {
  return useQuery({
    queryKey: ['clinical-profile-history', clinicalProfileId],
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
      queryClient.invalidateQueries({ queryKey: ['clinical-profiles'] })
      queryClient.invalidateQueries({ queryKey: ['clinical-profile-history', variables.id] })
      toast({
        title: 'Perfil clínico atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.response?.data?.message || 'Não foi possível atualizar o perfil clínico.',
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
      queryClient.invalidateQueries({ queryKey: ['clinical-profiles'] })
      toast({
        title: 'Perfil clínico excluído',
        description: 'O perfil clínico foi excluído com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.response?.data?.message || 'Não foi possível excluir o perfil clínico.',
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
