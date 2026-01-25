import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, PageHeader } from '@/design-system/components'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Archive,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import { useAssessments, useCreateAssessment } from '@/hooks/useComplianceAssessments'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ComplianceAssessment } from '@/api/compliance-assessments.api'
import { ComplianceEvolutionChart } from '@/components/compliance-assessments/ComplianceEvolutionChart'

export function AssessmentListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [isInfoExpanded, setIsInfoExpanded] = useState(false)
  const limit = 10

  const { data: assessmentsData, isLoading } = useAssessments({ page, limit })
  const createAssessmentMutation = useCreateAssessment()

  const handleCreateNew = async () => {
    try {
      const newAssessment = await createAssessmentMutation.mutateAsync({})
      navigate(`/dashboard/conformidade/autodiagnostico/${newAssessment.id}`)
    } catch (error) {
      // Erro já tratado no hook
    }
  }

  const handleViewAssessment = (assessment: ComplianceAssessment) => {
    if (assessment.status === 'COMPLETED') {
      navigate(`/dashboard/conformidade/autodiagnostico/${assessment.id}/result`)
    } else {
      navigate(`/dashboard/conformidade/autodiagnostico/${assessment.id}`)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      DRAFT: { variant: 'secondary' as const, label: 'Rascunho', icon: Clock },
      COMPLETED: { variant: 'default' as const, label: 'Finalizado', icon: CheckCircle2 },
      ARCHIVED: { variant: 'outline' as const, label: 'Arquivado', icon: Archive },
    }

    const config = variants[status as keyof typeof variants] || variants.DRAFT
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getComplianceBadge = (level: string, percentage: number) => {
    const variants = {
      REGULAR: { variant: 'default' as const, className: 'bg-success', label: 'Regular' },
      PARCIAL: { variant: 'secondary' as const, className: 'bg-warning', label: 'Parcial' },
      IRREGULAR: { variant: 'destructive' as const, className: '', label: 'Irregular' },
    }

    const config = variants[level as keyof typeof variants] || variants.IRREGULAR

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label} ({percentage.toFixed(1)}%)
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Page>
        <PageHeader title="Autodiagnósticos RDC 502/2021" />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Page>
    )
  }

  const assessments = assessmentsData?.data || []
  const totalPages = Math.ceil((assessmentsData?.total || 0) / limit)

  return (
    <Page>
      <PageHeader
        title="Autodiagnósticos RDC 502/2021"
        subtitle="Histórico de avaliações de conformidade regulatória"
        actions={
          <Button onClick={handleCreateNew} disabled={createAssessmentMutation.isPending}>
            {createAssessmentMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Novo Autodiagnóstico
              </>
            )}
          </Button>
        }
      />

      {/* Disclaimer Legal - Sempre visível e em destaque */}
      <Alert variant="default" className="border-warning/50 bg-warning/5 py-2.5">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-xs flex items-start gap-2">
          <span className="flex-1">
            <strong>Importante:</strong> Este autodiagnóstico é interno.{' '}
            <strong>Não substitui inspeção oficial</strong> e{' '}
            <strong>não gera certificação</strong>. A conformidade é confirmada por{' '}
            <strong>vistoria da Vigilância Sanitária</strong>.
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-warning cursor-help flex-shrink-0 mt-0.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Use os resultados para planejar melhorias internas. Apenas inspeção oficial pode
                  confirmar conformidade.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </AlertDescription>
      </Alert>

      {/* Informações - Colapsável */}
      <Alert className="py-2.5">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs flex-1">
              Ferramenta interna baseada no roteiro da RDC 502/2021. Use para acompanhar evolução de conformidade.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 -mt-1 flex-shrink-0"
              onClick={() => setIsInfoExpanded(!isInfoExpanded)}
            >
              <span className="text-xs font-medium mr-1">
                {isInfoExpanded ? 'Ocultar' : 'Como funciona'}
              </span>
              {isInfoExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>

          {isInfoExpanded && (
            <div className="mt-3 pt-3 border-t space-y-2 text-xs">
              <p>
                <strong>Sobre o Autodiagnóstico:</strong> Baseado no Roteiro Objetivo de
                Inspeção ILPI da ANVISA. Permite avaliar periodicamente o nível de
                conformidade da instituição com a RDC 502/2021.
              </p>
              <p>
                <strong>Critério de conformidade:</strong> Questões com pontuação de 3 ou mais pontos são
                consideradas conformes (Regular). Pontuações de 4 e 5 indicam ótimo e excelente desempenho.
              </p>
              <p>
                <strong>Classificação final:</strong> IRREGULAR (&lt;50%), PARCIAL (50-74%), REGULAR (≥75%).
              </p>
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* Gráfico de Evolução */}
      {assessments.length > 0 && <ComplianceEvolutionChart assessments={assessments} />}

      {/* Lista de Autodiagnósticos */}
      <div className="space-y-4">
        {assessments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum autodiagnóstico realizado</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Comece criando seu primeiro autodiagnóstico de conformidade regulatória.
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Autodiagnóstico
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {assessments.map((assessment) => (
              <Card
                key={assessment.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewAssessment(assessment)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Info Principal */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(assessment.status)}
                        {assessment.status === 'COMPLETED' &&
                          getComplianceBadge(
                            assessment.complianceLevel!,
                            assessment.compliancePercentage!,
                          )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Realizado em{' '}
                          {format(new Date(assessment.assessmentDate), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>

                      {/* Progresso */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span>
                            <strong>{assessment.questionsAnswered}</strong>/{assessment.totalQuestions}{' '}
                            questões respondidas
                          </span>
                        </div>
                        {assessment.questionsNA > 0 && (
                          <div className="text-muted-foreground">
                            ({assessment.questionsNA} N/A)
                          </div>
                        )}
                      </div>

                      {/* Alertas Críticos */}
                      {assessment.status === 'COMPLETED' &&
                        assessment.criticalNonCompliant &&
                        Array.isArray(assessment.criticalNonCompliant) &&
                        assessment.criticalNonCompliant.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-danger">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                              <strong>{assessment.criticalNonCompliant.length}</strong> não
                              conformidade(s) crítica(s)
                            </span>
                          </div>
                        )}

                      {/* Observações */}
                      {assessment.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          Notas: {assessment.notes}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant={assessment.status === 'COMPLETED' ? 'default' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewAssessment(assessment)
                        }}
                      >
                        {assessment.status === 'COMPLETED' ? 'Ver Resultados' : 'Continuar'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  )
}
