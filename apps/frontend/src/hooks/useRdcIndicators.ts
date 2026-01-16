import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { tenantKey } from '@/lib/query-keys';

interface IndicatorsByMonth {
  [indicatorType: string]: {
    numerator: number;
    denominator: number;
    rate: number;
    incidentIds: string[];
    metadata?: any;
    calculatedAt: string;
  };
}

interface HistoricalIndicator {
  year: number;
  month: number;
  indicators: {
    [indicatorType: string]: {
      numerator: number;
      denominator: number;
      rate: number;
      calculatedAt: string;
    };
  };
}

/**
 * Hook para buscar indicadores RDC de um mês específico
 */
export function useRdcIndicators(year: number, month: number) {
  return useQuery({
    queryKey: tenantKey('rdc-indicators', year.toString(), month.toString()),
    queryFn: async () => {
      const response = await api.get<IndicatorsByMonth>(
        `/rdc-indicators`,
        {
          params: { year, month },
        },
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar histórico de indicadores RDC (últimos N meses)
 */
export function useRdcIndicatorsHistory(months: number = 12) {
  return useQuery({
    queryKey: tenantKey('rdc-indicators-history', months.toString()),
    queryFn: async () => {
      const response = await api.get<HistoricalIndicator[]>(
        `/rdc-indicators/history`,
        {
          params: { months },
        },
      );
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (menos volátil)
  });
}

/**
 * Hook para recalcular indicadores manualmente
 */
export function useRecalculateIndicators() {
  return {
    recalculate: async (year: number, month: number) => {
      await api.post(`/rdc-indicators/calculate?year=${year}&month=${month}`);
    },
  };
}
