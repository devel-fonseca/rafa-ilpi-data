/**
 * QUERY INVALIDATION - Sistema Inteligente de Invalidação de Cache
 *
 * Este arquivo centraliza a lógica de invalidação de queries do React Query.
 * Garante que mudanças em um módulo atualizem automaticamente todos os
 * módulos relacionados.
 *
 * PROBLEMA QUE RESOLVE:
 * - ❌ Antes: Criar uma config de agenda não atualizava atividades recentes
 * - ❌ Antes: Trocar de usuário mantinha dados do usuário anterior
 * - ❌ Antes: Completar um registro não atualizava a lista de tarefas
 * - ✅ Agora: Invalidação automática e inteligente de todas queries relacionadas
 *
 * COMO USAR:
 *
 * @example
 * // Em um hook de mutation
 * export function useCreateScheduleConfig() {
 *   const queryClient = useQueryClient()
 *
 *   return useMutation({
 *     mutationFn: createConfig,
 *     onSuccess: (data) => {
 *       // ✅ Um helper cuida de TUDO
 *       invalidateAfterScheduleMutation(queryClient, data.residentId)
 *     }
 *   })
 * }
 */

import { QueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/queryKeys'

// ──────────────────────────────────────────────────────────────────────────
// HELPERS GLOBAIS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Invalida queries "globais" que aparecem em múltiplas telas
 * Use após qualquer mutation que deve aparecer em atividades recentes
 *
 * Invalida:
 * - Audit logs (atividades recentes)
 * - Notificações
 *
 * @example
 * onSuccess: () => {
 *   invalidateGlobalQueries(queryClient)
 * }
 */
export function invalidateGlobalQueries(queryClient: QueryClient) {
  console.log('🔄 Invalidando queries globais (audit + notifications)')

  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.audit.all,
  })

  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.notifications.all,
  })
}

// ──────────────────────────────────────────────────────────────────────────
// HELPERS POR MÓDULO
// ──────────────────────────────────────────────────────────────────────────

/**
 * Invalida queries relacionadas a RESIDENT SCHEDULE
 *
 * Use quando: Criar/editar/deletar configuração de agenda ou evento agendado
 *
 * Invalida:
 * - Configurações do residente
 * - Tarefas diárias do residente
 * - Eventos agendados do residente
 * - Queries globais (audit + notifications)
 *
 * @param queryClient - Instância do QueryClient
 * @param residentId - ID do residente afetado
 *
 * @example
 * // Após criar/editar config
 * onSuccess: (data) => {
 *   invalidateAfterScheduleMutation(queryClient, data.residentId)
 * }
 */
export function invalidateAfterScheduleMutation(
  queryClient: QueryClient,
  residentId: string
) {
  console.log(`🔄 Invalidando queries de schedule para residente ${residentId}`)

  // Queries específicas do residente
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.scheduleConfigs.byResident(residentId),
  })

  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.dailyTasks.byResident(residentId),
  })

  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.scheduledEvents.byResident(residentId),
  })

  // Queries globais
  invalidateGlobalQueries(queryClient)
}

/**
 * Invalida queries relacionadas a DAILY RECORDS
 *
 * Use quando: Criar/editar/deletar registro diário
 *
 * Invalida:
 * - Lista geral de registros
 * - Registros do residente
 * - Registros da data específica
 * - Tarefas diárias (para atualizar status completed)
 * - Queries globais
 *
 * @param queryClient - Instância do QueryClient
 * @param residentId - ID do residente
 * @param recordDate - Data do registro (opcional, formato YYYY-MM-DD)
 *
 * @example
 * // Após criar registro
 * onSuccess: (data) => {
 *   invalidateAfterDailyRecordMutation(
 *     queryClient,
 *     data.residentId,
 *     data.date
 *   )
 * }
 */
export function invalidateAfterDailyRecordMutation(
  queryClient: QueryClient,
  residentId: string,
  recordDate?: string
) {
  console.log(`🔄 Invalidando queries de daily records para residente ${residentId}`)

  // Listas gerais
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.dailyRecords.all,
  })

  // Queries específicas
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.dailyRecords.byResident(residentId),
  })

  if (recordDate) {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.dailyRecords.byDate(recordDate),
    })

    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.dailyRecords.byResidentAndDate(residentId, recordDate),
    })
  }

  // Tarefas diárias (para atualizar status)
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.dailyTasks.byResident(residentId),
  })

  if (recordDate) {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.dailyTasks.byDate(recordDate),
    })
  }

  // Queries globais
  invalidateGlobalQueries(queryClient)
}

/**
 * Invalida queries relacionadas a RESIDENT
 *
 * Use quando: Criar/editar/deletar residente
 *
 * Invalida:
 * - Lista de residentes
 * - Detalhes do residente
 * - Documentos do residente
 * - Queries globais
 *
 * @param queryClient - Instância do QueryClient
 * @param residentId - ID do residente (opcional para create)
 *
 * @example
 * onSuccess: (data) => {
 *   invalidateAfterResidentMutation(queryClient, data.id)
 * }
 */
export function invalidateAfterResidentMutation(
  queryClient: QueryClient,
  residentId?: string
) {
  console.log('🔄 Invalidando queries de residents')

  // Listas gerais
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.residents.all,
  })

  // Se tem ID, invalidar detalhes também
  if (residentId) {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.residents.detail(residentId),
    })

    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.residents.documents(residentId),
    })
  }

  // Queries globais
  invalidateGlobalQueries(queryClient)
}

