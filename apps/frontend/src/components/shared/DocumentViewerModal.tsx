import { Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DocumentViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentUrl: string
  documentTitle?: string
  documentType?: 'pdf' | 'image' | 'auto' // auto detecta pelo URL
}

/**
 * Modal reutilizável para visualização de documentos (PDFs e Imagens)
 *
 * Suporta:
 * - PDFs (via iframe)
 * - Imagens (JPEG, PNG, GIF, WEBP)
 * - Controles de zoom para imagens
 * - Rotação de imagens
 * - Download
 *
 * Uso:
 * - Documentos Tiptap de evoluções clínicas
 * - Comprovantes de vacinação
 * - Prescrições médicas
 * - Laudos e exames
 * - Documentos administrativos
 */
export function DocumentViewerModal({
  open,
  onOpenChange,
  documentUrl,
  documentTitle = 'Documento',
  documentType = 'auto',
}: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  // Detectar tipo de documento pelo URL
  const detectDocumentType = (): 'pdf' | 'image' => {
    if (documentType !== 'auto') return documentType

    const url = documentUrl.toLowerCase()
    if (url.includes('.pdf') || url.includes('pdf')) return 'pdf'
    if (
      url.includes('.jpg') ||
      url.includes('.jpeg') ||
      url.includes('.png') ||
      url.includes('.gif') ||
      url.includes('.webp')
    ) {
      return 'image'
    }

    // Default para PDF
    return 'pdf'
  }

  const detectedType = detectDocumentType()
  const isPdf = detectedType === 'pdf'

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = documentUrl
    link.download = documentTitle
    link.click()
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50))
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const resetView = () => {
    setZoom(100)
    setRotation(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
          <DialogTitle className="flex-1">{documentTitle}</DialogTitle>

          <div className="flex items-center gap-2">
            {/* Controles para imagens */}
            {!isPdf && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  title="Reduzir zoom"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground w-12 text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  title="Aumentar zoom"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRotate}
                  title="Girar 90°"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetView}
                  title="Resetar visualização"
                >
                  Reset
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
              </>
            )}

            {/* Download */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              title="Baixar documento"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-center justify-center p-4">
          {isPdf ? (
            // Visualizador de PDF
            <iframe
              src={documentUrl}
              className="w-full h-full rounded border bg-white"
              title={documentTitle}
            />
          ) : (
            // Visualizador de Imagem
            <div className="flex items-center justify-center w-full h-full">
              <img
                src={documentUrl}
                alt={documentTitle}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
