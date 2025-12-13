import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getDietaryRestrictionHistory,
  updateDietaryRestriction,
  deleteDietaryRestriction,
  type UpdateDietaryRestrictionVersionedDto,
} from '@/api/dietary-restrictions.api'
import { useToast } from '@/components/ui/use-toast'

/**
 * Hook para buscar histórico de uma restrição alimentar
 */
export function useDietaryRestrictionHistory(dietaryRestrictionId: string | null) {
  return useQuery({
    queryKey: ['dietary-restriction-history', dietaryRestrictionId],
    queryFn: () => getDietaryRestrictionHistory(dietaryRestrictionId!),
    enabled: !!dietaryRestrictionId,
  })
}

/**
 * Hook para atualizar uma restrição alimentar com versionamento
 */
export function useUpdateDietaryRestriction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDietaryRestrictionVersionedDto }) =>
      updateDietaryRestriction(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dietary-restrictions'] })
      queryClient.invalidateQueries({ queryKey: ['dietary-restriction-history', variables.id] })
      toast({
        title: 'Restrição alimentar atualizada',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.response?.data?.message || 'Não foi possível atualizar a restrição alimentar.',
      })
    },
  })
}

/**
 * Hook para excluir uma restrição alimentar com versionamento
 */
export function useDeleteDietaryRestriction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteDietaryRestriction(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dietary-restrictions'] })
      toast({
        title: 'Restrição alimentar excluída',
        description: 'A restrição alimentar foi excluída com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.response?.data?.message || 'Não foi possível excluir a restrição alimentar.',
      })
    },
  })
}

/**
 * Hook agregado para versionamento de restrições alimentares
 * Combina histórico, atualização e exclusão em um único hook
 */
export function useDietaryRestrictionVersioning(dietaryRestrictionId: string | null) {
  const history = useDietaryRestrictionHistory(dietaryRestrictionId)
  const update = useUpdateDietaryRestriction()
  const remove = useDeleteDietaryRestriction()

  return {
    history,
    update,
    remove,
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