/**
 * Invalida queries relacionadas a CLINICAL DATA
 *
 * Use quando: Criar/editar perfil clínico, sinal vital, nota clínica
 *
 * @param queryClient - Instância do QueryClient
 * @param residentId - ID do residente
 * @param clinicalDataType - Tipo de dado clínico afetado
 */
export function invalidateAfterClinicalMutation(
  queryClient: QueryClient,
  residentId: string,
  clinicalDataType: 'profile' | 'vitalSign' | 'note'
) {
  console.log(`🔄 Invalidando queries clínicas (${clinicalDataType}) para ${residentId}`)

  switch (clinicalDataType) {
    case 'profile':
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.clinicalProfiles.byResident(residentId),
      })
      break

    case 'vitalSign':
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.vitalSigns.byResident(residentId),
      })
      break

    case 'note':
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.clinicalNotes.byResident(residentId),
      })
      break
  }

  // Queries globais
  invalidateGlobalQueries(queryClient)
}

/**
 * Invalida queries relacionadas a PRESCRIPTIONS
 *
 * Use quando: Criar/editar/deletar prescrição ou administrar medicação
 *
 * @param queryClient - Instância do QueryClient
 * @param residentId - ID do residente
 * @param prescriptionId - ID da prescrição (opcional)
 */
export function invalidateAfterPrescriptionMutation(
  queryClient: QueryClient,
  residentId: string,
  prescriptionId?: string
) {
  console.log(`🔄 Invalidando queries de prescriptions para ${residentId}`)

  // Listas
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.prescriptions.all,
  })

  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.prescriptions.byResident(residentId),
  })

  // Detalhes específicos
  if (prescriptionId) {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.prescriptions.detail(prescriptionId),
    })
  }

  // Medications relacionadas
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.medications.byResident(residentId),
  })

  // Queries globais
  invalidateGlobalQueries(queryClient)
}

/**
 * Invalida queries relacionadas a BEDS & ROOMS
 *
 * Use quando: Transferir residente de leito
 *
 * @param queryClient - Instância do QueryClient
 * @param bedIds - IDs dos leitos afetados (origem e destino)
 */
export function invalidateAfterBedTransfer(
  queryClient: QueryClient,
  bedIds: string[]
) {
  console.log('🔄 Invalidando queries de beds após transferência')

  // Listas gerais
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.beds.all,
  })

  // Detalhes específicos dos leitos
  bedIds.forEach((bedId) => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.beds.detail(bedId),
    })
  })

  // Queries globais
  invalidateGlobalQueries(queryClient)
}

// ──────────────────────────────────────────────────────────────────────────
// MATRIZ DE INVALIDAÇÃO (Documentação)
// ──────────────────────────────────────────────────────────────────────────

/**
 * MATRIZ DE INVALIDAÇÃO - Guia de Referência Rápida
 *
 * Ação → Helper a usar:
 *
 * ┌─────────────────────────────────────────┬──────────────────────────────────┐
 * │ AÇÃO                                    │ HELPER                           │
 * ├─────────────────────────────────────────┼──────────────────────────────────┤
 * │ CREATE/UPDATE/DELETE Schedule Config    │ invalidateAfterScheduleMutation  │
 * │ CREATE/UPDATE/DELETE Scheduled Event    │ invalidateAfterScheduleMutation  │
 * │ CREATE/UPDATE/DELETE Daily Record       │ invalidateAfterDailyRecordMutation│
 * │ CREATE/UPDATE/DELETE Resident           │ invalidateAfterResidentMutation  │
 * │ UPDATE Clinical Profile                 │ invalidateAfterClinicalMutation  │
 * │ CREATE/UPDATE Vital Sign                │ invalidateAfterClinicalMutation  │
 * │ CREATE/UPDATE Clinical Note             │ invalidateAfterClinicalMutation  │
 * │ CREATE/UPDATE/DELETE Prescription       │ invalidateAfterPrescriptionMutation│
 * │ ADMINISTER Medication                   │ invalidateAfterPrescriptionMutation│
 * │ TRANSFER Bed                            │ invalidateAfterBedTransfer       │
 * │ SWITCH Tenant/User                      │ queryClient.clear() [auth.store] │
 * └─────────────────────────────────────────┴──────────────────────────────────┘
 *
 * REGRAS GERAIS:
 * 1. Sempre invalide queries globais (audit + notifications)
 * 2. Sempre invalide queries específicas do residente afetado
 * 3. Se tem data, invalide queries filtradas por data também
 * 4. Em caso de dúvida, prefira invalidar mais do que menos
 *    (é melhor refetch desnecessário do que dado desatualizado)
 */

/**
 * EXEMPLO DE USO COMPLETO:
 *
 * // Em um hook de mutation
 * export function useCreateScheduleConfig() {
 *   const queryClient = useQueryClient()
 *
 *   return useMutation({
 *     mutationFn: async (data: CreateScheduleConfigInput) => {
 *       const response = await api.post('/schedule/configs', data)
 *       return response.data
 *     },
 *     onSuccess: (data) => {
 *       // ✅ Um helper cuida de TUDO automaticamente
 *       invalidateAfterScheduleMutation(queryClient, data.residentId)
 *
 *       // ✅ Toast de sucesso
 *       toast.success('Configuração criada com sucesso')
 *     },
 *     onError: (error) => {
 *       // ❌ Erro
 *       toast.error('Erro ao criar configuração')
 *     }
 *   })
 * }
 */
