import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bedsAPI, ReserveBedDto, BlockBedDto, ReleaseBedDto } from '@/api/beds.api'

/**
 * Hook para reservar um leito
 */
export function useReserveBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ bedId, data }: { bedId: string; data: ReserveBedDto }) =>
      bedsAPI.reserveBed(bedId, data),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['bed-status-history'] })
    },
  })
}

/**
 * Hook para bloquear um leito para manutenção
 */
export function useBlockBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ bedId, data }: { bedId: string; data: BlockBedDto }) =>
      bedsAPI.blockBed(bedId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['bed-status-history'] })
    },
  })
}

/**
 * Hook para liberar um leito (Disponível)
 */
export function useReleaseBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ bedId, data }: { bedId: string; data: ReleaseBedDto }) =>
      bedsAPI.releaseBed(bedId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['bed-status-history'] })
    },
  })
}

/**
 * Hook para buscar histórico de mudanças de status
 */
export function useBedStatusHistory(params?: { bedId?: string; skip?: number; take?: number }) {
  return useQuery({
    queryKey: ['bed-status-history', params],
    queryFn: () => bedsAPI.getBedStatusHistory(params),
  })
}
