import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page, PageHeader } from '@/design-system/components'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FileDown, Loader2, UserCircle2 } from 'lucide-react'
import { residentsAPI } from '@/api/residents.api'
import { useAuthStore } from '@/stores/auth.store'
import { getResidentCareSummaryReport } from '@/services/reportsApi'
import { ResidentCareSummaryReportView } from '@/components/reports/ResidentCareSummaryReportView'
import { downloadResidentCareSummaryReportPDF } from '@/services/residentCareSummaryReportPdf'
import { ResidentSearchSelect } from '@/components/residents/ResidentSearchSelect'

export default function ResidentCareSummaryReportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedResidentId, setSelectedResidentId] = useState(searchParams.get('residentId') || '')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const { user } = useAuthStore()

  const { data: residentsResponse, isLoading: isLoadingResidents } = useQuery({
    queryKey: ['residents', 'active-for-care-summary'],
    queryFn: () =>
      residentsAPI.getAll({
        page: 1,
        limit: 200,
        sortBy: 'fullName',
        sortOrder: 'asc',
      }),
    staleTime: 1000 * 60 * 5,
  })

  const residents = useMemo(
    () => {
      const allResidents = residentsResponse?.data || []
      const activeResidents = allResidents.filter((resident) => {
        const normalized = resident.status?.trim().toLowerCase()
        return normalized === 'ativo' || normalized === 'active'
      })

      const source = activeResidents.length > 0 ? activeResidents : allResidents
      return [...source].sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'))
    },
    [residentsResponse],
  )

  const { data: report, isLoading: isLoadingReport, error: reportError } = useQuery({
    queryKey: ['resident-care-summary-report', selectedResidentId],
    queryFn: () => getResidentCareSummaryReport(selectedResidentId),
    enabled: !!selectedResidentId,
    staleTime: 1000 * 60 * 5,
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

      downloadResidentCareSummaryReportPDF(report, {
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
        title="Resumo Assistencial do Residente"
        subtitle="Selecione um residente para visualizar o documento consolidado e gerar o PDF"
        breadcrumbs={[
          { label: 'Relatórios e Documentos', href: '/dashboard/relatorios' },
          { label: 'Resumo Assistencial do Residente' },
        ]}
        backButton={{
          onClick: () => navigate('/dashboard/relatorios'),
        }}
        actions={
          report && !isLoadingReport && !reportError ? (
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

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
            <div className="space-y-2">
              <Label>Residente</Label>
              <ResidentSearchSelect
                residents={residents}
                value={selectedResidentId || null}
                onValueChange={(resident) => setSelectedResidentId(resident || '')}
                isLoading={isLoadingResidents}
                disabled={residents.length === 0}
                placeholder={
                  isLoadingResidents
                    ? 'Carregando residentes...'
                    : 'Digite o nome do residente para selecionar'
                }
              />
              {!isLoadingResidents && residents.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum residente ativo encontrado.
                </p>
              )}
            </div>

            <Button
              variant="outline"
              onClick={() => setSelectedResidentId('')}
              disabled={!selectedResidentId}
            >
              Limpar seleção
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selectedResidentId && (
        <Card>
          <CardContent className="py-10">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
              <UserCircle2 className="h-8 w-8" />
              <p className="font-medium">Selecione um residente para prosseguir</p>
              <p className="text-sm">
                A visualização e a geração de PDF ficam disponíveis após a seleção.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedResidentId && isLoadingReport && (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Carregando resumo assistencial...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedResidentId && reportError && (
        <Card className="border-danger">
          <CardContent className="py-8">
            <p className="text-danger text-center">
              Erro ao carregar o resumo assistencial. Tente novamente.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedResidentId && report && !isLoadingReport && !reportError && (
        <ResidentCareSummaryReportView report={report} />
      )}
    </Page>
  )
}
