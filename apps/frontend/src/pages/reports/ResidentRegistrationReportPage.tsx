import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Page, PageHeader } from '@/design-system/components'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FileDown, Loader2, UserCircle2 } from 'lucide-react'
import { residentsAPI } from '@/api/residents.api'
import { useAuthStore } from '@/stores/auth.store'
import { ResidentSearchSelect } from '@/components/residents/ResidentSearchSelect'
import { useProfile } from '@/hooks/useInstitutionalProfile'
import { useResidentDocuments } from '@/hooks/useResidentDocuments'
import { ResidentRegistrationReportView } from '@/components/reports/ResidentRegistrationReportView'
import { downloadResidentRegistrationReportPDF } from '@/services/residentRegistrationReportPdf'

export default function ResidentRegistrationReportPage() {
  const [searchParams] = useSearchParams()
  const [selectedResidentId, setSelectedResidentId] = useState(
    searchParams.get('residentId') || '',
  )
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const { user } = useAuthStore()
  const { data: institutionalProfile } = useProfile()

  const { data: residentsResponse, isLoading: isLoadingResidents } = useQuery({
    queryKey: ['residents', 'active-for-registration-report'],
    queryFn: () =>
      residentsAPI.getAll({
        page: 1,
        limit: 200,
        sortBy: 'fullName',
        sortOrder: 'asc',
      }),
    staleTime: 1000 * 60 * 5,
  })

  const residents = useMemo(() => {
    const allResidents = residentsResponse?.data || []
    const activeResidents = allResidents.filter((resident) => {
      const normalized = resident.status?.trim().toLowerCase()
      return normalized === 'ativo' || normalized === 'active'
    })

    const source = activeResidents.length > 0 ? activeResidents : allResidents
    return [...source].sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'))
  }, [residentsResponse])

  const residentOptions = useMemo(
    () =>
      residents.map((resident) => ({
        id: resident.id,
        fullName: resident.fullName,
        socialName: resident.socialName,
        bed: resident.bed?.code ? { code: resident.bed.code } : null,
      })),
    [residents],
  )

  const {
    data: resident,
    isLoading: isLoadingResident,
    error: residentError,
  } = useQuery({
    queryKey: ['resident-registration-report', selectedResidentId],
    queryFn: () => residentsAPI.getById(selectedResidentId),
    enabled: !!selectedResidentId,
    staleTime: 1000 * 60 * 5,
  })

  const {
    data: residentDocuments = [],
    isLoading: isLoadingDocuments,
    error: residentDocumentsError,
  } = useResidentDocuments(selectedResidentId)

  const handleGeneratePDF = () => {
    if (!resident || !user) return

    setIsGeneratingPdf(true)
    try {
      const ilpiName = user.tenant?.profile?.tradeName || user.tenant?.name || 'ILPI'
      const cnpj = user.tenant?.cnpj || 'CNPJ não cadastrado'
      const cnes =
        user.tenant?.profile?.cnesCode?.trim() ||
        institutionalProfile?.profile?.cnesCode?.trim() ||
        undefined
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

      downloadResidentRegistrationReportPDF(
        {
          resident,
          documents: residentDocuments,
        },
        {
          ilpiName,
          cnpj,
          cnes,
          userName,
          printDate,
          printDateTime,
        },
      )
    } catch (error) {
      console.error('Erro ao gerar PDF do cadastro do residente:', error)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title="Cadastro do Residente"
        subtitle="Selecione um residente para visualizar a ficha cadastral completa e gerar o PDF"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Relatórios e Documentos', href: '/dashboard/relatorios' },
          { label: 'Cadastro do Residente' },
        ]}
        actions={
          resident && !isLoadingResident && !residentError ? (
            <Button
              onClick={handleGeneratePDF}
              disabled={isGeneratingPdf || isLoadingDocuments}
              className="gap-2"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando PDF...
                </>
              ) : isLoadingDocuments ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando documentos...
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
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label>Residente</Label>
              <ResidentSearchSelect
                residents={residentOptions}
                value={selectedResidentId || null}
                onValueChange={(selectedId) => setSelectedResidentId(selectedId || '')}
                isLoading={isLoadingResidents}
                disabled={residentOptions.length === 0}
                placeholder={
                  isLoadingResidents
                    ? 'Carregando residentes...'
                    : 'Digite o nome do residente para selecionar'
                }
              />
              {!isLoadingResidents && residentOptions.length === 0 && (
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
            <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <UserCircle2 className="h-8 w-8" />
              <p className="font-medium">Selecione um residente para prosseguir</p>
              <p className="text-sm">
                A visualização e a geração de PDF ficam disponíveis após a seleção.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedResidentId && (isLoadingResident || isLoadingDocuments) && (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Carregando cadastro do residente...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedResidentId && residentError && (
        <Card className="border-danger">
          <CardContent className="py-8">
            <p className="text-center text-danger">
              Erro ao carregar cadastro do residente. Tente novamente.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedResidentId && resident && !isLoadingResident && residentDocumentsError && (
        <Card className="border-warning">
          <CardContent className="py-4">
            <p className="text-sm text-warning">
              Não foi possível carregar os documentos desse residente agora.
              O restante da ficha continua disponível.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedResidentId && resident && !isLoadingResident && !isLoadingDocuments && !residentError && (
        <ResidentRegistrationReportView resident={resident} documents={residentDocuments} />
      )}
    </Page>
  )
}
