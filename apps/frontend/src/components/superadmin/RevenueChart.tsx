import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EChart } from '@/components/ui/echart'
import type { TrendData } from '@/api/superadmin.api'

interface RevenueChartProps {
  data: TrendData[]
  title?: string
  height?: number
}

/**
 * RevenueChart
 *
 * Gráfico de linha mostrando a evolução do MRR ao longo do tempo.
 */
export function RevenueChart({
  data,
  title = 'Evolução de Receita (MRR)',
  height = 300,
}: RevenueChartProps) {
  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    mrr: item.mrr,
  }))

  const chartOption = useMemo<EChartsOption>(() => ({
    animationDuration: 400,
    grid: {
      top: 24,
      right: 16,
      bottom: 40,
      left: 24,
      containLabel: true,
    },
    legend: {
      bottom: 8,
      icon: 'line',
      textStyle: {
        color: '#475569',
        fontSize: 14,
      },
      data: ['MRR'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
      },
      backgroundColor: '#ffffff',
      borderColor: '#cbd5e1',
      borderWidth: 1,
      textStyle: {
        color: '#0f172a',
        fontFamily: 'inherit',
      },
      extraCssText: 'border-radius: 8px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);',
      formatter: (params) => {
        const point = Array.isArray(params) ? params[0] : params
        const value = Array.isArray(point.value) ? point.value[1] : point.value
        return `${point.axisValueLabel}<br/>MRR: <strong>${formatCurrency(Number(value))}</strong>`
      },
    },
    xAxis: {
      type: 'category',
      data: chartData.map((item) => item.month),
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#cbd5e1',
        },
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748b',
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748b',
        fontSize: 12,
        formatter: (value: number) => `R$ ${value}`,
      },
      splitLine: {
        lineStyle: {
          color: '#e2e8f0',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: 'MRR',
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        data: chartData.map((item) => item.mrr),
        lineStyle: {
          color: '#059669',
          width: 3,
        },
        itemStyle: {
          color: '#059669',
          opacity: 1,
        },
        emphasis: {
          disabled: true,
        },
      },
    ],
  }), [chartData])

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-base font-medium text-slate-900">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <EChart option={chartOption} height={height} />
      </CardContent>
    </Card>
  )
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1)
  const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
  const yearShort = year.slice(2)
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${yearShort}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
