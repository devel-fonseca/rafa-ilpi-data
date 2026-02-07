// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - DocumentosSection (Formulário de Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { Lock } from 'lucide-react'
import { ResidentDocuments } from '@/components/residents/ResidentDocuments'

// ========== TYPES ==========

interface DocumentosSectionProps {
  residentId?: string
  isNewResident: boolean
}

// ========== COMPONENT ==========

export function DocumentosSection({ residentId, isNewResident }: DocumentosSectionProps) {
  // Estado: Novo residente (sem ID ainda)
  if (isNewResident || !residentId) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Documentos não disponíveis</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Para gerenciar documentos, primeiro salve o cadastro do residente.
          Após o cadastro inicial, você poderá anexar documentos como termos de admissão,
          consentimentos e outros arquivos.
        </p>
      </div>
    )
  }

  // Estado: Residente existente - mostrar gestão de documentos inline (sem Card wrapper)
  return <ResidentDocuments residentId={residentId} embedded />
}
