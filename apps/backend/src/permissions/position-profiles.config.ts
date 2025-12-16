/**
 * Configuração de Permissões por Cargo ILPI
 *
 * Define as permissões padrão para cada cargo em uma ILPI (Instituição de Longa Permanência para Idosos).
 * Este sistema híbrido combina:
 * - Roles hierárquicos (ADMIN, MANAGER, STAFF, VIEWER)
 * - Cargos específicos de ILPI (PositionCode)
 * - Permissões granulares (PermissionType)
 */

import { PermissionType, PositionCode } from '@prisma/client';

/**
 * Interface para definição de perfil de cargo
 */
export interface PositionProfile {
  positionCode: PositionCode;
  displayName: string;
  description: string;
  requiredRegistration?: string; // Tipo de registro profissional exigido
  defaultRole: 'admin' | 'manager' | 'staff' | 'viewer';
  permissions: PermissionType[];
}

/**
 * Permissões Base por Nível Hierárquico
 */
const BASE_PERMISSIONS = {
  // VIEWER: Apenas visualização básica
  VIEWER: [
    PermissionType.VIEW_RESIDENTS,
    PermissionType.VIEW_DAILY_RECORDS,
    PermissionType.VIEW_MEDICATIONS,
    PermissionType.VIEW_VITAL_SIGNS,
    PermissionType.VIEW_POPS,
  ] as PermissionType[],

  // STAFF: Operações básicas de cuidado
  STAFF: [
    PermissionType.VIEW_RESIDENTS,
    PermissionType.VIEW_DAILY_RECORDS,
    PermissionType.CREATE_DAILY_RECORDS,
    PermissionType.UPDATE_DAILY_RECORDS,
    PermissionType.VIEW_MEDICATIONS,
    PermissionType.VIEW_VITAL_SIGNS,
    PermissionType.RECORD_VITAL_SIGNS,
    PermissionType.VIEW_VACCINATIONS,
    PermissionType.VIEW_CLINICAL_NOTES,
    PermissionType.CREATE_CLINICAL_NOTES,
    PermissionType.UPDATE_CLINICAL_NOTES,
    PermissionType.VIEW_DOCUMENTS,
    PermissionType.VIEW_BEDS,
    // Dados Clínicos
    PermissionType.VIEW_CLINICAL_PROFILE,
    PermissionType.VIEW_ALLERGIES,
    PermissionType.VIEW_CONDITIONS,
    PermissionType.VIEW_DIETARY_RESTRICTIONS,
    // POPs
    PermissionType.VIEW_POPS,
    PermissionType.CREATE_POPS, // Enfermeiros podem criar sugestões (DRAFT)
  ] as PermissionType[],

  // MANAGER: Gerenciamento clínico e operacional
  MANAGER: [
    PermissionType.VIEW_RESIDENTS,
    PermissionType.CREATE_RESIDENTS,
    PermissionType.UPDATE_RESIDENTS,
    PermissionType.VIEW_DAILY_RECORDS,
    PermissionType.CREATE_DAILY_RECORDS,
    PermissionType.UPDATE_DAILY_RECORDS,
    PermissionType.DELETE_DAILY_RECORDS,
    PermissionType.VIEW_PRESCRIPTIONS,
    PermissionType.CREATE_PRESCRIPTIONS,
    PermissionType.UPDATE_PRESCRIPTIONS,
    PermissionType.VIEW_MEDICATIONS,
    PermissionType.ADMINISTER_MEDICATIONS,
    PermissionType.ADMINISTER_CONTROLLED_MEDICATIONS,
    PermissionType.VIEW_VITAL_SIGNS,
    PermissionType.RECORD_VITAL_SIGNS,
    PermissionType.VIEW_VACCINATIONS,
    PermissionType.RECORD_VACCINATIONS,
    PermissionType.VIEW_CLINICAL_NOTES,
    PermissionType.CREATE_CLINICAL_NOTES,
    PermissionType.UPDATE_CLINICAL_NOTES,
    PermissionType.VIEW_BEDS,
    PermissionType.MANAGE_BEDS,
    PermissionType.VIEW_DOCUMENTS,
    PermissionType.UPLOAD_DOCUMENTS,
    PermissionType.VIEW_USERS,
    PermissionType.VIEW_REPORTS,
    PermissionType.EXPORT_DATA,
    // Dados Clínicos
    PermissionType.VIEW_CLINICAL_PROFILE,
    PermissionType.UPDATE_CLINICAL_PROFILE,
    PermissionType.VIEW_ALLERGIES,
    PermissionType.CREATE_ALLERGIES,
    PermissionType.UPDATE_ALLERGIES,
    PermissionType.VIEW_CONDITIONS,
    PermissionType.CREATE_CONDITIONS,
    PermissionType.UPDATE_CONDITIONS,
    PermissionType.VIEW_DIETARY_RESTRICTIONS,
    PermissionType.CREATE_DIETARY_RESTRICTIONS,
    PermissionType.UPDATE_DIETARY_RESTRICTIONS,
    // POPs
    PermissionType.VIEW_POPS,
    PermissionType.CREATE_POPS,
    PermissionType.UPDATE_POPS,
    PermissionType.DELETE_POPS,
    PermissionType.PUBLISH_POPS,
    PermissionType.MANAGE_POPS, // RT tem controle total sobre POPs
  ] as PermissionType[],

  // ADMIN: Controle total
  ADMIN: [
    // Residentes
    PermissionType.VIEW_RESIDENTS,
    PermissionType.CREATE_RESIDENTS,
    PermissionType.UPDATE_RESIDENTS,
    PermissionType.DELETE_RESIDENTS,
    // Registros
    PermissionType.VIEW_DAILY_RECORDS,
    PermissionType.CREATE_DAILY_RECORDS,
    PermissionType.UPDATE_DAILY_RECORDS,
    PermissionType.DELETE_DAILY_RECORDS,
    // Prescrições
    PermissionType.VIEW_PRESCRIPTIONS,
    PermissionType.CREATE_PRESCRIPTIONS,
    PermissionType.UPDATE_PRESCRIPTIONS,
    PermissionType.DELETE_PRESCRIPTIONS,
    // Medicamentos
    PermissionType.VIEW_MEDICATIONS,
    PermissionType.ADMINISTER_MEDICATIONS,
    PermissionType.ADMINISTER_CONTROLLED_MEDICATIONS,
    // Sinais Vitais
    PermissionType.VIEW_VITAL_SIGNS,
    PermissionType.RECORD_VITAL_SIGNS,
    // Vacinações
    PermissionType.VIEW_VACCINATIONS,
    PermissionType.RECORD_VACCINATIONS,
    // Evoluções Clínicas
    PermissionType.VIEW_CLINICAL_NOTES,
    PermissionType.CREATE_CLINICAL_NOTES,
    PermissionType.UPDATE_CLINICAL_NOTES,
    PermissionType.DELETE_CLINICAL_NOTES,
    // Dados Clínicos
    PermissionType.VIEW_CLINICAL_PROFILE,
    PermissionType.UPDATE_CLINICAL_PROFILE,
    PermissionType.VIEW_ALLERGIES,
    PermissionType.CREATE_ALLERGIES,
    PermissionType.UPDATE_ALLERGIES,
    PermissionType.DELETE_ALLERGIES,
    PermissionType.VIEW_CONDITIONS,
    PermissionType.CREATE_CONDITIONS,
    PermissionType.UPDATE_CONDITIONS,
    PermissionType.DELETE_CONDITIONS,
    PermissionType.VIEW_DIETARY_RESTRICTIONS,
    PermissionType.CREATE_DIETARY_RESTRICTIONS,
    PermissionType.UPDATE_DIETARY_RESTRICTIONS,
    PermissionType.DELETE_DIETARY_RESTRICTIONS,
    // Leitos
    PermissionType.VIEW_BEDS,
    PermissionType.MANAGE_BEDS,
    // Documentos
    PermissionType.VIEW_DOCUMENTS,
    PermissionType.UPLOAD_DOCUMENTS,
    PermissionType.DELETE_DOCUMENTS,
    // Usuários
    PermissionType.VIEW_USERS,
    PermissionType.CREATE_USERS,
    PermissionType.UPDATE_USERS,
    PermissionType.DELETE_USERS,
    PermissionType.MANAGE_PERMISSIONS,
    // Relatórios
    PermissionType.VIEW_REPORTS,
    PermissionType.EXPORT_DATA,
    PermissionType.VIEW_AUDIT_LOGS,
    // Configurações
    PermissionType.VIEW_INSTITUTIONAL_SETTINGS,
    PermissionType.UPDATE_INSTITUTIONAL_SETTINGS,
    // POPs
    PermissionType.VIEW_POPS,
    PermissionType.CREATE_POPS,
    PermissionType.UPDATE_POPS,
    PermissionType.DELETE_POPS,
    PermissionType.PUBLISH_POPS,
    PermissionType.MANAGE_POPS, // Admin tem controle total sobre POPs
  ] as PermissionType[],
};

