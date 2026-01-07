import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Save } from 'lucide-react'
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
import { getErrorMessage } from '@/utils/errorHandling'

/**
 * Schema de validação para edição de Daily Record
 * Sincronizado com backend: UpdateDailyRecordDto
 */
const editSchema = z.object({
  editReason: z
    .string()
    .min(1, 'Motivo da edição é obrigatório')
    .refine(
      (value) => {
        // Remove espaços para validar tamanho real
        const cleaned = value.replace(/\s+/g, '')
        return cleaned.length >= 10
      },
      { message: 'Motivo deve ter pelo menos 10 caracteres (sem contar espaços)' }
    ),
  time: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido. Use HH:mm')
    .optional(),
  notes: z.string().optional(),
  data: z.record(z.any()).optional(),
})

type EditFormData = z.infer<typeof editSchema>

interface EditDailyRecordModalProps {
  record: DailyRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Modal genérico para edição de Daily Records
 * Implementa validação obrigatória de editReason (min 10 chars) conforme RDC 502/2021
 *
 * @example
 * ```tsx
 * <EditDailyRecordModal
 *   record={selectedRecord}
 *   open={isEditModalOpen}
 *   onOpenChange={setIsEditModalOpen}
 *   onSuccess={() => {
 *     queryClient.invalidateQueries(['daily-records'])
 *   }}
 * />
 * ```
 */
export function EditDailyRecordModal({
  record,
  open,
  onOpenChange,
  onSuccess,
}: EditDailyRecordModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      editReason: '',
      time: record?.time || '',
      notes: record?.notes || '',
    },
  })

  const editReason = watch('editReason')
  const cleanedLength = editReason?.replace(/\s+/g, '').length || 0

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (data: EditFormData) => {
    if (!record) return

    try {
      setLoading(true)

      await dailyRecordsAPI.update(record.id, {
        editReason: data.editReason,
        time: data.time,
        notes: data.notes,
        // data: Permite edição de campos específicos se necessário
      })

      toast({
        title: 'Registro atualizado',
        description: 'As alterações foram salvas com sucesso.',
      })

      handleClose()
      onSuccess?.()
    } catch (error: unknown) {
      console.error('Erro ao atualizar registro:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description:
          error.response?.data?.message ||
          'Não foi possível atualizar o registro. Tente novamente.',
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
          <DialogTitle>Editar Registro Diário</DialogTitle>
          <DialogDescription>
            Para conformidade com RDC 502/2021 (ANVISA), toda edição deve ser justificada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Alerta de Conformidade */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta ação será registrada no histórico de auditoria
              do prontuário eletrônico. O motivo da edição é obrigatório.
            </AlertDescription>
          </Alert>

          {/* Campo: Motivo da Edição (obrigatório) */}
          <div className="space-y-2">
            <Label htmlFor="editReason" className="required">
              Motivo da Edição *
            </Label>
            <Textarea
              id="editReason"
              placeholder="Ex: Correção de horário registrado incorretamente"
              {...register('editReason')}
              className={errors.editReason ? 'border-danger' : ''}
              rows={3}
            />
            {errors.editReason && (
              <p className="text-sm text-danger">{errors.editReason.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Caracteres (sem espaços): {cleanedLength}/10
            </p>
          </div>

          {/* Campo: Horário (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="time">Horário</Label>
            <input
              id="time"
              type="time"
              {...register('time')}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                errors.time ? 'border-danger' : ''
              }`}
            />
            {errors.time && <p className="text-sm text-danger">{errors.time.message}</p>}
          </div>

          {/* Campo: Observações (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações adicionais"
              {...register('notes')}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Salvando...'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
