// ──────────────────────────────────────────────────────────────────────────────
//  MODAL - DeleteReasonModal (Modal genérico de exclusão com motivo)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Loader2, ShieldAlert } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface DeleteReasonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: (reason: string) => Promise<void>
  isLoading?: boolean
}

export function DeleteReasonModal({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading = false,
}: DeleteReasonModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setError('Motivo da exclusão deve ter no mínimo 10 caracteres')
      return
    }

    setError('')
    await onConfirm(reason.trim())
    setReason('')
  }

  const handleClose = () => {
    setReason('')
    setError('')
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-danger">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Card Destacado - Auditoria */}
          <div className="bg-warning/5 dark:bg-warning/20 border border-warning/30 dark:border-warning/50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-warning/90 dark:text-warning">
                  Este registro integra trilha de auditoria permanente.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deleteReason" className="text-sm font-semibold">
                Motivo da Exclusão <span className="text-danger">*</span>
              </Label>
              <Textarea
                id="deleteReason"
                placeholder="Descreva o motivo da exclusão (mínimo 10 caracteres)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={error ? 'border-danger focus:border-danger' : ''}
                rows={2}
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <p className="text-xs text-muted-foreground">
                Campo obrigatório. A justificativa comporá o registro permanente.
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={isLoading || reason.trim().length < 10}
            onClick={handleSubmit}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Confirmar Exclusão'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
