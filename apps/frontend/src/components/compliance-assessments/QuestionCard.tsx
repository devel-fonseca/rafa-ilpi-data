import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { type ComplianceQuestion } from '@/api/compliance-assessments.api'
import { useState, useEffect } from 'react'

interface QuestionCardProps {
  question: ComplianceQuestion
  questionIndex: number
  totalQuestions: number
  initialSelectedPoints?: number
  initialIsNA?: boolean
  initialObservations?: string
  onSaveResponse: (data: {
    questionId: string
    questionNumber: number
    selectedPoints?: number
    selectedText?: string
    isNotApplicable: boolean
    observations?: string
  }) => void
  onPrevious?: () => void
  onNext?: () => void
  onComplete?: () => void
  isFirst: boolean
  isLast: boolean
  isSaving: boolean
}

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  initialSelectedPoints,
  initialIsNA = false,
  initialObservations = '',
  onSaveResponse,
  onPrevious,
  onNext,
  onComplete,
  isFirst,
  isLast,
  isSaving,
}: QuestionCardProps) {
  const [selectedValue, setSelectedValue] = useState<string>(
    initialIsNA ? 'NA' : initialSelectedPoints !== undefined ? initialSelectedPoints.toString() : '',
  )
  const [observations, setObservations] = useState(initialObservations || '')
  const [hasChanges, setHasChanges] = useState(false)

  // Sincronizar estado quando a questão mudar
  useEffect(() => {
    const newValue = initialIsNA ? 'NA' : initialSelectedPoints !== undefined ? initialSelectedPoints.toString() : ''
    setSelectedValue(newValue)
    setObservations(initialObservations || '')
    setHasChanges(false)
  }, [question.id, initialIsNA, initialSelectedPoints, initialObservations])

  // Detectar mudanças
  useEffect(() => {
    const currentIsNA = selectedValue === 'NA'
    const currentPoints = currentIsNA ? undefined : Number(selectedValue)

    const changed =
      (currentIsNA !== initialIsNA) ||
      (currentPoints !== initialSelectedPoints) ||
      (observations !== initialObservations)

    setHasChanges(changed)
  }, [selectedValue, observations, initialIsNA, initialSelectedPoints, initialObservations])

  // Auto-save quando houver mudanças (debounce no hook)
  useEffect(() => {
    if (!hasChanges) return

    const isNA = selectedValue === 'NA'
    const points = isNA ? undefined : Number(selectedValue)
    const selectedOption = question.responseOptions.find((opt) => opt.points === points)

    onSaveResponse({
      questionId: question.id,
      questionNumber: question.questionNumber,
      selectedPoints: points,
      selectedText: selectedOption?.text,
      isNotApplicable: isNA,
      observations: observations || undefined,
    })
  }, [selectedValue, observations, hasChanges, question, onSaveResponse])

  const isAnswered = selectedValue !== ''

  return (
    <Card className="border-2">
      <CardHeader className="pb-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                {questionIndex + 1}/{totalQuestions}
              </Badge>
              <Badge
                variant={question.criticalityLevel === 'C' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {question.criticalityLevel === 'C' ? 'Crítica' : 'Não Crítica'}
              </Badge>
              {isAnswered && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Respondida
                </Badge>
              )}
            </div>

            <CardTitle className="text-base leading-relaxed">
              {question.questionText}
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              {question.legalReference}
              {question.category && ` • ${question.category}`}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Opções de Resposta */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Selecione a pontuação:</Label>
          <RadioGroup
            value={selectedValue || undefined}
            onValueChange={setSelectedValue}
            className="space-y-2"
          >
            {question.responseOptions.map((option) => (
              <div
                key={option.points}
                className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <RadioGroupItem
                  value={option.points.toString()}
                  id={`q${question.questionNumber}-opt${option.points}`}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`q${question.questionNumber}-opt${option.points}`}
                  className="flex-1 cursor-pointer leading-relaxed"
                >
                  <span className="font-semibold">{option.points} pontos</span> -{' '}
                  {option.text}
                </Label>
              </div>
            ))}

            {/* Opção N/A */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-dashed hover:bg-accent transition-colors">
              <RadioGroupItem
                value="NA"
                id={`q${question.questionNumber}-na`}
                className="mt-0.5"
              />
              <Label
                htmlFor={`q${question.questionNumber}-na`}
                className="flex-1 cursor-pointer leading-relaxed"
              >
                <span className="font-semibold">Não Aplicável (N/A)</span> - Este indicador não
                se aplica à instituição
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Campo de Observações */}
        <div className="space-y-2">
          <Label htmlFor={`obs-${question.questionNumber}`} className="text-sm font-medium">
            Observações <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id={`obs-${question.questionNumber}`}
            placeholder="Adicione observações, justificativas ou notas sobre esta resposta..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Status de Salvamento */}
        {hasChanges && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Salvando resposta...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Resposta salva automaticamente</span>
              </>
            )}
          </div>
        )}

        {/* Aviso para Questões Críticas */}
        {question.criticalityLevel === 'C' && selectedValue !== 'NA' && Number(selectedValue) < 3 && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                Não Conformidade Crítica
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Esta questão é considerada crítica pela ANVISA e a pontuação selecionada ({selectedValue} pontos)
                indica não conformidade. Isto impactará negativamente na classificação final do estabelecimento.
              </p>
            </div>
          </div>
        )}

        {/* Botões de Navegação */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isFirst}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <span className="text-sm text-muted-foreground">
            Questão {questionIndex + 1} de {totalQuestions}
          </span>

          <Button
            variant={isLast ? 'default' : 'outline'}
            onClick={isLast ? onComplete : onNext}
            className="gap-2"
          >
            {isLast ? 'Concluir' : 'Próxima'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
