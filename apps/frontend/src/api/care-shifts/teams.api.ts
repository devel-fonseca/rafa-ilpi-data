// ──────────────────────────────────────────────────────────────────────────────
//  API - Teams (Equipes de Cuidadores)
// ──────────────────────────────────────────────────────────────────────────────

import { api } from '../../services/api';
import type {
  Team,
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  ListTeamsQueryDto,
  ListTeamsResponse,
} from '../../types/care-shifts/teams';

const BASE_URL = '/teams';

// ────────────────────────────────────────────────────────────────────────────
// CRUD de Equipes
// ────────────────────────────────────────────────────────────────────────────

/**
 * Criar equipe
 */
export const createTeam = async (data: CreateTeamDto): Promise<Team> => {
  const response = await api.post<Team>(BASE_URL, data);
  return response.data;
};

/**
 * Listar equipes com paginação e filtros
 */
export const listTeams = async (
  query?: ListTeamsQueryDto,
): Promise<ListTeamsResponse> => {
  const response = await api.get<ListTeamsResponse>(BASE_URL, { params: query });
  return response.data;
};

/**
 * Buscar equipe por ID
 */
export const getTeamById = async (id: string): Promise<Team> => {
  const response = await api.get<Team>(`${BASE_URL}/${id}`);
  return response.data;
};

/**
 * Atualizar equipe
 */
export const updateTeam = async (
  id: string,
  data: UpdateTeamDto,
): Promise<Team> => {
  const response = await api.patch<Team>(`${BASE_URL}/${id}`, data);
  return response.data;
};

/**
 * Deletar equipe (soft delete)
 */
export const deleteTeam = async (id: string): Promise<void> => {
  await api.delete(`${BASE_URL}/${id}`);
};

// ────────────────────────────────────────────────────────────────────────────
// Gerenciamento de Membros
// ────────────────────────────────────────────────────────────────────────────

/**
 * Adicionar membro à equipe
 */
export const addTeamMember = async (
  teamId: string,
  data: AddTeamMemberDto,
): Promise<Team> => {
  const response = await api.post<Team>(`${BASE_URL}/${teamId}/members`, data);
  return response.data;
};

/**
 * Remover membro da equipe (soft delete)
 */
export const removeTeamMember = async (
  teamId: string,
  userId: string,
): Promise<void> => {
  await api.delete(`${BASE_URL}/${teamId}/members/${userId}`);
};
