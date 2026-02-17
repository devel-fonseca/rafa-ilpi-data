import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page, PageHeader } from '@/design-system/components'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { getShiftHistoryReport } from '@/services/reportsApi'
import { ShiftHistoryReportView } from '@/components/reports/ShiftHistoryReportView'
import { downloadShiftHistoryReportPDF } from '@/services/shiftHistoryReportPdf'
import { useAuthStore } from '@/stores/auth.store'

export default function ShiftHistoryReportPage() {
  const { shiftId } = useParams<{ shiftId: string }>()
  const { user } = useAuthStore()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['shift-history-report', shiftId],
    queryFn: () => getShiftHistoryReport(shiftId as string),
    enabled: !!shiftId,
    staleTime: 1000 * 60 * 5,
  })

  const handleGeneratePDF = () => {
    if (!report || !user) return

    setIsGeneratingPdf(true)
    try {
      const ilpiName = user.tenant?.profile?.tradeName || user.tenant?.name || 'ILPI'
      const cnpj = user.tenant?.cnpj || 'CNPJ não cadastrado'
      const userName = user.name
      const printDate = new Date().toLocaleDateString('pt-BR')
      const printDateTime = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      downloadShiftHistoryReportPDF(report, {
        ilpiName,
        cnpj,
        userName,
        printDate,
        printDateTime,
      })
    } catch (err) {
      console.error('Erro ao gerar PDF do histórico do plantão:', err)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title="Relatório de Histórico de Plantão"
        subtitle="Resumo do plantão concluído e trilha de atividades por origem de registro"
        breadcrumbs={[
          { label: 'Relatórios e Documentos', href: '/dashboard/relatorios' },
          { label: 'Histórico de Plantão' },
        ]}
        actions={
          report && !isLoading && !error ? (
            <Button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPdf}
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

      {isLoading && (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Carregando relatório do histórico de plantão...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-danger">
          <CardContent className="py-8">
            <p className="text-danger text-center">
              Erro ao carregar relatório do histórico do plantão. Tente novamente.
            </p>
          </CardContent>
        </Card>
      )}

      {report && !isLoading && !error && <ShiftHistoryReportView report={report} />}
    </Page>
  )
}

