import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bedsAPI, CreateBuildingDto, UpdateBuildingDto } from '../api/beds.api'

// Hook para listar prédios
export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: () => bedsAPI.getAllBuildings(),
  })
}

// Hook para buscar um prédio específico
export function useBuilding(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: ['building', id],
    queryFn: () => {
      if (!id) {
        throw new Error('ID é obrigatório')
      }
      return bedsAPI.getBuildingById(id)
    },
    enabled: shouldFetch,
  })
}

// Hook para criar prédio
export function useCreateBuilding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBuildingDto) => bedsAPI.createBuilding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}

// Hook para atualizar prédio
export function useUpdateBuilding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBuildingDto }) =>
      bedsAPI.updateBuilding(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['building', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}

// Hook para deletar prédio
export function useDeleteBuilding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => bedsAPI.deleteBuilding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
      queryClient.invalidateQueries({ queryKey: ['beds-hierarchy'] })
    },
  })
}
