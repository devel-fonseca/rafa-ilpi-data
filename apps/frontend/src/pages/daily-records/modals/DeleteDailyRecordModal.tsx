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
import { dailyRecordsAPI, type DailyRecord } from '@/api/dailyRecords.api'
import { useToast } from '@/components/ui/use-toast'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { getErrorMessage } from '@/utils/errorHandling'

/**
 * Schema de validação para exclusão de Daily Record
 * Sincronizado com backend: DeleteDailyRecordDto
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

interface DeleteDailyRecordModalProps {
  record: DailyRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Modal de confirmação para exclusão de Daily Records
 * Implementa soft delete com validação obrigatória de deleteReason (min 10 chars) conforme RDC 502/2021
 *
 * @example
 * ```tsx
 * <DeleteDailyRecordModal
 *   record={selectedRecord}
 *   open={isDeleteModalOpen}
 *   onOpenChange={setIsDeleteModalOpen}
 *   onSuccess={() => {
 *     queryClient.invalidateQueries(['daily-records'])
 *   }}
 * />
 * ```
 */
export function DeleteDailyRecordModal({
  record,
  open,
  onOpenChange,
  onSuccess,
}: DeleteDailyRecordModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

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
    if (!record) return

    try {
      setLoading(true)

      await dailyRecordsAPI.delete(record.id, data.deleteReason)

      toast({
        title: 'Registro excluído',
        description: 'O registro foi excluído com sucesso.',
      })

      handleClose()
      onSuccess?.()
    } catch (error: unknown) {
      console.error('Erro ao excluir registro:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description:
          error.response?.data?.message ||
          'Não foi possível excluir o registro. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!record) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <Trash2 className="h-5 w-5" />
            Excluir Registro Diário
          </DialogTitle>
          <DialogDescription>
            Esta ação realizará uma exclusão lógica (soft delete). O registro permanecerá no
            histórico de auditoria conforme RDC 502/2021.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Alerta de Confirmação */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta ação será permanentemente registrada no histórico
              de auditoria. O motivo da exclusão é obrigatório.
            </AlertDescription>
          </Alert>

          {/* Informações do Registro */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <h4 className="font-medium text-sm">Registro a ser excluído:</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Tipo:</dt>
              <dd className="font-medium">{record.type}</dd>

              <dt className="text-muted-foreground">Data/Hora:</dt>
              <dd>{formatDateTimeSafe(record.createdAt)}</dd>

              <dt className="text-muted-foreground">Registrado por:</dt>
              <dd>{record.recordedBy}</dd>
            </dl>
          </div>

          {/* Campo: Motivo da Exclusão (obrigatório) */}
          <div className="space-y-2">
            <Label htmlFor="deleteReason" className="required">
              Motivo da Exclusão *
            </Label>
            <Textarea
              id="deleteReason"
              placeholder="Ex: Registro duplicado acidentalmente"
              {...register('deleteReason')}
              className={errors.deleteReason ? 'border-danger' : ''}
              rows={3}
            />
            {errors.deleteReason && (
              <p className="text-sm text-danger">{errors.deleteReason.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Caracteres (sem espaços): {cleanedLength}/10
            </p>
          </div>

          {/* Informação de Conformidade */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>✓ Exclusão lógica (soft delete) - registro mantido no banco de dados</p>
            <p>✓ Histórico de auditoria preservado para conformidade regulatória</p>
            <p>✓ Rastreabilidade completa conforme LGPD Art. 48</p>
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
  )
}
