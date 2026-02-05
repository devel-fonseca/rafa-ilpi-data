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
import { useAuthStore } from '@/stores/auth.store'
import { useState } from 'react'

export default function DailyReportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const startDate = searchParams.get('startDate') || searchParams.get('date') || getCurrentDate()
  const endDate = searchParams.get('endDate') || undefined
  const shiftTemplateId = searchParams.get('shiftTemplateId') || undefined
  const { user } = useAuthStore()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const { data: multiDayReport, isLoading, error } = useQuery({
    queryKey: ['daily-report', startDate, endDate, shiftTemplateId],
    queryFn: () => getDailyReport(startDate, endDate, shiftTemplateId),
    enabled: !!startDate,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  const handleGeneratePDF = () => {
    if (!multiDayReport || !user) return

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

      downloadDailyReportPDF(multiDayReport, {
        ilpiName,
        cnpj,
        userName,
        printDate,
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
        title="Relatório Diário"
        subtitle="Visualize todos os registros, medicações e sinais vitais de um ou mais dias"
        breadcrumbs={[
          { label: 'Relatórios e Documentos', href: '/dashboard/relatorios' },
          { label: 'Relatório Diário' },
        ]}
        backButton={{
          onClick: () => navigate('/dashboard/relatorios'),
        }}
        actions={
          multiDayReport && !isLoading && !error ? (
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
      {multiDayReport && <DailyReportView multiDayReport={multiDayReport} />}

      {/* Empty State */}
      {!multiDayReport && !isLoading && !error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Nenhum registro encontrado para esta data.
            </p>
          </CardContent>
        </Card>
      )}
    </Page>
  )
}
