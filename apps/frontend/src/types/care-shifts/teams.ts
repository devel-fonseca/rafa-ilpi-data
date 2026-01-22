// ──────────────────────────────────────────────────────────────────────────────
//  TYPES - Teams (Equipes de Cuidadores)
// ──────────────────────────────────────────────────────────────────────────────

import { PositionCode } from '../permissions';

/**
 * Equipe de cuidadores
 */
export interface Team {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  color: string | null; // Hex color (#FF5733)
  members: TeamMember[];
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Membro de equipe (relacionamento Team ↔ User)
 */
export interface TeamMember {
  id: string;
  tenantId: string;
  teamId: string;
  userId: string;
  role: string | null; // Ex: "Líder", "Suplente"
  user: TeamMemberUser;
  addedBy: string;
  addedAt: string;
  removedBy: string | null;
  removedAt: string | null;
}

/**
 * Dados do usuário para exibição em membros de equipe
 */
export interface TeamMemberUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  profile: {
    positionCode: PositionCode;
    registrationNumber: string | null;
  } | null;
}

// ────────────────────────────────────────────────────────────────────────────
// DTOs para APIs
// ────────────────────────────────────────────────────────────────────────────

export interface CreateTeamDto {
  name: string;
  description?: string;
  color?: string; // Hex color
  isActive?: boolean;
}

export interface UpdateTeamDto {
  name?: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface AddTeamMemberDto {
  userId: string;
  role?: string;
}

export interface ListTeamsQueryDto {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string; // Buscar por nome
}

export interface ListTeamsResponse {
  data: Team[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
