import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bedsAPI, CreateRoomDto, UpdateRoomDto } from '../api/beds.api'

// Hook para listar quartos
export function useRooms(floorId?: string) {
  return useQuery({
    queryKey: ['rooms', floorId],
    queryFn: () => bedsAPI.getAllRooms(floorId),
  })
}

// Hook para buscar um quarto específico
export function useRoom(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: ['room', id],
    queryFn: () => {
      if (!id) {
        throw new Error('ID é obrigatório')
      }
      return bedsAPI.getRoomById(id)
    },
    enabled: shouldFetch,
  })
}

// Hook para criar quarto
export function useCreateRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateRoomDto) => bedsAPI.createRoom(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['floor', data.floorId] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}

// Hook para atualizar quarto
export function useUpdateRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoomDto }) =>
      bedsAPI.updateRoom(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['floor', result.floorId] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}

// Hook para deletar quarto
export function useDeleteRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => bedsAPI.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}
