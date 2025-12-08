import { useState } from 'react'
import { FileText, X, Check, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TiptapEditor } from '@/components/tiptap/TiptapEditor'

interface DocumentEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentTitle: string
  documentType: string
  documentContent: string
  onDocumentTitleChange: (title: string) => void
  onDocumentTypeChange: (type: string) => void
  onDocumentContentChange: (content: string) => void
  onSave: () => void
}

// Mapa de labels dos tipos de documento
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  RELATORIO: 'Relatório',
  PEDIDO_EXAME: 'Pedido de Exame',
  PARECER: 'Parecer Técnico',
  ATESTADO: 'Atestado',
  EVOLUCAO_DETALHADA: 'Evolução Detalhada',
  PLANO_TERAPEUTICO: 'Plano Terapêutico',
  OUTRO: 'Outro',
}

/**
 * Modal fullscreen para edição de documentos Tiptap
 *
 * Este modal ocupa toda a área visível e fornece uma experiência
 * de edição focada, sem distrações.
 *
 * Recursos:
 * - Editor Tiptap com toolbar completa
 * - Campos para título e tipo de documento
 * - Modo fullscreen para melhor foco
 * - Botões de salvar e cancelar
 */
export function DocumentEditorModal({
  open,
  onOpenChange,
  documentTitle,
  documentType,
  documentContent,
  onDocumentTitleChange,
  onDocumentTypeChange,
  onDocumentContentChange,
  onSave,
}: DocumentEditorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col p-0">
        {/* Header fixo */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <DialogTitle>Editor de Documento Clínico</DialogTitle>
              <DialogDescription>
                Crie um documento formatado para anexar à evolução clínica
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Campos de metadados */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Título/Descrição do Documento *</Label>
              <Input
                id="doc-title"
                placeholder="Ex: Relatório de Evolução Multidisciplinar"
                value={documentTitle}
                onChange={(e) => onDocumentTitleChange(e.target.value)}
                className="font-medium"
              />
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (documentType) {
                        onDocumentTitleChange(DOCUMENT_TYPE_LABELS[documentType] || documentType)
                      }
                    }}
                    disabled={!documentType}
                    className="h-10 w-10"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copiar tipo de documento para o título</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="space-y-2">
              <Label htmlFor="doc-type">Tipo de Documento</Label>
              <Select value={documentType || undefined} onValueChange={onDocumentTypeChange}>
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder="Selecione o tipo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RELATORIO">Relatório</SelectItem>
                  <SelectItem value="PEDIDO_EXAME">Pedido de Exame</SelectItem>
                  <SelectItem value="PARECER">Parecer Técnico</SelectItem>
                  <SelectItem value="ATESTADO">Atestado</SelectItem>
                  <SelectItem value="EVOLUCAO_DETALHADA">Evolução Detalhada</SelectItem>
                  <SelectItem value="PLANO_TERAPEUTICO">Plano Terapêutico</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Editor Tiptap */}
          <div className="space-y-2">
            <Label>Conteúdo do Documento</Label>
            <TiptapEditor
              content={documentContent}
              onChange={onDocumentContentChange}
              placeholder="Digite o conteúdo do documento clínico aqui. Você pode usar formatação rica, títulos, listas e muito mais..."
              className="min-h-[500px]"
            />
          </div>
        </div>

        {/* Footer fixo */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              O documento será anexado à evolução clínica e gerado em PDF automaticamente
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>

              <Button
                onClick={() => {
                  onSave()
                  onOpenChange(false)
                }}
                disabled={!documentTitle.trim() || !documentContent.trim()}
              >
                <Check className="h-4 w-4 mr-2" />
                Salvar Documento
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
