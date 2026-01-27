import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { normalizeUTCDate } from '@/utils/dateHelpers'

interface MonthlyData {
  month: string
  count: number
}

interface ResidentsGrowthChartProps {
  data?: MonthlyData[]
  isLoading?: boolean
}

/**
 * ResidentsGrowthChart
 *
 * Gráfico de área mostrando o crescimento de residentes ao longo do tempo.
 * Exibe os últimos 6 meses de dados.
 */
export function ResidentsGrowthChart({ data = [], isLoading = false }: ResidentsGrowthChartProps) {
  // Formatar mês para exibição (Jan, Fev, Mar, etc.) - timezone-safe
  const formatMonth = (monthStr: string): string => {
    // monthStr vem como 'YYYY-MM', precisamos converter para 'YYYY-MM-01' para normalizar
    const dateStr = `${monthStr}-01` // Primeiro dia do mês
    const date = normalizeUTCDate(dateStr)
    const formatted = format(date, 'MMM', { locale: ptBR })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }

  // Preparar dados para o gráfico
  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    count: item.count,
  }))

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Residentes ao Longo do Tempo
          </CardTitle>
          <CardDescription>Crescimento nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Carregando...</p>
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
            Residentes ao Longo do Tempo
          </CardTitle>
          <CardDescription>Crescimento nos últimos 6 meses</CardDescription>
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
    <Card className="bg-card border-border h-[320px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-medium text-foreground">
          Residentes ao Longo do Tempo
        </CardTitle>
        <CardDescription>Crescimento nos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
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
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number) => [value, 'Residentes']}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
