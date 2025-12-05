import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createClinicalProfile,
  getClinicalProfileByResident,
  updateClinicalProfile,
  deleteClinicalProfile,
  type ClinicalProfile,
  type CreateClinicalProfileDto,
  type UpdateClinicalProfileDto,
} from '@/api/clinicalProfiles.api'

// ==================== QUERY HOOKS ====================

/**
 * Hook para buscar o perfil clínico de um residente
 */
export function useClinicalProfile(residentId: string | undefined) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<ClinicalProfile | null>({
    queryKey: ['clinical-profiles', 'resident', residentId],
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return getClinicalProfileByResident(residentId)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

// ==================== MUTATION HOOKS ====================

/**
 * Hook para criar novo perfil clínico
 */
export function useCreateClinicalProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateClinicalProfileDto) => createClinicalProfile(data),
    onSuccess: (newProfile) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['clinical-profiles', 'resident', newProfile.residentId],
      })

      toast.success('Perfil clínico criado com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao criar perfil clínico'
      toast.error(message)
    },
  })
}

/**
 * Hook para atualizar perfil clínico
 */
export function useUpdateClinicalProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClinicalProfileDto }) =>
      updateClinicalProfile(id, data),
    onSuccess: (updatedProfile) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ['clinical-profiles', 'resident', updatedProfile.residentId],
      })

      toast.success('Perfil clínico atualizado com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao atualizar perfil clínico'
      toast.error(message)
    },
  })
}

/**
 * Hook para soft delete de perfil clínico
 */
export function useDeleteClinicalProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteClinicalProfile(id),
    onSuccess: () => {
      // Invalidar todas as queries de clinical profiles
      queryClient.invalidateQueries({ queryKey: ['clinical-profiles'] })

      toast.success('Perfil clínico excluído com sucesso')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao excluir perfil clínico'
      toast.error(message)
    },
  })
}
