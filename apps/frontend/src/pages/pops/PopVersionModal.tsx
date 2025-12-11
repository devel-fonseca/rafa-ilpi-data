import { useState, useEffect } from 'react'
import { GitBranch } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { TiptapEditor } from '../../components/tiptap/TiptapEditor'
import { useCreatePopVersion } from '../../hooks/usePops'
import type { CreatePopVersionDto } from '../../types/pop.types'

interface PopVersionModalProps {
  open: boolean
  onClose: () => void
  popId: string
  currentTitle: string
  currentContent: string
  currentReviewMonths?: number
}

export default function PopVersionModal({
  open,
  onClose,
  popId,
  currentTitle,
  currentContent,
  currentReviewMonths,
}: PopVersionModalProps) {
  const [reason, setReason] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState(currentContent)
  const [newReviewMonths, setNewReviewMonths] = useState<string>(
    currentReviewMonths?.toString() || ''
  )
  const [newNotes, setNewNotes] = useState('')

  const createVersion = useCreatePopVersion()

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setReason('')
      setNewTitle('')
      setNewContent(currentContent)
      setNewReviewMonths(currentReviewMonths?.toString() || '')
      setNewNotes('')
    }
  }, [open, currentContent, currentReviewMonths])

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      return // Validation handled by UI
    }

    const dto: CreatePopVersionDto = {
      reason: reason.trim(),
      newContent,
      newTitle: newTitle.trim() || undefined,
      newReviewIntervalMonths: newReviewMonths
        ? parseInt(newReviewMonths, 10)
        : undefined,
      newNotes: newNotes.trim() || undefined,
    }

    await createVersion.mutateAsync({ id: popId, dto })
    onClose()
  }

  const isValid = reason.trim().length >= 10 && newContent.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Criar Nova Versão do POP
          </DialogTitle>
          <DialogDescription>
            A versão atual será marcada como obsoleta. Uma nova versão em
            rascunho será criada para você editar e publicar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reason (Required) */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo da Revisão <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo da criação desta nova versão (mínimo 10 caracteres)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={
                reason.length > 0 && reason.trim().length < 10
                  ? 'border-destructive'
                  : ''
              }
            />
            {reason.length > 0 && reason.trim().length < 10 && (
              <p className="text-sm text-destructive">
                Mínimo de 10 caracteres ({reason.trim().length}/10)
              </p>
            )}
          </div>

          {/* New Title (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="newTitle">Novo Título (opcional)</Label>
            <Input
              id="newTitle"
              placeholder={currentTitle}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Deixe em branco para manter o título atual: "{currentTitle}"
            </p>
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <Label>
              Conteúdo do POP <span className="text-destructive">*</span>
            </Label>
            <div className="rounded-lg border">
              <TiptapEditor
                content={newContent}
                onChange={setNewContent}
                placeholder="Edite o conteúdo do POP..."
              />
            </div>
          </div>

          {/* Review Interval (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="newReviewMonths">
              Novo Intervalo de Revisão (meses)
            </Label>
            <Input
              id="newReviewMonths"
              type="number"
              min="1"
              max="60"
              placeholder={
                currentReviewMonths
                  ? currentReviewMonths.toString()
                  : 'Sem intervalo configurado'
              }
              value={newReviewMonths}
              onChange={(e) => setNewReviewMonths(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {currentReviewMonths
                ? `Intervalo atual: ${currentReviewMonths} meses`
                : 'Nenhum intervalo configurado atualmente'}
            </p>
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="newNotes">Novas Notas Internas (opcional)</Label>
            <Textarea
              id="newNotes"
              placeholder="Adicione observações internas sobre esta versão..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createVersion.isPending}
          >
            {createVersion.isPending ? 'Criando...' : 'Criar Nova Versão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
