import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'

interface NonCompliantIssue {
  questionNumber: number
  questionText: string
  pointsObtained: number
  criticalityLevel: string
}

interface AllNonCompliantListProps {
  issues: NonCompliantIssue[]
}

export function AllNonCompliantList({ issues }: AllNonCompliantListProps) {
  if (!issues || issues.length === 0) {
    return (
      <Card className="border-success/30 bg-success/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-success/20">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-success mb-1">
                Nenhuma Não Conformidade
              </h3>
              <p className="text-sm text-success/80">
                Todas as questões aplicáveis obtiveram pontuação igual ou superior a 3 pontos,
                atendendo ao critério de conformidade da RDC 502/2021.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Alert de Aviso */}
      <Alert variant="default" className="border-warning bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription>
          <strong>Atenção:</strong> {issues.length} questão(ões) com pontuação inferior a 3 pontos.
          Estas questões requerem elaboração de plano de ação corretiva para regularização.
        </AlertDescription>
      </Alert>

      {/* Card com Lista de Não Conformidades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-warning" />
            Todas as Não Conformidades (&lt;3 pontos)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {issues.map((issue) => {
            const isCritical = issue.criticalityLevel === 'C'
            const severityColor = isCritical ? 'danger' : 'warning'

            return (
              <div
                key={issue.questionNumber}
                className={`p-4 border rounded-lg space-y-3 ${
                  isCritical
                    ? 'border-danger/30 bg-danger/10'
                    : 'border-warning/30 bg-warning/10'
                }`}
              >
                {/* Cabeçalho */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isCritical ? 'destructive' : 'default'}
                      className="font-mono"
                    >
                      Q{issue.questionNumber}
                    </Badge>
                    <Badge
                      variant={isCritical ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {isCritical ? 'Crítica' : 'Não Crítica'}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold text-${severityColor}`}>
                      {issue.pointsObtained}
                    </span>
                    <span className="text-sm text-muted-foreground">/ 5 pontos</span>
                  </div>
                </div>

                {/* Texto da Questão */}
                <div>
                  <p className="font-medium text-sm leading-relaxed">{issue.questionText}</p>
                </div>

                {/* Aviso de Prioridade */}
                <div
                  className={`flex items-start gap-2 p-3 rounded-md ${
                    isCritical ? 'bg-danger/20' : 'bg-warning/20'
                  }`}
                >
                  <AlertTriangle
                    className={`h-4 w-4 mt-0.5 flex-shrink-0 text-${severityColor}`}
                  />
                  <p className={`text-xs text-${severityColor}`}>
                    <strong>{isCritical ? 'Prioridade Alta' : 'Requer Atenção'}:</strong>{' '}
                    {isCritical
                      ? 'Questão crítica com pontuação insuficiente. Requer ação corretiva imediata.'
                      : 'Questão não conforme. Recomenda-se implementação de melhorias.'}
                  </p>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Sobre Não Conformidades:</strong> Questões com pontuação inferior a 3 pontos
          indicam não conformidade com os requisitos da RDC 502/2021. Questões críticas (C)
          possuem impacto maior na classificação e devem ser priorizadas nas ações corretivas.
        </AlertDescription>
      </Alert>
    </div>
  )
}
