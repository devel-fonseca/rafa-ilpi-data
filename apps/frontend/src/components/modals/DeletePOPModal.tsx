// ──────────────────────────────────────────────────────────────────────────────
//  MODAL - DeletePOPModal (Exclusão de POP com Reautenticação)
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
import { deletePop } from '@/api/pops.api'
import type { Pop } from '@/types/pop.types'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'

// ========== VALIDATION SCHEMA ==========

const deletePOPSchema = z.object({
  deleteReason: z
    .string()
    .min(1, 'Motivo da exclusão é obrigatório')
    .refine((val) => val.trim().length >= 10, {
      message: 'Motivo da exclusão deve ter no mínimo 10 caracteres (sem contar espaços)',
    }),
})

type DeletePOPFormData = z.infer<typeof deletePOPSchema>

// ========== INTERFACE ==========

interface DeletePOPModalProps {
  pop: Pop | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// ========== COMPONENT ==========

export function DeletePOPModal({ pop, open, onOpenChange, onSuccess }: DeletePOPModalProps) {
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
  } = useForm<DeletePOPFormData>({
    resolver: zodResolver(deletePOPSchema),
  })

  // ========== HANDLERS ==========

  const onSubmit = async (data: DeletePOPFormData) => {
    if (!pop) return

    setIsDeleting(true)
    try {
      await deletePop(pop.id)

      // Sucesso
      toast({
        title: 'POP excluído',
        description: 'O Procedimento Operacional Padrão foi excluído com sucesso.',
        variant: 'default',
      })

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['pops'] })
      queryClient.invalidateQueries({ queryKey: ['pop-history'] })

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
        title: 'Erro ao excluir POP',
        description: error.response?.data?.message || 'Ocorreu um erro ao excluir o POP.',
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

  if (!pop) return null

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-danger">Confirmar Exclusão de POP</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o POP "{pop.title}"?
              Esta ação realizará uma exclusão lógica (soft delete).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Informações do POP */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-medium">POP a ser excluído:</p>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-semibold">Título:</span> {pop.title}
                </p>
                {pop.code && (
                  <p className="text-sm">
                    <span className="font-semibold">Código:</span> {pop.code}
                  </p>
                )}
                {pop.category && (
                  <p className="text-sm">
                    <span className="font-semibold">Categoria:</span> {pop.category}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-semibold">Status:</span> {pop.status}
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
                  placeholder="Ex: POP substituído por versão mais recente - Documento obsoleto..."
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
                <li>O POP será marcado como excluído no sistema</li>
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
        actionDescription="Exclusão de POP (Procedimento Operacional Padrão)"
      />
    </>
  )
}
