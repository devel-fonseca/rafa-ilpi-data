export type MonthlyIndicatorStatusLabel =
  | 'Ótimo'
  | 'Bom'
  | 'Atenção'
  | 'Crítico'
  | 'Atenção (base populacional pequena)';

export type MonthlyIndicatorStatusLevel =
  | 'excellent'
  | 'good'
  | 'warning'
  | 'critical'
  | 'warning_small_population';

export interface MonthlyIndicatorStatus {
  label: MonthlyIndicatorStatusLabel;
  level: MonthlyIndicatorStatusLevel;
}

const SMALL_POPULATION_THRESHOLD = 20;

/**
 * Classificação híbrida dos indicadores:
 * - mantém faixas percentuais para bases normais;
 * - evita classificar como "Crítico" quando há apenas 1 caso
 *   em base populacional pequena.
 */
export function getMonthlyIndicatorStatus(params: {
  numerator: number;
  denominator: number;
  rate: number;
}): MonthlyIndicatorStatus {
  const { numerator, denominator, rate } = params;

  if (rate <= 0 || numerator <= 0) {
    return { label: 'Ótimo', level: 'excellent' };
  }

  const isSmallPopulationSingleCase =
    denominator > 0 &&
    denominator < SMALL_POPULATION_THRESHOLD &&
    numerator === 1 &&
    rate > 10;

  if (isSmallPopulationSingleCase) {
    return {
      label: 'Atenção (base populacional pequena)',
      level: 'warning_small_population',
    };
  }

  if (rate < 5) {
    return { label: 'Bom', level: 'good' };
  }

  if (rate <= 10) {
    return { label: 'Atenção', level: 'warning' };
  }

  return { label: 'Crítico', level: 'critical' };
}
