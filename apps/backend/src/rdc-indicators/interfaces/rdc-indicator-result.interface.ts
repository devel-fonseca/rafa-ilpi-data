import { RdcIndicatorType, Prisma } from '@prisma/client';

/**
 * Interface para o resultado de um indicador RDC individual
 */
export interface RdcIndicatorResult {
  numerator: number;
  denominator: number;
  rate: number;
  incidentIds: string[];
  metadata: Prisma.JsonValue;
  calculatedAt: Date;
  provisionalNumerator: number;
  totalCandidates: number;
  pendingCount: number;
  confirmedCount: number;
  discardedCount: number;
  populationReferenceDate: string | null;
  periodStatus: 'OPEN' | 'CLOSED';
  periodClosedAt: string | null;
  periodClosedBy: string | null;
  periodClosedByName: string | null;
  periodCloseNote: string | null;
}

/**
 * Interface para o objeto de indicadores por mês
 * Mapeia cada tipo de indicador para seu resultado
 */
export type RdcIndicatorsByType = Partial<Record<RdcIndicatorType, RdcIndicatorResult>>;

/**
 * Interface para histórico agrupado por mês
 */
export interface RdcIndicatorHistoryMonth {
  year: number;
  month: number;
  monthLabel: string;
  indicators: RdcIndicatorsByType;
}
