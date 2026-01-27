import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
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
  capacityDeclared?: number | null
  capacityLicensed?: number | null
  isLoading?: boolean
}

/**
 * OccupancyRateChart
 *
 * Gráfico composto (barras + linhas) mostrando ocupação vs capacidades ao longo do tempo.
 * - Barras: Residentes (ocupados) e Leitos Configurados (capacidade real)
 * - Linhas tracejadas: Capacidade Declarada e Licenciada (referências regulatórias)
 * Exibe os últimos 6 meses de dados.
 * Mostra alerta caso não haja leitos configurados.
 */
export function OccupancyRateChart({
  data = [],
  hasBedsConfigured = false,
  capacityDeclared = null,
  capacityLicensed = null,
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
    Residentes: item.residents,
    'Leitos Configurados': item.capacity,
    ...(capacityDeclared && { 'Cap. Declarada': capacityDeclared }),
    ...(capacityLicensed && { 'Cap. Licenciada': capacityLicensed }),
  }))

  // Calcular domínio do YAxis (máximo entre todos os valores)
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.residents, d.capacity)),
    capacityDeclared ?? 0,
    capacityLicensed ?? 0,
  )
  const yAxisMax = Math.ceil(maxValue * 1.1) // 10% margem

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
          Ocupação vs Capacidades
        </CardTitle>
        <CardDescription>Últimos 6 meses - Residentes, Leitos e Limites Regulatórios</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              domain={[0, yAxisMax]}
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

            {/* Linhas de referência das capacidades regulatórias */}
            {capacityDeclared && (
              <ReferenceLine
                y={capacityDeclared}
                stroke="hsl(var(--warning))"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Declarada: ${capacityDeclared}`,
                  position: 'insideTopRight',
                  fill: 'hsl(var(--warning))',
                  fontSize: 11,
                }}
              />
            )}
            {capacityLicensed && (
              <ReferenceLine
                y={capacityLicensed}
                stroke="hsl(var(--danger))"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Licenciada: ${capacityLicensed}`,
                  position: 'insideBottomRight',
                  fill: 'hsl(var(--danger))',
                  fontSize: 11,
                }}
              />
            )}

            {/* Barras de dados */}
            <Bar
              dataKey="Residentes"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="Leitos Configurados"
              fill="hsl(var(--info))"
              radius={[4, 4, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
