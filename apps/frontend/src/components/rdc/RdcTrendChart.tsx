import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RdcIndicatorType, RDC_INDICATOR_LABELS } from '@/types/incidents';

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

interface RdcTrendChartProps {
  data: HistoricalIndicator[];
  isLoading?: boolean;
}

// Cores para cada indicador (seguindo padrão do sistema)
const INDICATOR_COLORS: Record<RdcIndicatorType, string> = {
  [RdcIndicatorType.MORTALIDADE]: '#DC2626', // red-600
  [RdcIndicatorType.DIARREIA_AGUDA]: '#EA580C', // orange-600
  [RdcIndicatorType.ESCABIOSE]: '#D97706', // amber-600
  [RdcIndicatorType.DESIDRATACAO]: '#CA8A04', // yellow-600
  [RdcIndicatorType.ULCERA_DECUBITO]: '#65A30D', // lime-600
  [RdcIndicatorType.DESNUTRICAO]: '#16A34A', // green-600
};

export function RdcTrendChart({ data, isLoading = false }: RdcTrendChartProps) {
  // Transformar dados para o formato do Recharts
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    // Ordenar por data (mais antigo primeiro)
    const sorted = [...data].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    // Transformar para formato do Recharts
    return sorted.map((item) => {
      const monthLabel = new Date(item.year, item.month - 1, 1).toLocaleDateString(
        'pt-BR',
        {
          month: 'short',
          year: '2-digit',
        },
      );

      const dataPoint: Record<string, unknown> = {
        month: monthLabel,
        fullDate: `${item.year}-${String(item.month).padStart(2, '0')}`,
      };

      // Adicionar cada indicador
      Object.entries(RdcIndicatorType).forEach(([, value]) => {
        const indicatorData = item.indicators[value];
        if (indicatorData) {
          dataPoint[value] = Number(indicatorData.rate.toFixed(2));
        }
      });

      return dataPoint;
    });
  }, [data]);

  // Tooltip customizado
  interface TooltipPayloadEntry {
    dataKey: string
    color: string
    value: number
    [key: string]: unknown
  }

  interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayloadEntry[]
    label?: string
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: TooltipPayloadEntry) => (
            <div key={entry.dataKey} className="flex items-center gap-2 text-xs mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">
                {RDC_INDICATOR_LABELS[entry.dataKey as RdcIndicatorType]}:
              </span>
              <span className="font-medium">{entry.value}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência - Últimos 12 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Carregando gráfico...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência - Últimos 12 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Sem dados históricos disponíveis
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência - Últimos 12 Meses</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Evolução temporal dos 6 indicadores obrigatórios RDC 502/2021
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              label={{
                value: 'Taxa (%)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12 },
              }}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) =>
                RDC_INDICATOR_LABELS[value as RdcIndicatorType] || value
              }
            />

            {/* Linhas para cada indicador */}
            <Line
              type="monotone"
              dataKey={RdcIndicatorType.MORTALIDADE}
              stroke={INDICATOR_COLORS[RdcIndicatorType.MORTALIDADE]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={RdcIndicatorType.MORTALIDADE}
            />
            <Line
              type="monotone"
              dataKey={RdcIndicatorType.DIARREIA_AGUDA}
              stroke={INDICATOR_COLORS[RdcIndicatorType.DIARREIA_AGUDA]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={RdcIndicatorType.DIARREIA_AGUDA}
            />
            <Line
              type="monotone"
              dataKey={RdcIndicatorType.ESCABIOSE}
              stroke={INDICATOR_COLORS[RdcIndicatorType.ESCABIOSE]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={RdcIndicatorType.ESCABIOSE}
            />
            <Line
              type="monotone"
              dataKey={RdcIndicatorType.DESIDRATACAO}
              stroke={INDICATOR_COLORS[RdcIndicatorType.DESIDRATACAO]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={RdcIndicatorType.DESIDRATACAO}
            />
            <Line
              type="monotone"
              dataKey={RdcIndicatorType.ULCERA_DECUBITO}
              stroke={INDICATOR_COLORS[RdcIndicatorType.ULCERA_DECUBITO]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={RdcIndicatorType.ULCERA_DECUBITO}
            />
            <Line
              type="monotone"
              dataKey={RdcIndicatorType.DESNUTRICAO}
              stroke={INDICATOR_COLORS[RdcIndicatorType.DESNUTRICAO]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={RdcIndicatorType.DESNUTRICAO}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legenda adicional */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <p>
            <strong>Como interpretar:</strong> Quanto menor a taxa, melhor o
            desempenho. Tendências crescentes (linhas subindo) indicam piora e
            requerem atenção imediata.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
