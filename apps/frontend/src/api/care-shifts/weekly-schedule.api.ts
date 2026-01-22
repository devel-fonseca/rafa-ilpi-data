// ──────────────────────────────────────────────────────────────────────────────
//  API - Weekly Schedule (Padrão Semanal)
// ──────────────────────────────────────────────────────────────────────────────

import { api } from '../../services/api';
import type {
  WeeklySchedulePattern,
  CreateWeeklyPatternDto,
  UpdateWeeklyPatternDto,
  AssignTeamToPatternDto,
} from '../../types/care-shifts/weekly-schedule';

const BASE_URL = '/weekly-schedule';

// ────────────────────────────────────────────────────────────────────────────
// Weekly Pattern CRUD
// ────────────────────────────────────────────────────────────────────────────

/**
 * Obter padrão semanal ativo
 */
export const getActiveWeeklyPattern = async (): Promise<WeeklySchedulePattern | null> => {
  const response = await api.get<WeeklySchedulePattern>(`${BASE_URL}/patterns/active`);
  return response.data;
};

/**
 * Obter todos os padrões semanais (histórico)
 */
export const getAllWeeklyPatterns = async (): Promise<WeeklySchedulePattern[]> => {
  const response = await api.get<WeeklySchedulePattern[]>(`${BASE_URL}/patterns`);
  return response.data;
};

/**
 * Criar novo padrão semanal (desativa o anterior automaticamente)
 */
export const createWeeklyPattern = async (
  data: CreateWeeklyPatternDto,
): Promise<WeeklySchedulePattern> => {
  const response = await api.post<WeeklySchedulePattern>(
    `${BASE_URL}/patterns`,
    data,
  );
  return response.data;
};

/**
 * Atualizar padrão semanal
 */
export const updateWeeklyPattern = async (
  id: string,
  data: UpdateWeeklyPatternDto,
): Promise<WeeklySchedulePattern> => {
  const response = await api.patch<WeeklySchedulePattern>(
    `${BASE_URL}/patterns/${id}`,
    data,
  );
  return response.data;
};

/**
 * Deletar padrão semanal (soft delete)
 */
export const deleteWeeklyPattern = async (id: string): Promise<void> => {
  await api.delete(`${BASE_URL}/patterns/${id}`);
};

// ────────────────────────────────────────────────────────────────────────────
// Assignments (Designação de Equipes ao Padrão)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Designar equipe a um dia da semana + turno
 */
export const assignTeamToPattern = async (
  patternId: string,
  data: AssignTeamToPatternDto,
): Promise<WeeklySchedulePattern> => {
  const response = await api.post<WeeklySchedulePattern>(
    `${BASE_URL}/patterns/${patternId}/assignments`,
    data,
  );
  return response.data;
};

/**
 * Remover designação de equipe (assignment)
 */
export const removePatternAssignment = async (
  _patternId: string,
  assignmentId: string,
): Promise<void> => {
  await api.delete(
    `${BASE_URL}/assignments/${assignmentId}`,
  );
};
