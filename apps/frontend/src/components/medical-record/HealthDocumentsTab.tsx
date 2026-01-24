import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, FileText, Syringe, Pill, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DocumentViewerModal } from '@/components/shared/DocumentViewerModal'
import { usePrescriptions } from '@/hooks/usePrescriptions'
import { useVaccinationsByResident } from '@/hooks/useVaccinations'
import { useClinicalNoteDocuments } from '@/hooks/useClinicalNotes'
import { getRegistrationPrefix } from '@/utils/clinicalNotesConstants'
import { api } from '@/services/api'
import { toast } from 'sonner'

interface HealthDocumentsTabProps {
  residentId: string
}

type DocumentType = 'PRESCRIPTION' | 'VACCINATION' | 'CLINICAL_DOCUMENT'

interface ConsolidatedDocument {
  id: string
  type: DocumentType
  title: string
  date: string
  url: string | null
}

/**
 * Aba de Documentos de Saúde
 *
 * Consolida e exibe todos os documentos médicos do residente:
 * - Prescrições médicas (PDFs)
 * - Comprovantes de vacinação (PDFs)
 * - Documentos Tiptap das evoluções clínicas (PDFs)
 */
export function HealthDocumentsTab({ residentId }: HealthDocumentsTabProps) {
  // Document viewer modal states
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false)
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string>('')
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState<string>('Documento')

  // Buscar dados
  const {
    prescriptions,
    isLoading: prescriptionsLoading,
  } = usePrescriptions({ residentId, page: 1, limit: 1000 })

  const {
    data: vaccinations = [],
    isLoading: vaccinationsLoading,
  } = useVaccinationsByResident(residentId)

  const {
    data: clinicalDocuments = [],
    isLoading: documentsLoading,
  } = useClinicalNoteDocuments(residentId)

  // Consolidar em lista única
  const healthDocuments = useMemo<ConsolidatedDocument[]>(() => {
    const documents: ConsolidatedDocument[] = []

    // Prescrições (apenas as que possuem imagem/PDF anexado)
    if (Array.isArray(prescriptions)) {
      prescriptions
        .filter(p => p.prescriptionImageUrl)
        .forEach(p => {
          const formattedDate = format(new Date(p.prescriptionDate), 'dd/MM/yyyy', { locale: ptBR })
          documents.push({
            id: p.id,
            type: 'PRESCRIPTION',
            title: `Prescrição ${formattedDate} - Dr. ${p.doctorName} (CRM-${p.doctorCrmState} ${p.doctorCrm})`,
            date: p.prescriptionDate,
            url: p.prescriptionImageUrl!,
          })
        })
    }

    // Comprovantes de vacinação (PDF processado com carimbo institucional)
    if (Array.isArray(vaccinations)) {
      vaccinations
        .filter(v => v.processedFileUrl)
        .forEach(v => {
          const formattedDate = format(new Date(v.date), 'dd/MM/yyyy', { locale: ptBR })
          documents.push({
            id: v.id,
            type: 'VACCINATION',
            title: `Comprovante - ${v.vaccine} - ${v.dose} - ${formattedDate}`,
            date: v.date,
            url: v.processedFileUrl!,
          })
        })
    }

    // Documentos Tiptap (apenas com PDF)
    if (Array.isArray(clinicalDocuments)) {
      clinicalDocuments
        .filter(d => d.pdfFileUrl)
        .forEach(d => {
          // Construir informação do profissional se disponível
          let professionalInfo = ''

          try {
            if (d.clinicalNote?.professional?.name && d.clinicalNote?.profession) {
              const prefix = getRegistrationPrefix(d.clinicalNote.profession)
              const registration = d.clinicalNote.professional.profile?.registrationNumber
              const state = d.clinicalNote.professional.profile?.registrationState

              if (registration && state) {
                professionalInfo = ` - ${d.clinicalNote.professional.name} (${prefix}-${state} ${registration})`
              } else {
                professionalInfo = ` - ${d.clinicalNote.professional.name}`
              }
            }
          } catch (error) {
            console.error('Erro ao processar informações do profissional:', error)
            // Continuar mesmo se houver erro - professionalInfo ficará vazio
          }

          documents.push({
            id: d.id,
            type: 'CLINICAL_DOCUMENT',
            title: `${d.title}${professionalInfo}`,
            date: d.documentDate,
            url: d.pdfFileUrl!,
          })
        })
    }

    // Ordenar por data (mais recente primeiro)
    return documents.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [prescriptions, vaccinations, clinicalDocuments])

  const getDocumentTypeLabel = (type: DocumentType): string => {
    switch (type) {
      case 'PRESCRIPTION':
        return 'Prescrição'
      case 'VACCINATION':
        return 'Vacinação'
      case 'CLINICAL_DOCUMENT':
        return 'Documento Clínico'
    }
  }

  const getDocumentTypeIcon = (type: DocumentType) => {
    switch (type) {
      case 'PRESCRIPTION':
        return <Pill className="h-4 w-4" />
      case 'VACCINATION':
        return <Syringe className="h-4 w-4" />
      case 'CLINICAL_DOCUMENT':
        return <FileText className="h-4 w-4" />
    }
  }

  const getDocumentTypeBadgeVariant = (type: DocumentType) => {
    switch (type) {
      case 'PRESCRIPTION':
        return 'info' as const
      case 'VACCINATION':
        return 'success' as const
      case 'CLINICAL_DOCUMENT':
        return 'warning' as const
    }
  }

  const handleViewDocument = async (filePath: string, title: string) => {
    try {
      const response = await api.get<{ url: string }>(`/files/download/${filePath}`)
      setSelectedDocumentUrl(response.data.url)
      setSelectedDocumentTitle(title)
      setDocumentViewerOpen(true)
    } catch (error) {
      toast.error('Erro ao carregar documento')
      console.error('Erro ao buscar URL do arquivo:', error)
    }
  }

  const isLoading = prescriptionsLoading || vaccinationsLoading || documentsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (healthDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          Nenhum documento de saúde encontrado
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Documentos médicos como prescrições, comprovantes de vacinação e documentos
          clínicos aparecerão aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {healthDocuments.map(doc => (
              <TableRow key={`${doc.type}-${doc.id}`}>
                <TableCell className="font-medium">
                  {format(new Date(doc.date), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant={getDocumentTypeBadgeVariant(doc.type)} className="gap-1">
                    {getDocumentTypeIcon(doc.type)}
                    {getDocumentTypeLabel(doc.type)}
                  </Badge>
                </TableCell>
                <TableCell>{doc.title}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDocument(doc.url!, doc.title)}
                    disabled={!doc.url}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Total: {healthDocuments.length} documento(s) de saúde
      </p>

      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        documentUrl={selectedDocumentUrl}
        documentTitle={selectedDocumentTitle}
        documentType="auto"
      />
    </div>
  )
}
