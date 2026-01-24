import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import type { AssessmentResult } from '@/api/compliance-assessments.api'

interface ResultsDashboardProps {
  report: AssessmentResult
}

export function ResultsDashboard({ report }: ResultsDashboardProps) {
  // report JÁ É o assessment completo (não tem nested structure)
  const assessment = report
  const categoryBreakdown = report.categoryStats || []

  // Calcular métricas derivadas
  const metrics = {
    totalPointsObtained: report.totalPointsObtained,
    totalPointsPossible: report.totalPointsPossible,
    fullyCompliant: report.responses?.filter(r => !r.isNotApplicable && r.selectedPoints === 5).length || 0,
    partiallyCompliant: report.responses?.filter(r => !r.isNotApplicable && r.selectedPoints !== undefined && r.selectedPoints > 0 && r.selectedPoints < 5).length || 0,
    nonCompliant: report.responses?.filter(r => !r.isNotApplicable && r.selectedPoints === 0).length || 0,
  }

  const getComplianceLevelConfig = (level: string) => {
    const configs = {
      REGULAR: {
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950',
        borderColor: 'border-green-200 dark:border-green-800',
        label: 'Conformidade Regular',
        description: '≥ 75% de conformidade com indicadores aplicáveis',
      },
      PARCIAL: {
        icon: AlertTriangle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 dark:bg-orange-950',
        borderColor: 'border-orange-200 dark:border-orange-800',
        label: 'Conformidade Parcial',
        description: '50-74% de conformidade com indicadores aplicáveis',
      },
      IRREGULAR: {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950',
        borderColor: 'border-red-200 dark:border-red-800',
        label: 'Irregularidade',
        description: '< 50% de conformidade com indicadores aplicáveis',
      },
    }

    return configs[level as keyof typeof configs] || configs.IRREGULAR
  }

  const config = getComplianceLevelConfig(assessment.complianceLevel!)
  const Icon = config.icon

  return (
    <div className="space-y-6">
      {/* Card Principal - Resultado Geral */}
      <Card className={`border-2 ${config.borderColor} ${config.bgColor}`}>
        <CardContent className="p-8">
          <div className="flex items-start gap-6">
            <div className={`p-4 rounded-full ${config.bgColor} border ${config.borderColor}`}>
              <Icon className={`h-12 w-12 ${config.color}`} />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-bold mb-1">{config.label}</h2>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{assessment.compliancePercentage!.toFixed(1)}%</span>
                <span className="text-sm text-muted-foreground">de conformidade</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Questões */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Questões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{assessment.totalQuestions}</span>
              <span className="text-sm text-muted-foreground">indicadores</span>
            </div>
          </CardContent>
        </Card>

        {/* Aplicáveis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aplicáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{assessment.applicableQuestions}</span>
              <span className="text-sm text-muted-foreground">questões</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {assessment.questionsNA} marcadas como N/A
            </p>
          </CardContent>
        </Card>

        {/* Pontuação Obtida */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pontos Obtidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{metrics.totalPointsObtained.toFixed(0)}</span>
              <span className="text-sm text-muted-foreground">
                / {metrics.totalPointsPossible.toFixed(0)}
              </span>
            </div>
            <Progress
              value={(metrics.totalPointsObtained / metrics.totalPointsPossible) * 100}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        {/* Questões Críticas */}
        <Card className={assessment.criticalNonCompliant && (assessment.criticalNonCompliant as unknown[]).length > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Não Conformidades Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${(assessment.criticalNonCompliant as unknown[])?.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {(assessment.criticalNonCompliant as unknown[])?.length || 0}
              </span>
              <span className="text-sm text-muted-foreground">questões</span>
            </div>
            {(assessment.criticalNonCompliant as unknown[])?.length > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Requerem atenção imediata
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown por Categoria (se disponível) */}
      {categoryBreakdown && categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryBreakdown.map((category) => {
              const percentage = category.percentage
              const trend =
                percentage >= 75 ? 'up' : percentage >= 50 ? 'neutral' : 'down'

              return (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{category.category}</span>
                      <Badge variant="outline" className="text-xs">
                        {category.questionsAnswered} questões
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {trend === 'up' && (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      )}
                      {trend === 'neutral' && (
                        <Minus className="h-4 w-4 text-orange-600" />
                      )}
                      {trend === 'down' && (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-semibold">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {category.pointsObtained.toFixed(0)} / {category.pointsPossible.toFixed(0)}{' '}
                      pontos
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Resumo de Respostas */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Respostas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.fullyCompliant}</p>
                <p className="text-xs text-muted-foreground">100% conformes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.partiallyCompliant}</p>
                <p className="text-xs text-muted-foreground">Parcialmente</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.nonCompliant}</p>
                <p className="text-xs text-muted-foreground">Não conformes</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                <MinusCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assessment.questionsNA}</p>
                <p className="text-xs text-muted-foreground">Não aplicáveis</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
