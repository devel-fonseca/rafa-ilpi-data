import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { residentsAPI, ResidentQuery, CreateResidentDto, UpdateResidentDto } from '../api/residents.api'
import { useState } from 'react'

// Hook para listar residentes
export function useResidents(initialQuery?: ResidentQuery) {
  const [query, setQuery] = useState<ResidentQuery>(initialQuery || { page: 1, limit: 10 })

  const result = useQuery({
    queryKey: ['residents', query],
    queryFn: () => residentsAPI.getAll(query),
    placeholderData: keepPreviousData,
  })

  return {
    ...result,
    query,
    setQuery,
    residents: result.data?.data || [],
    meta: result.data?.meta,
  }
}

// Hook para buscar um residente específico
export function useResident(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'
  console.log('[useResident] id:', id, 'shouldFetch:', shouldFetch)
  return useQuery({
    queryKey: ['resident', id],
    queryFn: () => {
      if (!id) {
        throw new Error('ID is required')
      }
      return residentsAPI.getById(id)
    },
    enabled: shouldFetch,
  })
}

// Hook para criar residente
export function useCreateResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateResidentDto) => residentsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] })
      queryClient.invalidateQueries({ queryKey: ['resident-stats'] })
    },
  })
}

// Hook para atualizar residente
export function useUpdateResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResidentDto }) =>
      residentsAPI.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['residents'] })
      queryClient.invalidateQueries({ queryKey: ['resident', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['resident-stats'] })
    },
  })
}

// Hook para deletar residente
export function useDeleteResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => residentsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] })
      queryClient.invalidateQueries({ queryKey: ['resident-stats'] })
    },
  })
}

// Hook para estatísticas
export function useResidentStats() {
  return useQuery({
    queryKey: ['resident-stats'],
    queryFn: () => residentsAPI.getStats(),
  })
}