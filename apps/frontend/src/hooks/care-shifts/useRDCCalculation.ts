// ──────────────────────────────────────────────────────────────────────────────
//  HOOK - useRDCCalculation (Cálculo RDC 502/2021)
// ──────────────────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';
import { calculateRDC, getCoverageReport } from '@/api/care-shifts/care-shifts.api';
import type {
  RDCCalculationResult,
  RDCCalculationQueryDto,
  CoverageReportQueryDto,
  CoverageReportResult,
} from '@/types/care-shifts/rdc-calculation';
import { tenantKey } from '@/lib/query-keys';

// ────────────────────────────────────────────────────────────────────────────
// QUERY HOOKS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hook para calcular mínimo RDC por turno em uma data específica
 */
export function useRDCCalculation(query: RDCCalculationQueryDto) {
  return useQuery<RDCCalculationResult>({
    queryKey: tenantKey('care-shifts', 'rdc-calculation', JSON.stringify(query)),
    queryFn: () => calculateRDC(query),
    staleTime: 1000 * 60 * 5, // 5 minutos (dados de residentes mudam pouco)
    enabled: !!query.date, // Só executa se tiver data
  });
}

/**
 * Hook para obter relatório de cobertura de um período
 */
export function useCoverageReport(query: CoverageReportQueryDto) {
  return useQuery<CoverageReportResult>({
    queryKey: tenantKey(
      'care-shifts',
      'coverage-report',
      JSON.stringify(query),
    ),
    queryFn: () => getCoverageReport(query),
    staleTime: 1000 * 60 * 5,
    enabled: !!query.startDate && !!query.endDate,
  });
}

/**
 * Alias para useCoverageReport (nome mais descritivo)
 */
export const useGenerateCoverageReport = useCoverageReport;
