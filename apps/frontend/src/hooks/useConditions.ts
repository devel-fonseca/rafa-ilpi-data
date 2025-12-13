import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createCondition,
  getConditionsByResident,
  getCondition,
  updateCondition,
  deleteCondition,
  type Condition,
  type CreateConditionDto,
  type UpdateConditionDto,
} from '@/api/conditions.api'

// ==================== QUERY HOOKS ====================

/**
 * Hook para listar condições crônicas de um residente específico
 */
export function useConditionsByResident(residentId: string | undefined) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<Condition[]>({
    queryKey: ['conditions', 'resident', residentId],
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return getConditionsByResident(residentId)
    },
    enabled,
    placeholderData: [],
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar uma condição por ID
 */
export function useCondition(id: string | undefined) {
  const enabled = !!id

  return useQuery<Condition>({
    queryKey: ['conditions', id],
    queryFn: () => {
      if (!id) {
        throw new Error('id is required')
      }
      return getCondition(id)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// ==================== MUTATION HOOKS ====================

/**
 * Hook para criar nova condição crônica / diagnóstico
 */
export function useCreateCondition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateConditionDto) => createCondition(data),
    onSuccess: (newCondition) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['conditions', 'resident', newCondition.residentId],
      })

      toast.success('Condição registrada com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao registrar condição'
      toast.error(message)
    },
  })
}

/**
 * Hook para atualizar condição
 */
export function useUpdateCondition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConditionDto }) =>
      updateCondition(id, data),
    onSuccess: (updatedCondition) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['conditions', 'resident', updatedCondition.residentId],
      })
      queryClient.invalidateQueries({ queryKey: ['conditions', updatedCondition.id] })

      toast.success('Condição atualizada com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao atualizar condição'
      toast.error(message)
    },
  })
}

/**
 * Hook para soft delete de condição com versionamento
 */
export function useDeleteCondition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteCondition(id, deleteReason),
    onSuccess: () => {
      // Invalidar todas as queries de conditions
      queryClient.invalidateQueries({ queryKey: ['conditions'] })

      toast.success('Condição excluída com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao excluir condição'
      toast.error(message)
    },
  })
}
