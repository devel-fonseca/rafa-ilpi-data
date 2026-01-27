import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { normalizeUTCDate } from '@/utils/dateHelpers'
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
  isLoading?: boolean
}

/**
 * OccupancyRateChart
 *
 * Gráfico de área mostrando taxa de ocupação (residentes/leitos) ao longo do tempo.
 * Exibe os últimos 6 meses de dados.
 * Mostra alerta caso não haja leitos configurados.
 */
export function OccupancyRateChart({
  data = [],
  hasBedsConfigured = false,
  isLoading = false,
}: OccupancyRateChartProps) {
  // Formatar mês para exibição (Jan, Fev, Mar, etc.) - timezone-safe
  const formatMonth = (monthStr: string): string => {
    const dateStr = `${monthStr}-01` // Primeiro dia do mês
    const date = normalizeUTCDate(dateStr)
    const formatted = format(date, 'MMM', { locale: ptBR })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  // Preparar dados para o gráfico
  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    'Taxa (%)': item.occupancyRate !== null ? item.occupancyRate : 0,
    Residentes: item.residents,
    Leitos: item.capacity,
  }))

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Taxa de Ocupação
          </CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
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
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center gap-3">
            <AlertCircle className="h-8 w-8 text-warning" />
            <p className="text-sm text-muted-foreground text-center">
              Configure leitos em <strong>Gestão de Leitos</strong> para visualizar a taxa de ocupação
            </p>
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
            Taxa de Ocupação
          </CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
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
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground">
          Taxa de Ocupação
        </CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'Taxa (%)') {
                  return [`${value.toFixed(1)}%`, 'Taxa de Ocupação']
                }
                return [value, name]
              }}
            />
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                color: 'hsl(var(--foreground))',
              }}
            />
            <Area
              type="monotone"
              dataKey="Taxa (%)"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorOccupancy)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
