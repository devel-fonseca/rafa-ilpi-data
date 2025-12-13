import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { prescriptionsApi } from '@/api/prescriptions.api'
import { useToast } from '@/components/ui/use-toast'

/**
 * Hook para gerenciar histórico de Prescription
 */
export function usePrescriptionHistory(prescriptionId: string | null) {
  return useQuery({
    queryKey: ['prescription-history', prescriptionId],
    queryFn: () => prescriptionsApi.getHistory(prescriptionId!),
    enabled: !!prescriptionId,
  })
}

/**
 * Hook para atualizar Prescription com validação de changeReason
 */
export function useUpdatePrescription() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: {
        changeReason: string
        doctorName?: string
        doctorCrm?: string
        doctorCrmState?: string
        prescriptionDate?: string
        prescriptionType?: string
        validUntil?: string
        reviewDate?: string
        controlledClass?: string
        notificationNumber?: string
        notificationType?: string
        prescriptionImageUrl?: string
        notes?: string
        isActive?: boolean
      }
    }) => prescriptionsApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      queryClient.invalidateQueries({ queryKey: ['prescription-history', variables.id] })

      toast({
        title: 'Prescrição atualizada',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description:
          error.response?.data?.message ||
          'Não foi possível atualizar a prescrição. Tente novamente.',
      })
    },
  })
}

/**
 * Hook para excluir Prescription com validação de deleteReason
 */
export function useDeletePrescription() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      prescriptionsApi.remove(id, deleteReason),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })

      toast({
        title: 'Prescrição excluída',
        description: 'A prescrição foi excluída com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description:
          error.response?.data?.message ||
          'Não foi possível excluir a prescrição. Tente novamente.',
      })
    },
  })
}

/**
 * Hook agregado que fornece todas as operações de versionamento
 *
 * @example
 * ```tsx
 * function PrescriptionsPage() {
 *   const { history, update, remove } = usePrescriptionVersioning(prescriptionId)
 *
 *   const handleUpdate = () => {
 *     update.mutate({
 *       id: prescriptionId,
 *       data: {
 *         changeReason: 'Correção de dosagem',
 *         validUntil: '2025-12-31'
 *       }
 *     })
 *   }
 *
 *   return (
 *     <div>
 *       {history.data?.history.map(version => (
 *         <VersionCard key={version.id} version={version} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePrescriptionVersioning(prescriptionId: string | null) {
  const history = usePrescriptionHistory(prescriptionId)
  const update = useUpdatePrescription()
  const remove = useDeletePrescription()

  return {
    // Queries
    history,

    // Mutations
    update,
    remove,

    // Estado agregado
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
