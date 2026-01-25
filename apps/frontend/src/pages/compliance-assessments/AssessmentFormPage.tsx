import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page, PageHeader } from '@/design-system/components'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QuestionCard } from '@/components/compliance-assessments/QuestionCard'
import { AssessmentProgressBar } from '@/components/compliance-assessments/AssessmentProgressBar'
import { AlertCircle, FileText, Loader2, Save } from 'lucide-react'
import {
  useAssessmentQuestions,
  useAssessment,
  useSaveResponse,
  useCompleteAssessment,
} from '@/hooks/useComplianceAssessments'
import { toast } from 'sonner'
import type { SubmitResponseDto } from '@/api/compliance-assessments.api'

export function AssessmentFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  // Queries
  const { data: questionsData, isLoading: isLoadingQuestions } = useAssessmentQuestions()
  const { data: assessment, isLoading: isLoadingAssessment } = useAssessment(id)

  // Mutations
  const saveResponseMutation = useSaveResponse(id!)
  const completeAssessmentMutation = useCompleteAssessment()

  const questions = questionsData?.questions || []
  const currentQuestion = questions[currentQuestionIndex]

  // Mapear respostas existentes
  const responsesMap = useMemo(() => {
    if (!assessment?.responses) return new Map()

    return new Map(
      assessment.responses.map((r) => [
        r.questionNumber,
        {
          selectedPoints: r.selectedPoints,
          isNA: r.isNotApplicable,
          observations: r.observations,
        },
      ]),
    )
  }, [assessment?.responses])

  // Auto-navegar para primeira questão não respondida ao carregar rascunho
  useEffect(() => {
    if (!assessment || !questions.length || assessment.status !== 'DRAFT') return

    // Encontrar primeira questão sem resposta
    const firstUnansweredIndex = questions.findIndex((q) => {
      const response = responsesMap.get(q.questionNumber)
      // Questão não respondida = sem resposta OU sem pontos/NA selecionado
      return !response || (response.selectedPoints === undefined && !response.isNA)
    })

    // Se encontrou questão não respondida, navegar para ela
    if (firstUnansweredIndex !== -1 && firstUnansweredIndex !== currentQuestionIndex) {
      setCurrentQuestionIndex(firstUnansweredIndex)
    }
    // Se todas estão respondidas mas ainda é DRAFT, manter na última questão
    else if (firstUnansweredIndex === -1 && currentQuestionIndex === 0 && questions.length > 0) {
      setCurrentQuestionIndex(questions.length - 1)
    }
  }, [assessment?.id, questions.length]) // Executar apenas quando assessment ID ou número de questões mudar

  // Handler de salvar resposta com debounce
  const handleSaveResponse = useCallback(
    (data: SubmitResponseDto) => {
      // Limpar timer anterior
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Criar novo timer de debounce (500ms)
      debounceTimerRef.current = setTimeout(() => {
        saveResponseMutation.mutate(data)
      }, 500)
    },
    [saveResponseMutation],
  )

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Navegação entre questões
  const handlePrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentQuestionIndex])

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentQuestionIndex, questions.length])

  // Finalizar assessment
  const handleComplete = useCallback(async () => {
    if (!id) return

    if (assessment && assessment.questionsAnswered < assessment.totalQuestions) {
      toast.error(
        `Ainda há ${assessment.totalQuestions - assessment.questionsAnswered} questões não respondidas`,
      )
      return
    }

    try {
      await completeAssessmentMutation.mutateAsync(id)
      navigate(`/dashboard/conformidade/autodiagnostico/${id}/result`)
    } catch (error) {
      // Erro já tratado no hook
    }
  }, [id, assessment, completeAssessmentMutation, navigate])

  // Loading states
  if (isLoadingQuestions || isLoadingAssessment) {
    return (
      <Page>
        <PageHeader title="Autodiagnóstico RDC 502/2021" />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Page>
    )
  }

  // Error states
  if (!assessment || !questionsData || questions.length === 0) {
    return (
      <Page>
        <PageHeader title="Autodiagnóstico RDC 502/2021" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar autodiagnóstico. Verifique se o ID é válido.
          </AlertDescription>
        </Alert>
      </Page>
    )
  }

  // Status do assessment
  if (assessment.status === 'COMPLETED') {
    return (
      <Page>
        <PageHeader title="Autodiagnóstico RDC 502/2021" />
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Este autodiagnóstico já foi finalizado. Você pode visualizar o relatório completo.
            <Button
              variant="link"
              onClick={() => navigate(`/dashboard/conformidade/autodiagnostico/${id}/result`)}
              className="ml-2"
            >
              Ver Relatório
            </Button>
          </AlertDescription>
        </Alert>
      </Page>
    )
  }

  const currentResponse = responsesMap.get(currentQuestion?.questionNumber)

  return (
    <Page>
      <PageHeader
        title="Autodiagnóstico RDC 502/2021"
        subtitle={`Versão ${questionsData.version.versionNumber} • ${questionsData.version.regulationName}`}
        breadcrumbs={[
          { label: 'Hub de Conformidade', href: '/dashboard/conformidade' },
          { label: 'Autodiagnósticos', href: '/dashboard/conformidade/autodiagnostico' },
          { label: 'Avaliação' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/conformidade')}
            >
              Salvar Rascunho e Sair
            </Button>
            <Button
              onClick={handleComplete}
              disabled={
                assessment.questionsAnswered < assessment.totalQuestions ||
                completeAssessmentMutation.isPending
              }
              className="gap-2"
            >
              {completeAssessmentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Finalizar Autodiagnóstico
                </>
              )}
            </Button>
          </div>
        }
      />

      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <AssessmentProgressBar
              totalQuestions={assessment.totalQuestions}
              questionsAnswered={assessment.questionsAnswered}
              questionsNA={assessment.questionsNA}
            />
          </CardContent>
        </Card>

        {/* Alert de Instrução */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Instruções:</strong> Leia atentamente cada indicador e selecione a pontuação
            que melhor reflete a situação da instituição. As respostas são salvas automaticamente.
            Questões marcadas como <strong>Críticas (C)</strong> têm peso maior na avaliação
            final.
          </AlertDescription>
        </Alert>

        {/* Question Card */}
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            questionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            initialSelectedPoints={currentResponse?.selectedPoints}
            initialIsNA={currentResponse?.isNA || false}
            initialObservations={currentResponse?.observations}
            onSaveResponse={handleSaveResponse}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onComplete={handleComplete}
            isFirst={currentQuestionIndex === 0}
            isLast={currentQuestionIndex === questions.length - 1}
            isSaving={saveResponseMutation.isPending}
          />
        )}
      </div>
    </Page>
  )
}
