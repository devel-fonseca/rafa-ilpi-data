import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EChart, useEChartThemeTokens } from '@/components/ui/echart'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { normalizeUTCDate } from '@/utils/dateHelpers'

interface MonthlyData {
  month: string
  count: number
}

interface ResidentsGrowthChartProps {
  data?: MonthlyData[]
  isLoading?: boolean
}

/**
 * ResidentsGrowthChart
 *
 * Gráfico de área mostrando o crescimento de residentes ao longo do tempo.
 * Exibe os últimos 6 meses de dados.
 */
export function ResidentsGrowthChart({ data = [], isLoading = false }: ResidentsGrowthChartProps) {
  const tokens = useEChartThemeTokens()

  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    count: item.count,
  }))

  const chartOption = useMemo<EChartsOption>(() => ({
    animationDuration: 400,
    grid: {
      top: 16,
      right: 16,
      bottom: 24,
      left: 12,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: tokens.border,
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
      formatter: (params) => {
        const point = (Array.isArray(params) ? params[0] : params) as {
          axisValueLabel?: string
          value?: number | string | Array<number | string | null> | null
        }
        const value = Array.isArray(point.value) ? point.value[1] : point.value
        return `${point.axisValueLabel ?? ''}<br/><strong>${value ?? 0}</strong> residente(s)`
      },
    },
    xAxis: {
      type: 'category',
      data: chartData.map((item) => item.month),
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: tokens.border,
        },
      },
      axisTick: { show: false },
      axisLabel: {
        color: tokens.mutedText,
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: tokens.mutedText,
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: tokens.border,
          type: 'dashed',
          opacity: 0.6,
        },
      },
    },
    series: [
      {
        name: 'Residentes',
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        data: chartData.map((item) => item.count),
        lineStyle: {
          color: tokens.primary,
          width: 2,
        },
        itemStyle: {
          color: tokens.primary,
          opacity: 1,
        },
        emphasis: {
          disabled: true,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: tokens.primary },
              { offset: 1, color: 'rgba(37, 99, 235, 0.08)' },
            ],
          },
          opacity: 0.35,
        },
      },
    ],
  }), [chartData, tokens.border, tokens.mutedText, tokens.popover, tokens.primary, tokens.text])

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Residentes ao Longo do Tempo
          </CardTitle>
          <CardDescription>Crescimento nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Residentes ao Longo do Tempo
          </CardTitle>
          <CardDescription>Crescimento nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border h-[320px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground">
          Residentes ao Longo do Tempo
        </CardTitle>
        <CardDescription>Crescimento nos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <EChart option={chartOption} className="h-full" />
      </CardContent>
    </Card>
  )
}

function formatMonth(monthStr: string): string {
  const date = normalizeUTCDate(`${monthStr}-01`)
  const formatted = format(date, 'MMM', { locale: ptBR })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
