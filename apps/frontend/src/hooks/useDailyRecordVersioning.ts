import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dailyRecordsAPI } from '@/api/dailyRecords.api'
import { useToast } from '@/components/ui/use-toast'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para gerenciar histórico de Daily Record
 */
export function useDailyRecordHistory(recordId: string | null) {
  return useQuery({
    queryKey: tenantKey('daily-record-history', recordId || 'none'),
    queryFn: () => dailyRecordsAPI.getHistory(recordId!),
    enabled: !!recordId,
  })
}

/**
 * Hook para atualizar Daily Record com validação de editReason
 */
export function useUpdateDailyRecord() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: {
        editReason: string
        type?: string
        date?: string
        time?: string
        data?: Record<string, unknown>
        recordedBy?: string
        notes?: string
      }
    }) => dailyRecordsAPI.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: tenantKey('daily-records') })
      queryClient.invalidateQueries({ queryKey: tenantKey('daily-record-history', variables.id) })

      toast({
        title: 'Registro atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description:
          errorResponse?.data?.message ||
          'Não foi possível atualizar o registro. Tente novamente.',
      })
    },
  })
}

/**
 * Hook para excluir Daily Record com validação de deleteReason
 */
export function useDeleteDailyRecord() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      dailyRecordsAPI.delete(id, deleteReason),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: tenantKey('daily-records') })

      toast({
        title: 'Registro excluído',
        description: 'O registro foi excluído com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description:
          errorResponse?.data?.message ||
          'Não foi possível excluir o registro. Tente novamente.',
      })
    },
  })
}

/**
 * Hook para restaurar versão anterior de Daily Record
 */
export function useRestoreDailyRecordVersion() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      recordId,
      versionId,
      restoreReason,
    }: {
      recordId: string
      versionId: string
      restoreReason: string
    }) => dailyRecordsAPI.restoreVersion(recordId, versionId, restoreReason),
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: tenantKey('daily-records') })
      queryClient.invalidateQueries({ queryKey: tenantKey('daily-record-history', variables.recordId) })

      toast({
        title: 'Versão restaurada',
        description: 'O registro foi restaurado para a versão anterior com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      toast({
        variant: 'destructive',
        title: 'Erro ao restaurar',
        description:
          errorResponse?.data?.message ||
          'Não foi possível restaurar a versão. Tente novamente.',
      })
    },
  })
}

/**
 * Hook agregado que fornece todas as operações de versionamento
 *
 * @example
 * ```tsx
 * function DailyRecordsPage() {
 *   const { history, update, remove, restore } = useDailyRecordVersioning(recordId)
 *
 *   const handleUpdate = () => {
 *     update.mutate({
 *       id: recordId,
 *       data: {
 *         editReason: 'Correção de horário',
 *         time: '14:30'
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
export function useDailyRecordVersioning(recordId: string | null) {
  const history = useDailyRecordHistory(recordId)
  const update = useUpdateDailyRecord()
  const remove = useDeleteDailyRecord()
  const restore = useRestoreDailyRecordVersion()

  return {
    // Queries
    history,

    // Mutations
    update,
    remove,
    restore,

    // Estado agregado
    isLoading: history.isLoading || update.isPending || remove.isPending || restore.isPending,
    isError: history.isError || update.isError || remove.isError || restore.isError,
  }
}
