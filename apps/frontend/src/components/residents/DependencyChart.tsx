import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ResidentStats } from '@/api/residents.api'
import { useNavigate } from 'react-router-dom'

interface DependencyChartProps {
  stats: ResidentStats
}

export function DependencyChart({ stats }: DependencyChartProps) {
  const navigate = useNavigate()

  const total = stats.grauI + stats.grauII + stats.grauIII
  const grauIPercent = total > 0 ? Math.round((stats.grauI / total) * 100) : 0
  const grauIIPercent = total > 0 ? Math.round((stats.grauII / total) * 100) : 0
  const grauIIIPercent = total > 0 ? Math.round((stats.grauIII / total) * 100) : 0

  const dependencies = [
    {
      level: 'Grau I',
      description: 'Independente',
      count: stats.grauI,
      percent: grauIPercent,
      color: 'bg-primary',
      textColor: 'text-primary',
      bgLight: 'bg-primary/10',
      borderColor: 'border-primary/30',
    },
    {
      level: 'Grau II',
      description: 'Dependência Parcial',
      count: stats.grauII,
      percent: grauIIPercent,
      color: 'bg-warning',
      textColor: 'text-warning',
      bgLight: 'bg-warning/10',
      borderColor: 'border-warning/30',
    },
    {
      level: 'Grau III',
      description: 'Dependência Total',
      count: stats.grauIII,
      percent: grauIIIPercent,
      color: 'bg-danger',
      textColor: 'text-danger',
      bgLight: 'bg-danger/10',
      borderColor: 'border-danger/30',
    },
  ]

  const handleDependencyClick = (level: string) => {
    // Navegar para lista filtrada por grau de dependência
    navigate('/dashboard/residentes', {
      state: {
        filter: 'dependency-level',
        dependencyLevel: level,
      },
    })
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Grau de Dependência</h3>

        {/* Barra de progresso empilhada */}
        <div className="w-full h-8 rounded-lg overflow-hidden flex mb-4 sm:mb-6 border">
          {stats.grauI > 0 && (
            <div
              className="bg-primary hover:opacity-80 transition-opacity cursor-pointer"
              style={{ width: `${grauIPercent}%` }}
              onClick={() => handleDependencyClick('Grau I')}
              title={`Grau I: ${stats.grauI} (${grauIPercent}%)`}
            />
          )}
          {stats.grauII > 0 && (
            <div
              className="bg-warning hover:opacity-80 transition-opacity cursor-pointer"
              style={{ width: `${grauIIPercent}%` }}
              onClick={() => handleDependencyClick('Grau II')}
              title={`Grau II: ${stats.grauII} (${grauIIPercent}%)`}
            />
          )}
          {stats.grauIII > 0 && (
            <div
              className="bg-danger hover:opacity-80 transition-opacity cursor-pointer"
              style={{ width: `${grauIIIPercent}%` }}
              onClick={() => handleDependencyClick('Grau III')}
              title={`Grau III: ${stats.grauIII} (${grauIIIPercent}%)`}
            />
          )}
        </div>

        {/* Lista de dependências */}
        <div className="space-y-3">
          {dependencies.map((dep) => (
            <div
              key={dep.level}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${dep.bgLight} ${dep.borderColor}`}
              onClick={() => handleDependencyClick(dep.level)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${dep.color}`} />
                <div>
                  <p className="font-semibold text-sm">{dep.level}</p>
                  <p className="text-xs text-muted-foreground">{dep.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={dep.textColor}>
                  {dep.count}
                </Badge>
                <span className="text-xs text-muted-foreground">{dep.percent}%</span>
              </div>
            </div>
          ))}
        </div>

        {total === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum residente com grau de dependência definido
          </div>
        )}
      </CardContent>
    </Card>
  )
}
