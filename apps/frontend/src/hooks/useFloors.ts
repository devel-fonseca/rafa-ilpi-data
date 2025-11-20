import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bedsAPI, CreateFloorDto, UpdateFloorDto } from '../api/beds.api'

// Hook para listar andares
export function useFloors(buildingId?: string) {
  return useQuery({
    queryKey: ['floors', buildingId],
    queryFn: () => bedsAPI.getAllFloors(buildingId),
  })
}

// Hook para buscar um andar específico
export function useFloor(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: ['floor', id],
    queryFn: () => {
      if (!id) {
        throw new Error('ID é obrigatório')
      }
      return bedsAPI.getFloorById(id)
    },
    enabled: shouldFetch,
  })
}

// Hook para criar andar
export function useCreateFloor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateFloorDto) => bedsAPI.createFloor(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['building', data.buildingId] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}

// Hook para atualizar andar
export function useUpdateFloor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFloorDto }) =>
      bedsAPI.updateFloor(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['floor', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['building', result.buildingId] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}

// Hook para deletar andar
export function useDeleteFloor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => bedsAPI.deleteFloor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] })
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}
