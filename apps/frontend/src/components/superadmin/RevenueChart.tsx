import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TrendData } from '@/api/superadmin.api'

interface RevenueChartProps {
  data: TrendData[]
  title?: string
  height?: number
}

/**
 * RevenueChart
 *
 * Gráfico de linha mostrando a evolução do MRR ao longo do tempo.
 * Utiliza Recharts para visualização responsiva.
 */
export function RevenueChart({
  data,
  title = 'Evolução de Receita (MRR)',
  height = 300,
}: RevenueChartProps) {
  // Formatar mês para exibição (Jan/25, Fev/25, etc.)
  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
    const yearShort = year.slice(2)
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${yearShort}`
  }

  // Formatar valor para tooltip (R$ 1.234,56)
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Preparar dados para o gráfico
  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    mrr: item.mrr,
  }))

  return (
    <Card className="bg-purple-900 border-purple-800">
      <CardHeader>
        <CardTitle className="text-base font-medium text-purple-50">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#6b21a8" />
            <XAxis
              dataKey="month"
              stroke="#c4b5fd"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#c4b5fd"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `R$ ${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#581c87',
                border: '1px solid #6b21a8',
                borderRadius: '8px',
                color: '#f3e8ff',
              }}
              formatter={(value: number) => [formatCurrency(value), 'MRR']}
              labelStyle={{ color: '#e9d5ff' }}
            />
            <Legend
              wrapperStyle={{ color: '#e9d5ff', fontSize: '14px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="mrr"
              stroke="#a78bfa"
              strokeWidth={3}
              dot={{ fill: '#a78bfa', r: 4 }}
              activeDot={{ r: 6 }}
              name="MRR"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
