import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit } from 'lucide-react'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const editVisitaSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  visitante: z.string().min(1, 'Visitante é obrigatório'),
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditVisitaFormData = z.infer<typeof editVisitaSchema>

interface VisitaRecord {
  time: string
  data: Record<string, unknown>
  [key: string]: unknown
}

interface EditVisitaModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: VisitaRecord
  isUpdating?: boolean
}

export function EditVisitaModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditVisitaModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditVisitaFormData>({
    resolver: zodResolver(editVisitaSchema),
  })

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        visitante: record.data.visitante || '',
        observacoes: record.data.observacoes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditVisitaFormData) => {
    const payload = {
      time: data.time,
      data: {
        visitante: data.visitante,
        observacoes: data.observacoes,
      },
      notes: '',
      editReason: data.editReason,
    }
    onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Visita
          </DialogTitle>
          <DialogDescription>
            É obrigatório informar o motivo da edição para auditoria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Box com info do registro original */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <span className="font-medium">Registrado por:</span>{' '}
              {record?.recordedBy}
            </p>
            <p className="text-sm">
              <span className="font-medium">Data:</span>{' '}
              {record && formatDateOnlySafe(record.date)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Horário original:</span> {record?.time}
            </p>
          </div>

          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Horário
            </Label>
            <Input {...register('time')} type="time" className="mt-2" />
            {errors.time && (
              <p className="text-sm text-danger mt-1">{errors.time.message}</p>
            )}
          </div>

          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Visitante
            </Label>
            <Input
              {...register('visitante')}
              className="mt-2"
              placeholder="Ex: João Silva (filho)"
            />
            {errors.visitante && (
              <p className="text-sm text-danger mt-1">
                {errors.visitante.message}
              </p>
            )}
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2 resize-none"
              placeholder="Observações sobre a visita"
            />
          </div>

          {/* Campo de motivo OBRIGATÓRIO */}
          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Motivo da edição
            </Label>
            <Textarea
              {...register('editReason')}
              rows={4}
              className="mt-2 resize-none"
              placeholder="Descreva o motivo da edição (mínimo 10 caracteres)..."
            />
            {errors.editReason && (
              <p className="text-sm text-danger mt-1">
                {errors.editReason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
