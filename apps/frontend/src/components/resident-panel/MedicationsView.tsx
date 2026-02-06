// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - MedicationsView (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/design-system/components'
import { Pill, Eye, AlertTriangle } from 'lucide-react'
import { DocumentViewerModal } from '@/components/shared/DocumentViewerModal'
import { getSignedFileUrl } from '@/services/upload'
import { toast } from 'sonner'
import type { Prescription, Medication, AdministrationRoute } from '@/api/prescriptions.api'

// ========== CONSTANTS ==========

const ROUTE_LABELS: Record<AdministrationRoute, string> = {
  VO: 'Via Oral',
  IM: 'Intramuscular',
  EV: 'Endovenosa',
  SC: 'Subcutânea',
  TOPICA: 'Tópica',
  SL: 'Sublingual',
  RETAL: 'Retal',
  OCULAR: 'Ocular',
  NASAL: 'Nasal',
  INALATORIA: 'Inalatória',
  OUTRA: 'Outra',
}

// ========== TYPES ==========

interface MedicationsViewProps {
  prescriptions: Prescription[]
}

interface MedicationWithPrescription extends Medication {
  prescriptionId: string
  prescriptionFileUrl?: string | null
  doctorName: string
  isControlled: boolean
  isHighRisk: boolean
}

// ========== COMPONENT ==========

export function MedicationsView({ prescriptions }: MedicationsViewProps) {
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false)
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState<string>('')
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState<string>('')

  const handleViewPrescription = async (fileUrl: string, title: string) => {
    try {
      // Se já é uma URL completa (http/https), abrir diretamente
      if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
        setSelectedDocumentUrl(fileUrl)
      } else {
        // Caso contrário, obter URL assinada do MinIO
        const signedUrl = await getSignedFileUrl(fileUrl)
        setSelectedDocumentUrl(signedUrl)
      }
      setSelectedDocumentTitle(title)
      setDocumentViewerOpen(true)
    } catch {
      toast.error('Erro ao carregar prescrição')
    }
  }

  // Extrair todos os medicamentos das prescrições ativas
  const activeMedications: MedicationWithPrescription[] = prescriptions
    .filter((p) => p.isActive)
    .flatMap((prescription) =>
      prescription.medications.map((med) => ({
        ...med,
        prescriptionId: prescription.id,
        prescriptionFileUrl: prescription.processedFileUrl || prescription.originalFileUrl,
        doctorName: prescription.doctorName,
      })),
    )

  if (activeMedications.length === 0) {
    return (
      <EmptyState
        icon={Pill}
        title="Nenhum medicamento ativo"
        description="Este residente não possui medicamentos em prescrições ativas"
      />
    )
  }

  // Ordenar: controlados/alto risco primeiro, depois por nome
  const sortedMedications = [...activeMedications].sort((a, b) => {
    if (a.isControlled !== b.isControlled) return a.isControlled ? -1 : 1
    if (a.isHighRisk !== b.isHighRisk) return a.isHighRisk ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <>
      <div className="space-y-2">
        {sortedMedications.map((medication) => {
          return (
            <div
              key={medication.id}
              className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{medication.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {medication.concentration}
                  </Badge>
                  {medication.isControlled && (
                    <Badge variant="destructive" className="text-xs">
                      Controlado
                    </Badge>
                  )}
                  {medication.isHighRisk && (
                    <Badge variant="outline" className="text-xs border-warning text-warning">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Alto Risco
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {medication.dose} • {ROUTE_LABELS[medication.route]} • Horários: {medication.scheduledTimes.join(', ')}
                </p>
              </div>

              {/* Botão de prescrição */}
              {!!medication.prescriptionFileUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() =>
                    handleViewPrescription(
                      medication.prescriptionFileUrl!,
                      `Prescrição - ${medication.name}`,
                    )
                  }
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Prescrição
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de Visualização de Prescrição */}
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
