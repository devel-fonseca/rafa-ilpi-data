import { useState } from 'react'
import { Loader2, ShieldAlert } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useDeleteSOSMedication } from '@/hooks/useSOSMedicationVersioning'
import type { SOSMedication } from '@/api/prescriptions.api'

interface DeleteSOSMedicationModalProps {
  sosMedication: SOSMedication | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Modal para exclusão de SOSMedication com versionamento
 * Implementa validação obrigatória de deleteReason (min 10 chars) conforme RDC 502/2021
 */
export function DeleteSOSMedicationModal({
  sosMedication,
  open,
  onOpenChange,
  onSuccess,
}: DeleteSOSMedicationModalProps) {
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState('')
  const deleteMutation = useDeleteSOSMedication()

  const handleClose = () => {
    setDeleteReason('')
    setDeleteReasonError('')
    onOpenChange(false)
  }

  const handleConfirm = async () => {
    if (!sosMedication) return

    // Validação do motivo da exclusão
    const trimmedReason = deleteReason.trim()
    if (!trimmedReason || trimmedReason.length < 10) {
      setDeleteReasonError(
        'Motivo da exclusão deve ter no mínimo 10 caracteres (sem contar espaços)'
      )
      return
    }

    try {
      await deleteMutation.mutateAsync({
        id: sosMedication.id,
        deleteReason: trimmedReason,
      })
      handleClose()
      onSuccess?.()
    } catch (error) {
      // Erro é tratado automaticamente pelo hook (toast)
    }
  }

  const cleanedLength = deleteReason.trim().length

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Medicamento SOS</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o medicamento SOS "{sosMedication?.name}"?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Card Destacado - RDC 502/2021 */}
        <div className="bg-warning/5 dark:bg-warning/90/20 border border-warning/30 dark:border-warning/80 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-5 w-5 text-warning dark:text-warning/40 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning/90 dark:text-warning/20">
                Rastreabilidade Obrigatória (RDC 502/2021 Art. 39)
              </p>
              <p className="text-xs text-warning/80 dark:text-warning/30 mt-1">
                Toda exclusão de registro deve ter justificativa documentada para fins de
                auditoria e conformidade regulatória.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="deleteReason"
              className="text-sm font-semibold text-warning/95 dark:text-warning/10"
            >
              Motivo da Exclusão <span className="text-danger">*</span>
            </Label>
            <Textarea
              id="deleteReason"
              placeholder="Ex: Medicamento SOS descontinuado - não mais necessário para o residente..."
              value={deleteReason}
              onChange={(e) => {
                setDeleteReason(e.target.value)
                setDeleteReasonError('')
              }}
              className={`min-h-[100px] ${deleteReasonError ? 'border-danger focus:border-danger' : ''}`}
              disabled={deleteMutation.isPending}
            />
            {deleteReasonError && (
              <p className="text-sm text-danger mt-2">{deleteReasonError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {cleanedLength}/10 caracteres mínimos. Este motivo ficará registrado
              permanentemente no histórico de alterações.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={deleteMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir Definitivamente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
