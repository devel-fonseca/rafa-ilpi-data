/**
 * Interface para resultado do cálculo RDC 502/2021
 */
export interface RDCCalculationResult {
  date: string; // YYYY-MM-DD
  calculations: ShiftRDCCalculation[];
  warnings: string[];
  totalResidents: ResidentsByDependencyLevel;
}

export interface ShiftRDCCalculation {
  shiftTemplate: {
    id: string;
    type: string;
    name: string;
    startTime: string;
    endTime: string;
    duration: number; // 8 ou 12
  };
  minimumRequired: number; // Mínimo exigido pela RDC
  assignedCount?: number; // Quantos cuidadores designados (para relatórios)
  complianceStatus?: 'compliant' | 'attention' | 'non_compliant';
  residents: ResidentsByDependencyLevel;
}

export interface ResidentsByDependencyLevel {
  grauI: number;
  grauII: number;
  grauIII: number;
  withoutLevel: number;
}

/**
 * Interface para relatório de cobertura de período
 */
export interface CoverageReportResult {
  startDate: string;
  endDate: string;
  shifts: ShiftCoverageReport[];
  summary: {
    totalShifts: number;
    compliant: number;
    attention: number;
    nonCompliant: number;
  };
}

export interface ShiftCoverageReport {
  date: string;
  shiftTemplate: {
    id: string;
    name: string;
  };
  minimumRequired: number;
  assignedCount: number;
  complianceStatus: 'compliant' | 'attention' | 'non_compliant';
  team?: {
    id: string;
    name: string;
  };
}
