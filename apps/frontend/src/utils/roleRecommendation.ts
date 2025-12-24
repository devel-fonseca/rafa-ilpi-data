import { PositionCode } from '@/types/permissions'

export type UserRole = 'admin' | 'manager' | 'staff' | 'viewer'

export interface RoleRecommendation {
  suggestedRole: UserRole
  reason: string
  allowOverride: boolean
  warning?: string
}

/**
 * Mapeamento de cargos para roles recomendadas
 * Baseado em position-profiles.config.ts do backend
 */
const POSITION_DEFAULT_ROLES: Record<PositionCode, UserRole> = {
  [PositionCode.ADMINISTRATOR]: 'admin',
  [PositionCode.TECHNICAL_MANAGER]: 'admin',
  [PositionCode.NURSING_COORDINATOR]: 'manager',
  [PositionCode.NURSE]: 'manager',
  [PositionCode.NURSING_TECHNICIAN]: 'staff',
  [PositionCode.NURSING_ASSISTANT]: 'staff',
  [PositionCode.DOCTOR]: 'manager',
  [PositionCode.PSYCHOLOGIST]: 'manager',
  [PositionCode.SOCIAL_WORKER]: 'manager',
  [PositionCode.PHYSIOTHERAPIST]: 'manager',
  [PositionCode.NUTRITIONIST]: 'manager',
  [PositionCode.SPEECH_THERAPIST]: 'staff',
  [PositionCode.OCCUPATIONAL_THERAPIST]: 'staff',
  [PositionCode.CAREGIVER]: 'staff',
  [PositionCode.ADMINISTRATIVE]: 'staff',
  [PositionCode.ADMINISTRATIVE_ASSISTANT]: 'staff',
  [PositionCode.OTHER]: 'staff',
}

/**
 * Labels descritivas para cada role
 */
export const ROLE_LABELS: Record<UserRole, { title: string; description: string }> = {
  admin: {
    title: 'Administrador',
    description: 'Acesso total ao sistema, pode gerenciar configurações e usuários',
  },
  manager: {
    title: 'Gerente',
    description: 'Gestão de equipe, processos clínicos e operacionais',
  },
  staff: {
    title: 'Colaborador',
    description: 'Acesso operacional para execução de tarefas do dia a dia',
  },
  viewer: {
    title: 'Visualizador',
    description: 'Acesso somente leitura, sem permissão para alterações',
  },
}

/**
 * Retorna a recomendação de role baseada no cargo e flags especiais
 */
export function getRoleRecommendation(
  positionCode: PositionCode | null,
  isTechnicalManager: boolean,
  isNursingCoordinator: boolean
): RoleRecommendation {
  // Se é Responsável Técnico, sempre admin (independente do cargo)
  if (isTechnicalManager) {
    return {
      suggestedRole: 'admin',
      reason: 'Responsável Técnico exige acesso administrativo total',
      allowOverride: false,
      warning: 'RT sempre recebe role "admin" por exigência regulatória (RDC 502/2021)',
    }
  }

  // Se é Coordenador de Enfermagem, mínimo manager
  if (isNursingCoordinator) {
    const defaultRole = positionCode ? POSITION_DEFAULT_ROLES[positionCode] : 'staff'
    const suggestedRole = defaultRole === 'admin' ? 'admin' : 'manager'

    return {
      suggestedRole,
      reason: 'Coordenador de Enfermagem requer role de gestão',
      allowOverride: true,
      warning: suggestedRole !== 'manager' ? 'Coordenador geralmente recebe role "manager"' : undefined,
    }
  }

  // Sem cargo selecionado
  if (!positionCode) {
    return {
      suggestedRole: 'staff',
      reason: 'Role padrão para usuários sem cargo definido',
      allowOverride: true,
    }
  }

  // Role baseada no cargo
  const defaultRole = POSITION_DEFAULT_ROLES[positionCode]

  return {
    suggestedRole: defaultRole,
    reason: `Role recomendada para ${getPositionDisplayName(positionCode)}`,
    allowOverride: true,
  }
}

/**
 * Helper para obter nome display do cargo
 */
function getPositionDisplayName(positionCode: PositionCode): string {
  const labels: Record<PositionCode, string> = {
    [PositionCode.ADMINISTRATOR]: 'Administrador',
    [PositionCode.TECHNICAL_MANAGER]: 'Responsável Técnico',
    [PositionCode.NURSING_COORDINATOR]: 'Coordenador de Enfermagem',
    [PositionCode.NURSE]: 'Enfermeiro',
    [PositionCode.NURSING_TECHNICIAN]: 'Técnico de Enfermagem',
    [PositionCode.NURSING_ASSISTANT]: 'Auxiliar de Enfermagem',
    [PositionCode.DOCTOR]: 'Médico',
    [PositionCode.PSYCHOLOGIST]: 'Psicólogo',
    [PositionCode.SOCIAL_WORKER]: 'Assistente Social',
    [PositionCode.PHYSIOTHERAPIST]: 'Fisioterapeuta',
    [PositionCode.NUTRITIONIST]: 'Nutricionista',
    [PositionCode.SPEECH_THERAPIST]: 'Fonoaudiólogo',
    [PositionCode.OCCUPATIONAL_THERAPIST]: 'Terapeuta Ocupacional',
    [PositionCode.CAREGIVER]: 'Cuidador',
    [PositionCode.ADMINISTRATIVE]: 'Administrativo',
    [PositionCode.ADMINISTRATIVE_ASSISTANT]: 'Assistente Administrativo',
    [PositionCode.OTHER]: 'Outro',
  }

  return labels[positionCode] || positionCode
}
