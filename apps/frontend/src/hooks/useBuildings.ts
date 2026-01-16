import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bedsAPI, CreateBuildingDto, UpdateBuildingDto } from '../api/beds.api'
import { tenantKey } from '@/lib/query-keys'

// Hook para listar prédios
export function useBuildings() {
  return useQuery({
    queryKey: tenantKey('buildings'),
    queryFn: () => bedsAPI.getAllBuildings(),
  })
}

// Hook para buscar um prédio específico
export function useBuilding(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: tenantKey('buildings', id),
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
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds-hierarchy') })
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
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings', variables.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds-hierarchy') })
    },
  })
}

// Hook para deletar prédio
export function useDeleteBuilding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => bedsAPI.deleteBuilding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds-hierarchy') })
    },
  })
}
