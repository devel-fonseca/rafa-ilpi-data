import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { residentsAPI, ResidentQuery, CreateResidentDto, UpdateResidentDto } from '../api/residents.api'
import { useToast } from '@/components/ui/use-toast'
import { useState } from 'react'

// Hook para listar residentes
export function useResidents(initialQuery?: ResidentQuery) {
  const [query, setQuery] = useState<ResidentQuery>(initialQuery || { page: 1, limit: 10 })

  const result = useQuery({
    queryKey: ['residents', query],
    queryFn: () => residentsAPI.getAll(query),
    placeholderData: keepPreviousData,
  })

  return {
    ...result,
    query,
    setQuery,
    residents: result.data?.data || [],
    meta: result.data?.meta,
  }
}

// Hook para buscar um residente específico
export function useResident(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'
  console.log('[useResident] id:', id, 'shouldFetch:', shouldFetch)
  return useQuery({
    queryKey: ['resident', id],
    queryFn: () => {
      if (!id) {
        throw new Error('ID is required')
      }
      return residentsAPI.getById(id)
    },
    enabled: shouldFetch,
  })
}

// Hook para criar residente
export function useCreateResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateResidentDto) => residentsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] })
      queryClient.invalidateQueries({ queryKey: ['resident-stats'] })
    },
  })
}

// Hook para atualizar residente
export function useUpdateResident() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResidentDto }) =>
      residentsAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['residents'] })
      queryClient.invalidateQueries({ queryKey: ['resident', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['resident-history', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['resident-stats'] })
      toast({
        title: 'Residente atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.response?.data?.message || 'Não foi possível atualizar o residente.',
      })
    },
  })
}

// Hook para deletar residente
export function useDeleteResident() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      residentsAPI.delete(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] })
      queryClient.invalidateQueries({ queryKey: ['resident-stats'] })
      toast({
        title: 'Residente excluído',
        description: 'O residente foi excluído com sucesso.',
      })
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.response?.data?.message || 'Não foi possível excluir o residente.',
      })
    },
  })
}

// Hook para estatísticas
export function useResidentStats() {
  return useQuery({
    queryKey: ['resident-stats'],
    queryFn: () => residentsAPI.getStats(),
    staleTime: 0, // Sempre revalidar
    refetchOnMount: true, // Revalidar ao montar o componente
  })
}

// Hook para buscar histórico de alterações de um residente
export function useResidentHistory(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'
  return useQuery({
    queryKey: ['resident-history', id],
    queryFn: () => {
      if (!id) {
        throw new Error('ID is required')
      }
      return residentsAPI.getHistory(id)
    },
    enabled: shouldFetch,
  })
}

// Hook para buscar uma versão específica do histórico
export function useResidentHistoryVersion(id: string | undefined, versionNumber: number | undefined) {
  const shouldFetch = !!id && versionNumber !== undefined
  return useQuery({
    queryKey: ['resident-history-version', id, versionNumber],
    queryFn: () => {
      if (!id || versionNumber === undefined) {
        throw new Error('ID and versionNumber are required')
      }
      return residentsAPI.getHistoryVersion(id, versionNumber)
    },
    enabled: shouldFetch,
  })
}

/**
 * Hook agregado para versionamento de residentes
 * Combina histórico, atualização e exclusão em um único hook
 */
export function useResidentVersioning(residentId: string | null) {
  const history = useResidentHistory(residentId || undefined)
  const update = useUpdateResident()
  const remove = useDeleteResident()

  return {
    history,
    update,
    remove,
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}