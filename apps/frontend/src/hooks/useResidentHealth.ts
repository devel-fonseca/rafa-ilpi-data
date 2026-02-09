import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getResidentHealthSummary,
  getBloodType,
  createBloodType,
  updateBloodType,
  getAnthropometryRecords,
  getLatestAnthropometry,
  createAnthropometry,
  updateAnthropometry,
  deleteAnthropometry,
  getDependencyAssessments,
  getCurrentDependencyAssessment,
  createDependencyAssessment,
  updateDependencyAssessment,
  type ResidentHealthSummary,
  type ResidentBloodType,
  type CreateBloodTypeDto,
  type UpdateBloodTypeDto,
  type ResidentAnthropometry,
  type CreateAnthropometryDto,
  type UpdateAnthropometryDto,
  type ResidentDependencyAssessment,
  type CreateDependencyAssessmentDto,
  type UpdateDependencyAssessmentDto,
} from '@/api/resident-health.api'
import { tenantKey } from '@/lib/query-keys'

// ==================== QUERY HOOKS ====================

/**
 * Hook para buscar resumo de saúde do residente (agregado)
 */
export function useResidentHealthSummary(
  residentId: string | undefined,
  enabled: boolean = true,
) {
  const queryEnabled = !!residentId && residentId !== 'new' && enabled

  return useQuery<ResidentHealthSummary>({
    queryKey: tenantKey('resident-health', 'summary', residentId),
    queryFn: () => {
      if (!residentId) throw new Error('residentId is required')
      return getResidentHealthSummary(residentId)
    },
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

// ==================== BLOOD TYPE ====================

/**
 * Hook para buscar tipo sanguíneo do residente
 */
export function useBloodType(residentId: string | undefined) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<ResidentBloodType | null>({
    queryKey: tenantKey('resident-health', 'blood-type', residentId),
    queryFn: () => {
      if (!residentId) throw new Error('residentId is required')
      return getBloodType(residentId)
    },
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutos - raramente muda
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para criar tipo sanguíneo
 */
export function useCreateBloodType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBloodTypeDto) => createBloodType(data),
    onSuccess: (newBloodType) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'blood-type', newBloodType.residentId),
      })
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'summary', newBloodType.residentId),
      })
      toast.success('Tipo sanguíneo registrado com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao registrar tipo sanguíneo'
      toast.error(message)
    },
  })
}

/**
 * Hook para atualizar tipo sanguíneo
 */
export function useUpdateBloodType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBloodTypeDto }) =>
      updateBloodType(id, data),
    onSuccess: (updatedBloodType) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'blood-type', updatedBloodType.residentId),
      })
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'summary', updatedBloodType.residentId),
      })
      toast.success('Tipo sanguíneo atualizado com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao atualizar tipo sanguíneo'
      toast.error(message)
    },
  })
}

// ==================== ANTHROPOMETRY ====================

/**
 * Hook para listar medições antropométricas
 */
export function useAnthropometryRecords(
  residentId: string | undefined,
  limit = 10,
  enabled: boolean = true,
) {
  const queryEnabled = !!residentId && residentId !== 'new' && enabled

  return useQuery<ResidentAnthropometry[]>({
    queryKey: tenantKey('resident-health', 'anthropometry', residentId, limit),
    queryFn: () => {
      if (!residentId) throw new Error('residentId is required')
      return getAnthropometryRecords(residentId, limit)
    },
    enabled: queryEnabled,
    placeholderData: [],
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar última medição antropométrica
 */
export function useLatestAnthropometry(residentId: string | undefined) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<ResidentAnthropometry | null>({
    queryKey: tenantKey('resident-health', 'anthropometry', 'latest', residentId),
    queryFn: () => {
      if (!residentId) throw new Error('residentId is required')
      return getLatestAnthropometry(residentId)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para criar medição antropométrica
 */
export function useCreateAnthropometry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAnthropometryDto) => createAnthropometry(data),
    onSuccess: (newRecord) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'anthropometry', newRecord.residentId),
      })
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'summary', newRecord.residentId),
      })
      toast.success('Medição antropométrica registrada com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao registrar medição'
      toast.error(message)
    },
  })
}

/**
 * Hook para atualizar medição antropométrica
 */
export function useUpdateAnthropometry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAnthropometryDto }) =>
      updateAnthropometry(id, data),
    onSuccess: (updatedRecord) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'anthropometry', updatedRecord.residentId),
      })
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'summary', updatedRecord.residentId),
      })
      toast.success('Medição antropométrica atualizada com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao atualizar medição'
      toast.error(message)
    },
  })
}

/**
 * Hook para excluir medição antropométrica
 */
export function useDeleteAnthropometry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      deleteAnthropometry(id, deleteReason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'anthropometry'),
      })
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'summary'),
      })
      toast.success('Medição antropométrica excluída com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao excluir medição'
      toast.error(message)
    },
  })
}

// ==================== DEPENDENCY ASSESSMENT ====================

/**
 * Hook para listar avaliações de dependência
 */
export function useDependencyAssessments(
  residentId: string | undefined,
  enabled: boolean = true,
) {
  const queryEnabled = !!residentId && residentId !== 'new' && enabled

  return useQuery<ResidentDependencyAssessment[]>({
    queryKey: tenantKey('resident-health', 'dependency-assessments', residentId),
    queryFn: () => {
      if (!residentId) throw new Error('residentId is required')
      return getDependencyAssessments(residentId)
    },
    enabled: queryEnabled,
    placeholderData: [],
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para buscar avaliação de dependência vigente
 */
export function useCurrentDependencyAssessment(residentId: string | undefined) {
  const enabled = !!residentId && residentId !== 'new'

  return useQuery<ResidentDependencyAssessment | null>({
    queryKey: tenantKey('resident-health', 'dependency-assessments', 'current', residentId),
    queryFn: () => {
      if (!residentId) throw new Error('residentId is required')
      return getCurrentDependencyAssessment(residentId)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook para criar avaliação de dependência
 */
export function useCreateDependencyAssessment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateDependencyAssessmentDto) => createDependencyAssessment(data),
    onSuccess: (newAssessment) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'dependency-assessments', newAssessment.residentId),
      })
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'summary', newAssessment.residentId),
      })
      toast.success('Avaliação de dependência registrada com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao registrar avaliação'
      toast.error(message)
    },
  })
}

/**
 * Hook para atualizar avaliação de dependência
 */
export function useUpdateDependencyAssessment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDependencyAssessmentDto }) =>
      updateDependencyAssessment(id, data),
    onSuccess: (updatedAssessment) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'dependency-assessments', updatedAssessment.residentId),
      })
      queryClient.invalidateQueries({
        queryKey: tenantKey('resident-health', 'summary', updatedAssessment.residentId),
      })
      toast.success('Avaliação de dependência atualizada com sucesso')
    },
    onError: (error: unknown) => {
      const errorResponse = (error as { response?: { data?: { message?: string } } }).response
      const message = errorResponse?.data?.message || 'Erro ao atualizar avaliação'
      toast.error(message)
    },
  })
}
