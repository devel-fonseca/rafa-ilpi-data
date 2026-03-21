import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EChart, useEChartThemeTokens } from '@/components/ui/echart'
import { normalizeUTCDate } from '@/utils/dateHelpers'

interface DailyData {
  day: string
  scheduled: number
  administered: number
}

interface MedicationAdministrationChartProps {
  data?: DailyData[]
  isLoading?: boolean
}

/**
 * MedicationAdministrationChart
 *
 * Gráfico de barras comparando medicações agendadas vs administradas.
 * Exibe os últimos 7 dias de dados.
 */
export function MedicationAdministrationChart({
  data = [],
  isLoading = false,
}: MedicationAdministrationChartProps) {
  const tokens = useEChartThemeTokens()

  const chartData = data.map((item) => ({
    day: formatDay(item.day),
    scheduled: item.scheduled,
    administered: item.administered,
  }))

  const chartOption = useMemo<EChartsOption>(() => ({
    animationDuration: 400,
    grid: {
      top: 20,
      right: 16,
      bottom: 42,
      left: 12,
      containLabel: true,
    },
    legend: {
      bottom: 8,
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: {
        color: tokens.mutedText,
        fontSize: 12,
      },
      data: ['Agendadas', 'Administradas'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(148, 163, 184, 0.12)',
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
    },
    xAxis: {
      type: 'category',
      data: chartData.map((item) => item.day),
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
        name: 'Agendadas',
        type: 'bar',
        barGap: '15%',
        z: 2,
        itemStyle: {
          color: tokens.info,
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          focus: 'none',
          itemStyle: {
            color: tokens.info,
          },
        },
        data: chartData.map((item) => item.scheduled),
      },
      {
        name: 'Administradas',
        type: 'bar',
        z: 2,
        itemStyle: {
          color: tokens.success,
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          focus: 'none',
          itemStyle: {
            color: tokens.success,
          },
        },
        data: chartData.map((item) => item.administered),
      },
    ],
  }), [chartData, tokens.border, tokens.info, tokens.mutedText, tokens.popover, tokens.success, tokens.text])

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Administração de Medicações
          </CardTitle>
          <CardDescription>Últimos 7 dias</CardDescription>
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
            Administração de Medicações
          </CardTitle>
          <CardDescription>Últimos 7 dias</CardDescription>
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
          Administração de Medicações
        </CardTitle>
        <CardDescription>Últimos 7 dias</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <EChart option={chartOption} className="h-full" />
      </CardContent>
    </Card>
  )
}

function formatDay(dayStr: string): string {
  const date = normalizeUTCDate(dayStr)
  const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' })
  return dayName.charAt(0).toUpperCase() + dayName.slice(1)
}
