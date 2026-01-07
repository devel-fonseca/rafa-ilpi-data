import { CheckCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PDFViewer } from '@react-pdf/renderer'
import { ClinicalDocumentPDF } from '@/components/pdf/ClinicalDocumentPDF'
import { convertTiptapHtmlToReactPdf } from '@/utils/htmlToReactPdf'

interface DocumentPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentTitle: string
  documentContent: string // HTML do Tiptap
  resident: {
    fullName: string
    age: number
    cpf: string
    cns?: string
    admissionDate?: string
  }
  professional: {
    name: string
    profession?: string
    council?: string
    councilNumber?: string
    councilState?: string
  }
  date: string
  documentId?: string
  institutionalData?: {
    tenantName?: string
    logoUrl?: string
    cnpj?: string
    cnesCode?: string
    phone?: string
    email?: string
    addressStreet?: string
    addressNumber?: string
    addressDistrict?: string
    addressCity?: string
    addressState?: string
    addressZipCode?: string
  }
  onConfirm: () => void
  onEdit: () => void
  isConfirming: boolean
}

/**
 * Modal de preview do documento PDF antes de salvar a evolução usando @react-pdf/renderer
 *
 * Permite que o usuário visualize o documento gerado e decida se:
 * - Confirma e salva a evolução com o documento
 * - Volta para editar o documento
 */
export function DocumentPreviewModal({
  open,
  onOpenChange,
  documentTitle,
  documentContent,
  resident,
  professional,
  date,
  documentId,
  institutionalData,
  onConfirm,
  onEdit,
  isConfirming,
}: DocumentPreviewModalProps) {
  // Converter HTML do Tiptap para componentes React-PDF
  const contentComponents = convertTiptapHtmlToReactPdf(documentContent)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Confirmar Documento e Evolução
          </DialogTitle>
          <DialogDescription>
            Revise o documento gerado abaixo. Você pode confirmar o salvamento ou voltar para
            editar.
          </DialogDescription>
        </DialogHeader>

        {/* Preview do PDF usando PDFViewer do @react-pdf/renderer */}
        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted/50">
          {open ? (
            <div className="w-full h-full min-h-[700px]">
              <PDFViewer
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                showToolbar={true}
              >
                <ClinicalDocumentPDF
                  title={documentTitle}
                  content={contentComponents}
                  resident={resident}
                  professional={professional}
                  date={date}
                  documentId={documentId}
                  institutionalData={institutionalData}
                />
              </PDFViewer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[600px] gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
              <p className="text-sm text-muted-foreground">Carregando preview...</p>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <strong>Documento:</strong> {documentTitle}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onEdit}
              disabled={isConfirming}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Editar
            </Button>

            <Button onClick={onConfirm} disabled={isConfirming} className="gap-2">
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirmar e Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
