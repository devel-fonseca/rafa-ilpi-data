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
} from '@/api/clinical-profiles.api'
import { tenantKey } from '@/lib/query-keys'

// ==================== QUERY HOOKS ====================

/**
 * Hook para buscar o perfil clínico de um residente
 */
export function useClinicalProfile(
  residentId: string | undefined,
  enabled: boolean = true,
) {
  const queryEnabled = !!residentId && residentId !== 'new' && enabled

  return useQuery<ClinicalProfile | null>({
    queryKey: tenantKey('clinical-profiles', 'resident', residentId),
    queryFn: () => {
      if (!residentId) {
        throw new Error('residentId is required')
      }
      return getClinicalProfileByResident(residentId)
    },
    enabled: queryEnabled,
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
        queryKey: tenantKey('clinical-profiles', 'resident', newProfile.residentId),
      })

      toast.success('Perfil clínico criado com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao criar perfil clínico'
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
        queryKey: tenantKey('clinical-profiles', 'resident', updatedProfile.residentId),
      })

      // Invalidar também a query do residente, pois mobilityAid é atualizado lá
      queryClient.invalidateQueries({
        queryKey: tenantKey('residents', updatedProfile.residentId),
      })

      toast.success('Perfil clínico atualizado com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao atualizar perfil clínico'
      toast.error(message)
    },
  })
}

/**
 * Hook para soft delete de perfil clínico com versionamento
 */
export function useDeleteClinicalProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteClinicalProfile(id, deleteReason),
    onSuccess: () => {
      // Invalidar todas as queries de clinical profiles
      queryClient.invalidateQueries({ queryKey: tenantKey('clinical-profiles') })

      toast.success('Perfil clínico excluído com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao excluir perfil clínico'
      toast.error(message)
    },
  })
}
