import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, MinusCircle } from 'lucide-react'

interface AssessmentProgressBarProps {
  totalQuestions: number
  questionsAnswered: number
  questionsNA: number
}

export function AssessmentProgressBar({
  totalQuestions,
  questionsAnswered,
  questionsNA,
}: AssessmentProgressBarProps) {
  const progressPercentage = (questionsAnswered / totalQuestions) * 100
  const questionsWithResponse = questionsAnswered - questionsNA

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progresso do Autodiagnóstico</span>
          <span className="text-muted-foreground">
            {questionsAnswered}/{totalQuestions} questões respondidas
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Estatísticas */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">{questionsWithResponse}</strong> respondidas
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <MinusCircle className="h-4 w-4 text-warning" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">{questionsNA}</strong> N/A
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Circle className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            <strong className="text-foreground">{totalQuestions - questionsAnswered}</strong>{' '}
            pendentes
          </span>
        </div>
      </div>

      {/* Status Badge */}
      {questionsAnswered === totalQuestions && (
        <Badge variant="default" className="bg-success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Todas as questões foram respondidas
        </Badge>
      )}
    </div>
  )
}
