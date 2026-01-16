import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAllergyHistory,
  updateAllergy,
  deleteAllergy,
  type UpdateAllergyVersionedDto,
} from '@/api/allergies.api'
import { useToast } from '@/components/ui/use-toast'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para buscar histórico de uma alergia
 */
export function useAllergyHistory(allergyId: string | null) {
  return useQuery({
    queryKey: tenantKey('allergy-history', allergyId || 'none'),
    queryFn: () => getAllergyHistory(allergyId!),
    enabled: !!allergyId,
  })
}

/**
 * Hook para atualizar uma alergia com versionamento
 */
export function useUpdateAllergy() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAllergyVersionedDto }) =>
      updateAllergy(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('allergies') })
      queryClient.invalidateQueries({ queryKey: tenantKey('allergy-history', variables.id) })
      toast({
        title: 'Alergia atualizada',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.response?.data?.message || 'Não foi possível atualizar a alergia.',
      })
    },
  })
}

/**
 * Hook para excluir uma alergia com versionamento
 */
export function useDeleteAllergy() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteAllergy(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('allergies') })
      toast({
        title: 'Alergia excluída',
        description: 'A alergia foi excluída com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.response?.data?.message || 'Não foi possível excluir a alergia.',
      })
    },
  })
}

/**
 * Hook agregado para versionamento de alergias
 * Combina histórico, atualização e exclusão em um único hook
 */
export function useAllergyVersioning(allergyId: string | null) {
  const history = useAllergyHistory(allergyId)
  const update = useUpdateAllergy()
  const remove = useDeleteAllergy()

  return {
    history,
    update,
    remove,
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
