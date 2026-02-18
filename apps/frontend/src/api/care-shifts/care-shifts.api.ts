// ──────────────────────────────────────────────────────────────────────────────
//  API - Care Shifts (Plantões de Cuidadores)
// ──────────────────────────────────────────────────────────────────────────────

import { api } from '../../services/api';
import type {
  Shift,
  ShiftHistory,
  ShiftHandover,
  ListShiftsQueryDto,
  MyShiftsQueryDto,
  MyShiftsWorkspaceResponse,
  CreateShiftDto,
  UpdateShiftDto,
  AssignTeamDto,
  SubstituteTeamDto,
  SubstituteMemberDto,
  AddMemberDto,
  CreateHandoverDto,
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

/**
 * Tradeoff de compatibilidade: o backend do módulo alterna entre retorno
 * direto (`Shift`) e envelopado (`{ shift: Shift }`) em alguns endpoints.
 * Este helper evita quebra de UI durante a padronização do contrato.
 */
function unwrapShiftResponse(payload: Shift | ShiftResponse): Shift {
  if (payload && typeof payload === 'object' && 'shift' in payload) {
    return payload.shift;
  }
  return payload as Shift;
}

// ────────────────────────────────────────────────────────────────────────────
// CRUD de Plantões
// ────────────────────────────────────────────────────────────────────────────

/**
 * Listar plantões de um período
 */
export const listShifts = async (
  query: ListShiftsQueryDto,
): Promise<Shift[]> => {
  const response = await api.get<Shift[]>(BASE_URL, { params: query });
  return response.data; // API retorna array diretamente
};

/**
 * Workspace "Meus Plantões" do usuário autenticado
 */
export const getMyShiftsWorkspace = async (
  query: MyShiftsQueryDto = {},
): Promise<MyShiftsWorkspaceResponse> => {
  const response = await api.get<MyShiftsWorkspaceResponse>(`${BASE_URL}/my`, {
    params: query,
  });
  return response.data;
};

/**
 * Buscar plantão por ID (com membros e histórico)
 */
export const getShiftById = async (id: string): Promise<Shift> => {
  const response = await api.get<Shift | ShiftResponse>(`${BASE_URL}/${id}`);
  return unwrapShiftResponse(response.data);
};

/**
 * Criar plantão manual
 */
export const createShift = async (data: CreateShiftDto): Promise<Shift> => {
  const response = await api.post<Shift | ShiftResponse>(BASE_URL, data);
  return unwrapShiftResponse(response.data);
};

/**
 * Atualizar plantão
 */
export const updateShift = async (
  id: string,
  data: UpdateShiftDto,
): Promise<Shift> => {
  const response = await api.patch<Shift | ShiftResponse>(`${BASE_URL}/${id}`, data);
  return unwrapShiftResponse(response.data);
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
  const response = await api.post<Shift | ShiftResponse>(
    `${BASE_URL}/${shiftId}/assign-team`,
    data,
  );
  return unwrapShiftResponse(response.data);
};

/**
 * Substituir equipe inteira
 */
export const substituteTeam = async (
  shiftId: string,
  data: SubstituteTeamDto,
): Promise<Shift> => {
  const response = await api.post<Shift | ShiftResponse>(
    `${BASE_URL}/${shiftId}/substitute-team`,
    data,
  );
  return unwrapShiftResponse(response.data);
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
  const response = await api.post<Shift | ShiftResponse>(
    `${BASE_URL}/${shiftId}/substitute-member`,
    data,
  );
  return unwrapShiftResponse(response.data);
};

/**
 * Adicionar membro extra ao plantão
 */
export const addMember = async (
  shiftId: string,
  data: AddMemberDto,
): Promise<Shift> => {
  const response = await api.post<Shift | ShiftResponse>(
    `${BASE_URL}/${shiftId}/add-member`,
    data,
  );
  return unwrapShiftResponse(response.data);
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
// Check-in e Handover
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fazer check-in do plantão (CONFIRMED → IN_PROGRESS)
 * Apenas Líder ou Suplente podem fazer check-in
 */
export const checkInShift = async (shiftId: string): Promise<Shift> => {
  const response = await api.post<Shift | ShiftResponse>(`${BASE_URL}/${shiftId}/check-in`);
  return unwrapShiftResponse(response.data);
};

/**
 * Fazer passagem de plantão (handover)
 * Apenas Líder ou Suplente podem fazer handover
 */
export const handoverShift = async (
  shiftId: string,
  data: CreateHandoverDto,
): Promise<Shift> => {
  const response = await api.post<Shift | ShiftResponse>(`${BASE_URL}/${shiftId}/handover`, data);
  return unwrapShiftResponse(response.data);
};

/**
 * Buscar passagem de plantão de um plantão específico
 */
export const getShiftHandover = async (shiftId: string): Promise<ShiftHandover> => {
  const response = await api.get<ShiftHandover>(`${BASE_URL}/${shiftId}/handover`);
  return response.data;
};

/**
 * Buscar template padrão de relatório de passagem
 */
export const getHandoverReportTemplate = async (): Promise<string> => {
  const response = await api.get<{ report: string }>(`${BASE_URL}/handover-report-template`);
  return response.data.report;
};

/**
 * Atualizar notas do plantão
 * Permite que o líder/suplente registre observações durante o turno
 */
export const updateShiftNotes = async (
  shiftId: string,
  notes: string | undefined,
): Promise<Shift> => {
  const response = await api.patch<Shift | ShiftResponse>(`${BASE_URL}/${shiftId}/notes`, { notes });
  return unwrapShiftResponse(response.data);
};

/**
 * Encerrar plantão administrativamente (pelo RT/Admin)
 * Transição IN_PROGRESS/PENDING_CLOSURE → ADMIN_CLOSED
 */
export const adminCloseShift = async (
  shiftId: string,
  reason: string,
): Promise<Shift> => {
  const response = await api.post<Shift | ShiftResponse>(`${BASE_URL}/${shiftId}/admin-close`, { reason });
  return unwrapShiftResponse(response.data);
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
