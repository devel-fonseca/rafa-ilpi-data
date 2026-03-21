import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EChart, useEChartThemeTokens } from '@/components/ui/echart'
import { RdcIndicatorType, RDC_INDICATOR_LABELS } from '@/types/incidents'

interface HistoricalIndicator {
  year: number
  month: number
  indicators: {
    [indicatorType: string]: {
      numerator: number
      denominator: number
      rate: number
      calculatedAt: string
    }
  }
}

interface RdcTrendChartProps {
  data: HistoricalIndicator[]
  isLoading?: boolean
}

const INDICATOR_COLORS: Record<RdcIndicatorType, string> = {
  [RdcIndicatorType.MORTALIDADE]: '#DC2626',
  [RdcIndicatorType.DIARREIA_AGUDA]: '#EA580C',
  [RdcIndicatorType.ESCABIOSE]: '#D97706',
  [RdcIndicatorType.DESIDRATACAO]: '#CA8A04',
  [RdcIndicatorType.ULCERA_DECUBITO]: '#65A30D',
  [RdcIndicatorType.DESNUTRICAO]: '#16A34A',
}

const INDICATORS_IN_ORDER: RdcIndicatorType[] = [
  RdcIndicatorType.MORTALIDADE,
  RdcIndicatorType.DIARREIA_AGUDA,
  RdcIndicatorType.ESCABIOSE,
  RdcIndicatorType.DESIDRATACAO,
  RdcIndicatorType.ULCERA_DECUBITO,
  RdcIndicatorType.DESNUTRICAO,
]

export function RdcTrendChart({ data, isLoading = false }: RdcTrendChartProps) {
  const tokens = useEChartThemeTokens()

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []

    const sorted = [...data].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    return sorted.map((item) => {
      const monthLabel = new Date(item.year, item.month - 1, 1).toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit',
      })

      const point: Record<string, unknown> = {
        month: monthLabel,
        fullDate: `${item.year}-${String(item.month).padStart(2, '0')}`,
      }

      INDICATORS_IN_ORDER.forEach((indicator) => {
        const indicatorData = item.indicators[indicator]
        point[indicator] = indicatorData ? Number(indicatorData.rate.toFixed(2)) : null
      })

      return point
    })
  }, [data])

  const chartOption = useMemo<EChartsOption>(() => ({
    animationDuration: 400,
    grid: {
      top: 20,
      right: 24,
      bottom: 72,
      left: 48,
      containLabel: true,
    },
    legend: {
      bottom: 8,
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        color: tokens.mutedText,
        fontSize: 12,
      },
      data: INDICATORS_IN_ORDER,
      formatter: (value: string) => RDC_INDICATOR_LABELS[value as RdcIndicatorType] || value,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: tokens.border,
          width: 1,
          type: 'dashed',
        },
      },
      backgroundColor: tokens.popover,
      borderColor: tokens.border,
      borderWidth: 1,
      textStyle: {
        color: tokens.text,
        fontFamily: 'inherit',
      },
      extraCssText: 'border-radius: 8px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);',
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [params]
        const typedRows = rows as Array<{
          seriesName?: string
          marker?: string
          axisValueLabel?: string
          value?: number | string | null
        }>

        const title = typedRows[0]?.axisValueLabel ?? ''
        const lines = typedRows
          .filter((row) => row.seriesName)
          .map((row) => {
            const value = Number(row.value ?? 0)
            return `${row.marker ?? ''} ${RDC_INDICATOR_LABELS[row.seriesName as RdcIndicatorType] || row.seriesName}: <strong>${value.toFixed(2)}%</strong>`
          })

        return [title, ...lines].join('<br/>')
      },
    },
    xAxis: {
      type: 'category',
      data: chartData.map((item) => item.month as string),
      axisLine: { lineStyle: { color: tokens.border } },
      axisTick: { show: false },
      axisLabel: {
        color: tokens.mutedText,
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Taxa (%)',
      nameLocation: 'middle',
      nameGap: 42,
      nameTextStyle: {
        color: tokens.mutedText,
        fontSize: 12,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: tokens.mutedText,
        fontSize: 12,
        formatter: (value: number) => `${value}%`,
      },
      splitLine: {
        lineStyle: {
          color: tokens.border,
          type: 'dashed',
          opacity: 0.7,
        },
      },
    },
    series: INDICATORS_IN_ORDER.map((indicator) => ({
      name: indicator,
      type: 'line',
      smooth: true,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 7,
      data: chartData.map((item) => item[indicator] as number | null),
      lineStyle: {
        color: INDICATOR_COLORS[indicator],
        width: 2,
      },
      itemStyle: {
        color: INDICATOR_COLORS[indicator],
        opacity: 1,
      },
      emphasis: {
        disabled: true,
      },
      connectNulls: false,
    })),
  }), [chartData, tokens.border, tokens.mutedText, tokens.popover, tokens.text])

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
    )
  }

  if (!chartData.length) {
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
    )
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
        <div className="h-[400px]">
          <EChart option={chartOption} className="h-full" />
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <p>
            <strong>Como interpretar:</strong> Quanto menor a taxa, melhor o
            desempenho. Tendências crescentes (linhas subindo) indicam piora e
            requerem atenção imediata.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
