import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { residentsAPI, ResidentQuery, CreateResidentDto, UpdateResidentDto } from '../api/residents.api'
import { useToast } from '@/components/ui/use-toast'
import { useState } from 'react'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para listar residentes
 *
 * Busca residentes do tenant atual com filtros e paginação.
 * Cache automaticamente isolado por tenant via tenantKey().
 *
 * @example
 * const { residents, meta, isLoading } = useResidents({ status: 'active', page: 1 })
 */
export function useResidents(initialQuery?: ResidentQuery) {
  const [query, setQuery] = useState<ResidentQuery>(initialQuery || { page: 1, limit: 10 })

  const result = useQuery({
    queryKey: tenantKey('residents', 'list', JSON.stringify(query)),
    queryFn: () => residentsAPI.getAll(query),
    placeholderData: keepPreviousData,
    staleTime: 30_000, // Cache válido por 30 segundos
  })

  return {
    ...result,
    query,
    setQuery,
    residents: result.data?.data || [],
    meta: result.data?.meta,
  }
}

/**
 * Hook para buscar residente específico
 *
 * Busca dados completos de um residente.
 * Cache automaticamente isolado por tenant.
 *
 * @example
 * const { data: resident, isLoading } = useResident(residentId)
 */
export function useResident(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'
  return useQuery({
    queryKey: tenantKey('residents', id),
    queryFn: () => {
      if (!id) {
        throw new Error('ID is required')
      }
      return residentsAPI.getById(id)
    },
    enabled: shouldFetch,
    staleTime: 60_000, // Cache válido por 1 minuto
  })
}

/**
 * Hook para criar novo residente
 *
 * Mutation que cria residente e invalida cache automaticamente.
 *
 * @example
 * const createResident = useCreateResident()
 * await createResident.mutateAsync(formData)
 */
export function useCreateResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateResidentDto) => residentsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })
    },
  })
}

/**
 * Hook para atualizar residente existente
 *
 * Mutation que atualiza residente e invalida cache automaticamente.
 * Cria nova versão no histórico (versionamento automático).
 *
 * @example
 * const updateResident = useUpdateResident()
 * await updateResident.mutateAsync({ id, data: formData })
 */
export function useUpdateResident() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResidentDto }) =>
      residentsAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', variables.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', variables.id, 'history') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })
      toast({
        title: 'Residente atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: errorMessage || 'Não foi possível atualizar o residente.',
      })
    },
  })
}

/**
 * Hook para deletar residente (soft delete)
 *
 * Mutation que marca residente como deletado (não remove fisicamente).
 * Preserva dados para auditoria e histórico.
 *
 * @example
 * const deleteResident = useDeleteResident()
 * await deleteResident.mutateAsync({ id, deleteReason: 'Transferido' })
 */
export function useDeleteResident() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      residentsAPI.delete(id, deleteReason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', variables.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })
      toast({
        title: 'Residente excluído',
        description: 'O residente foi excluído com sucesso.',
      })
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: errorMessage || 'Não foi possível excluir o residente.',
      })
    },
  })
}

/**
 * Hook para buscar estatísticas de residentes
 *
 * Retorna métricas agregadas (total, ativos, inativos, etc.).
 * Cache automaticamente isolado por tenant.
 *
 * @example
 * const { data: stats } = useResidentStats()
 */
export function useResidentStats() {
  return useQuery({
    queryKey: tenantKey('residents', 'stats'),
    queryFn: () => residentsAPI.getStats(),
    staleTime: 60_000, // Cache válido por 1 minuto
    refetchOnMount: true, // Revalidar ao montar o componente
  })
}

/**
 * Hook para buscar histórico de versões de um residente
 *
 * Retorna todas as versões do residente com auditoria completa.
 * Cache automaticamente isolado por tenant.
 *
 * @example
 * const { data: history } = useResidentHistory(residentId)
 */
export function useResidentHistory(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'
  return useQuery({
    queryKey: tenantKey('residents', id, 'history'),
    queryFn: () => {
      if (!id) {
        throw new Error('ID is required')
      }
      return residentsAPI.getHistory(id)
    },
    enabled: shouldFetch,
    staleTime: 300_000, // Cache válido por 5 minutos (histórico muda raramente)
  })
}

/**
 * Hook para buscar versão específica do histórico
 *
 * Retorna snapshot de uma versão específica do residente.
 * Cache automaticamente isolado por tenant.
 *
 * @example
 * const { data: oldVersion } = useResidentHistoryVersion(residentId, 3)
 */
export function useResidentHistoryVersion(id: string | undefined, versionNumber: number | undefined) {
  const shouldFetch = !!id && versionNumber !== undefined
  return useQuery({
    queryKey: tenantKey('residents', id, 'history', versionNumber),
    queryFn: () => {
      if (!id || versionNumber === undefined) {
        throw new Error('ID and versionNumber are required')
      }
      return residentsAPI.getHistoryVersion(id, versionNumber)
    },
    enabled: shouldFetch,
    staleTime: Infinity, // Histórico nunca muda - cache permanente
  })
}

/**
 * Hook agregado para versionamento de residentes
 *
 * Combina histórico, atualização e exclusão em um único hook.
 * Útil para componentes que precisam de todas essas funcionalidades.
 *
 * @example
 * const { history, update, remove } = useResidentVersioning(residentId)
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
