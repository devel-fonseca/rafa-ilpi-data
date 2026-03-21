import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart, useEChartThemeTokens } from '@/components/ui/echart'

interface SparklineProps {
  data: Array<{ value: number }>
  color?: string
  height?: number
  domain?: [number | string, number | string]
  unit?: string
}

export function Sparkline({
  data,
  color = '#3b82f6',
  height = 60,
  domain = ['dataMin', 'dataMax'],
  unit = '',
}: SparklineProps) {
  const tokens = useEChartThemeTokens()

  const chartOption = useMemo<EChartsOption>(() => ({
    animationDuration: 250,
    grid: {
      top: 6,
      right: 4,
      bottom: 6,
      left: 4,
      containLabel: false,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: {
          color,
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
      extraCssText: 'border-radius: 6px; box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);',
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [params]
        const value = Number((rows[0] as { value?: number | string })?.value ?? 0)
        return `<div style="font-size: 12px; font-weight: 600;">${value} ${unit}</div>`
      },
    },
    xAxis: {
      type: 'category',
      data: data.map((_, index) => index + 1),
      show: false,
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      show: false,
      min: domain[0],
      max: domain[1],
    },
    series: [
      {
        type: 'line',
        data: data.map((item) => item.value),
        smooth: true,
        showSymbol: false,
        lineStyle: {
          color,
          width: 2,
        },
        itemStyle: {
          color,
          opacity: 1,
        },
        emphasis: {
          disabled: true,
        },
        animationEasing: 'cubicOut',
      },
    ],
  }), [color, data, domain, tokens.border, tokens.popover, tokens.text, unit])

  if (!data || data.length === 0) {
    return (
      <div
        className="bg-muted rounded flex items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        Sem dados
      </div>
    )
  }

  return <EChart option={chartOption} height={height} />
}
