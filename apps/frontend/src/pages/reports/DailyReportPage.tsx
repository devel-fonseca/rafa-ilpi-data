import { useSearchParams, useNavigate } from 'react-router-dom'
import { Page, PageHeader } from '@/design-system/components'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FileDown } from 'lucide-react'
import { getCurrentDate } from '@/utils/dateHelpers'
import { useQuery } from '@tanstack/react-query'
import { getDailyReport } from '@/services/reportsApi'
import { DailyReportView } from '@/components/reports/DailyReportView'
import { downloadDailyReportPDF } from '@/services/dailyReportPdf'
import { applyOperationalReportFilter } from '@/services/operationalReports'
import { useAuthStore } from '@/stores/auth.store'
import { useEffect, useState } from 'react'
import { getRecordTypeLabel } from '@/utils/recordTypeLabels'
import type { ReportType, RecordTypeFilter } from '@/types/reportsHub'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function DailyReportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const startDate = searchParams.get('startDate') || searchParams.get('date') || getCurrentDate()
  const endDate = searchParams.get('endDate') || undefined
  const shiftTemplateId = searchParams.get('shiftTemplateId') || undefined
  const reportType = (searchParams.get('reportType') as ReportType | null) || 'DAILY'
  const recordType = (searchParams.get('recordType') as RecordTypeFilter | null) || undefined
  const periodType = (searchParams.get('periodType') as 'DAY' | 'MONTH' | null) || 'DAY'
  const yearMonth = searchParams.get('yearMonth') || undefined
  const { user } = useAuthStore()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [noShiftDialogOpen, setNoShiftDialogOpen] = useState(false)

  const { data: multiDayReport, isLoading, error } = useQuery({
    queryKey: ['daily-report', startDate, endDate, shiftTemplateId, periodType, yearMonth, reportType],
    queryFn: () =>
      getDailyReport(startDate, endDate, shiftTemplateId, {
        periodType,
        yearMonth,
        reportType,
      }),
    enabled: !!startDate,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  useEffect(() => {
    if (!shiftTemplateId || !multiDayReport || isLoading || error) {
      return
    }
    const hasAnyShift = multiDayReport.reports.some((report) => report.shifts.length > 0)
    setNoShiftDialogOpen(!hasAnyShift)
  }, [shiftTemplateId, multiDayReport, isLoading, error])

  const filteredReport = multiDayReport
    ? applyOperationalReportFilter(multiDayReport, { reportType, recordType })
    : undefined

  const pageTitle =
    reportType === 'BY_SHIFT'
      ? 'Relatório por Plantão'
      : reportType === 'BY_RECORD_TYPE'
        ? 'Relatório por Tipo de Registro'
        : 'Relatório Diário'

  const getRecordTypeDisplayName = (type: RecordTypeFilter | undefined) => {
    if (!type || type === 'ALL') return 'todos os tipos'
    if (type === 'MEDICACAO') return 'Medicação'
    if (type === 'IMUNIZACOES') return 'Imunizações'
    if (type === 'AGENDAMENTOS_PONTUAIS') return 'Agendamentos Pontuais'
    return getRecordTypeLabel(type).label
  }

  const pageSubtitle =
    reportType === 'BY_RECORD_TYPE' && recordType && recordType !== 'ALL'
      ? periodType === 'MONTH' && yearMonth
        ? `Visualize registros filtrados por ${getRecordTypeDisplayName(recordType)} no mês ${yearMonth}`
        : `Visualize registros filtrados por ${getRecordTypeDisplayName(recordType)}`
      : reportType === 'BY_SHIFT'
        ? 'Visualize os registros assistenciais dentro do turno selecionado'
        : 'Visualize todos os registros, medicações e sinais vitais de um ou mais dias'

  const handleGeneratePDF = () => {
    if (!filteredReport || !user) return

    setIsGeneratingPdf(true)
    try {
      const ilpiName = user.tenant?.profile?.tradeName || user.tenant?.name || 'ILPI'
      const cnpj = user.tenant?.cnpj || 'CNPJ não cadastrado'
      const userName = user.name
      const printDate = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      downloadDailyReportPDF(filteredReport, {
        ilpiName,
        cnpj,
        userName,
        printDate,
        reportType,
        periodType,
        recordType,
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        breadcrumbs={[
          { label: 'Relatórios e Documentos', href: '/dashboard/relatorios' },
          { label: pageTitle },
        ]}
        actions={
          filteredReport && !isLoading && !error && !noShiftDialogOpen ? (
            <Button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPdf}
              variant="default"
              className="gap-2"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4" />
                  Gerar PDF
                </>
              )}
            </Button>
          ) : undefined
        }
      />

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Carregando relatório...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-danger">
          <CardContent className="pt-6">
            <p className="text-danger text-center">
              Erro ao carregar relatório. Por favor, tente novamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Report View */}
      {filteredReport && !noShiftDialogOpen && (
        <DailyReportView
          multiDayReport={filteredReport}
          reportType={reportType}
          periodType={periodType}
          recordType={recordType}
        />
      )}

      {/* Empty State */}
      {!filteredReport && !isLoading && !error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Nenhum registro encontrado para esta data.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={noShiftDialogOpen} onOpenChange={setNoShiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plantão não agendado</DialogTitle>
            <DialogDescription>
              Não há plantão agendado para o turno selecionado na data escolhida.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => navigate('/dashboard/relatorios')}>
              Voltar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
