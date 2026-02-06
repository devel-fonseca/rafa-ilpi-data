import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page, PageHeader } from '@/design-system/components'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, FileDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getResidentsListReport } from '@/services/reportsApi'
import { ResidentsListReportView } from '@/components/reports/ResidentsListReportView'
import { downloadResidentsListReportPDF } from '@/services/residentsListReportPdf'
import { useAuthStore } from '@/stores/auth.store'

export default function ResidentsListReportPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['residents-list-report'],
    queryFn: () => getResidentsListReport('Ativo'),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

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

      downloadResidentsListReportPDF(report, {
        ilpiName,
        cnpj,
        userName,
        printDate,
        printDateTime,
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
        title="Lista de Residentes"
        subtitle="Visão geral de todos os residentes ativos com informações demográficas e grau de dependência"
        breadcrumbs={[
          { label: 'Relatórios e Documentos', href: '/dashboard/relatorios' },
          { label: 'Lista de Residentes' },
        ]}
        backButton={{
          onClick: () => navigate('/dashboard/relatorios'),
        }}
        actions={
          report && !isLoading && !error ? (
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
      {report && <ResidentsListReportView report={report} />}

      {/* Empty State */}
      {!report && !isLoading && !error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Nenhum residente encontrado.
            </p>
          </CardContent>
        </Card>
      )}
    </Page>
  )
}
