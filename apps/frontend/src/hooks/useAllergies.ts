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
  type UpdateAllergyDto,
} from '@/api/allergies.api'

// ==================== QUERY HOOKS ====================

/**
 * Hook para listar alergias de um residente específico
 */
export function useAllergiesByResident(residentId: string | undefined) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<Allergy[]>({
    queryKey: ['allergies', 'resident', residentId],
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return getAllergiesByResident(residentId)
    },
    enabled,
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
    queryKey: ['allergies', id],
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
        queryKey: ['allergies', 'resident', newAllergy.residentId],
      })

      toast.success('Alergia registrada com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao registrar alergia'
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
    mutationFn: ({ id, data }: { id: string; data: UpdateAllergyDto }) =>
      updateAllergy(id, data),
    onSuccess: (updatedAllergy) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['allergies', 'resident', updatedAllergy.residentId],
      })
      queryClient.invalidateQueries({ queryKey: ['allergies', updatedAllergy.id] })

      toast.success('Alergia atualizada com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao atualizar alergia'
      toast.error(message)
    },
  })
}

/**
 * Hook para soft delete de alergia
 */
export function useDeleteAllergy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteAllergy(id),
    onSuccess: () => {
      // Invalidar todas as queries de allergies
      queryClient.invalidateQueries({ queryKey: ['allergies'] })

      toast.success('Alergia excluída com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao excluir alergia'
      toast.error(message)
    },
  })
}
