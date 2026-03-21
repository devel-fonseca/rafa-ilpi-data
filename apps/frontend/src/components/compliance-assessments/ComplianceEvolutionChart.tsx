import { useCallback, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ComplianceAssessment } from '@/api/compliance-assessments.api'
import { TrendingUp } from 'lucide-react'
import { EChart, useEChartThemeTokens } from '@/components/ui/echart'

interface ComplianceEvolutionChartProps {
  assessments: ComplianceAssessment[]
}

export function ComplianceEvolutionChart({ assessments }: ComplianceEvolutionChartProps) {
  const tokens = useEChartThemeTokens()
  const levelColors = useMemo(
    () => ({
      IRREGULAR: tokens.danger,
      PARCIAL: tokens.warning,
      REGULAR: tokens.success,
    }),
    [tokens.danger, tokens.success, tokens.warning],
  )

  const chartData = useMemo(() => {
    return assessments
      .filter((a) => a.status === 'COMPLETED' && a.compliancePercentage != null)
      .sort((a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime())
      .map((assessment) => ({
        id: assessment.id,
        date: format(new Date(assessment.assessmentDate), 'MMM/yy', { locale: ptBR }),
        fullDate: format(new Date(assessment.assessmentDate), "dd 'de' MMM 'de' yyyy", {
          locale: ptBR,
        }),
        percentage: Math.round(assessment.compliancePercentage ?? 0),
        level: assessment.complianceLevel,
      }))
  }, [assessments])

  const evolution = chartData.length >= 2
    ? chartData[chartData.length - 1].percentage - chartData[0].percentage
    : 0

  const getBarColor = useCallback(
    (level: string) => levelColors[level as keyof typeof levelColors] || tokens.danger,
    [levelColors, tokens.danger],
  )

  const chartOption = useMemo<EChartsOption>(() => ({
    animationDuration: 400,
    grid: {
      top: 20,
      right: 36,
      bottom: 32,
      left: 24,
      containLabel: true,
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
      formatter: (params: unknown) => {
        const rows = Array.isArray(params) ? params : [params]
        const first = rows[0] as { dataIndex?: number } | undefined
        const index = first?.dataIndex ?? 0
        const data = chartData[index]
        if (!data) return ''

        return `
          <div style="min-width: 170px;">
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 6px; color: ${tokens.text};">${data.fullDate}</div>
            <div style="font-size: 13px; color: ${tokens.text};">
              <span style="color: ${tokens.mutedText};">Conformidade:</span>
              <strong style="margin-left: 4px; color: ${getBarColor(data.level)};">${data.percentage}%</strong>
            </div>
            <div style="font-size: 12px; color: ${tokens.mutedText}; margin-top: 4px;">Nível: <strong>${data.level}</strong></div>
          </div>
        `
      },
    },
    xAxis: {
      type: 'category',
      data: chartData.map((item) => item.date),
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
      min: 0,
      max: 100,
      name: 'Conformidade (%)',
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
      },
      splitLine: {
        lineStyle: {
          color: tokens.border,
          type: 'dashed',
          opacity: 0.7,
        },
      },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 64,
        data: chartData.map((item) => ({
          value: item.percentage,
          itemStyle: {
            color: getBarColor(item.level),
            borderRadius: [8, 8, 0, 0],
          },
        })),
        emphasis: {
          disabled: true,
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: {
            type: 'dashed',
            width: 1,
          },
          label: {
            show: true,
            position: 'end',
            color: tokens.mutedText,
            fontSize: 10,
            formatter: (params) => {
              const value = typeof params.value === 'number' ? params.value : Number(params.value ?? 0)
              if (value === 75) return 'REGULAR (75%)'
              if (value === 50) return 'PARCIAL (50%)'
              return ''
            },
          },
          data: [
            { yAxis: 75, lineStyle: { color: tokens.success, type: 'dashed' } },
            { yAxis: 50, lineStyle: { color: tokens.warning, type: 'dashed' } },
          ],
        },
      },
    ],
  }), [chartData, getBarColor, tokens.border, tokens.mutedText, tokens.popover, tokens.success, tokens.text, tokens.warning])

  if (chartData.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Evolução de Conformidade
          {evolution !== 0 && (
            <span
              className={`text-sm font-normal ${evolution > 0 ? 'text-success' : 'text-danger'}`}
            >
              ({evolution > 0 ? '+' : ''}
              {evolution}% {chartData.length >= 2 && 'desde a primeira avaliação'})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <EChart option={chartOption} className="h-full" />
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-danger" />
            <span>IRREGULAR (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning" />
            <span>PARCIAL (50-74%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success" />
            <span>REGULAR (≥75%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
