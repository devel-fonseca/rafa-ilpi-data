import { useCallback, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { formatDateTimeShortSafe } from '@/utils/dateHelpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { EChart, useEChartThemeTokens } from '@/components/ui/echart'

const CHART_COLORS = {
  danger: 'hsl(var(--danger))',
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  pink: 'hsl(330 81% 60%)',
  cyan: 'hsl(188 95% 42%)',
}

interface VitalSignData {
  id: string
  timestamp: string
  systolicBloodPressure?: number
  diastolicBloodPressure?: number
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodGlucose?: number
}

interface VitalSignsChartsProps {
  data: VitalSignData[]
}

interface SeriesConfig {
  key: 'systolic' | 'diastolic' | 'temperature' | 'heartRate' | 'oxygenSaturation' | 'bloodGlucose'
  name: string
  color: string
  unit: string
}

interface ThresholdLine {
  value: number
  color: string
  label: string
}

export function VitalSignsCharts({ data }: VitalSignsChartsProps) {
  const tokens = useEChartThemeTokens()

  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .map((item) => ({
        date: formatDateTimeShortSafe(item.timestamp),
        timestamp: item.timestamp,
        systolic: item.systolicBloodPressure,
        diastolic: item.diastolicBloodPressure,
        temperature: item.temperature,
        heartRate: item.heartRate,
        oxygenSaturation: item.oxygenSaturation,
        bloodGlucose: item.bloodGlucose,
      }))
  }, [data])

  const buildLineOption = useCallback(
    (
      series: SeriesConfig[],
      yDomain: [number, number],
      thresholds: ThresholdLine[],
      showLegend = false,
    ): EChartsOption => ({
      animationDuration: 400,
      grid: {
        top: showLegend ? 28 : 20,
        right: 24,
        bottom: showLegend ? 48 : 24,
        left: 20,
        containLabel: true,
      },
      legend: showLegend
        ? {
            bottom: 8,
            textStyle: {
              color: tokens.mutedText,
              fontSize: 12,
            },
            data: series.map((item) => item.name),
          }
        : undefined,
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
            axisValueLabel?: string
            seriesName?: string
            marker?: string
            value?: number | string | null
          }>

          const title = typedRows[0]?.axisValueLabel ?? ''
          const lines = typedRows
            .filter((row) => row.seriesName && row.value != null)
            .map((row) => {
              const config = series.find((item) => item.name === row.seriesName)
              const value = Number(row.value ?? 0)
              return `${row.marker ?? ''} ${row.seriesName}: <strong>${value} ${config?.unit ?? ''}</strong>`
            })

          return [title, ...lines].join('<br/>')
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
        min: yDomain[0],
        max: yDomain[1],
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
      series: series.map((item, index) => ({
        name: item.name,
        type: 'line',
        smooth: true,
        connectNulls: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: 6,
        data: chartData.map((row) => row[item.key] as number | null),
        lineStyle: {
          color: item.color,
          width: 2,
        },
        itemStyle: {
          color: item.color,
          opacity: 1,
        },
        emphasis: {
          disabled: true,
        },
        markLine: index === 0 && thresholds.length > 0
          ? {
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
                formatter: (params) => params.name ?? '',
              },
              data: thresholds.map((threshold) => ({
                name: threshold.label,
                yAxis: threshold.value,
                lineStyle: {
                  color: threshold.color,
                  type: 'dashed',
                },
              })),
            }
          : undefined,
      })),
    }),
    [chartData, tokens.border, tokens.mutedText, tokens.popover, tokens.text],
  )

  const bloodPressureOption = useMemo(
    () =>
      buildLineOption(
        [
          { key: 'systolic', name: 'Sistólica', color: CHART_COLORS.danger, unit: 'mmHg' },
          { key: 'diastolic', name: 'Diastólica', color: CHART_COLORS.primary, unit: 'mmHg' },
        ],
        [0, 200],
        [
          { value: 140, color: CHART_COLORS.warning, label: 'PA Alta' },
          { value: 90, color: CHART_COLORS.warning, label: 'PA Baixa' },
        ],
        true,
      ),
    [buildLineOption],
  )

  const glucoseOption = useMemo(
    () =>
      buildLineOption(
        [{ key: 'bloodGlucose', name: 'Glicemia', color: CHART_COLORS.success, unit: 'mg/dL' }],
        [0, 300],
        [
          { value: 180, color: CHART_COLORS.danger, label: 'Hiperglicemia' },
          { value: 70, color: CHART_COLORS.warning, label: 'Hipoglicemia' },
        ],
        true,
      ),
    [buildLineOption],
  )

  const temperatureOption = useMemo(
    () =>
      buildLineOption(
        [{ key: 'temperature', name: 'Temperatura', color: CHART_COLORS.warning, unit: '°C' }],
        [34, 40],
        [
          { value: 37.5, color: CHART_COLORS.warning, label: 'Febre' },
          { value: 35.5, color: CHART_COLORS.primary, label: 'Hipotermia' },
        ],
      ),
    [buildLineOption],
  )

  const heartRateOption = useMemo(
    () =>
      buildLineOption(
        [{ key: 'heartRate', name: 'FC', color: CHART_COLORS.pink, unit: 'bpm' }],
        [40, 120],
        [
          { value: 100, color: CHART_COLORS.warning, label: 'Taquicardia' },
          { value: 60, color: CHART_COLORS.warning, label: 'Bradicardia' },
        ],
      ),
    [buildLineOption],
  )

  const oxygenOption = useMemo(
    () =>
      buildLineOption(
        [{ key: 'oxygenSaturation', name: 'SpO₂', color: CHART_COLORS.cyan, unit: '%' }],
        [85, 100],
        [{ value: 92, color: CHART_COLORS.danger, label: 'Baixa saturação' }],
        true,
      ),
    [buildLineOption],
  )

  if (data.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Sem dados disponíveis</AlertTitle>
        <AlertDescription>
          Não há registros de sinais vitais para o período selecionado.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <CardTitle>Pressão Arterial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <EChart option={bloodPressureOption} className="h-full" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Glicemia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <EChart option={glucoseOption} className="h-full" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Temperatura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <EChart option={temperatureOption} className="h-full" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Frequência Cardíaca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <EChart option={heartRateOption} className="h-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle>Saturação de Oxigênio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <EChart option={oxygenOption} className="h-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
