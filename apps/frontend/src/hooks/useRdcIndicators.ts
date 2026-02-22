import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { tenantKey } from '@/lib/query-keys';
import { RdcIndicatorType, IncidentSeverity } from '@/types/incidents';

export type RdcReviewStatus = 'PENDING' | 'CONFIRMED' | 'DISCARDED';

export interface RdcIndicatorMonthData {
  numerator: number;
  denominator: number;
  rate: number;
  incidentIds: string[];
  metadata?: Record<string, unknown> | null;
  calculatedAt: string;
  provisionalNumerator?: number;
  totalCandidates?: number;
  pendingCount?: number;
  confirmedCount?: number;
  discardedCount?: number;
  populationReferenceDate?: string | null;
  periodStatus?: 'OPEN' | 'CLOSED';
  periodClosedAt?: string | null;
  periodClosedBy?: string | null;
  periodClosedByName?: string | null;
  periodCloseNote?: string | null;
}

export interface RdcIndicatorsByMonth {
  [indicatorType: string]: RdcIndicatorMonthData;
}

export interface RdcHistoricalIndicator {
  year: number;
  month: number;
  monthLabel: string;
  indicators: {
    [indicatorType: string]: {
      numerator: number;
      denominator: number;
      rate: number;
      incidentIds: string[];
      metadata?: Record<string, unknown> | null;
      calculatedAt: string;
      provisionalNumerator?: number;
      totalCandidates?: number;
      pendingCount?: number;
      confirmedCount?: number;
      discardedCount?: number;
      populationReferenceDate?: string | null;
      periodStatus?: 'OPEN' | 'CLOSED';
      periodClosedAt?: string | null;
      periodClosedBy?: string | null;
      periodClosedByName?: string | null;
      periodCloseNote?: string | null;
    };
  };
}

