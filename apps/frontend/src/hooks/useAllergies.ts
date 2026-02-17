import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createAllergy,
  getAllergiesByResident,
  getAllergy,
  updateAllergy,
  deleteAllergy,
  type Allergy,
  type CreateAllergyDto,
  type UpdateAllergyVersionedDto,
} from '@/api/allergies.api'
import { tenantKey } from '@/lib/query-keys'

// ==================== QUERY HOOKS ====================

/**
 * Hook para listar alergias de um residente específico
 */
export function useAllergiesByResident(
  residentId: string | undefined,
  enabled: boolean = true,
) {
  const queryEnabled = !!residentId && residentId !== 'new' && enabled

  return useQuery<Allergy[]>({
    queryKey: tenantKey('allergies', 'resident', residentId),
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return getAllergiesByResident(residentId)
    },
    enabled: queryEnabled,
    placeholderData: [],
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar uma alergia por ID
 */
export function useAllergy(id: string | undefined) {
  const enabled = !!id

  return useQuery<Allergy>({
    queryKey: tenantKey('allergies', id),
    queryFn: () => {
      if (!id) {
        throw new Error('id is required')
      }
      return getAllergy(id)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// ==================== MUTATION HOOKS ====================

/**
 * Hook para criar nova alergia
 */
export function useCreateAllergy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAllergyDto) => createAllergy(data),
    onSuccess: (newAllergy) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: tenantKey('allergies', 'resident', newAllergy.residentId),
      })

      toast.success('Alergia registrada com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao registrar alergia'
      toast.error(message)
    },
  })
}

/**
 * Hook para atualizar alergia
 */
export function useUpdateAllergy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAllergyVersionedDto }) =>
      updateAllergy(id, data),
    onSuccess: (updatedAllergy) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: tenantKey('allergies', 'resident', updatedAllergy.residentId),
      })
      queryClient.invalidateQueries({ queryKey: tenantKey('allergies', updatedAllergy.id) })

      toast.success('Alergia atualizada com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao atualizar alergia'
      toast.error(message)
    },
  })
}

/**
 * Hook para soft delete de alergia com versionamento
 */
export function useDeleteAllergy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteAllergy(id, deleteReason),
    onSuccess: () => {
      // Invalidar todas as queries de allergies
      queryClient.invalidateQueries({ queryKey: tenantKey('allergies') })

      toast.success('Alergia excluída com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao excluir alergia'
      toast.error(message)
    },
  })
}
