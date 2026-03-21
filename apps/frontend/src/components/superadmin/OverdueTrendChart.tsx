import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import type { OverdueTrend } from '@/api/overdue.api'
import { EChart, useEChartThemeTokens } from '@/components/ui/echart'

interface OverdueTrendChartProps {
  data: OverdueTrend[]
}

interface TooltipRow {
  seriesName?: string
  marker?: string
  axisValueLabel?: string
  value?: number | string | Array<number | string | null> | null
}

export function OverdueTrendChart({ data }: OverdueTrendChartProps) {
  const tokens = useEChartThemeTokens()

  // Formatar dados para o gráfico
  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    'Valor (R$)': item.overdueAmount,
    'Quantidade': item.overdueInvoices,
    'Taxa (%)': item.overdueRate,
  }))

  const chartOption = useMemo<EChartsOption>(() => ({
    animationDuration: 400,
    grid: {
      top: 32,
      right: 24,
      bottom: 56,
      left: 56,
      containLabel: true,
    },
    legend: {
      bottom: 8,
      textStyle: {
        color: tokens.mutedText,
        fontSize: 14,
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
      },
      backgroundColor: tokens.popover,
      borderColor: tokens.border,
      borderWidth: 1,
      textStyle: {
        color: tokens.text,
      },
      extraCssText: 'border-radius: 8px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);',
      formatter: (params) => {
        const rows = (Array.isArray(params) ? params : [params]) as TooltipRow[]
        const lines = rows.map((row) => {
          const rawValue = Array.isArray(row.value) ? row.value[row.value.length - 1] : row.value
          const value = Number(rawValue ?? 0)

          if (row.seriesName === 'Valor (R$)') {
            return `${row.marker} ${row.seriesName}: <strong>${new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(value)}</strong>`
          }

          if (row.seriesName === 'Taxa (%)') {
            return `${row.marker} ${row.seriesName}: <strong>${value.toFixed(1)}%</strong>`
          }

          return `${row.marker} ${row.seriesName}: <strong>${value}</strong>`
        })

        const title = rows[0]?.axisValueLabel ?? ''
        return [title, ...lines].join('<br/>')
      },
    },
    xAxis: {
      type: 'category',
      data: chartData.map((item) => item.month),
      axisLine: { lineStyle: { color: tokens.border } },
      axisTick: { show: false },
      axisLabel: {
        color: tokens.mutedText,
        fontSize: 12,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Valor',
        position: 'left',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: tokens.border,
            type: 'dashed',
            opacity: 0.7,
          },
        },
        axisLabel: {
          color: tokens.mutedText,
          fontSize: 12,
          formatter: (value: number) => `R$ ${(value / 1000).toFixed(0)}k`,
        },
      },
      {
        type: 'value',
        name: 'Qtd./Taxa',
        position: 'right',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          color: tokens.mutedText,
          fontSize: 12,
        },
      },
    ],
    series: [
      {
        name: 'Valor (R$)',
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        data: chartData.map((item) => item['Valor (R$)']),
        lineStyle: {
          color: tokens.danger,
          width: 2,
        },
        itemStyle: {
          color: tokens.danger,
          opacity: 1,
        },
        emphasis: {
          disabled: true,
        },
      },
      {
        name: 'Quantidade',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        data: chartData.map((item) => item.Quantidade),
        lineStyle: {
          color: '#f97316',
          width: 2,
        },
        itemStyle: {
          color: '#f97316',
          opacity: 1,
        },
        emphasis: {
          disabled: true,
        },
      },
      {
        name: 'Taxa (%)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 8,
        data: chartData.map((item) => item['Taxa (%)']),
        lineStyle: {
          color: '#facc15',
          width: 2,
          type: 'dashed',
        },
        itemStyle: {
          color: '#facc15',
          opacity: 1,
        },
        emphasis: {
          disabled: true,
        },
      },
    ],
  }), [chartData, tokens.border, tokens.danger, tokens.mutedText, tokens.popover, tokens.text])

  return (
    <EChart option={chartOption} height={350} />
  )
}

/**
 * Formata string de mês "2024-12" para "Dez/24"
 */
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ]

  const monthIndex = parseInt(month, 10) - 1
  const shortYear = year.slice(2)

  return `${monthNames[monthIndex]}/${shortYear}`
}
