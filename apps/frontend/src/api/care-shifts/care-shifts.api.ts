// ──────────────────────────────────────────────────────────────────────────────
//  API - Care Shifts (Plantões de Cuidadores)
// ──────────────────────────────────────────────────────────────────────────────

import { api } from '../../services/api';
import type {
  Shift,
  ShiftHistory,
  ListShiftsQueryDto,
  CreateShiftDto,
  UpdateShiftDto,
  AssignTeamDto,
  SubstituteTeamDto,
  SubstituteMemberDto,
  AddMemberDto,
  ListShiftsResponse,
  ShiftResponse,
} from '../../types/care-shifts/care-shifts';
import type {
  RDCCalculationResult,
  CoverageReportResult,
  RDCCalculationQueryDto,
  CoverageReportQueryDto,
} from '../../types/care-shifts/rdc-calculation';

const BASE_URL = '/care-shifts';
const RDC_URL = '/care-shifts/rdc';

// ────────────────────────────────────────────────────────────────────────────
// CRUD de Plantões
// ────────────────────────────────────────────────────────────────────────────

/**
 * Listar plantões de um período
 */
export const listShifts = async (
  query: ListShiftsQueryDto,
): Promise<Shift[]> => {
  const response = await api.get<ListShiftsResponse>(BASE_URL, { params: query });
  return response.data.shifts;
};

/**
 * Buscar plantão por ID (com membros e histórico)
 */
export const getShiftById = async (id: string): Promise<Shift> => {
  const response = await api.get<ShiftResponse>(`${BASE_URL}/${id}`);
  return response.data.shift;
};

/**
 * Criar plantão manual
 */
export const createShift = async (data: CreateShiftDto): Promise<Shift> => {
  const response = await api.post<ShiftResponse>(BASE_URL, data);
  return response.data.shift;
};

/**
 * Atualizar plantão
 */
export const updateShift = async (
  id: string,
  data: UpdateShiftDto,
): Promise<Shift> => {
  const response = await api.patch<ShiftResponse>(`${BASE_URL}/${id}`, data);
  return response.data.shift;
};

/**
 * Deletar plantão (soft delete)
 */
export const deleteShift = async (id: string): Promise<void> => {
  await api.delete(`${BASE_URL}/${id}`);
};

// ────────────────────────────────────────────────────────────────────────────
// Designação de Equipes
// ────────────────────────────────────────────────────────────────────────────

/**
 * Designar equipe ao plantão
 */
export const assignTeamToShift = async (
  shiftId: string,
  data: AssignTeamDto,
): Promise<Shift> => {
  const response = await api.post<ShiftResponse>(
    `${BASE_URL}/${shiftId}/assign-team`,
    data,
  );
  return response.data.shift;
};

/**
 * Substituir equipe inteira
 */
export const substituteTeam = async (
  shiftId: string,
  data: SubstituteTeamDto,
): Promise<Shift> => {
  const response = await api.post<ShiftResponse>(
    `${BASE_URL}/${shiftId}/substitute-team`,
    data,
  );
  return response.data.shift;
};

// ────────────────────────────────────────────────────────────────────────────
// Gerenciamento de Membros
// ────────────────────────────────────────────────────────────────────────────

/**
 * Substituir membro individual
 */
export const substituteMember = async (
  shiftId: string,
  data: SubstituteMemberDto,
): Promise<Shift> => {
  const response = await api.post<ShiftResponse>(
    `${BASE_URL}/${shiftId}/substitute-member`,
    data,
  );
  return response.data.shift;
};

/**
 * Adicionar membro extra ao plantão
 */
export const addMember = async (
  shiftId: string,
  data: AddMemberDto,
): Promise<Shift> => {
  const response = await api.post<ShiftResponse>(
    `${BASE_URL}/${shiftId}/add-member`,
    data,
  );
  return response.data.shift;
};

/**
 * Remover membro do plantão
 */
export const removeMember = async (
  shiftId: string,
  userId: string,
): Promise<void> => {
  await api.delete(`${BASE_URL}/${shiftId}/members/${userId}`);
};

// ────────────────────────────────────────────────────────────────────────────
// Histórico
// ────────────────────────────────────────────────────────────────────────────

/**
 * Buscar histórico de versões do plantão
 */
export const getShiftHistory = async (shiftId: string): Promise<ShiftHistory[]> => {
  const response = await api.get<{ history: ShiftHistory[] }>(
    `${BASE_URL}/${shiftId}/history`,
  );
  return response.data.history;
};

// ────────────────────────────────────────────────────────────────────────────
// RDC Compliance
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calcular mínimo RDC para uma data específica
 */
export const calculateRDC = async (
  query: RDCCalculationQueryDto,
): Promise<RDCCalculationResult> => {
  const response = await api.get<RDCCalculationResult>(
    `${RDC_URL}/calculate`,
    { params: query },
  );
  return response.data;
};

/**
 * Gerar relatório de cobertura RDC para um período
 */
export const getCoverageReport = async (
  query: CoverageReportQueryDto,
): Promise<CoverageReportResult> => {
  const response = await api.get<CoverageReportResult>(
    `${RDC_URL}/coverage-report`,
    { params: query },
  );
  return response.data;
};

// ────────────────────────────────────────────────────────────────────────────
// Geração Automática
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// Types para Geração Automática
// ────────────────────────────────────────────────────────────────────────────

export interface ShiftGenerationDetail {
  date: string;
  shiftTemplateId: string;
  action: 'generated' | 'skipped';
  teamId?: string;
  reason?: string;
}

export interface ShiftGenerationError {
  date: string;
  shiftTemplateId: string;
  error: string;
}

export interface ShiftGenerationResult {
  generated: number;
  skipped: number;
  errors: ShiftGenerationError[];
  details: ShiftGenerationDetail[];
}

/**
 * Gerar plantões do padrão semanal (próximos 14 dias)
 */
export const generateShifts = async (): Promise<ShiftGenerationResult> => {
  const response = await api.post<ShiftGenerationResult>('/care-shifts/generate');
  return response.data;
};
