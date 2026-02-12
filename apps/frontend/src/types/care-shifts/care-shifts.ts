// ──────────────────────────────────────────────────────────────────────────────
//  TYPES - Care Shifts (Plantões de Cuidadores)
// ──────────────────────────────────────────────────────────────────────────────

import { ShiftTemplate } from './shift-templates';
import { Team, TeamMemberUser } from './teams';

/**
 * Status do plantão
 */
export enum ShiftStatus {
  SCHEDULED = 'SCHEDULED', // Agendado (do padrão semanal)
  CONFIRMED = 'CONFIRMED', // Confirmado (com equipe designada)
  IN_PROGRESS = 'IN_PROGRESS', // Em andamento
  PENDING_CLOSURE = 'PENDING_CLOSURE', // Encerramento pendente (horário terminou, aguardando passagem)
  COMPLETED = 'COMPLETED', // Concluído (com passagem de plantão)
  ADMIN_CLOSED = 'ADMIN_CLOSED', // Encerrado administrativamente (pelo RT)
  CANCELLED = 'CANCELLED', // Cancelado
}

/**
 * Tipo de substituição
 */
export enum SubstitutionType {
  TEAM_REPLACEMENT = 'TEAM_REPLACEMENT', // Substituição de equipe inteira
  MEMBER_REPLACEMENT = 'MEMBER_REPLACEMENT', // Substituição de membro individual
  MEMBER_ADDITION = 'MEMBER_ADDITION', // Adição de membro extra
}

/**
 * Tipo de mudança no histórico
 */
export enum ChangeType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  TEAM_ASSIGNMENT = 'TEAM_ASSIGNMENT',
  TEAM_SUBSTITUTION = 'TEAM_SUBSTITUTION',
  MEMBER_SUBSTITUTION = 'MEMBER_SUBSTITUTION',
  MEMBER_ADDITION = 'MEMBER_ADDITION',
  MEMBER_REMOVAL = 'MEMBER_REMOVAL',
}

/**
 * Plantão de cuidadores
 */
export interface Shift {
  id: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  shiftTemplateId: string;
  teamId: string | null;
  status: ShiftStatus;
  isFromPattern: boolean;
  patternId: string | null;
  notes: string | null;
  versionNumber: number;
  shiftTemplate: ShiftTemplate;
  team: Team | null;
  members: ShiftAssignment[];
  substitutions: ShiftSubstitution[];
  // Check-in data
  checkedInAt: string | null;
  checkedInBy: string | null;
  // Handover relation
  handover?: ShiftHandover | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Passagem de plantão
 */
export interface ShiftHandover {
  id: string;
  tenantId: string;
  shiftId: string;
  handedOverBy: string;
  receivedBy: string | null;
  report: string;
  activitiesSnapshot: ActivitiesSnapshot;
  createdAt: string;
  // Enriched data
  handedOverByUser?: {
    id: string;
    name: string;
    email: string;
  };
  receivedByUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

/**
 * Snapshot de atividades do turno
 */
export interface ActivitiesSnapshot {
  shiftId: string;
  date: string;
  totalRecords: number;
  byType: Array<{
    type: string;
    count: number;
    records: Array<{
      id: string;
      residentId: string;
      time: string;
    }>;
  }>;
  generatedAt: string;
}

/**
 * Designação de membro ao plantão
 */
export interface ShiftAssignment {
  id: string;
  tenantId: string;
  shiftId: string;
  userId: string;
  isFromTeam: boolean;
  user: TeamMemberUser;
  assignedBy: string;
  assignedAt: string;
  removedBy: string | null;
  removedAt: string | null;
}

/**
 * Substituição de plantão
 */
export interface ShiftSubstitution {
  id: string;
  tenantId: string;
  shiftId: string;
  type: SubstitutionType;
  reason: string;
  originalTeamId: string | null;
  newTeamId: string | null;
  originalUserId: string | null;
  newUserId: string | null;
  originalTeam: Team | null;
  newTeam: Team | null;
  originalUser: TeamMemberUser | null;
  newUser: TeamMemberUser | null;
  substitutedBy: string;
  substitutedAt: string;
}

/**
 * Histórico de alterações do plantão
 */
export interface ShiftHistory {
  id: string;
  tenantId: string;
  shiftId: string;
  versionNumber: number;
  changeType: ChangeType;
  changeReason: string;
  previousData: Record<string, unknown> | null;
  newData: Record<string, unknown>;
  changedFields: string[];
  changedBy: string;
  changedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// DTOs para APIs
// ────────────────────────────────────────────────────────────────────────────

export interface ListShiftsQueryDto {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  shiftTemplateId?: string;
  teamId?: string;
  status?: ShiftStatus;
}

export interface CreateShiftDto {
  date: string; // YYYY-MM-DD
  shiftTemplateId: string;
  teamId?: string;
  notes?: string;
}

export interface UpdateShiftDto {
  teamId?: string;
  status?: ShiftStatus;
  notes?: string;
}

export interface AssignTeamDto {
  teamId: string;
  reason: string;
}

export interface SubstituteTeamDto {
  originalTeamId: string;
  newTeamId: string;
  reason: string;
}

export interface SubstituteMemberDto {
  originalUserId: string;
  newUserId: string;
  reason: string;
}

export interface AddMemberDto {
  userId: string;
  reason: string;
}

export interface CreateHandoverDto {
  report: string;
  receivedBy?: string;
}

export interface AdminCloseShiftDto {
  reason: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Response Types
// ────────────────────────────────────────────────────────────────────────────

export interface ListShiftsResponse {
  shifts: Shift[];
}

export interface ShiftResponse {
  shift: Shift;
}
