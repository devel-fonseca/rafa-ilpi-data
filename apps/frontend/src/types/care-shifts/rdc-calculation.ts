// ──────────────────────────────────────────────────────────────────────────────
//  TYPES - RDC Calculation (Cálculo RDC 502/2021)
// ──────────────────────────────────────────────────────────────────────────────

import { ShiftTemplate } from './shift-templates';

/**
 * Residentes classificados por grau de dependência
 */
export interface ResidentsByDependencyLevel {
  grauI: number;
  grauII: number;
  grauIII: number;
  withoutLevel: number; // Residentes sem grau (alerta)
}

/**
 * Cálculo RDC para um turno específico
 */
export interface ShiftRDCCalculation {
  shiftTemplate: ShiftTemplate;
  minimumRequired: number; // Mínimo de cuidadores exigido
  residents: ResidentsByDependencyLevel;
  calculationDetails: {
    grauICalc: string; // Ex: "10 / 20 = 0.5 → 1 cuidador"
    grauIICalc: string; // Ex: "15 / 10 = 1.5 → 2 cuidadores"
    grauIIICalc: string; // Ex: "6 / 6 = 1 → 1 cuidador"
  };
}

/**
 * Resultado completo do cálculo RDC
 */
export interface RDCCalculationResult {
  date: string; // YYYY-MM-DD
  calculations: ShiftRDCCalculation[];
  warnings: string[]; // Ex: ["3 residentes sem grau de dependência"]
  totalResidents: ResidentsByDependencyLevel;
}

/**
 * Status de conformidade de um plantão
 */
export type ComplianceStatus = 'compliant' | 'attention' | 'non_compliant';

/**
 * Plantão com status de conformidade RDC
 */
export interface ShiftWithCompliance {
  date: string;
  shiftTemplate: {
    id: string;
    name: string;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  };
  minimumRequired: number;
  assignedCount: number;
  complianceStatus: ComplianceStatus;
  team?: {
    id: string;
    name: string;
  };
  members: {
    userId: string;
    userName: string;
    teamFunction: string | null; // Função do membro na equipe (ex: "Líder", "Substituto")
  }[];
}

/**
 * Relatório de cobertura RDC para um período
 */
export interface CoverageReportResult {
  startDate: string;
  endDate: string;
  shifts: ShiftWithCompliance[];
  summary: {
    totalShifts: number;
    compliant: number;
    attention: number;
    nonCompliant: number;
    complianceRate: number; // Percentual (0-100)
  };
}

// ────────────────────────────────────────────────────────────────────────────
// DTOs para APIs
// ────────────────────────────────────────────────────────────────────────────

export interface RDCCalculationQueryDto {
  date: string; // YYYY-MM-DD
  shiftTemplateId?: string;
}

export interface CoverageReportQueryDto {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}