/**
 * Configuração de Perfis de Cargos ILPI
 * Cada cargo herda permissões base do seu role + permissões específicas
 */
export const ILPI_POSITION_PROFILES: Record<PositionCode, PositionProfile> = {
  // ─────────────────────────────────────────────────────────────────────────
  // NÍVEL ADMINISTRATIVO
  // ─────────────────────────────────────────────────────────────────────────
  [PositionCode.ADMINISTRATOR]: {
    positionCode: PositionCode.ADMINISTRATOR,
    displayName: 'Administrador',
    description: 'Responsável pela gestão administrativa e operacional da ILPI',
    defaultRole: 'admin',
    permissions: [
      // Gerenciamento de Residentes (cadastro/administrativo)
      PermissionType.VIEW_RESIDENTS,
      PermissionType.CREATE_RESIDENTS,
      PermissionType.UPDATE_RESIDENTS,
      PermissionType.DELETE_RESIDENTS,
      // Visualização de Dados Clínicos (somente leitura)
      PermissionType.VIEW_CLINICAL_PROFILE,
      PermissionType.VIEW_ALLERGIES,
      PermissionType.VIEW_CONDITIONS,
      PermissionType.VIEW_DIETARY_RESTRICTIONS,
      PermissionType.VIEW_PRESCRIPTIONS,
      PermissionType.VIEW_MEDICATIONS,
      PermissionType.VIEW_VITAL_SIGNS,
      PermissionType.VIEW_VACCINATIONS,
      PermissionType.VIEW_CLINICAL_NOTES,
      PermissionType.VIEW_DAILY_RECORDS,
      // Gerenciamento Operacional
      PermissionType.VIEW_BEDS,
      PermissionType.MANAGE_BEDS,
      PermissionType.MANAGE_INFRASTRUCTURE,
      PermissionType.VIEW_DOCUMENTS,
      PermissionType.UPLOAD_DOCUMENTS,
      // Perfil Institucional
      PermissionType.VIEW_INSTITUTIONAL_PROFILE,
      PermissionType.UPDATE_INSTITUTIONAL_PROFILE,
      // Gestão de Usuários e Sistema
      PermissionType.VIEW_USERS,
      PermissionType.CREATE_USERS,
      PermissionType.UPDATE_USERS,
      PermissionType.DELETE_USERS,
      PermissionType.MANAGE_PERMISSIONS,
      // Relatórios e Exportação
      PermissionType.VIEW_REPORTS,
      PermissionType.EXPORT_DATA,
      PermissionType.VIEW_AUDIT_LOGS,
    ],
  },

  [PositionCode.ADMINISTRATIVE_ASSISTANT]: {
    positionCode: PositionCode.ADMINISTRATIVE_ASSISTANT,
    displayName: 'Assistente Administrativo',
    description: 'Auxilia na gestão administrativa e documental',
    defaultRole: 'staff',
    permissions: [
      ...BASE_PERMISSIONS.STAFF,
      PermissionType.CREATE_RESIDENTS,
      PermissionType.UPDATE_RESIDENTS,
      PermissionType.UPLOAD_DOCUMENTS,
      PermissionType.MANAGE_BEDS,
      PermissionType.VIEW_REPORTS,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NÍVEL GERENCIAL CLÍNICO
  // ─────────────────────────────────────────────────────────────────────────
  [PositionCode.TECHNICAL_MANAGER]: {
    positionCode: PositionCode.TECHNICAL_MANAGER,
    displayName: 'Responsável Técnico',
    description: 'Responsável técnico da ILPI (nível superior, conforme RDC 502/2021)',
    requiredRegistration: 'Nível Superior com registro no conselho',
    defaultRole: 'admin',
    permissions: [...BASE_PERMISSIONS.ADMIN],
  },

  [PositionCode.NURSING_COORDINATOR]: {
    positionCode: PositionCode.NURSING_COORDINATOR,
    displayName: 'Coordenador de Enfermagem',
    description: 'Coordena e supervisiona a equipe de enfermagem',
    requiredRegistration: 'COREN',
    defaultRole: 'manager',
    permissions: [...BASE_PERMISSIONS.MANAGER],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EQUIPE DE ENFERMAGEM
  // ─────────────────────────────────────────────────────────────────────────
  [PositionCode.NURSE]: {
    positionCode: PositionCode.NURSE,
    displayName: 'Enfermeiro',
    description: 'Enfermeiro responsável pelos cuidados de enfermagem',
    requiredRegistration: 'COREN',
    defaultRole: 'manager',
    permissions: [
      ...BASE_PERMISSIONS.MANAGER,
      // Enfermeiros podem criar prescrições de enfermagem
      PermissionType.CREATE_PRESCRIPTIONS,
    ],
  },

  [PositionCode.NURSING_TECHNICIAN]: {
    positionCode: PositionCode.NURSING_TECHNICIAN,
    displayName: 'Técnico de Enfermagem',
    description: 'Técnico de enfermagem para cuidados assistenciais',
    requiredRegistration: 'COREN',
    defaultRole: 'staff',
    permissions: [
      ...BASE_PERMISSIONS.STAFF,
      PermissionType.ADMINISTER_MEDICATIONS,
      PermissionType.RECORD_VACCINATIONS,
      PermissionType.UPDATE_RESIDENTS, // Atualizar dados de saúde
    ],
  },

  [PositionCode.NURSING_ASSISTANT]: {
    positionCode: PositionCode.NURSING_ASSISTANT,
    displayName: 'Auxiliar de Enfermagem',
    description: 'Auxiliar de enfermagem com permissões básicas de cuidados',
    requiredRegistration: 'COREN',
    defaultRole: 'staff',
    permissions: [
      ...BASE_PERMISSIONS.STAFF,
      PermissionType.ADMINISTER_MEDICATIONS,
      PermissionType.RECORD_VACCINATIONS,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EQUIPE MÉDICA
  // ─────────────────────────────────────────────────────────────────────────
  [PositionCode.DOCTOR]: {
    positionCode: PositionCode.DOCTOR,
    displayName: 'Médico',
    description: 'Médico responsável pelas prescrições e acompanhamento clínico',
    requiredRegistration: 'CRM',
    defaultRole: 'manager',
    permissions: [
      ...BASE_PERMISSIONS.MANAGER,
      // Médicos têm permissão para prescrever medicamentos controlados
      PermissionType.CREATE_PRESCRIPTIONS,
      PermissionType.UPDATE_PRESCRIPTIONS,
      PermissionType.DELETE_PRESCRIPTIONS,
      PermissionType.ADMINISTER_CONTROLLED_MEDICATIONS,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EQUIPE MULTIPROFISSIONAL
  // ─────────────────────────────────────────────────────────────────────────
  [PositionCode.NUTRITIONIST]: {
    positionCode: PositionCode.NUTRITIONIST,
    displayName: 'Nutricionista',
    description: 'Nutricionista responsável pela avaliação e acompanhamento nutricional',
    requiredRegistration: 'CRN',
    defaultRole: 'staff',
    permissions: [
      ...BASE_PERMISSIONS.STAFF,
      PermissionType.CREATE_RESIDENTS,
      PermissionType.UPDATE_RESIDENTS,
      PermissionType.VIEW_REPORTS,
      PermissionType.EXPORT_DATA,
    ],
  },

  [PositionCode.PHYSIOTHERAPIST]: {
    positionCode: PositionCode.PHYSIOTHERAPIST,
    displayName: 'Fisioterapeuta',
    description: 'Fisioterapeuta para reabilitação e manutenção funcional',
    requiredRegistration: 'CREFITO',
    defaultRole: 'staff',
    permissions: [
      ...BASE_PERMISSIONS.STAFF,
      PermissionType.UPDATE_RESIDENTS,
      PermissionType.VIEW_REPORTS,
      PermissionType.EXPORT_DATA,
    ],
  },

  [PositionCode.PSYCHOLOGIST]: {
    positionCode: PositionCode.PSYCHOLOGIST,
    displayName: 'Psicólogo',
    description: 'Psicólogo para acompanhamento e suporte emocional',
    requiredRegistration: 'CRP',
    defaultRole: 'staff',
    permissions: [
      ...BASE_PERMISSIONS.STAFF,
      PermissionType.UPDATE_RESIDENTS,
      PermissionType.VIEW_REPORTS,
      PermissionType.EXPORT_DATA,
    ],
  },

  [PositionCode.SPEECH_THERAPIST]: {
    positionCode: PositionCode.SPEECH_THERAPIST,
    displayName: 'Fonoaudiólogo',
    description: 'Fonoaudiólogo para avaliação e reabilitação da comunicação',
    requiredRegistration: 'CREFONO',
    defaultRole: 'staff',
    permissions: [
      ...BASE_PERMISSIONS.STAFF,
      PermissionType.UPDATE_RESIDENTS,
      PermissionType.VIEW_REPORTS,
    ],
  },

  [PositionCode.SOCIAL_WORKER]: {
    positionCode: PositionCode.SOCIAL_WORKER,
    displayName: 'Assistente Social',
    description: 'Assistente social para acompanhamento social e familiar',
    requiredRegistration: 'CRESS',
    defaultRole: 'staff',
    permissions: [
      ...BASE_PERMISSIONS.STAFF,
      PermissionType.CREATE_RESIDENTS,
      PermissionType.UPDATE_RESIDENTS,
      PermissionType.UPLOAD_DOCUMENTS,
      PermissionType.VIEW_REPORTS,
    ],
  },

  [PositionCode.OCCUPATIONAL_THERAPIST]: {
    positionCode: PositionCode.OCCUPATIONAL_THERAPIST,
    displayName: 'Terapeuta Ocupacional',
    description: 'Terapeuta ocupacional para reabilitação e atividades terapêuticas',
    requiredRegistration: 'CREFITO',
    defaultRole: 'staff',
    permissions: [
      ...BASE_PERMISSIONS.STAFF,
      PermissionType.UPDATE_RESIDENTS,
      PermissionType.VIEW_REPORTS,
      PermissionType.EXPORT_DATA,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EQUIPE DE CUIDADOS DIRETOS
  // ─────────────────────────────────────────────────────────────────────────
  [PositionCode.CAREGIVER]: {
    positionCode: PositionCode.CAREGIVER,
    displayName: 'Cuidador de Idosos',
    description: 'Cuidador responsável pelos cuidados básicos diários',
    defaultRole: 'staff',
    permissions: [
      // Cuidadores têm permissões limitadas
      PermissionType.VIEW_RESIDENTS,
      PermissionType.VIEW_DAILY_RECORDS,
      PermissionType.CREATE_DAILY_RECORDS, // Podem registrar cuidados
      PermissionType.VIEW_MEDICATIONS,
      PermissionType.VIEW_VITAL_SIGNS,
      PermissionType.RECORD_VITAL_SIGNS, // Podem aferir sinais vitais
      PermissionType.VIEW_BEDS,
      PermissionType.VIEW_REPORTS, // Permite visualizar estatísticas do dashboard
      // Dados clínicos essenciais para cuidados seguros
      PermissionType.VIEW_ALLERGIES, // CRÍTICO: Evitar reações alérgicas
      PermissionType.VIEW_CONDITIONS, // IMPORTANTE: Conhecer condições crônicas
      PermissionType.VIEW_DIETARY_RESTRICTIONS, // ESSENCIAL: Respeitar restrições alimentares
    ],
  },

  [PositionCode.ADMINISTRATIVE]: {
    positionCode: PositionCode.ADMINISTRATIVE,
    displayName: 'Administrativo',
    description: 'Profissional administrativo com acesso a gestão e relatórios',
    defaultRole: 'staff',
    permissions: [
      ...BASE_PERMISSIONS.STAFF,
      PermissionType.MANAGE_BEDS,
      PermissionType.VIEW_AUDIT_LOGS,
      PermissionType.EXPORT_DATA,
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OUTROS
  // ─────────────────────────────────────────────────────────────────────────
  [PositionCode.OTHER]: {
    positionCode: PositionCode.OTHER,
    displayName: 'Outro',
    description: 'Outros profissionais não categorizados',
    defaultRole: 'viewer',
    permissions: [...BASE_PERMISSIONS.VIEWER],
  },
};

/**
 * Função auxiliar para obter permissões de um cargo
 */
export function getPositionPermissions(
  positionCode: PositionCode,
): PermissionType[] {
  return ILPI_POSITION_PROFILES[positionCode]?.permissions || [];
}

/**
 * Função auxiliar para obter role padrão de um cargo
 */
export function getPositionDefaultRole(
  positionCode: PositionCode,
): 'admin' | 'manager' | 'staff' | 'viewer' {
  return ILPI_POSITION_PROFILES[positionCode]?.defaultRole || 'viewer';
}

/**
 * Função auxiliar para verificar se um cargo tem uma permissão específica
 */
export function positionHasPermission(
  positionCode: PositionCode,
  permission: PermissionType,
): boolean {
  const permissions = getPositionPermissions(positionCode);
  return permissions.includes(permission);
}

/**
 * Função auxiliar para obter informações completas de um cargo
 */
export function getPositionProfile(
  positionCode: PositionCode,
): PositionProfile | undefined {
  return ILPI_POSITION_PROFILES[positionCode];
}
