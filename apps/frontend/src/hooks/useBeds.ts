import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bedsAPI, CreateBedDto, UpdateBedDto } from '../api/beds.api'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para listar leitos
 *
 * Busca leitos do tenant atual, opcionalmente filtrados por quarto.
 * Cache automaticamente isolado por tenant via tenantKey().
 *
 * @example
 * const { data: beds, isLoading } = useBeds()
 *
 * @example
 * const { data: roomBeds } = useBeds(roomId)
 */
export function useBeds(roomId?: string) {
  return useQuery({
    queryKey: tenantKey('beds', roomId ? `room-${roomId}` : 'all'),
    queryFn: () => bedsAPI.getAllBeds(roomId),
    staleTime: 30_000, // Cache válido por 30 segundos
  })
}

/**
 * Hook para buscar leito específico
 *
 * Busca dados completos de um leito incluindo ocupação.
 * Cache automaticamente isolado por tenant.
 *
 * @example
 * const { data: bed, isLoading } = useBed(bedId)
 */
export function useBed(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: tenantKey('beds', id),
    queryFn: () => {
      if (!id) {
        throw new Error('ID é obrigatório')
      }
      return bedsAPI.getBedById(id)
    },
    enabled: shouldFetch,
    staleTime: 30_000, // Cache válido por 30 segundos
  })
}

/**
 * Hook para criar novo leito
 *
 * Mutation que cria leito e invalida cache automaticamente.
 *
 * @example
 * const createBed = useCreateBed()
 * await createBed.mutateAsync(formData)
 */
export function useCreateBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBedDto) => bedsAPI.createBed(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })
      queryClient.invalidateQueries({ queryKey: tenantKey('rooms') })
      queryClient.invalidateQueries({ queryKey: tenantKey('rooms', data.roomId) })
      queryClient.invalidateQueries({ queryKey: tenantKey('floors') })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
    },
  })
}

/**
 * Hook para atualizar leito existente
 *
 * Mutation que atualiza leito e invalida cache automaticamente.
 *
 * @example
 * const updateBed = useUpdateBed()
 * await updateBed.mutateAsync({ id, data: formData })
 */
export function useUpdateBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBedDto }) =>
      bedsAPI.updateBed(id, data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds', variables.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('rooms') })
      queryClient.invalidateQueries({ queryKey: tenantKey('rooms', result.roomId) })
      queryClient.invalidateQueries({ queryKey: tenantKey('floors') })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
    },
  })
}

/**
 * Hook para deletar leito
 *
 * Mutation que remove leito e invalida cache automaticamente.
 *
 * @example
 * const deleteBed = useDeleteBed()
 * await deleteBed.mutateAsync(bedId)
 */
export function useDeleteBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => bedsAPI.deleteBed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })
      queryClient.invalidateQueries({ queryKey: tenantKey('rooms') })
      queryClient.invalidateQueries({ queryKey: tenantKey('floors') })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
    },
  })
}

/**
 * Hook para atribuir residente a leito
 *
 * Mutation que vincula residente a um leito e invalida cache automaticamente.
 *
 * @example
 * const assignResident = useAssignResident()
 * await assignResident.mutateAsync({ bedId, residentId })
 */
export function useAssignResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ bedId, residentId }: { bedId: string; residentId: string }) =>
      bedsAPI.assignResident(bedId, { bedId, residentId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds', data.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('rooms') })
      queryClient.invalidateQueries({ queryKey: tenantKey('rooms', data.roomId) })
      queryClient.invalidateQueries({ queryKey: tenantKey('floors') })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents') })
    },
  })
}

/**
 * Hook para desatribuir residente de leito
 *
 * Mutation que remove vínculo de residente com leito e invalida cache automaticamente.
 *
 * @example
 * const unassignResident = useUnassignResident()
 * await unassignResident.mutateAsync(bedId)
 */
export function useUnassignResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bedId: string) => bedsAPI.unassignResident(bedId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds', data.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('rooms') })
      queryClient.invalidateQueries({ queryKey: tenantKey('rooms', data.roomId) })
      queryClient.invalidateQueries({ queryKey: tenantKey('floors') })
      queryClient.invalidateQueries({ queryKey: tenantKey('buildings') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents') })
    },
  })
}
