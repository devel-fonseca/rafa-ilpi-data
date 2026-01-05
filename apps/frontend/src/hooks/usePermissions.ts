import { useQuery } from '@tanstack/react-query'
import { getMyPermissions } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'

// Tipos de permissões (enum do backend)
export enum PermissionType {
  // Residentes
  VIEW_RESIDENTS = 'VIEW_RESIDENTS',
  CREATE_RESIDENTS = 'CREATE_RESIDENTS',
  UPDATE_RESIDENTS = 'UPDATE_RESIDENTS',
  DELETE_RESIDENTS = 'DELETE_RESIDENTS',

  // Perfil Clínico
  VIEW_CLINICAL_PROFILE = 'VIEW_CLINICAL_PROFILE',
  UPDATE_CLINICAL_PROFILE = 'UPDATE_CLINICAL_PROFILE',

  // Alergias
  VIEW_ALLERGIES = 'VIEW_ALLERGIES',
  CREATE_ALLERGIES = 'CREATE_ALLERGIES',
  UPDATE_ALLERGIES = 'UPDATE_ALLERGIES',
  DELETE_ALLERGIES = 'DELETE_ALLERGIES',

  // Condições Crônicas
  VIEW_CONDITIONS = 'VIEW_CONDITIONS',
  CREATE_CONDITIONS = 'CREATE_CONDITIONS',
  UPDATE_CONDITIONS = 'UPDATE_CONDITIONS',
  DELETE_CONDITIONS = 'DELETE_CONDITIONS',

  // Restrições Alimentares
  VIEW_DIETARY_RESTRICTIONS = 'VIEW_DIETARY_RESTRICTIONS',
  CREATE_DIETARY_RESTRICTIONS = 'CREATE_DIETARY_RESTRICTIONS',
  UPDATE_DIETARY_RESTRICTIONS = 'UPDATE_DIETARY_RESTRICTIONS',
  DELETE_DIETARY_RESTRICTIONS = 'DELETE_DIETARY_RESTRICTIONS',

  // Notas Clínicas
  VIEW_CLINICAL_NOTES = 'VIEW_CLINICAL_NOTES',
  CREATE_CLINICAL_NOTES = 'CREATE_CLINICAL_NOTES',
  UPDATE_CLINICAL_NOTES = 'UPDATE_CLINICAL_NOTES',
  DELETE_CLINICAL_NOTES = 'DELETE_CLINICAL_NOTES',

  // Prescrições
  VIEW_PRESCRIPTIONS = 'VIEW_PRESCRIPTIONS',
  CREATE_PRESCRIPTIONS = 'CREATE_PRESCRIPTIONS',
  UPDATE_PRESCRIPTIONS = 'UPDATE_PRESCRIPTIONS',
  DELETE_PRESCRIPTIONS = 'DELETE_PRESCRIPTIONS',

  // Administração de Medicamentos
  VIEW_MEDICATIONS = 'VIEW_MEDICATIONS',
  ADMINISTER_MEDICATIONS = 'ADMINISTER_MEDICATIONS',
  ADMINISTER_CONTROLLED_MEDICATIONS = 'ADMINISTER_CONTROLLED_MEDICATIONS',

  // Sinais Vitais
  VIEW_VITAL_SIGNS = 'VIEW_VITAL_SIGNS',
  CREATE_VITAL_SIGNS = 'CREATE_VITAL_SIGNS',

  // Vacinações
  VIEW_VACCINATIONS = 'VIEW_VACCINATIONS',
  CREATE_VACCINATIONS = 'CREATE_VACCINATIONS',
  UPDATE_VACCINATIONS = 'UPDATE_VACCINATIONS',
  DELETE_VACCINATIONS = 'DELETE_VACCINATIONS',

  // Registros Diários
  VIEW_DAILY_RECORDS = 'VIEW_DAILY_RECORDS',
  CREATE_DAILY_RECORDS = 'CREATE_DAILY_RECORDS',
  UPDATE_DAILY_RECORDS = 'UPDATE_DAILY_RECORDS',
  DELETE_DAILY_RECORDS = 'DELETE_DAILY_RECORDS',

  // Documentos
  VIEW_DOCUMENTS = 'VIEW_DOCUMENTS',
  UPLOAD_DOCUMENTS = 'UPLOAD_DOCUMENTS',
  DELETE_DOCUMENTS = 'DELETE_DOCUMENTS',

  // Leitos
  VIEW_BEDS = 'VIEW_BEDS',

  // Infraestrutura (prédios, andares, quartos, leitos)
  MANAGE_INFRASTRUCTURE = 'MANAGE_INFRASTRUCTURE',

  // Auditoria
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',

