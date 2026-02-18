import { useMemo, useState } from 'react'
import { Page, PageHeader, Section } from '@/design-system/components'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, FileDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import {
  getInstitutionalResidentProfileReport,
} from '@/services/reportsApi'
import { InstitutionalResidentProfileReportView } from '@/components/reports/InstitutionalResidentProfileReportView'
import { downloadInstitutionalResidentProfileReportPDF } from '@/services/institutionalResidentProfileReportPdf'
import { getCurrentDate } from '@/utils/dateHelpers'

export default function InstitutionalResidentProfileReportPage() {
  const { user } = useAuthStore()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [asOfDate, setAsOfDate] = useState(getCurrentDate())
  const [trendMonths, setTrendMonths] = useState(6)

  const { data: report, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['institutional-resident-profile-report', asOfDate, trendMonths],
    queryFn: () => getInstitutionalResidentProfileReport(asOfDate, trendMonths),
    staleTime: 1000 * 60 * 5,
  })

  const canGeneratePdf = useMemo(() => !!report && !isLoading && !error, [report, isLoading, error])

  const handleGeneratePDF = () => {
    if (!report || !user) return

    setIsGeneratingPdf(true)
    try {
      const ilpiName = user.tenant?.profile?.tradeName || user.tenant?.name || 'ILPI'
      const cnpj = user.tenant?.cnpj || 'CNPJ não cadastrado'
      const userName = user.name
      const printDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      const printDateTime = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      downloadInstitutionalResidentProfileReportPDF(report, {
        ilpiName,
        cnpj,
        userName,
        printDate,
        printDateTime,
      })
    } catch (pdfError) {
      console.error('Erro ao gerar PDF do perfil dos residentes:', pdfError)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title="Perfil dos Residentes"
        subtitle="Visão atual institucional de dependência, perfil clínico e carga assistencial para gestão"
        breadcrumbs={[
          { label: 'Relatórios e Documentos', href: '/dashboard/relatorios' },
          { label: 'Perfil dos Residentes' },
        ]}
        actions={
          canGeneratePdf ? (
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

      <Section title="Filtros" spacing="compact">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-xs space-y-2">
            <Label htmlFor="asOfDate">Data de referência</Label>
            <Input
              id="asOfDate"
              type="date"
              value={asOfDate}
              onChange={(event) => setAsOfDate(event.target.value)}
            />
          </div>
          <div className="w-full max-w-xs space-y-2">
            <Label htmlFor="trendMonths">Tendência (meses)</Label>
            <select
              id="trendMonths"
              value={trendMonths}
              onChange={(event) => setTrendMonths(Number(event.target.value))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value={6}>6 meses</option>
              <option value={9}>9 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              'Atualizar'
            )}
          </Button>
        </div>
      </Section>

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Carregando relatório...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-danger">
          <CardContent className="pt-6">
            <p className="text-center text-danger">
              Erro ao carregar relatório de Perfil dos Residentes.
            </p>
          </CardContent>
        </Card>
      )}

      {report && !isLoading && !error && <InstitutionalResidentProfileReportView report={report} />}
    </Page>
  )
}
