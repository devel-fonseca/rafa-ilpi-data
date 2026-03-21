import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { EChart, useEChartThemeTokens } from '@/components/ui/echart'

interface MonthlyOccupancyData {
  month: string
  residents: number
  capacity: number
  occupancyRate: number | null
}

interface OccupancyRateChartProps {
  data?: MonthlyOccupancyData[]
  hasBedsConfigured?: boolean
  capacityDeclared?: number | null
  capacityLicensed?: number | null
  isLoading?: boolean
}

/**
 * OccupancyRateChart
 *
 * Gráfico radial mostrando taxa de ocupação atual.
 * Exibe a taxa do mês mais recente com indicação visual de capacidade.
 * Mostra alerta caso não haja leitos configurados.
 */
export function OccupancyRateChart({
  data = [],
  hasBedsConfigured = false,
  capacityDeclared = null,
  capacityLicensed = null,
  isLoading = false,
}: OccupancyRateChartProps) {
  const tokens = useEChartThemeTokens()
  const currentMonth = data[data.length - 1]
  const occupancyRate = currentMonth?.occupancyRate ?? 0
  const residents = currentMonth?.residents ?? 0
  const capacity = currentMonth?.capacity ?? 0

  const chartOption = useMemo<EChartsOption>(() => {
    const occupancyColor =
      occupancyRate >= 90
        ? tokens.danger
        : occupancyRate >= 75
          ? tokens.warning
          : occupancyRate >= 50
            ? tokens.success
            : tokens.info

    const capacityDetails = [
      capacityDeclared
        ? `<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:${tokens.mutedText};font-size:12px;">Cap. Declarada:</span><span style="color:${tokens.warning};font-size:14px;font-weight:500;">${capacityDeclared}</span></div>`
        : '',
      capacityLicensed
        ? `<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:${tokens.mutedText};font-size:12px;">Cap. Licenciada:</span><span style="color:${tokens.danger};font-size:14px;font-weight:500;">${capacityLicensed}</span></div>`
        : '',
    ]
      .filter(Boolean)
      .join('')

    return {
      animationDuration: 400,
      tooltip: {
        trigger: 'item',
        backgroundColor: tokens.popover,
        borderColor: tokens.border,
        borderWidth: 1,
        textStyle: {
          color: tokens.text,
          fontFamily: 'inherit',
        },
        extraCssText: 'border-radius: 12px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);',
        formatter: () => `
          <div style="min-width:180px;">
            <div style="font-size:14px;font-weight:600;margin-bottom:8px;color:${tokens.text};">Taxa de Ocupação</div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:6px;"><span style="color:${tokens.mutedText};font-size:12px;">Taxa:</span><span style="color:${occupancyColor};font-size:14px;font-weight:700;">${occupancyRate.toFixed(1)}%</span></div>
            <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:6px;"><span style="color:${tokens.mutedText};font-size:12px;">Residentes:</span><span style="color:${tokens.primary};font-size:14px;font-weight:600;">${residents}</span></div>
            <div style="display:flex;justify-content:space-between;gap:16px;${capacityDetails ? 'margin-bottom:8px;' : ''}"><span style="color:${tokens.mutedText};font-size:12px;">Leitos:</span><span style="color:${tokens.info};font-size:14px;font-weight:600;">${capacity}</span></div>
            ${capacityDetails ? `<div style="border-top:1px solid ${tokens.border};padding-top:8px;display:grid;gap:4px;">${capacityDetails}</div>` : ''}
          </div>
        `,
      },
      series: [
        {
          type: 'gauge',
          center: ['50%', '52%'],
          radius: '92%',
          startAngle: 90,
          endAngle: -270,
          min: 0,
          max: 100,
          splitNumber: 0,
          emphasis: {
            disabled: true,
          },
          progress: {
            show: true,
            roundCap: true,
            width: 18,
            itemStyle: {
              color: occupancyColor,
            },
          },
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: 18,
              color: [[1, tokens.muted]],
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          pointer: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '0%'],
            formatter: (value: number) => `${Number(value).toFixed(1)}%`,
            color: occupancyColor,
            fontSize: 32,
            fontWeight: 700,
          },
          data: [{ value: occupancyRate, name: 'Taxa de Ocupação' }],
        },
      ],
    }
  }, [
    capacity,
    capacityDeclared,
    capacityLicensed,
    occupancyRate,
    residents,
    tokens.border,
    tokens.danger,
    tokens.info,
    tokens.muted,
    tokens.mutedText,
    tokens.popover,
    tokens.primary,
    tokens.success,
    tokens.text,
    tokens.warning,
  ])

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Taxa de Ocupação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-square max-h-[240px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Se não há leitos configurados, mostrar alerta
  if (!hasBedsConfigured) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Taxa de Ocupação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-square max-h-[240px] flex flex-col items-center justify-center gap-3">
            <AlertCircle className="h-8 w-8 text-warning" />
            <p className="text-sm text-muted-foreground text-center">
              Configure leitos em <strong>Gestão de Leitos</strong> para visualizar a taxa de ocupação
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Taxa de Ocupação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-square max-h-[240px] flex items-center justify-center">
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
          Taxa de Ocupação
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex items-center justify-center">
        <div className="aspect-square h-full max-w-full w-full">
          <EChart option={chartOption} className="h-full" />
        </div>
      </CardContent>
    </Card>
  )
}
