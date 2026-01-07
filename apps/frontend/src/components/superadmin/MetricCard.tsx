import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    label: string
  }
  format?: 'currency' | 'number' | 'percentage'
}

/**
 * MetricCard
 *
 * Componente reutilizável para exibir métricas do SuperAdmin.
 * Suporta formatação de moeda, números e percentuais.
 * Mostra indicador de tendência (crescimento/queda) quando fornecido.
 */
export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  format = 'number',
}: MetricCardProps) {
  const formatValue = (val: string | number): string => {
    const numVal = typeof val === 'string' ? parseFloat(val) : val

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(numVal)
      case 'percentage':
        return `${numVal.toFixed(2)}%`
      case 'number':
      default:
        return new Intl.NumberFormat('pt-BR').format(numVal)
    }
  }

  const getTrendIcon = () => {
    if (!trend) return null

    if (trend.value > 0) {
      return <TrendingUp className="h-4 w-4 text-success/40" />
    } else if (trend.value < 0) {
      return <TrendingDown className="h-4 w-4 text-danger/40" />
    } else {
      return <Minus className="h-4 w-4 text-slate-500" />
    }
  }

  const getTrendColor = () => {
    if (!trend) return ''

    if (trend.value > 0) {
      return 'text-success/40'
    } else if (trend.value < 0) {
      return 'text-danger/40'
    } else {
      return 'text-slate-500'
    }
  }

  return (
    <Card className="bg-white border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-slate-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">
          {formatValue(value)}
        </div>

        {description && (
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        )}

        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon()}
            <span className={`text-xs font-medium ${getTrendColor()}`}>
              {trend.value > 0 && '+'}
              {trend.value.toFixed(2)}%
            </span>
            <span className="text-xs text-slate-500">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
