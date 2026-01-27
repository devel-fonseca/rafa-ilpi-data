import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Users, Bed } from 'lucide-react'

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
          <CardDescription>Taxa atual</CardDescription>
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
          <CardDescription>Taxa atual</CardDescription>
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
          <CardDescription>Taxa atual</CardDescription>
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

  // Dados para o gráfico radial
  const chartData = [
    {
      name: 'Ocupação',
      value: occupancyRate,
      fill: getOccupancyColor(occupancyRate),
    },
  ]

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground">
          Taxa de Ocupação
        </CardTitle>
        <CardDescription>Taxa atual</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="75%"
              outerRadius="100%"
              barSize={20}
              data={chartData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                minAngle={15}
                background={{ fill: 'hsl(var(--muted))' }}
                clockWise
                dataKey="value"
                cornerRadius={8}
                fill={getOccupancyColor(occupancyRate)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de Ocupação']}
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

        {/* Informações adicionais */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Residentes</div>
              <div className="text-lg font-semibold text-foreground">{currentMonth.residents}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Bed className="h-4 w-4 text-info" />
            <div>
              <div className="text-xs text-muted-foreground">Leitos</div>
              <div className="text-lg font-semibold text-foreground">{currentMonth.capacity}</div>
            </div>
          </div>
        </div>

        {/* Capacidades regulatórias (se existirem) */}
        {(capacityDeclared || capacityLicensed) && (
          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/50">
            {capacityDeclared && (
              <div>
                <div className="text-xs text-muted-foreground">Cap. Declarada</div>
                <div className="text-sm font-medium text-warning">{capacityDeclared}</div>
              </div>
            )}
            {capacityLicensed && (
              <div>
                <div className="text-xs text-muted-foreground">Cap. Licenciada</div>
                <div className="text-sm font-medium text-danger">{capacityLicensed}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
