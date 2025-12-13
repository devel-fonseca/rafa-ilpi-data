import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { vaccinationsAPI, type UpdateVaccinationVersionedDto } from '@/api/vaccinations.api'
import { useToast } from '@/components/ui/use-toast'

export function useVaccinationHistory(vaccinationId: string | null) {
  return useQuery({
    queryKey: ['vaccination-history', vaccinationId],
    queryFn: () => vaccinationsAPI.getHistory(vaccinationId!),
    enabled: !!vaccinationId,
  })
}

export function useUpdateVaccination() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVaccinationVersionedDto }) =>
      vaccinationsAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] })
      queryClient.invalidateQueries({ queryKey: ['vaccination-history', variables.id] })
      toast({ title: 'Vacinação atualizada', description: 'As alterações foram salvas com sucesso.' })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.response?.data?.message || 'Não foi possível atualizar a vacinação.',
      })
    },
  })
}

export function useDeleteVaccination() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      vaccinationsAPI.remove(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations'] })
      toast({ title: 'Vacinação excluída', description: 'A vacinação foi excluída com sucesso.' })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.response?.data?.message || 'Não foi possível excluir a vacinação.',
      })
    },
  })
}

export function useVaccinationVersioning(vaccinationId: string | null) {
  const history = useVaccinationHistory(vaccinationId)
  const update = useUpdateVaccination()
  const remove = useDeleteVaccination()

  return {
    history,
    update,
    remove,
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
