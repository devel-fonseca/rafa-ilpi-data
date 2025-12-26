import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { OverdueTrend } from '@/api/overdue.api'

interface OverdueTrendChartProps {
  data: OverdueTrend[]
}

export function OverdueTrendChart({ data }: OverdueTrendChartProps) {
  // Formatar dados para o gráfico
  const chartData = data.map((item) => ({
    month: formatMonth(item.month),
    'Valor (R$)': item.overdueAmount,
    'Quantidade': item.overdueInvoices,
    'Taxa (%)': item.overdueRate,
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          stroke="#64748b"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          yAxisId="left"
          stroke="#64748b"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#64748b"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: 'none',
            borderRadius: '8px',
            color: '#f1f5f9',
          }}
          formatter={(value: any, name: string) => {
            if (name === 'Valor (R$)') {
              return [
                new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(value),
                name,
              ]
            }
            if (name === 'Taxa (%)') {
              return [`${value.toFixed(1)}%`, name]
            }
            return [value, name]
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
        />

        {/* Linha de Valor em Atraso */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="Valor (R$)"
          stroke="#dc2626"
          strokeWidth={2}
          dot={{ fill: '#dc2626', r: 4 }}
          activeDot={{ r: 6 }}
        />

        {/* Linha de Quantidade de Faturas */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="Quantidade"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ fill: '#f97316', r: 4 }}
          activeDot={{ r: 6 }}
        />

        {/* Linha de Taxa de Inadimplência */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="Taxa (%)"
          stroke="#facc15"
          strokeWidth={2}
          dot={{ fill: '#facc15', r: 4 }}
          activeDot={{ r: 6 }}
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * Formata string de mês "2024-12" para "Dez/24"
 */
function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ]

  const monthIndex = parseInt(month, 10) - 1
  const shortYear = year.slice(2)

  return `${monthNames[monthIndex]}/${shortYear}`
}