  // Perfil Institucional
  VIEW_INSTITUTIONAL_PROFILE = 'VIEW_INSTITUTIONAL_PROFILE',
  UPDATE_INSTITUTIONAL_PROFILE = 'UPDATE_INSTITUTIONAL_PROFILE',

  // POPs (Procedimentos Operacionais Padrão)
  VIEW_POPS = 'VIEW_POPS',
  CREATE_POPS = 'CREATE_POPS',
  UPDATE_POPS = 'UPDATE_POPS',
  DELETE_POPS = 'DELETE_POPS',
  PUBLISH_POPS = 'PUBLISH_POPS',
  MANAGE_POPS = 'MANAGE_POPS',

  // Agenda do Residente
  VIEW_RESIDENT_SCHEDULE = 'VIEW_RESIDENT_SCHEDULE',
  MANAGE_RESIDENT_SCHEDULE = 'MANAGE_RESIDENT_SCHEDULE',

  // Eventos Institucionais
  VIEW_INSTITUTIONAL_EVENTS = 'VIEW_INSTITUTIONAL_EVENTS',
  CREATE_INSTITUTIONAL_EVENTS = 'CREATE_INSTITUTIONAL_EVENTS',
  UPDATE_INSTITUTIONAL_EVENTS = 'UPDATE_INSTITUTIONAL_EVENTS',
  DELETE_INSTITUTIONAL_EVENTS = 'DELETE_INSTITUTIONAL_EVENTS',

  // Mensagens Internas
  VIEW_MESSAGES = 'VIEW_MESSAGES',
  SEND_MESSAGES = 'SEND_MESSAGES',
  DELETE_MESSAGES = 'DELETE_MESSAGES',
  BROADCAST_MESSAGES = 'BROADCAST_MESSAGES',

  // Usuários
  VIEW_USERS = 'VIEW_USERS',
  CREATE_USERS = 'CREATE_USERS',
  UPDATE_USERS = 'UPDATE_USERS',
  DELETE_USERS = 'DELETE_USERS',
}

export interface UserPermissions {
  inherited: PermissionType[] // Permissões herdadas do cargo
  custom: PermissionType[] // Permissões customizadas (adicionadas/removidas manualmente)
  all: PermissionType[] // Todas as permissões efetivas do usuário
}

// Query keys
export const permissionsKeys = {
  all: ['permissions'] as const,
  me: () => [...permissionsKeys.all, 'me'] as const,
}

/**
 * Hook para buscar as permissões do usuário logado
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAuthStore()

  const query = useQuery({
    queryKey: permissionsKeys.me(),
    queryFn: getMyPermissions,
    enabled: !!user && isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const hasPermission = (permission: PermissionType): boolean => {
    if (!query.data?.all) return false
    return query.data.all.includes(permission)
  }

  /**
   * Verifica se o usuário tem TODAS as permissões especificadas
   */
  const hasAllPermissions = (permissions: PermissionType[]): boolean => {
    if (!query.data?.all) return false
    return permissions.every((p) => query.data.all.includes(p))
  }

  /**
   * Verifica se o usuário tem QUALQUER UMA das permissões especificadas
   */
  const hasAnyPermission = (permissions: PermissionType[]): boolean => {
    if (!query.data?.all) return false
    return permissions.some((p) => query.data.all.includes(p))
  }

  /**
   * Verifica se o usuário é RT (Responsável Técnico)
   * Baseado no positionCode do perfil do usuário
   */
  const isTechnicalManager = (): boolean => {
    return user?.profile?.positionCode === 'TECHNICAL_MANAGER'
  }

  /**
   * Verifica se o usuário é Coordenador de Enfermagem
   */
  const isNursingCoordinator = (): boolean => {
    return user?.profile?.positionCode === 'NURSING_COORDINATOR'
  }

  /**
   * Verifica se o usuário pertence à equipe de enfermagem
   * Inclui: Enfermeiros, Técnicos e Auxiliares de Enfermagem
   */
  const isNursingStaff = (): boolean => {
    const nursingPositions = [
      'NURSE',
      'NURSING_TECHNICIAN',
      'NURSING_ASSISTANT',
      'NURSING_COORDINATOR',
    ]
    return nursingPositions.includes(user?.profile?.positionCode || '')
  }

  /**
   * Verifica se o usuário pode visualizar a agenda de prescrições
   * Apenas RT e equipe de enfermagem
   */
  const canViewPrescriptionCalendar = (): boolean => {
    return isTechnicalManager() || isNursingStaff()
  }

  return {
    permissions: query.data?.all ?? [],
    inheritedPermissions: query.data?.inherited ?? [],
    customPermissions: query.data?.custom ?? [],
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isTechnicalManager,
    isNursingCoordinator,
    isNursingStaff,
    canViewPrescriptionCalendar,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
