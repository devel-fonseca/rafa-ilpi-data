// ──────────────────────────────────────────────────────────────────────────────
//  TYPES - Shift Templates (Turnos Fixos do Sistema)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Tipos de turnos fixos do sistema
 */
export enum ShiftTemplateType {
  DAY_8H = 'DAY_8H', // Dia 8h (07:00-15:00)
  AFTERNOON_8H = 'AFTERNOON_8H', // Tarde 8h (15:00-23:00)
  NIGHT_8H = 'NIGHT_8H', // Noite 8h (23:00-07:00)
  DAY_12H = 'DAY_12H', // Dia 12h (07:00-19:00)
  NIGHT_12H = 'NIGHT_12H', // Noite 12h (19:00-07:00)
}

/**
 * Template de turno (read-only, definido pelo sistema)
 */
export interface ShiftTemplate {
  id: string;
  type: ShiftTemplateType;
  name: string;
  startTime: string; // "07:00"
  endTime: string; // "15:00"
  duration: number; // 8 ou 12 horas
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Configuração de turno para um tenant específico
 */
export interface TenantShiftConfig {
  id: string;
  tenantId: string;
  shiftTemplateId: string;
  isEnabled: boolean;
  customName: string | null; // Nome customizado (ex: "Plantão Manhã")
  shiftTemplate: ShiftTemplate;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// DTOs para APIs
// ────────────────────────────────────────────────────────────────────────────

export interface UpdateTenantShiftConfigDto {
  isEnabled?: boolean;
  customName?: string;
}
