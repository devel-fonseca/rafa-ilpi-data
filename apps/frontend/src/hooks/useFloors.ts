import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bedsAPI, CreateFloorDto, UpdateFloorDto } from '../api/beds.api'
import { tenantKey } from '@/lib/query-keys'

// Hook para listar andares
export function useFloors(buildingId?: string) {
  return useQuery({
    queryKey: tenantKey('floors', buildingId ? `building-${buildingId}` : 'all'),
    queryFn: () => bedsAPI.getAllFloors(buildingId),
  })
}

// Hook para buscar um andar específico
export function useFloor(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: tenantKey('floors', id),
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
      queryClient.invalidateQueries({ queryKey: tenantKey('floors') })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings', data.buildingId) })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds-hierarchy') })
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
      queryClient.invalidateQueries({ queryKey: tenantKey('floors') })
      queryClient.invalidateQueries({ queryKey: tenantKey('floors', variables.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings', result.buildingId) })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds-hierarchy') })
    },
  })
}

// Hook para deletar andar
export function useDeleteFloor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => bedsAPI.deleteFloor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('floors') })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds-hierarchy') })
    },
  })
}