export interface RdcReviewCandidate {
  incidentId: string;
  residentId: string;
  residentName: string;
  date: string;
  time: string;
  severity: string;
  description: string;
  reviewStatus: RdcReviewStatus;
  reviewReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface RdcReviewCasesResponse {
  year: number;
  month: number;
  indicatorType: RdcIndicatorType;
  numerator: number;
  denominator: number;
  rate: number;
  closure: {
    status: 'OPEN' | 'CLOSED';
    closedAt?: string;
    closedBy?: string;
    closedByName?: string;
    note?: string;
  };
  metadata?: Record<string, unknown>;
  summary: {
    total: number;
    pending: number;
    confirmed: number;
    discarded: number;
  };
  candidates: RdcReviewCandidate[];
}

export interface RdcAnnualConsolidatedMonth {
  month: number;
  monthLabel: string;
  status: 'MISSING' | 'OPEN' | 'CLOSED';
  indicators: Array<{
    indicatorType: RdcIndicatorType;
    numerator: number;
    denominator: number;
    rate: number;
    status: 'MISSING' | 'OPEN' | 'CLOSED';
    closed: boolean;
    closedAt?: string | null;
    closedByName?: string | null;
  }>;
}

export interface RdcAnnualConsolidatedResponse {
  year: number;
  generatedAt: string;
  summary: {
    totalMonths: number;
    closedMonths: number;
    openMonths: number;
    missingMonths: number;
    readyToSubmit: boolean;
  };
  months: RdcAnnualConsolidatedMonth[];
}

export interface ReviewDecisionPayload {
  incidentId: string;
  decision: RdcReviewStatus;
  reason?: string;
}

export interface RegisterManualRdcCasePayload {
  year: number;
  month: number;
  indicatorType: RdcIndicatorType;
  residentId: string;
  date: string;
  time: string;
  severity: IncidentSeverity;
  description: string;
  actionTaken: string;
  note?: string;
}

/**
 * Hook para buscar indicadores RDC de um mês específico.
 */
export function useRdcIndicators(year: number, month: number) {
  return useQuery({
    queryKey: tenantKey('rdc-indicators', year.toString(), month.toString()),
    queryFn: async () => {
      const response = await api.get<RdcIndicatorsByMonth>('/rdc-indicators', {
        params: { year, month },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar histórico de indicadores RDC (últimos N meses).
 */
export function useRdcIndicatorsHistory(months: number = 12) {
  return useQuery({
    queryKey: tenantKey('rdc-indicators-history', months.toString()),
    queryFn: async () => {
      const response = await api.get<RdcHistoricalIndicator[]>(
        '/rdc-indicators/history',
        {
          params: { months },
        },
      );
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para buscar casos candidatos de revisão de um indicador no mês.
 */
export function useRdcIndicatorReviewCases(params: {
  year: number;
  month: number;
  indicatorType: RdcIndicatorType | null;
  enabled?: boolean;
}) {
  const { year, month, indicatorType, enabled = true } = params;

  return useQuery({
    queryKey: tenantKey(
      'rdc-indicators-review-cases',
      year.toString(),
      month.toString(),
      indicatorType || 'none',
    ),
    queryFn: async () => {
      const response = await api.get<RdcReviewCasesResponse>(
        '/rdc-indicators/review-cases',
        {
          params: {
            year,
            month,
            indicatorType,
          },
        },
      );
      return response.data;
    },
    enabled: enabled && Boolean(indicatorType),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para salvar revisão dos casos de indicador.
 */
export function useSaveRdcIndicatorReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      year: number;
      month: number;
      indicatorType: RdcIndicatorType;
      decisions: ReviewDecisionPayload[];
    }) => {
      const response = await api.post('/rdc-indicators/review-cases', payload);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey(
          'rdc-indicators',
          variables.year.toString(),
          variables.month.toString(),
        ),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('rdc-indicators-history'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey(
          'rdc-indicators-review-cases',
          variables.year.toString(),
          variables.month.toString(),
          variables.indicatorType,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('rdc-indicators-annual-consolidated'),
      });
    },
  });
}

/**
 * Hook para fechar mês dos indicadores RDC.
 */
export function useCloseRdcMonth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { year: number; month: number; note?: string }) => {
      const response = await api.post('/rdc-indicators/close-month', payload);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey(
          'rdc-indicators',
          variables.year.toString(),
          variables.month.toString(),
        ),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('rdc-indicators-history'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey(
          'rdc-indicators-review-cases',
          variables.year.toString(),
          variables.month.toString(),
        ),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('rdc-indicators-annual-consolidated'),
      });
    },
  });
}

/**
 * Hook para reabrir mês dos indicadores RDC.
 */
export function useReopenRdcMonth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { year: number; month: number; reason: string }) => {
      const response = await api.post('/rdc-indicators/reopen-month', payload);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey(
          'rdc-indicators',
          variables.year.toString(),
          variables.month.toString(),
        ),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('rdc-indicators-history'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey(
          'rdc-indicators-review-cases',
          variables.year.toString(),
          variables.month.toString(),
        ),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('rdc-indicators-annual-consolidated'),
      });
    },
  });
}

/**
 * Hook para consultar consolidado anual (Art. 60).
 */
export function useRdcAnnualConsolidated(year?: number) {
  return useQuery({
    queryKey: tenantKey(
      'rdc-indicators-annual-consolidated',
      year?.toString() || 'default',
    ),
    queryFn: async () => {
      const response = await api.get<RdcAnnualConsolidatedResponse>(
        '/rdc-indicators/annual-consolidated',
        {
          params: { year },
        },
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para recalcular indicadores manualmente.
 */
export function useRecalculateIndicators() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { year: number; month: number }) => {
      const response = await api.request({
        method: 'post',
        url: '/rdc-indicators/calculate',
        params: payload,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey(
          'rdc-indicators',
          variables.year.toString(),
          variables.month.toString(),
        ),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('rdc-indicators-history'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey(
          'rdc-indicators-review-cases',
          variables.year.toString(),
          variables.month.toString(),
        ),
      });
    },
  });
}

/**
 * Hook para registrar caso manual e incluí-lo já confirmado no indicador.
 */
export function useRegisterManualRdcCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RegisterManualRdcCasePayload) => {
      const response = await api.post('/rdc-indicators/manual-case', payload);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantKey(
          'rdc-indicators',
          variables.year.toString(),
          variables.month.toString(),
        ),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('rdc-indicators-history'),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey(
          'rdc-indicators-review-cases',
          variables.year.toString(),
          variables.month.toString(),
          variables.indicatorType,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: tenantKey('rdc-indicators-annual-consolidated'),
      });
    },
  });
}
