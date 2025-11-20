import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bedsAPI, CreateBedDto, UpdateBedDto, AssignBedDto } from '../api/beds.api'

// Hook para listar leitos
export function useBeds(roomId?: string) {
  return useQuery({
    queryKey: ['beds', roomId],
    queryFn: () => bedsAPI.getAllBeds(roomId),
  })
}

// Hook para buscar um leito específico
export function useBed(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: ['bed', id],
    queryFn: () => {
      if (!id) {
        throw new Error('ID é obrigatório')
      }
      return bedsAPI.getBedById(id)
    },
    enabled: shouldFetch,
  })
}

// Hook para criar leito
export function useCreateBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBedDto) => bedsAPI.createBed(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room', data.roomId] })
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}

// Hook para atualizar leito
export function useUpdateBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBedDto }) =>
      bedsAPI.updateBed(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['bed', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room', result.roomId] })
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}

// Hook para deletar leito
export function useDeleteBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => bedsAPI.deleteBed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}

// Hook para atribuir residente a leito
export function useAssignResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ bedId, residentId }: { bedId: string; residentId: string }) =>
      bedsAPI.assignResident(bedId, { bedId, residentId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['bed', data.id] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room', data.roomId] })
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
  })
}

// Hook para desatribuir residente de leito
export function useUnassignResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bedId: string) => bedsAPI.unassignResident(bedId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['bed', data.id] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room', data.roomId] })
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['residents'] })
    },
  })
}
