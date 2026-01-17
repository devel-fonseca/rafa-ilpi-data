import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSOSMedicationHistory,
  updateSOSMedication,
  deleteSOSMedication,
  type UpdateSOSMedicationVersionedDto,
} from '@/api/sos-medications.api'
import { useToast } from '@/components/ui/use-toast'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para buscar histórico de um medicamento SOS
 */
export function useSOSMedicationHistory(sosMedicationId: string | null) {
  return useQuery({
    queryKey: tenantKey('sos-medications', sosMedicationId, 'history'),
    queryFn: () => getSOSMedicationHistory(sosMedicationId!),
    enabled: !!sosMedicationId,
  })
}

/**
 * Hook para atualizar um medicamento SOS com versionamento
 */
export function useUpdateSOSMedication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSOSMedicationVersionedDto }) =>
      updateSOSMedication(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('sos-medications') })
      queryClient.invalidateQueries({ queryKey: tenantKey('sos-medications', variables.id, 'history') })
      toast({
        title: 'Medicamento SOS atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: errorResponse?.data?.message || 'Não foi possível atualizar o medicamento SOS.',
      })
    },
  })
}

/**
 * Hook para excluir um medicamento SOS com versionamento
 */
export function useDeleteSOSMedication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteSOSMedication(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('sos-medications') })
      toast({
        title: 'Medicamento SOS excluído',
        description: 'O medicamento SOS foi excluído com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: errorResponse?.data?.message || 'Não foi possível excluir o medicamento SOS.',
      })
    },
  })
}

/**
 * Hook agregado para versionamento de medicamentos SOS
 * Combina histórico, atualização e exclusão em um único hook
 */
export function useSOSMedicationVersioning(sosMedicationId: string | null) {
  const history = useSOSMedicationHistory(sosMedicationId)
  const update = useUpdateSOSMedication()
  const remove = useDeleteSOSMedication()

  return {
    history,
    update,
    remove,
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
