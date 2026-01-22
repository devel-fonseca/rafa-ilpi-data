/**
 * Interface para resultado da geração de plantões
 */
export interface ShiftGenerationResult {
  generated: number; // Quantidade de plantões gerados
  skipped: number; // Quantidade de plantões já existentes (não sobrescritos)
  errors: ShiftGenerationError[];
  details: ShiftGenerationDetail[];
}

export interface ShiftGenerationError {
  date: string;
  shiftTemplateId: string;
  error: string;
}

export interface ShiftGenerationDetail {
  date: string;
  shiftTemplateId: string;
  action: 'generated' | 'skipped';
  teamId?: string;
  reason?: string;
}
