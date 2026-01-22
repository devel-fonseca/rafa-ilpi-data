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
  COMPLETED = 'COMPLETED', // Concluído
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
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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

// ────────────────────────────────────────────────────────────────────────────
// Response Types
// ────────────────────────────────────────────────────────────────────────────

export interface ListShiftsResponse {
  shifts: Shift[];
}

export interface ShiftResponse {
  shift: Shift;
}
