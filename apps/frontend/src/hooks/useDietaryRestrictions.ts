import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createDietaryRestriction,
  getDietaryRestrictionsByResident,
  getDietaryRestriction,
  updateDietaryRestriction,
  deleteDietaryRestriction,
  type DietaryRestriction,
  type CreateDietaryRestrictionDto,
  type UpdateDietaryRestrictionDto,
} from '@/api/dietaryRestrictions.api'
import { tenantKey } from '@/lib/query-keys'

// ==================== QUERY HOOKS ====================

/**
 * Hook para listar restrições alimentares de um residente específico
 */
export function useDietaryRestrictionsByResident(residentId: string | undefined) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<DietaryRestriction[]>({
    queryKey: tenantKey('dietary-restrictions', 'resident', residentId),
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return getDietaryRestrictionsByResident(residentId)
    },
    enabled,
    placeholderData: [],
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar uma restrição alimentar por ID
 */
export function useDietaryRestriction(id: string | undefined) {
  const enabled = !!id

  return useQuery<DietaryRestriction>({
    queryKey: tenantKey('dietary-restrictions', id),
    queryFn: () => {
      if (!id) {
        throw new Error('id is required')
      }
      return getDietaryRestriction(id)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// ==================== MUTATION HOOKS ====================

/**
 * Hook para criar nova restrição alimentar
 */
export function useCreateDietaryRestriction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDietaryRestrictionDto) => createDietaryRestriction(data),
    onSuccess: (newRestriction) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: tenantKey('dietary-restrictions', 'resident', newRestriction.residentId),
      })

      toast.success('Restrição alimentar registrada com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao registrar restrição alimentar'
      toast.error(message)
    },
  })
}

/**
 * Hook para atualizar restrição alimentar
 */
export function useUpdateDietaryRestriction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDietaryRestrictionDto }) =>
      updateDietaryRestriction(id, data),
    onSuccess: (updatedRestriction) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: tenantKey('dietary-restrictions', 'resident', updatedRestriction.residentId),
      })
      queryClient.invalidateQueries({
        queryKey: tenantKey('dietary-restrictions', updatedRestriction.id),
      })

      toast.success('Restrição alimentar atualizada com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message =
        errorResponse?.data?.message || 'Erro ao atualizar restrição alimentar'
      toast.error(message)
    },
  })
}

/**
 * Hook para soft delete de restrição alimentar com versionamento
 */
export function useDeleteDietaryRestriction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteDietaryRestriction(id, deleteReason),
    onSuccess: () => {
      // Invalidar todas as queries de dietary restrictions
      queryClient.invalidateQueries({ queryKey: tenantKey('dietary-restrictions') })

      toast.success('Restrição alimentar excluída com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao excluir restrição alimentar'
      toast.error(message)
    },
  })
}
