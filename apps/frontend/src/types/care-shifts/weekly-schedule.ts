// ──────────────────────────────────────────────────────────────────────────────
//  TYPES - Weekly Schedule (Padrão Semanal)
// ──────────────────────────────────────────────────────────────────────────────

import { ShiftTemplate } from './shift-templates';
import { Team } from './teams';

/**
 * Padrão semanal de plantões
 */
export interface WeeklySchedulePattern {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  numberOfWeeks: number; // 1-4 (1=semanal, 2=quinzenal, 3=tri-semanal, 4=mensal)
  assignments: WeeklySchedulePatternAssignment[];
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Designação de equipe para um dia da semana + turno
 */
export interface WeeklySchedulePatternAssignment {
  id: string;
  tenantId: string;
  patternId: string;
  weekNumber: number; // 0-3 (0 = primeira semana, 1 = segunda, etc.)
  dayOfWeek: number; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  shiftTemplateId: string;
  teamId: string | null;
  shiftTemplate: ShiftTemplate;
  team: Team | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string;
}

// ────────────────────────────────────────────────────────────────────────────
// DTOs para APIs
// ────────────────────────────────────────────────────────────────────────────

export interface CreateWeeklyPatternDto {
  name: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  numberOfWeeks?: number; // 1-4 (default: 1)
}

export interface UpdateWeeklyPatternDto {
  name?: string;
  description?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface AssignTeamToPatternDto {
  weekNumber?: number; // 0-3 (default: 0)
  dayOfWeek: number; // 0-6
  shiftTemplateId: string;
  teamId: string | null; // null remove a equipe
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers para UI
// ────────────────────────────────────────────────────────────────────────────

export const DAY_OF_WEEK_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

export const DAY_OF_WEEK_SHORT_LABELS = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
] as const;
