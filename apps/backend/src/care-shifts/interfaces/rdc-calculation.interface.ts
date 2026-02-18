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
  breakdown: {
    grauIBaseDaily: number; // Art. 16, II, a (base de 8h/dia)
    grauIWorkloadFactor: number; // fator aplicado ao Grau I (atual: 1 por turno)
    grauIRequiredPerShift: number; // Grau I exigido por turno
    grauIIRequiredPerShift: number; // Art. 16, II, b (por turno)
    grauIIIRequiredPerShift: number; // Art. 16, II, c (por turno)
    appliesGrauIComponent: boolean; // Se há componente Grau I neste turno
  };
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
  dailySummaries: DailyCoverageSummary[];
  summary: {
    totalShifts: number;
    compliant: number;
    attention: number;
    nonCompliant: number;
    totalDays: number;
    compliantDays: number;
    attentionDays: number;
    nonCompliantDays: number;
    totalCoveredHours: number;
    expectedHours: number;
    hourlyCoverageRate: number;
  };
}

export interface ShiftCoverageReport {
  date: string;
  shiftTemplate: {
    id: string;
    name: string;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  };
  durationHours: number;
  minimumRequired: number;
  assignedCount: number;
  complianceStatus: 'compliant' | 'attention' | 'non_compliant';
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

export interface DailyCoverageSummary {
  date: string;
  expectedHours: number; // 24h
  coveredHours: number; // horas com plantões conformes
  uncoveredHours: number; // expectedHours - coveredHours
  complianceStatus: 'compliant' | 'attention' | 'non_compliant';
  nonCompliantPeriods: {
    shiftTemplateName: string;
    startTime: string;
    endTime: string;
    complianceStatus: 'attention' | 'non_compliant';
    assignedCount: number;
    minimumRequired: number;
  }[];
}
