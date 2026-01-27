import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { normalizeUTCDate } from '@/utils/dateHelpers'

interface DailyRecordData {
  day: string // 'YYYY-MM-DD'
  expected: number
  completed: number
}

interface MandatoryRecordsChartProps {
  data?: DailyRecordData[]
  isLoading?: boolean
}

/**
 * MandatoryRecordsChart
 *
 * Gráfico de barras comparando registros obrigatórios esperados vs completados.
 * Exibe os últimos 7 dias de dados.
 */
export function MandatoryRecordsChart({
  data = [],
  isLoading = false,
}: MandatoryRecordsChartProps) {
  // Formatar dia da semana (timezone-safe seguindo DATETIME_STANDARD.md)
  const formatDay = (dayStr: string): string => {
    const date = normalizeUTCDate(dayStr) // Converte YYYY-MM-DD para Date sem timezone shift
    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' })
    return dayName.charAt(0).toUpperCase() + dayName.slice(1)
  }

  // Preparar dados para o gráfico
  const chartData = data.map((item) => ({
    day: formatDay(item.day),
    Esperados: item.expected,
    Completados: item.completed,
  }))

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Registros Obrigatórios
          </CardTitle>
          <CardDescription>Últimos 7 dias</CardDescription>
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
            Registros Obrigatórios
          </CardTitle>
          <CardDescription>Últimos 7 dias</CardDescription>
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
          Registros Obrigatórios
        </CardTitle>
        <CardDescription>Últimos 7 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="day"
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
            />
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                color: 'hsl(var(--foreground))',
              }}
            />
            <Bar
              dataKey="Esperados"
              fill="hsl(var(--warning))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="Completados"
              fill="hsl(var(--success))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
