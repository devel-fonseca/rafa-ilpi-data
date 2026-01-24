import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react'

interface CriticalNonCompliant {
  questionNumber: number
  questionText: string
  pointsObtained: number
  legalReference?: string
  category?: string
}

interface CriticalIssuesListProps {
  criticalIssues: CriticalNonCompliant[]
}

export function CriticalIssuesList({ criticalIssues }: CriticalIssuesListProps) {
  if (!criticalIssues || criticalIssues.length === 0) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Nenhuma Não Conformidade Crítica
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Todas as questões classificadas como críticas pela ANVISA estão em conformidade ou
                foram marcadas como não aplicáveis.
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
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Atenção:</strong> {criticalIssues.length} questão(ões) crítica(s) em não
          conformidade. Estas questões têm peso maior na avaliação e requerem ação corretiva
          imediata para regularização junto à vigilância sanitária.
        </AlertDescription>
      </Alert>

      {/* Card com Lista de Não Conformidades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Não Conformidades Críticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {criticalIssues.map((issue) => (
            <div
              key={issue.questionNumber}
              className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-lg space-y-3"
            >
              {/* Cabeçalho */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="font-mono">
                    Q{issue.questionNumber}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Crítica
                  </Badge>
                  {issue.category && (
                    <Badge variant="secondary" className="text-xs">
                      {issue.category}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-red-600">{issue.pointsObtained}</span>
                  <span className="text-sm text-muted-foreground">/ 5 pontos</span>
                </div>
              </div>

              {/* Texto da Questão */}
              <div>
                <p className="font-medium text-sm leading-relaxed">{issue.questionText}</p>
              </div>

              {/* Referência Legal */}
              {issue.legalReference && (
                <div className="pt-2 border-t border-red-200 dark:border-red-800">
                  <p className="text-xs text-muted-foreground">
                    <strong>Marco Regulatório:</strong> {issue.legalReference}
                  </p>
                </div>
              )}

              {/* Aviso de Prioridade */}
              <div className="flex items-start gap-2 p-3 bg-red-100 dark:bg-red-900 rounded-md">
                <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-300 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-900 dark:text-red-100">
                  <strong>Prioridade Alta:</strong> Questão crítica com pontuação inferior a 3
                  pontos. Recomenda-se elaboração de plano de ação corretiva documentado.
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Sobre Questões Críticas:</strong> De acordo com a RDC 502/2021, questões
          marcadas como críticas (C) possuem peso maior na classificação do estabelecimento. Não
          conformidades críticas podem resultar em notificações, interdições ou penalidades pela
          vigilância sanitária.
        </AlertDescription>
      </Alert>
    </div>
  )
}
