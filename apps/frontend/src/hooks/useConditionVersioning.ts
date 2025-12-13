import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getConditionHistory,
  updateCondition,
  deleteCondition,
  type UpdateConditionVersionedDto,
} from '@/api/conditions.api'
import { useToast } from '@/components/ui/use-toast'

/**
 * Hook para buscar histórico de uma condição
 */
export function useConditionHistory(conditionId: string | null) {
  return useQuery({
    queryKey: ['condition-history', conditionId],
    queryFn: () => getConditionHistory(conditionId!),
    enabled: !!conditionId,
  })
}

/**
 * Hook para atualizar uma condição com versionamento
 */
export function useUpdateCondition() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConditionVersionedDto }) =>
      updateCondition(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conditions'] })
      queryClient.invalidateQueries({ queryKey: ['condition-history', variables.id] })
      toast({
        title: 'Condição atualizada',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.response?.data?.message || 'Não foi possível atualizar a condição.',
      })
    },
  })
}

/**
 * Hook para excluir uma condição com versionamento
 */
export function useDeleteCondition() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteCondition(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conditions'] })
      toast({
        title: 'Condição excluída',
        description: 'A condição foi excluída com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.response?.data?.message || 'Não foi possível excluir a condição.',
      })
    },
  })
}

/**
 * Hook agregado para versionamento de condições
 * Combina histórico, atualização e exclusão em um único hook
 */
export function useConditionVersioning(conditionId: string | null) {
  const history = useConditionHistory(conditionId)
  const update = useUpdateCondition()
  const remove = useDeleteCondition()

  return {
    history,
    update,
    remove,
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
