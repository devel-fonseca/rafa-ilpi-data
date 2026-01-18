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

  // Invalidar audit queries (que agora usam tenantKey)
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      return queryKey.some(k => typeof k === 'string' && k === 'audit')
    }
  })

  // Invalidar notifications queries
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      return queryKey.some(k => typeof k === 'string' && k === 'notifications')
    }
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

  // Invalidar usando predicate para pegar variações com tenantKey
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]

      // Verificar se é schedule-configs ou scheduled-events com esse residente
      const isScheduleQuery = queryKey.some(k =>
        typeof k === 'string' && (k.includes('schedule-configs') || k.includes('scheduled-events'))
      )

      const hasResidentId = queryKey.some(k =>
        k === residentId || k === 'resident' && queryKey.includes(residentId)
      )

      return isScheduleQuery && hasResidentId
    }
  })

  // Invalidar daily-tasks que podem ter esse residentId
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      const isDailyTasksQuery = queryKey.some(k =>
        typeof k === 'string' && k.includes('daily-tasks')
      )

      const hasResidentId = queryKey.some(k => k === residentId)

      return isDailyTasksQuery && (hasResidentId || !hasResidentId) // Invalidar TODAS daily-tasks
    }
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

  // Invalidar usando predicate para pegar variações com tenantKey
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]

      // Verificar se é daily-records query
      const isDailyRecordsQuery = queryKey.some(k =>
        typeof k === 'string' && k.includes('daily-records')
      )

      const hasResidentId = queryKey.some(k =>
        typeof k === 'string' && k === residentId ||
        (typeof k === 'object' && k !== null && 'residentId' in k)
      )

      const hasDate = recordDate ? queryKey.some(k =>
        typeof k === 'string' && k === recordDate ||
        (typeof k === 'object' && k !== null && 'date' in k)
      ) : true

      return isDailyRecordsQuery && (hasResidentId || hasDate)
    }
  })

  // Tarefas diárias (para atualizar status)
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      return queryKey.some(k => typeof k === 'string' && k.includes('daily-tasks'))
    }
  })

  // Dashboard do cuidador (tarefas agregadas)
  console.log('🔄 Invalidando queries caregiver-tasks')
  queryClient.invalidateQueries({
    predicate: (query) => {
      const shouldInvalidate = Array.isArray(query.queryKey) &&
        query.queryKey[0] === 'caregiver-tasks'
      if (shouldInvalidate) {
        console.log('✅ Invalidando query:', query.queryKey)
      }
      return shouldInvalidate
    },
  })

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
 * Invalida:
 * - Listas de prescrições (todas as variações)
 * - Prescrição específica
 * - Medicamentos relacionados
 * - Dashboard e agenda (afetados por prescrições)
 * - Queries globais
 *
 * @param queryClient - Instância do QueryClient
 * @param residentId - ID do residente (opcional para listas gerais)
 * @param prescriptionId - ID da prescrição (opcional)
 *
 * @example
 * onSuccess: (data) => {
 *   invalidateAfterPrescriptionMutation(queryClient, data.residentId, data.id)
 * }
 */
export function invalidateAfterPrescriptionMutation(
  queryClient: QueryClient,
  residentId?: string,
  prescriptionId?: string
) {
  console.log(`🔄 Invalidando queries de prescriptions${residentId ? ` para ${residentId}` : ''}`)

  // Invalidar todas as queries de prescriptions usando predicate
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]

      const isPrescriptionsQuery = queryKey.some(k =>
        typeof k === 'string' && k.includes('prescriptions')
      )

      // Se tem residentId, filtrar por ele também
      if (residentId) {
        const hasResidentId = queryKey.some(k =>
          typeof k === 'string' && k === residentId ||
          (typeof k === 'object' && k !== null && 'residentId' in k)
        )
        return isPrescriptionsQuery && hasResidentId
      }

      return isPrescriptionsQuery
    }
  })

  // Invalidar prescrição específica se fornecida
  if (prescriptionId) {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey as unknown[]
        return queryKey.some(k => k === prescriptionId)
      }
    })
  }

  // Invalidar medications relacionadas
  if (residentId) {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey as unknown[]
        const isMedicationsQuery = queryKey.some(k =>
          typeof k === 'string' && k.includes('medications')
        )
        const hasResidentId = queryKey.some(k =>
          typeof k === 'string' && k === residentId
        )
        return isMedicationsQuery && hasResidentId
      }
    })
  }

  // Invalidar agenda (prescrições afetam medicamentos agendados)
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      return queryKey.some(k => typeof k === 'string' && k.includes('agenda'))
    }
  })

  // Invalidar dashboard
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      return queryKey.some(k => typeof k === 'string' && k.includes('dashboard'))
    }
  })

  // Queries globais
  invalidateGlobalQueries(queryClient)
}

