// ──────────────────────────────────────────────────────────────────────────────
//  MODAL - DeleteDietaryRestrictionModal (Exclusão de Restrição Alimentar com Reautenticação)
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useReauthentication } from '@/hooks/useReauthentication'
import { ReauthenticationModal } from '@/components/ReauthenticationModal'
import { deleteDietaryRestriction } from '@/api/dietary-restrictions.api'
import type { DietaryRestriction } from '@/api/dietary-restrictions.api'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'

// ========== VALIDATION SCHEMA ==========

const deleteDietaryRestrictionSchema = z.object({
  deleteReason: z
    .string()
    .min(1, 'Motivo da exclusão é obrigatório')
    .refine((val) => val.trim().length >= 10, {
      message: 'Motivo da exclusão deve ter no mínimo 10 caracteres (sem contar espaços)',
    }),
})

type DeleteDietaryRestrictionFormData = z.infer<typeof deleteDietaryRestrictionSchema>

// ========== INTERFACE ==========

interface DeleteDietaryRestrictionModalProps {
  restriction: DietaryRestriction | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// ========== COMPONENT ==========

export function DeleteDietaryRestrictionModal({ restriction, open, onOpenChange, onSuccess }: DeleteDietaryRestrictionModalProps) {
  // Hooks
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

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeleteDietaryRestrictionFormData>({
    resolver: zodResolver(deleteDietaryRestrictionSchema),
  })

  // ========== HANDLERS ==========

  const onSubmit = async (data: DeleteDietaryRestrictionFormData) => {
    if (!restriction) return

    setIsDeleting(true)
    try {
      await deleteDietaryRestriction(restriction.id, data.deleteReason.trim())

      // Sucesso
      toast({
        title: 'Restrição alimentar excluída',
        description: 'O registro de restrição alimentar foi excluído com sucesso.',
        variant: 'default',
      })

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['dietary-restrictions'] })
      queryClient.invalidateQueries({ queryKey: ['dietary-restriction-history'] })

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

      // Outros erros
      toast({
        title: 'Erro ao excluir restrição',
        description: error.response?.data?.message || 'Ocorreu um erro ao excluir o registro de restrição alimentar.',
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

  // ========== RENDER ==========

  if (!restriction) return null

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-danger">Confirmar Exclusão de Restrição Alimentar</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a restrição "{restriction.description}"?
              Esta ação realizará uma exclusão lógica (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Informações da restrição */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">Restrição a ser excluída:</p>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-semibold">Tipo:</span> {restriction.restrictionType}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Descrição:</span> {restriction.description}
                </p>
                {restriction.notes && (
                  <p className="text-sm">
                    <span className="font-semibold">Observações:</span> {restriction.notes}
                  </p>
                )}
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
                  placeholder="Ex: Restrição não mais necessária - Nutricionista reavaliou quadro clínico..."
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
        actionDescription="Exclusão de registro de restrição alimentar"
      />
    </>
  )
}
