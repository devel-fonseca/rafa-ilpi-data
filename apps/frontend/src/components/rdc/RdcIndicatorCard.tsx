import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, AlertCircle, Eye } from 'lucide-react';
import { RdcIndicatorType, RDC_INDICATOR_LABELS } from '@/types/incidents';
import { getMonthlyIndicatorStatus } from '@/utils/monthlyIndicatorStatus';

interface RdcIndicatorCardProps {
  indicatorType: RdcIndicatorType;
  rate: number;
  numerator: number;
  denominator: number;
  previousRate?: number;
  incidentIds?: string[];
  year?: number;
  month?: number;
  isLoading?: boolean;
  onViewDetails?: () => void;
}

export function RdcIndicatorCard({
  indicatorType,
  rate,
  numerator,
  denominator,
  previousRate,
  isLoading = false,
  onViewDetails,
}: RdcIndicatorCardProps) {
  // Calcular tendência
  const trend =
    previousRate !== undefined
      ? rate > previousRate
        ? 'up'
        : rate < previousRate
          ? 'down'
          : 'stable'
      : null;

  const trendPercentage =
    previousRate !== undefined && previousRate !== 0
      ? ((rate - previousRate) / previousRate) * 100
      : null;

  const status = getMonthlyIndicatorStatus({
    numerator,
    denominator,
    rate,
  });

  // Cores baseadas na classificação (quanto menor, melhor)
  const getColorClass = (statusLevel: ReturnType<typeof getMonthlyIndicatorStatus>['level']) => {
    if (statusLevel === 'excellent') return 'text-green-600 dark:text-green-400';
    if (statusLevel === 'good') return 'text-yellow-600 dark:text-yellow-400';
    if (statusLevel === 'warning' || statusLevel === 'warning_small_population') {
      return 'text-orange-600 dark:text-orange-400';
    }
    return 'text-red-600 dark:text-red-400';
  };

  const getBgColorClass = (statusLevel: ReturnType<typeof getMonthlyIndicatorStatus>['level']) => {
    if (statusLevel === 'excellent') {
      return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
    }
    if (statusLevel === 'good') {
      return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
    }
    if (statusLevel === 'warning' || statusLevel === 'warning_small_population') {
      return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800';
    }
    return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded animate-pulse w-1/2 mb-2" />
          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${getBgColorClass(status.level)}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {RDC_INDICATOR_LABELS[indicatorType]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div>
            <span className={`text-3xl font-bold ${getColorClass(status.level)}`}>
              {rate.toFixed(2)}%
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              {numerator} {numerator === 1 ? 'caso' : 'casos'} / {denominator}{' '}
              {denominator === 1 ? 'residente' : 'residentes'}
            </p>
          </div>

          {/* Indicador de Tendência */}
          {trend && trendPercentage !== null && (
            <div className="flex flex-col items-end">
              <div
                className={`flex items-center gap-1 ${
                  trend === 'up'
                    ? 'text-red-600 dark:text-red-400'
                    : trend === 'down'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-muted-foreground'
                }`}
              >
                {trend === 'up' && <TrendingUp className="h-4 w-4" />}
                {trend === 'down' && <TrendingDown className="h-4 w-4" />}
                {trend === 'stable' && <Minus className="h-4 w-4" />}
                <span className="text-xs font-medium">
                  {Math.abs(trendPercentage).toFixed(1)}%
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">vs mês ant.</span>
            </div>
          )}
        </div>

        {/* Alerta contextual para status crítico */}
        {status.level === 'critical' && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>Taxa acima do recomendado. Atenção necessária.</span>
          </div>
        )}

        {/* Alerta contextual para base populacional pequena */}
        {status.level === 'warning_small_population' && (
          <div className="mt-3 flex items-start gap-2 text-xs text-orange-700 dark:text-orange-300">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{status.label}</span>
          </div>
        )}

        {/* Botão Ver Detalhes */}
        {numerator > 0 && onViewDetails && (
          <div className="mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="w-full text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver {numerator} {numerator === 1 ? 'caso' : 'casos'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
