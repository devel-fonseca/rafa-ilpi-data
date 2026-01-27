import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

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
  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Taxa de Ocupação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] flex items-center justify-center">
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
          <div className="h-[240px] flex flex-col items-center justify-center gap-3">
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
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Pegar dados do mês mais recente
  const currentMonth = data[data.length - 1]
  const occupancyRate = currentMonth.occupancyRate ?? 0

  // Determinar cor baseada na taxa de ocupação
  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'hsl(var(--danger))' // Vermelho - muito cheio
    if (rate >= 75) return 'hsl(var(--warning))' // Amarelo - atenção
    if (rate >= 50) return 'hsl(var(--success))' // Verde - ideal
    return 'hsl(var(--info))' // Azul - baixa ocupação
  }

  // Dados para o gráfico radial - técnica correta para gráfico parcial
  const chartData = [
    {
      name: 'Preenchido',
      value: occupancyRate,
      fill: getOccupancyColor(occupancyRate),
    },
    {
      name: 'Vazio',
      value: 100 - occupancyRate,
      fill: 'hsl(var(--muted))',
      fillOpacity: 0.5,
    },
  ]

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground">
          Taxa de Ocupação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              barSize={18}
              data={chartData}
              startAngle={90}
              endAngle={450}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={8}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                content={({ active }) => {
                  if (active) {
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <div className="text-sm font-semibold mb-2 text-foreground">Taxa de Ocupação</div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground">Taxa:</span>
                            <span className="text-sm font-bold" style={{ color: getOccupancyColor(occupancyRate) }}>
                              {occupancyRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground">Residentes:</span>
                            <span className="text-sm font-semibold text-primary">{currentMonth.residents}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground">Leitos:</span>
                            <span className="text-sm font-semibold text-info">{currentMonth.capacity}</span>
                          </div>
                          {(capacityDeclared || capacityLicensed) && (
                            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                              {capacityDeclared && (
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs text-muted-foreground">Cap. Declarada:</span>
                                  <span className="text-sm font-medium text-warning">{capacityDeclared}</span>
                                </div>
                              )}
                              {capacityLicensed && (
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs text-muted-foreground">Cap. Licenciada:</span>
                                  <span className="text-sm font-medium text-danger">{capacityLicensed}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Valor central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-3xl font-bold" style={{ color: getOccupancyColor(occupancyRate) }}>
              {occupancyRate.toFixed(1)}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Taxa de Ocupação</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
