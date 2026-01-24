import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Page, PageHeader } from '@/design-system/components'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, ArrowLeft, FileText, Download, AlertCircle, Trash2 } from 'lucide-react'
import {
  useAssessmentReport,
  useExportPDF,
  useDeleteAssessment,
} from '@/hooks/useComplianceAssessments'
import { ResultsDashboard } from '@/components/compliance-assessments/ResultsDashboard'
import { CriticalIssuesList } from '@/components/compliance-assessments/CriticalIssuesList'
import { AllNonCompliantList } from '@/components/compliance-assessments/AllNonCompliantList'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function AssessmentResultPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isExporting, setIsExporting] = useState(false)

  const { data: report, isLoading, error } = useAssessmentReport(id!)
  const exportPDF = useExportPDF()
  const deleteAssessmentMutation = useDeleteAssessment()

  const handleDelete = async () => {
    if (!id) return

    await deleteAssessmentMutation.mutateAsync(id)
    navigate('/dashboard/conformidade/autodiagnostico')
  }

  if (isLoading) {
    return (
      <Page>
        <PageHeader title="Resultados do Autodiagnóstico" />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Page>
    )
  }

  if (error || !report) {
    return (
      <Page>
        <PageHeader title="Resultados do Autodiagnóstico" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar relatório. Verifique se o autodiagnóstico foi finalizado corretamente.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => navigate('/dashboard/conformidade/autodiagnostico')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Lista
          </Button>
        </div>
      </Page>
    )
  }

  // report JÁ É o assessment completo (AssessmentResult extends ComplianceAssessment)
  const assessment = report

  // Garantir que criticalNonCompliant seja um array
  const criticalIssues = Array.isArray(assessment.criticalNonCompliant)
    ? assessment.criticalNonCompliant
    : []

  // Filtrar todas as não conformidades (< 3 pontos) das respostas
  const allNonCompliant = assessment.responses
    ?.filter(
      (r) =>
        !r.isNotApplicable &&
        r.selectedPoints !== undefined &&
        r.selectedPoints < 3
    )
    .map((r) => ({
      questionNumber: r.questionNumber,
      questionText: r.questionTextSnapshot,
      pointsObtained: r.selectedPoints ?? 0,
      criticalityLevel: r.criticalityLevel,
    })) || []

  return (
    <Page>
      <PageHeader
        title="Resultados do Autodiagnóstico"
        subtitle={`Avaliação realizada em ${format(new Date(assessment.assessmentDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard/conformidade/autodiagnostico')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button
              onClick={async () => {
                if (!id) return
                setIsExporting(true)
                try {
                  await exportPDF(id)
                } finally {
                  setIsExporting(false)
                }
              }}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </>
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteAssessmentMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir este autodiagnóstico? Esta ação não pode ser
                    desfeita e todos os dados serão permanentemente removidos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteAssessmentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Excluindo...
                      </>
                    ) : (
                      'Excluir'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      {/* Alert Informativo */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Relatório Completo:</strong> Este documento apresenta análise detalhada da
          conformidade com a RDC 502/2021 da ANVISA. Os resultados servem como base para
          elaboração de planos de ação corretiva e acompanhamento regulatório.
        </AlertDescription>
      </Alert>

      {/* Tabs com Seções do Relatório */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="critical">
            Críticas
            {criticalIssues.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-danger text-danger-foreground rounded-full">
                {criticalIssues.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all-non-compliant">
            Não Conformes
            {allNonCompliant.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-warning text-warning-foreground rounded-full">
                {allNonCompliant.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <ResultsDashboard report={assessment} />
        </TabsContent>

        {/* Tab: Não Conformidades Críticas */}
        <TabsContent value="critical" className="space-y-6">
          <CriticalIssuesList criticalIssues={criticalIssues} />
        </TabsContent>

        {/* Tab: Todas as Não Conformidades */}
        <TabsContent value="all-non-compliant" className="space-y-6">
          <AllNonCompliantList issues={allNonCompliant} />
        </TabsContent>

        {/* Tab: Detalhes por Questão */}
        <TabsContent value="details" className="space-y-4">
          {assessment.responses && assessment.responses.length > 0 ? (
            <div className="space-y-3">
              {assessment.responses.map((response) => (
                <Alert
                  key={response.questionNumber}
                  variant={
                    response.criticalityLevel === 'C' && response.selectedPoints !== undefined && response.selectedPoints < 3
                      ? 'destructive'
                      : 'default'
                  }
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono font-semibold">Q{response.questionNumber}</span>
                          {response.criticalityLevel === 'C' && (
                            <span className="text-xs px-2 py-0.5 bg-danger/10 text-danger rounded">
                              Crítica
                            </span>
                          )}
                          {response.isNotApplicable && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                              N/A
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1">{response.questionTextSnapshot}</p>
                      </div>
                      {!response.isNotApplicable && response.selectedPoints !== undefined && (
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {response.selectedPoints}
                          </div>
                          <div className="text-xs text-muted-foreground">/ 5 pontos</div>
                        </div>
                      )}
                    </div>
                    {!response.isNotApplicable && response.selectedText && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          <strong>Resposta:</strong> {response.selectedText}
                        </p>
                      </div>
                    )}
                    {response.observations && (
                      <div className="pt-2 border-t">
                        <p className="text-sm">
                          <strong>Observações:</strong> {response.observations}
                        </p>
                      </div>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum detalhe de resposta disponível para este autodiagnóstico.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </Page>
  )
}