/**
 * Invalida queries relacionadas a BEDS & ROOMS
 *
 * Use quando: Criar/editar/deletar leito, transferir residente, atribuir leito
 *
 * Invalida:
 * - Listas de leitos (todas as variações)
 * - Leitos específicos
 * - Quartos, andares e prédios (estrutura completa)
 * - Residentes (se houver transferência)
 * - Queries globais
 *
 * @param queryClient - Instância do QueryClient
 * @param bedIds - IDs dos leitos afetados (opcional)
 * @param residentId - ID do residente afetado (opcional)
 *
 * @example
 * // Após transferência
 * invalidateAfterBedMutation(queryClient, [sourceBedId, targetBedId], residentId)
 */
export function invalidateAfterBedMutation(
  queryClient: QueryClient,
  bedIds?: string[],
  residentId?: string
) {
  console.log('🔄 Invalidando queries de beds')

  // Invalidar queries de beds usando predicate
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      return queryKey.some(k => typeof k === 'string' && k.includes('beds'))
    }
  })

  // Invalidar rooms, floors, buildings (estrutura completa)
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      return queryKey.some(k =>
        typeof k === 'string' && (
          k.includes('rooms') ||
          k.includes('floors') ||
          k.includes('buildings')
        )
      )
    }
  })

  // Se afeta residente, invalidar queries de residents
  if (residentId) {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey as unknown[]
        const isResidentsQuery = queryKey.some(k =>
          typeof k === 'string' && k.includes('residents')
        )
        const hasResidentId = queryKey.some(k => k === residentId)
        return isResidentsQuery && hasResidentId
      }
    })
  }

  // Queries globais
  invalidateGlobalQueries(queryClient)
}

/**
 * DEPRECATED: Use invalidateAfterBedMutation
 * Mantido para compatibilidade
 */
export function invalidateAfterBedTransfer(
  queryClient: QueryClient,
  bedIds: string[]
) {
  console.log('⚠️ invalidateAfterBedTransfer is deprecated, use invalidateAfterBedMutation')
  invalidateAfterBedMutation(queryClient, bedIds)
}

/**
 * Invalida queries relacionadas a MEDICATIONS
 *
 * Use quando: Criar/editar/deletar medicamento
 *
 * Invalida:
 * - Listas de medicamentos
 * - Medicamento específico
 * - Prescrição relacionada
 * - Agenda (medicamentos agendados)
 * - Queries globais
 *
 * @param queryClient - Instância do QueryClient
 * @param prescriptionId - ID da prescrição
 * @param medicationId - ID do medicamento (opcional)
 *
 * @example
 * onSuccess: (data) => {
 *   invalidateAfterMedicationMutation(queryClient, data.prescriptionId, data.id)
 * }
 */
