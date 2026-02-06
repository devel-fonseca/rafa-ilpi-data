// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - VaccinationsView (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/design-system/components'
import { Syringe, Eye } from 'lucide-react'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { DocumentViewerModal } from '@/components/shared/DocumentViewerModal'
import { api } from '@/services/api'
import { toast } from 'sonner'
import type { Vaccination } from '@/hooks/useVaccinations'

interface VaccinationsViewProps {
  vaccinations: Vaccination[]
}

export function VaccinationsView({ vaccinations }: VaccinationsViewProps) {
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false)
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string>('')
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState<string>('')

  const handleViewCertificate = async (filePath: string, title: string) => {
    try {
      const response = await api.get<{ url: string }>(`/files/download/${filePath}`)
      setSelectedDocumentUrl(response.data.url)
      setSelectedDocumentTitle(title)
      setDocumentViewerOpen(true)
    } catch {
      toast.error('Erro ao carregar comprovante')
    }
  }

  if (!vaccinations || vaccinations.length === 0) {
    return (
      <EmptyState
        icon={Syringe}
        title="Nenhuma vacinação registrada"
        description="Este residente não possui vacinações cadastradas"
      />
    )
  }

  // Ordenar por data (mais recente primeiro)
  const sortedVaccinations = [...vaccinations].sort(
    (a, b) => b.date.localeCompare(a.date),
  )

  return (
    <>
      <div className="space-y-2">
        {sortedVaccinations.map((vaccination) => {
          const hasCertificate = vaccination.processedFileUrl || vaccination.certificateUrl

          return (
            <div
              key={vaccination.id}
              className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{vaccination.vaccine}</span>
                  <Badge variant="outline" className="text-xs">
                    {vaccination.dose}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDateOnlySafe(vaccination.date)} • {vaccination.manufacturer} • Lote: {vaccination.batch} • {vaccination.healthUnit}, {vaccination.municipality}/{vaccination.state}
                </p>
              </div>

              {/* Botão de certificado */}
              {hasCertificate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() =>
                    handleViewCertificate(
                      vaccination.processedFileUrl || vaccination.certificateUrl!,
                      `Comprovante - ${vaccination.vaccine} (${vaccination.dose})`,
                    )
                  }
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Comprovante
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de Visualização de Comprovante */}
      <DocumentViewerModal
        open={documentViewerOpen}
        onOpenChange={setDocumentViewerOpen}
        documentUrl={selectedDocumentUrl}
        documentTitle={selectedDocumentTitle}
        documentType="auto"
      />
    </>
  )
}
