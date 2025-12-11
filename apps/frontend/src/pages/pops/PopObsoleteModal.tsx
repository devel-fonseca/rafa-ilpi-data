import { useState } from 'react'
import { XCircle, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { useMarkPopObsolete } from '../../hooks/usePops'
import type { MarkObsoleteDto } from '../../types/pop.types'

interface PopObsoleteModalProps {
  open: boolean
  onClose: () => void
  popId: string
  popTitle: string
}

export default function PopObsoleteModal({
  open,
  onClose,
  popId,
  popTitle,
}: PopObsoleteModalProps) {
  const [reason, setReason] = useState('')

  const markObsolete = useMarkPopObsolete()

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      return // Validation handled by UI
    }

    const dto: MarkObsoleteDto = {
      reason: reason.trim(),
    }

    await markObsolete.mutateAsync({ id: popId, dto })
    onClose()
    setReason('')
  }

  const handleCancel = () => {
    onClose()
    setReason('')
  }

  const isValid = reason.trim().length >= 10

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Marcar POP como Obsoleto
          </DialogTitle>
          <DialogDescription>
            Esta ação marcará o POP como obsoleto e ele não estará mais
            disponível para uso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta ação não pode ser desfeita. O POP
              "{popTitle}" será marcado como obsoleto e não aparecerá mais na
              lista de POPs publicados.
            </AlertDescription>
          </Alert>

          {/* Current POP Info */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium">POP a ser marcado como obsoleto:</p>
            <p className="mt-1 text-lg font-semibold">{popTitle}</p>
          </div>

          {/* Reason (Required) */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo pelo qual este POP está sendo marcado como obsoleto (mínimo 10 caracteres)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
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
            <p className="text-sm text-muted-foreground">
              Exemplos: "POP substituído por nova versão", "Procedimento não é
              mais aplicável", "Alteração de legislação"
            </p>
          </div>

          {/* Information */}
          <div className="rounded-lg border bg-blue-50 p-4 text-sm">
            <p className="font-medium text-blue-900">O que acontecerá:</p>
            <ul className="mt-2 space-y-1 text-blue-800">
              <li>• O status do POP será alterado para "Obsoleto"</li>
              <li>• Ele será removido da lista de POPs publicados</li>
              <li>• O histórico completo será preservado</li>
              <li>
                • Esta ação será registrada no histórico de auditoria
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!isValid || markObsolete.isPending}
          >
            {markObsolete.isPending ? 'Processando...' : 'Marcar como Obsoleto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
