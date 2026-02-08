// ──────────────────────────────────────────────────────────────────────────────
//  MODAL - DeleteMedicationAdministrationModal (Exclusão com Reautenticação)
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ShieldAlert, Pill } from 'lucide-react'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { formatMedicationPresentation } from '@/utils/formatters'
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
import { Badge } from '@/components/ui/badge'
import { useReauthentication } from '@/hooks/useReauthentication'
import { ReauthenticationModal } from '@/components/ReauthenticationModal'
import { api } from '@/services/api'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { tenantKey } from '@/lib/query-keys'
import type { MedicationAdministration } from '../types'

// ========== VALIDATION SCHEMA ==========

const deleteAdministrationSchema = z.object({
  deleteReason: z
    .string()
    .min(1, 'Motivo da exclusão é obrigatório')
    .refine((val) => val.trim().length >= 10, {
      message: 'Motivo da exclusão deve ter no mínimo 10 caracteres (sem contar espaços)',
    }),
})

type DeleteAdministrationFormData = z.infer<typeof deleteAdministrationSchema>

// ========== INTERFACE ==========

interface DeleteMedicationAdministrationModalProps {
  administration: MedicationAdministration | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// ========== COMPONENT ==========

export function DeleteMedicationAdministrationModal({
  administration,
  open,
  onOpenChange,
  onSuccess,
}: DeleteMedicationAdministrationModalProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = React.useState(false)
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
  } = useForm<DeleteAdministrationFormData>({
    resolver: zodResolver(deleteAdministrationSchema),
  })

  const onSubmit = async (data: DeleteAdministrationFormData) => {
    if (!administration) return

    setIsDeleting(true)
    try {
      await api.delete(`/prescriptions/medication-administrations/${administration.id}`, {
        data: { deleteReason: data.deleteReason.trim() },
      })

      toast({
        title: 'Administração excluída',
        description: 'O registro de administração foi excluído com sucesso.',
        variant: 'default',
      })

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: tenantKey('medication-administrations') })

      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      // Interceptar erro de reautenticação
      if (
        error.response?.data?.code === 'REAUTHENTICATION_REQUIRED' ||
        error.response?.data?.requiresReauth
      ) {
        openReauthModal(() => onSubmit(data))
        return
      }

      toast({
        title: 'Erro ao excluir administração',
        description: error.response?.data?.message || 'Ocorreu um erro ao excluir o registro.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  if (!administration) return null

  const { type, scheduledTime, actualTime, medication, wasAdministered, administeredBy, createdAt } = administration

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-danger">
              Confirmar Exclusão de Administração
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de administração?
              Esta ação realizará uma exclusão lógica (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Informações da administração */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-medium">Administração a ser excluída:</p>

              {medication && (
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{medication.name}</span>
                  {type === 'SOS' && (
                    <Badge variant="outline" className="bg-severity-warning/10 text-severity-warning border-severity-warning/30">
                      SOS
                    </Badge>
                  )}
                </div>
              )}

              <div className="space-y-1 text-sm">
                {medication && (
                  <p className="text-muted-foreground">
                    {medication.dose} • {medication.route}
                    {medication.presentation && ` • ${formatMedicationPresentation(medication.presentation)}`}
                  </p>
                )}

                <p>
                  <span className="font-semibold">Status:</span>{' '}
                  <Badge variant={wasAdministered ? 'default' : 'destructive'} className="ml-1">
                    {wasAdministered ? 'Administrado' : 'Não Administrado'}
                  </Badge>
                </p>

                {scheduledTime && (
                  <p>
                    <span className="font-semibold">Horário programado:</span> {scheduledTime}
                  </p>
                )}

                {actualTime && (
                  <p>
                    <span className="font-semibold">Horário real:</span> {actualTime}
                  </p>
                )}

                <p>
                  <span className="font-semibold">Registrado por:</span> {administeredBy}
                </p>

                <p>
                  <span className="font-semibold">Data/hora do registro:</span>{' '}
                  {formatDateTimeSafe(createdAt)}
                </p>
              </div>
            </div>

            {/* Card Destacado - Auditoria */}
            <div className="bg-warning/5 dark:bg-warning/20 border border-warning/30 dark:border-warning/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-warning/90 dark:text-warning">
                    Este registro integra trilha de auditoria permanente, com identificação do usuário, data, hora e motivo da alteração.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deleteReason" className="text-sm font-semibold">
                  Motivo da Exclusão <span className="text-danger">*</span>
                </Label>
                <Textarea
                  id="deleteReason"
                  placeholder="Ex: Registro duplicado - Administração registrada duas vezes por engano..."
                  {...register('deleteReason')}
                  className={errors.deleteReason ? 'border-danger focus:border-danger' : ''}
                  rows={2}
                />
                {errors.deleteReason && (
                  <p className="text-sm text-danger">{errors.deleteReason.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Campo obrigatório. A justificativa comporá o registro permanente da instituição.
                </p>
              </div>
            </div>

            {/* Informações de segurança */}
            <div className="rounded-lg bg-warning/5 border border-warning/20 p-4 space-y-2">
              <p className="text-sm font-semibold text-warning/95 dark:text-warning">
                ⚠️ Atenção - Operação de Alto Risco
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Esta operação requer confirmação de senha (reautenticação)</li>
                <li>O registro será marcado como excluído no sistema</li>
                <li>Todas as informações serão mantidas no histórico de auditoria</li>
              </ul>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose} disabled={isDeleting}>
                Cancelar
              </AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={isDeleting}
                className="min-w-[120px]"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Confirmar Exclusão'
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de reautenticação */}
      <ReauthenticationModal
        open={isReauthModalOpen}
        onOpenChange={closeReauthModal}
        onSubmit={reauthenticate}
        isLoading={isReauthenticating}
        error={reauthError}
        actionDescription="Exclusão de administração de medicamento"
      />
    </>
  )
}
