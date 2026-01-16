import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createMedication,
  getMedicationsByPrescription,
  getMedication,
  updateMedication,
  deleteMedication,
  getMedicationHistory,
  getMedicationHistoryVersion,
  type CreateMedicationDto,
  type UpdateMedicationVersionedDto,
} from '@/api/medications.api'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para listar medicamentos de uma prescrição
 *
 * Busca medicamentos do tenant atual filtrados por prescrição.
 * Cache automaticamente isolado por tenant via tenantKey().
 *
 * @example
 * const { data: medications, isLoading } = useMedicationsByPrescription(prescriptionId)
 */
export function useMedicationsByPrescription(prescriptionId: string | undefined) {
  const shouldFetch = !!prescriptionId

  return useQuery({
    queryKey: tenantKey('medications', 'prescription', prescriptionId),
    queryFn: () => {
      if (!prescriptionId) {
        throw new Error('Prescription ID is required')
      }
      return getMedicationsByPrescription(prescriptionId)
    },
    enabled: shouldFetch,
    staleTime: 30_000, // Cache válido por 30 segundos
  })
}

/**
 * Hook para buscar medicamento específico
 *
 * Busca dados completos de um medicamento.
 * Cache automaticamente isolado por tenant.
 *
 * @example
 * const { data: medication, isLoading } = useMedication(medicationId)
 */
export function useMedication(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: tenantKey('medications', id),
    queryFn: () => {
      if (!id) {
        throw new Error('Medication ID is required')
      }
      return getMedication(id)
    },
    enabled: shouldFetch,
    staleTime: 60_000, // Cache válido por 1 minuto
  })
}

/**
 * Hook para buscar histórico de versões de um medicamento
 *
 * Retorna todas as versões do medicamento com auditoria completa.
 * Cache automaticamente isolado por tenant.
 *
 * @example
 * const { data: history } = useMedicationHistory(medicationId)
 */
export function useMedicationHistory(id: string | undefined) {
  const shouldFetch = !!id && id !== 'new'

  return useQuery({
    queryKey: tenantKey('medications', id, 'history'),
    queryFn: () => {
      if (!id) {
        throw new Error('Medication ID is required')
      }
      return getMedicationHistory(id)
    },
    enabled: shouldFetch,
    staleTime: 300_000, // Cache válido por 5 minutos (histórico muda raramente)
  })
}

/**
 * Hook para buscar versão específica do histórico
 *
 * Retorna snapshot de uma versão específica do medicamento.
 * Cache automaticamente isolado por tenant.
 *
 * @example
 * const { data: oldVersion } = useMedicationHistoryVersion(medicationId, 3)
 */
export function useMedicationHistoryVersion(id: string | undefined, versionNumber: number | undefined) {
  const shouldFetch = !!id && versionNumber !== undefined

  return useQuery({
    queryKey: tenantKey('medications', id, 'history', versionNumber),
    queryFn: () => {
      if (!id || versionNumber === undefined) {
        throw new Error('Medication ID and version number are required')
      }
      return getMedicationHistoryVersion(id, versionNumber)
    },
    enabled: shouldFetch,
    staleTime: Infinity, // Histórico nunca muda - cache permanente
  })
}

/**
 * Hook para criar novo medicamento
 *
 * Mutation que cria medicamento e invalida cache automaticamente.
 *
 * @example
 * const createMed = useCreateMedication()
 * await createMed.mutateAsync(formData)
 */
export function useCreateMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMedicationDto) => createMedication(data),
    onSuccess: (newMedication) => {
      // Invalidar lista de medicamentos da prescrição
      queryClient.invalidateQueries({
        queryKey: tenantKey('medications', 'prescription', newMedication.prescriptionId),
      })
      // Invalidar prescrição (lista de medicamentos mudou)
      queryClient.invalidateQueries({
        queryKey: tenantKey('prescriptions', newMedication.prescriptionId),
      })
      // Invalidar agenda (novo medicamento = novos horários)
      queryClient.invalidateQueries({
        queryKey: tenantKey('agenda'),
      })
    },
  })
}

/**
 * Hook para atualizar medicamento existente
 *
 * Mutation que atualiza medicamento e invalida cache automaticamente.
 * Cria nova versão no histórico (versionamento automático).
 *
 * @example
 * const updateMed = useUpdateMedication()
 * await updateMed.mutateAsync({ id, data: { ...formData, changeReason: 'Ajuste de dose' } })
 */
export function useUpdateMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMedicationVersionedDto }) =>
      updateMedication(id, data),
    onSuccess: (updatedMedication, variables) => {
      // Invalidar medicamento específico
      queryClient.invalidateQueries({
        queryKey: tenantKey('medications', variables.id),
      })
      // Invalidar lista de medicamentos da prescrição
      queryClient.invalidateQueries({
        queryKey: tenantKey('medications', 'prescription', updatedMedication.prescriptionId),
      })
      // Invalidar histórico (nova versão criada)
      queryClient.invalidateQueries({
        queryKey: tenantKey('medications', variables.id, 'history'),
      })
      // Invalidar prescrição
      queryClient.invalidateQueries({
        queryKey: tenantKey('prescriptions', updatedMedication.prescriptionId),
      })
      // Invalidar agenda (horários podem ter mudado)
      queryClient.invalidateQueries({
        queryKey: tenantKey('agenda'),
      })
    },
  })
}

/**
 * Hook para deletar medicamento (soft delete)
 *
 * Mutation que marca medicamento como deletado (não remove fisicamente).
 * Preserva dados para auditoria e histórico.
 *
 * IMPORTANTE: Requer prescriptionId para invalidar cache corretamente.
 *
 * @example
 * const deleteMed = useDeleteMedication()
 * await deleteMed.mutateAsync({
 *   id: medicationId,
 *   deleteReason: 'Medicamento suspenso pelo médico',
 *   prescriptionId: medication.prescriptionId
 * })
 */
export function useDeleteMedication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string; prescriptionId: string }) =>
      deleteMedication(id, deleteReason),
    onSuccess: (_, variables) => {
      // Invalidar medicamento específico
      queryClient.invalidateQueries({
        queryKey: tenantKey('medications', variables.id),
      })
      // Invalidar lista de medicamentos da prescrição
      queryClient.invalidateQueries({
        queryKey: tenantKey('medications', 'prescription', variables.prescriptionId),
      })
      // Invalidar histórico
      queryClient.invalidateQueries({
        queryKey: tenantKey('medications', variables.id, 'history'),
      })
      // Invalidar prescrição
      queryClient.invalidateQueries({
        queryKey: tenantKey('prescriptions', variables.prescriptionId),
      })
      // Invalidar agenda (medicamento removido = horários cancelados)
      queryClient.invalidateQueries({
        queryKey: tenantKey('agenda'),
      })
    },
  })
}

/**
 * Hook agregado para versionamento de medicamentos
 *
 * Combina histórico, atualização e exclusão em um único hook.
 * Útil para componentes que precisam de todas essas funcionalidades.
 *
 * @example
 * const { history, update, remove } = useMedicationVersioning(medicationId)
 */
export function useMedicationVersioning(medicationId: string | null) {
  const history = useMedicationHistory(medicationId || undefined)
  const update = useUpdateMedication()
  const remove = useDeleteMedication()

  return {
    history,
    update,
    remove,
    isLoading: history.isLoading || update.isPending || remove.isPending,
    isError: history.isError || update.isError || remove.isError,
  }
}
