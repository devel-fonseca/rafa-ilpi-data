import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMedicationHistory,
  updateMedication,
  deleteMedication,
  type UpdateMedicationVersionedDto,
} from '@/api/medications.api'
import { useToast } from '@/components/ui/use-toast'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para buscar histórico de um medicamento
 */
export function useMedicationHistory(medicationId: string | null) {
  return useQuery({
    queryKey: tenantKey('medication-history', medicationId || 'none'),
    queryFn: () => getMedicationHistory(medicationId!),
    enabled: !!medicationId,
  })
}

/**
 * Hook para atualizar um medicamento com versionamento
 */
export function useUpdateMedication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMedicationVersionedDto }) =>
      updateMedication(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('medications') })
      queryClient.invalidateQueries({ queryKey: tenantKey('medication-history', variables.id) })
      toast({
        title: 'Medicamento atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.response?.data?.message || 'Não foi possível atualizar o medicamento.',
      })
    },
  })
}

/**
 * Hook para excluir um medicamento com versionamento
 */
export function useDeleteMedication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteMedication(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('medications') })
      toast({
        title: 'Medicamento excluído',
        description: 'O medicamento foi excluído com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.response?.data?.message || 'Não foi possível excluir o medicamento.',
      })
    },
  })
}

/**
 * Hook agregado para versionamento de medicamentos
 * Combina histórico, atualização e exclusão em um único hook
 */
export function useMedicationVersioning(medicationId: string | null) {
  const history = useMedicationHistory(medicationId)
  const update = useUpdateMedication()
  const remove = useDeleteMedication()

  return {
    history,
    update,
    remove,
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
