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
  VIEW_MEDICATION_ADMINISTRATION = 'VIEW_MEDICATION_ADMINISTRATION',
  ADMINISTER_MEDICATION = 'ADMINISTER_MEDICATION',

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

  // Infraestrutura (quartos, leitos, etc)
  MANAGE_INFRASTRUCTURE = 'MANAGE_INFRASTRUCTURE',

  // Auditoria
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',

  // Perfil Institucional
  VIEW_INSTITUTIONAL_PROFILE = 'VIEW_INSTITUTIONAL_PROFILE',
  UPDATE_INSTITUTIONAL_PROFILE = 'UPDATE_INSTITUTIONAL_PROFILE',

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
    if (!query.data) return false
    return query.data.all.includes(permission)
  }

  /**
   * Verifica se o usuário tem TODAS as permissões especificadas
   */
  const hasAllPermissions = (permissions: PermissionType[]): boolean => {
    if (!query.data) return false
    return permissions.every((p) => query.data.all.includes(p))
  }

  /**
   * Verifica se o usuário tem QUALQUER UMA das permissões especificadas
   */
  const hasAnyPermission = (permissions: PermissionType[]): boolean => {
    if (!query.data) return false
    return permissions.some((p) => query.data.all.includes(p))
  }

  return {
    permissions: query.data?.all ?? [],
    inheritedPermissions: query.data?.inherited ?? [],
    customPermissions: query.data?.custom ?? [],
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
