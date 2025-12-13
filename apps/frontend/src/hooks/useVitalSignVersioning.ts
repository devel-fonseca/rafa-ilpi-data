import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getVitalSignHistory,
  updateVitalSign,
  deleteVitalSign,
  type UpdateVitalSignVersionedDto,
} from '@/api/vital-signs.api'
import { useToast } from '@/components/ui/use-toast'

/**
 * Hook para buscar histórico de um sinal vital
 */
export function useVitalSignHistory(vitalSignId: string | null) {
  return useQuery({
    queryKey: ['vital-sign-history', vitalSignId],
    queryFn: () => getVitalSignHistory(vitalSignId!),
    enabled: !!vitalSignId,
  })
}

/**
 * Hook para atualizar um sinal vital com versionamento
 */
export function useUpdateVitalSign() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVitalSignVersionedDto }) =>
      updateVitalSign(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vital-signs'] })
      queryClient.invalidateQueries({ queryKey: ['vital-sign-history', variables.id] })
      toast({
        title: 'Sinal vital atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.response?.data?.message || 'Não foi possível atualizar o sinal vital.',
      })
    },
  })
}

/**
 * Hook para excluir um sinal vital com versionamento
 */
export function useDeleteVitalSign() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteVitalSign(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vital-signs'] })
      toast({
        title: 'Sinal vital excluído',
        description: 'O sinal vital foi excluído com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.response?.data?.message || 'Não foi possível excluir o sinal vital.',
      })
    },
  })
}

/**
 * Hook agregado para versionamento de sinais vitais
 * Combina histórico, atualização e exclusão em um único hook
 */
export function useVitalSignVersioning(vitalSignId: string | null) {
  const history = useVitalSignHistory(vitalSignId)
  const update = useUpdateVitalSign()
  const remove = useDeleteVitalSign()

  return {
    history,
    update,
    remove,
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