export function invalidateAfterMedicationMutation(
  queryClient: QueryClient,
  prescriptionId: string,
  medicationId?: string
) {
  console.log(`🔄 Invalidando queries de medications para prescrição ${prescriptionId}`)

  // Invalidar medications usando predicate
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      const isMedicationsQuery = queryKey.some(k =>
        typeof k === 'string' && k.includes('medications')
      )
      const hasPrescriptionId = queryKey.some(k => k === prescriptionId)
      return isMedicationsQuery && hasPrescriptionId
    }
  })

  // Invalidar medicamento específico se fornecido
  if (medicationId) {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey as unknown[]
        return queryKey.some(k => k === medicationId)
      }
    })
  }

  // Invalidar prescrição relacionada
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      const isPrescriptionsQuery = queryKey.some(k =>
        typeof k === 'string' && k.includes('prescriptions')
      )
      const hasPrescriptionId = queryKey.some(k => k === prescriptionId)
      return isPrescriptionsQuery && hasPrescriptionId
    }
  })

  // Invalidar agenda (medicamentos = horários agendados)
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      return queryKey.some(k => typeof k === 'string' && k.includes('agenda'))
    }
  })

  // Queries globais
  invalidateGlobalQueries(queryClient)
}

/**
 * Invalida queries relacionadas a AGENDA INSTITUCIONAL
 *
 * Use quando: Criar/editar/deletar evento institucional
 *
 * Invalida:
 * - Agenda institucional (todas as variações)
 * - Queries globais
 *
 * @param queryClient - Instância do QueryClient
 *
 * @example
 * onSuccess: () => {
 *   invalidateAfterAgendaMutation(queryClient)
 * }
 */
export function invalidateAfterAgendaMutation(
  queryClient: QueryClient
) {
  console.log('🔄 Invalidando queries de agenda')

  // Invalidar agenda usando predicate
  queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey as unknown[]
      return queryKey.some(k => typeof k === 'string' && k.includes('agenda'))
    }
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
 * ┌──────────────────────────────────────────┬───────────────────────────────────┐
 * │ AÇÃO                                     │ HELPER                            │
 * ├──────────────────────────────────────────┼───────────────────────────────────┤
 * │ CREATE/UPDATE/DELETE Schedule Config     │ invalidateAfterScheduleMutation   │
 * │ CREATE/UPDATE/DELETE Scheduled Event     │ invalidateAfterScheduleMutation   │
 * │ CREATE/UPDATE/DELETE Daily Record        │ invalidateAfterDailyRecordMutation│
 * │ CREATE/UPDATE/DELETE Resident            │ invalidateAfterResidentMutation   │
 * │ UPDATE Clinical Profile                  │ invalidateAfterClinicalMutation   │
 * │ CREATE/UPDATE Vital Sign                 │ invalidateAfterClinicalMutation   │
 * │ CREATE/UPDATE Clinical Note              │ invalidateAfterClinicalMutation   │
 * │ CREATE/UPDATE/DELETE Prescription        │ invalidateAfterPrescriptionMutation│
 * │ ADMINISTER Medication                    │ invalidateAfterPrescriptionMutation│
 * │ CREATE/UPDATE/DELETE Medication          │ invalidateAfterMedicationMutation │
 * │ CREATE/UPDATE/DELETE Bed                 │ invalidateAfterBedMutation        │
 * │ TRANSFER Bed                             │ invalidateAfterBedMutation        │
 * │ ASSIGN Resident to Bed                   │ invalidateAfterBedMutation        │
 * │ CREATE/UPDATE/DELETE Institutional Event │ invalidateAfterAgendaMutation     │
 * │ SWITCH Tenant/User                       │ queryClient.clear() [auth.store]  │
 * └──────────────────────────────────────────┴───────────────────────────────────┘
 *
 * REGRAS GERAIS:
 * 1. Sempre invalide queries globais (audit + notifications)
 * 2. Use predicate para buscar padrões (não match exato de queryKey)
 * 3. Invalide queries relacionadas (ex: medication → prescription + agenda)
 * 4. Em caso de dúvida, prefira invalidar mais do que menos
 *    (é melhor refetch desnecessário do que dado desatualizado)
 *
 * MIGRAÇÃO DE CÓDIGO ANTIGO:
 * ❌ EVITE: queryClient.invalidateQueries({ queryKey: tenantKey('resource') })
 * ✅ USE: invalidateAfterXxxMutation(queryClient, ...params)
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
