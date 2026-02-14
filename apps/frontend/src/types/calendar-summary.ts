/**
 * Tipos para o Calendar Summary API (visualização mensal otimizada)
 */

export interface DaySummary {
  date: string;
  totalItems: number;
  statusBreakdown: {
    pending: number;
    completed: number;
    missed: number;
    canceled: number;
  };
  categoryBreakdown: {
    medications: number;
    vaccinations: number;
    consultations: number;
    exams: number;
    procedures: number;
    feeding: number;
    hygiene: number;
    hydration: number;
    weight: number;
    monitoring: number;
    other: number;
  };
  has: {
    medications: boolean;
    events: boolean;
    records: boolean;
  };
}

export interface CalendarSummaryResponse {
  days: Record<string, DaySummary>;
  totals: {
    totalItems: number;
    totalDaysWithItems: number;
    statusBreakdown: {
      pending: number;
      completed: number;
      missed: number;
      canceled: number;
    };
  };
}
