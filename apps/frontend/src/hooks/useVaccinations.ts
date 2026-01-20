import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'

export interface Vaccination {
  id: string
  vaccine: string
  dose: string
  date: string
  batch: string
  manufacturer: string
  cnes: string
  healthUnit: string
  municipality: string
  state: string
  certificateUrl?: string // DEPRECATED: usar processedFileUrl
  notes?: string
  // Arquivo original (backup para auditoria)
  originalFileUrl?: string | null
  originalFileKey?: string | null
  originalFileName?: string | null
  originalFileSize?: number | null
  originalFileMimeType?: string | null
  originalFileHash?: string | null
  // Arquivo processado (PDF com carimbo institucional)
  processedFileUrl?: string | null
  processedFileKey?: string | null
  processedFileName?: string | null
  processedFileSize?: number | null
  processedFileHash?: string | null
  // Token público para validação
  publicToken?: string | null
  // Metadados do processamento
  processingMetadata?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  resident?: {
    id: string
    fullName: string
  }
  user?: {
    id: string
    name: string
  }
}

export interface CreateVaccinationInput {
  vaccine: string
  dose: string
  date: string | Date
  batch: string
  manufacturer: string
  cnes: string
  healthUnit: string
  municipality: string
  state: string
  certificateUrl?: string
  notes?: string
  residentId: string
}

export interface UpdateVaccinationInput {
  vaccine?: string
  dose?: string
  date?: string | Date
  batch?: string
  manufacturer?: string
  cnes?: string
  healthUnit?: string
  municipality?: string
  state?: string
  certificateUrl?: string
  notes?: string
  residentId?: string
}

/**
 * Hook para listar vacinações de um residente
 * Retorna ordenado por data DESC (mais recente primeiro)
 */
export function useVaccinationsByResident(
  residentId: string | null | undefined,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: tenantKey('vaccinations', 'resident', residentId),
    queryFn: async () => {
      const response = await api.get<Vaccination[]>(
        `/vaccinations/resident/${residentId}`,
      )
      return response.data
    },
    enabled: !!residentId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para obter detalhes de uma vacinação
 */
export function useVaccination(vaccinationId: string | null | undefined) {
  return useQuery({
    queryKey: tenantKey('vaccinations', vaccinationId),
    queryFn: async () => {
      const response = await api.get<Vaccination>(`/vaccinations/${vaccinationId}`)
      return response.data
    },
    enabled: !!vaccinationId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook para criar nova vacinação
 */
export function useCreateVaccination() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateVaccinationInput) => {
      const response = await api.post<Vaccination>('/vaccinations', data)
      return response.data
    },
    onSuccess: (data) => {
      // Invalida cache da lista de vacinações do residente
      queryClient.invalidateQueries({
        queryKey: tenantKey('vaccinations', 'resident', data.resident?.id),
      })
    },
  })
}

/**
 * Hook para atualizar vacinação
 */
export function useUpdateVaccination() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdateVaccinationInput
    }) => {
      const response = await api.patch<Vaccination>(
        `/vaccinations/${id}`,
        data,
      )
      return response.data
    },
    onSuccess: (data) => {
      // Invalida cache da lista e detalhes
      queryClient.invalidateQueries({
        queryKey: tenantKey('vaccinations', 'resident', data.resident?.id),
      })
      queryClient.invalidateQueries({
        queryKey: tenantKey('vaccinations', data.id),
      })
    },
  })
}

/**
 * Hook para deletar vacinação
 */
export function useDeleteVaccination() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (vaccinationId: string) => {
      await api.delete(`/vaccinations/${vaccinationId}`)
    },
    onSuccess: (_, vaccinationId) => {
      // Invalida todos os caches de vacinações
      queryClient.invalidateQueries({
        queryKey: tenantKey('vaccinations'),
      })
      queryClient.removeQueries({
        queryKey: tenantKey('vaccinations', vaccinationId),
      })
    },
  })
}
