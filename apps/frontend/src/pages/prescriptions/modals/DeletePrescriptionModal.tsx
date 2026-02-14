/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { prescriptionsApi, type Prescription } from '@/api/prescriptions.api'
import { useToast } from '@/components/ui/use-toast'
import { extractDateOnly } from '@/utils/dateHelpers'
import { format } from 'date-fns'
import { useReauthentication } from '@/hooks/useReauthentication'
import { ReauthenticationModal } from '@/components/ReauthenticationModal'

/**
 * Schema de validação para exclusão de Prescription
 * Sincronizado com backend: DeletePrescriptionDto
 */
const deleteSchema = z.object({
  deleteReason: z
    .string()
    .min(1, 'Motivo da exclusão é obrigatório')
    .refine(
      (value) => {
        // Remove espaços para validar tamanho real
        const cleaned = value.replace(/\s+/g, '')
        return cleaned.length >= 10
      },
      { message: 'Motivo deve ter pelo menos 10 caracteres (sem contar espaços)' }
    ),
})

type DeleteFormData = z.infer<typeof deleteSchema>

interface DeletePrescriptionModalProps {
  prescription: Prescription | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Modal de confirmação para exclusão de Prescriptions
 * Implementa soft delete com validação obrigatória de deleteReason (min 10 chars) conforme RDC 502/2021
 *
 * @example
 * ```tsx
 * <DeletePrescriptionModal
 *   prescription={selectedPrescription}
 *   open={isDeleteModalOpen}
 *   onOpenChange={setIsDeleteModalOpen}
 *   onSuccess={() => {
 *     queryClient.invalidateQueries(['prescriptions'])
 *   }}
 * />
 * ```
 */
export function DeletePrescriptionModal({
  prescription,
  open,
  onOpenChange,
  onSuccess,
}: DeletePrescriptionModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Hook de reautenticação
  const {
    isModalOpen: isReauthModalOpen,
    openReauthModal,
    closeReauthModal,
    reauthenticate,
    isReauthenticating,
    reauthError,
  } = useReauthentication()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<DeleteFormData>({
    resolver: zodResolver(deleteSchema),
    defaultValues: {
      deleteReason: '',
    },
  })

  const deleteReason = watch('deleteReason')
  const cleanedLength = deleteReason?.replace(/\s+/g, '').length || 0

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (data: DeleteFormData) => {
    if (!prescription) return

    try {
      setLoading(true)

      await prescriptionsApi.remove(prescription.id, data.deleteReason)

      toast({
        title: 'Prescrição excluída',
        description: 'A prescrição foi excluída com sucesso.',
      })

      handleClose()
      onSuccess?.()
    } catch (error: any) {
      console.error('Erro ao excluir prescrição:', error)

      // Verifica se precisa reautenticação
      if (error.response?.data?.code === 'REAUTHENTICATION_REQUIRED' ||
          error.response?.data?.requiresReauth) {
        // Abre modal de reautenticação e passa callback para retry
        openReauthModal(() => onSubmit(data))
        return
      }

      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description:
          error.response?.data?.message ||
          'Não foi possível excluir a prescrição. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!prescription) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <Trash2 className="h-5 w-5" />
              Excluir Prescrição
            </DialogTitle>
            <DialogDescription>
              Esta ação realizará uma exclusão lógica (soft delete). A prescrição permanecerá no
              histórico de auditoria conforme RDC 502/2021.
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Alerta de Confirmação */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta ação será permanentemente registrada no histórico
              de auditoria. O motivo da exclusão é obrigatório.
            </AlertDescription>
          </Alert>

          {/* Informações da Prescrição */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <h4 className="font-medium text-sm">Prescrição a ser excluída:</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Médico:</dt>
              <dd className="font-medium">{prescription.doctorName}</dd>

              <dt className="text-muted-foreground">Tipo:</dt>
              <dd>{prescription.prescriptionType}</dd>

              <dt className="text-muted-foreground">CRM:</dt>
              <dd>
                {prescription.doctorCrm}/{prescription.doctorCrmState}
              </dd>

              <dt className="text-muted-foreground">Data da Prescrição:</dt>
              <dd>{format(new Date(extractDateOnly(prescription.prescriptionDate) + 'T12:00:00'), 'dd/MM/yyyy')}</dd>
            </dl>
          </div>

          {/* Campo: Motivo da Exclusão (obrigatório) */}
          <div className="space-y-2">
            <Label htmlFor="deleteReason" className="required">
              Motivo da Exclusão *
            </Label>
            <Textarea
              id="deleteReason"
              placeholder="Ex: Prescrição duplicada acidentalmente no sistema"
              {...register('deleteReason')}
              className={errors.deleteReason ? 'border-danger' : ''}
              rows={2}
            />
            {errors.deleteReason && (
              <p className="text-sm text-danger">{errors.deleteReason.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Caracteres (sem espaços): {cleanedLength}/10
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? (
                'Excluindo...'
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

      {/* Modal de Reautenticação */}
      <ReauthenticationModal
        open={isReauthModalOpen}
        onOpenChange={closeReauthModal}
        onSubmit={reauthenticate}
        isLoading={isReauthenticating}
        error={reauthError}
        actionDescription="Exclusão de prescrição médica"
      />
    </>
  )
}
