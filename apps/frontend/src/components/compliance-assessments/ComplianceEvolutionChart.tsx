import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ComplianceAssessment } from '@/api/compliance-assessments.api'
import { TrendingUp } from 'lucide-react'

interface ComplianceEvolutionChartProps {
  assessments: ComplianceAssessment[]
}

export function ComplianceEvolutionChart({ assessments }: ComplianceEvolutionChartProps) {
  // Filtrar apenas avaliações completas e ordenar por data
  const chartData = useMemo(() => {
    return assessments
      .filter((a) => a.status === 'COMPLETED' && a.compliancePercentage != null)
      .sort((a, b) => new Date(a.assessmentDate).getTime() - new Date(b.assessmentDate).getTime())
      .map((assessment) => ({
        id: assessment.id,
        date: format(new Date(assessment.assessmentDate), 'MMM/yy', { locale: ptBR }),
        fullDate: format(new Date(assessment.assessmentDate), "dd 'de' MMM 'de' yyyy", {
          locale: ptBR,
        }),
        percentage: Math.round(assessment.compliancePercentage!),
        level: assessment.complianceLevel,
      }))
  }, [assessments])

  // Se não houver dados suficientes, não mostrar o gráfico
  if (chartData.length === 0) {
    return null
  }

  // Função para determinar a cor da barra baseado no nível de conformidade
  // Níveis definidos em: apps/backend/src/compliance-assessments/utils/scoring-calculator.ts
  // IRREGULAR: <50% | PARCIAL: 50-74% | REGULAR: ≥75%
  const getBarColor = (level: string) => {
    const colors = {
      IRREGULAR: 'hsl(var(--danger))', // Vermelho clínico (<50%)
      PARCIAL: 'hsl(var(--warning))', // Âmbar hospitalar (50-74%)
      REGULAR: 'hsl(var(--success))', // Verde institucional (≥75%)
    }
    return colors[level as keyof typeof colors] || colors.IRREGULAR
  }

  // Função para determinar a classe Tailwind do texto baseado no nível
  const getTextColorClass = (level: string) => {
    const classes = {
      IRREGULAR: 'text-danger',
      PARCIAL: 'text-warning',
      REGULAR: 'text-success',
    }
    return classes[level as keyof typeof classes] || classes.IRREGULAR
  }

  // Calcular evolução (se houver pelo menos 2 pontos)
  const evolution = chartData.length >= 2
    ? chartData[chartData.length - 1].percentage - chartData[0].percentage
    : 0

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Evolução de Conformidade
          {evolution !== 0 && (
            <span
              className={`text-sm font-normal ${evolution > 0 ? 'text-success' : 'text-danger'}`}
            >
              ({evolution > 0 ? '+' : ''}
              {evolution}% {chartData.length >= 2 && 'desde a primeira avaliação'})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{ value: 'Conformidade (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-popover text-popover-foreground p-3 border rounded-lg shadow-lg">
                      <p className="font-semibold text-sm mb-1">{data.fullDate}</p>
                      <p className="text-sm">
                        <span className="font-medium">Conformidade:</span>{' '}
                        <span className={`font-bold ${getTextColorClass(data.level)}`}>
                          {data.percentage}%
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nível: <strong>{data.level}</strong>
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            {/* Linhas de referência para níveis de conformidade */}
            <ReferenceLine
              y={75}
              stroke="hsl(var(--success))"
              strokeDasharray="3 3"
              label={{
                value: 'REGULAR (75%)',
                position: 'right',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
            <ReferenceLine
              y={50}
              stroke="hsl(var(--warning))"
              strokeDasharray="3 3"
              label={{
                value: 'PARCIAL (50%)',
                position: 'right',
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
            <Bar dataKey="percentage" radius={[8, 8, 0, 0]} maxBarSize={80}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.level)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legenda de cores */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-danger" />
            <span>IRREGULAR (&lt;50%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning" />
            <span>PARCIAL (50-74%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success" />
            <span>REGULAR (≥75%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
