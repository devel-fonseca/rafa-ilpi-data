// ──────────────────────────────────────────────────────────────────────────────
//  API - Shift Templates (Turnos Fixos)
// ──────────────────────────────────────────────────────────────────────────────

import { api } from '../../services/api';
import type {
  ShiftTemplate,
  TenantShiftConfig,
  UpdateTenantShiftConfigDto,
} from '../../types/care-shifts/shift-templates';

const BASE_URL = '/shift-templates';

// ────────────────────────────────────────────────────────────────────────────
// Shift Templates (Read-only)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Listar turnos fixos do sistema
 */
export const listShiftTemplates = async (): Promise<ShiftTemplate[]> => {
  const response = await api.get<ShiftTemplate[]>(BASE_URL);
  return response.data;
};

/**
 * Buscar turno por ID
 */
export const getShiftTemplateById = async (id: string): Promise<ShiftTemplate> => {
  const response = await api.get<ShiftTemplate>(`${BASE_URL}/${id}`);
  return response.data;
};

// ────────────────────────────────────────────────────────────────────────────
// Configuração do Tenant
// ────────────────────────────────────────────────────────────────────────────

/**
 * Listar configurações de turnos do tenant
 */
export const listTenantShiftConfigs = async (): Promise<TenantShiftConfig[]> => {
  const response = await api.get<TenantShiftConfig[]>(`${BASE_URL}/tenant-config`);
  return response.data;
};

/**
 * Atualizar configuração de turno (ativar/desativar, customizar nome)
 */
export const updateTenantShiftConfig = async (
  shiftTemplateId: string,
  data: UpdateTenantShiftConfigDto,
): Promise<TenantShiftConfig> => {
  const response = await api.patch<TenantShiftConfig>(
    `${BASE_URL}/${shiftTemplateId}/tenant-config`,
    data,
  );
  return response.data;
};

// ────────────────────────────────────────────────────────────────────────────
// Templates Disponíveis (para filtros de relatórios)
// ────────────────────────────────────────────────────────────────────────────

export interface AvailableShiftTemplate {
  id: string;
  type: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  displayOrder: number;
}

/**
 * Listar templates disponíveis para filtros de relatórios
 * Retorna apenas templates ativos e habilitados para o tenant
 */
export const getAvailableShiftTemplates = async (): Promise<AvailableShiftTemplate[]> => {
  const response = await api.get<AvailableShiftTemplate[]>('/care-shifts/available-templates');
  return response.data;
};
