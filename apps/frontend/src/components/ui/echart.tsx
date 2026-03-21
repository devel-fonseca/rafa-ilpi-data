import { useEffect, useMemo, useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/esm/core'
import * as echarts from 'echarts/core'
import type { EChartsOption } from 'echarts'
import {
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { cn } from '@/lib/utils'

interface EChartProps {
  option: EChartsOption
  className?: string
  height?: number | string
}

interface EChartThemeTokens {
  text: string
  mutedText: string
  border: string
  card: string
  popover: string
  primary: string
  success: string
  warning: string
  danger: string
  info: string
  muted: string
}

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  SVGRenderer,
])

const defaultTokens: EChartThemeTokens = {
  text: '#0f172a',
  mutedText: '#64748b',
  border: '#cbd5e1',
  card: '#ffffff',
  popover: '#ffffff',
  primary: '#2563eb',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  info: '#0284c7',
  muted: '#e2e8f0',
}

function readHslVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value ? `hsl(${value})` : fallback
}

function readThemeTokens(): EChartThemeTokens {
  return {
    text: readHslVar('--foreground', defaultTokens.text),
    mutedText: readHslVar('--muted-foreground', defaultTokens.mutedText),
    border: readHslVar('--border', defaultTokens.border),
    card: readHslVar('--card', defaultTokens.card),
    popover: readHslVar('--popover', defaultTokens.popover),
    primary: readHslVar('--primary', defaultTokens.primary),
    success: readHslVar('--success', defaultTokens.success),
    warning: readHslVar('--warning', defaultTokens.warning),
    danger: readHslVar('--danger', defaultTokens.danger),
    info: readHslVar('--info', defaultTokens.info),
    muted: readHslVar('--muted', defaultTokens.muted),
  }
}

export function useEChartThemeTokens() {
  const [tokens, setTokens] = useState<EChartThemeTokens>(() => readThemeTokens())

  useEffect(() => {
    const update = () => setTokens(readThemeTokens())
    update()

    const observer = new MutationObserver(() => {
      update()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  return tokens
}

function normalizeHeight(height?: number | string) {
  if (typeof height === 'number') return `${height}px`
  return height ?? '100%'
}

export function EChart({ option, className, height = '100%' }: EChartProps) {
  const stableOption = useMemo(() => option, [option])

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={stableOption}
      className={cn('w-full', className)}
      style={{ height: normalizeHeight(height), width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
      lazyUpdate
    />
  )
}
