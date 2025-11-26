import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit } from 'lucide-react'
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

const editHidratacaoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  volumeMl: z.coerce
    .number({ required_error: 'Volume é obrigatório' })
    .positive('Volume deve ser maior que zero')
    .max(5000, 'Volume máximo: 5000ml'),
  tipo: z.string().optional(),
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditHidratacaoFormData = z.infer<typeof editHidratacaoSchema>

interface EditHidratacaoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  record: any
  isUpdating?: boolean
}

export function EditHidratacaoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditHidratacaoModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditHidratacaoFormData>({
    resolver: zodResolver(editHidratacaoSchema),
  })

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        volumeMl: record.data.volumeMl || 200,
        tipo: record.data.tipo || '',
        observacoes: record.notes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditHidratacaoFormData) => {
    const payload = {
      time: data.time,
      data: {
        volumeMl: data.volumeMl,
        tipo: data.tipo,
      },
      notes: data.observacoes,
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
            Editar Hidratação
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
              {record && new Date(record.date).toLocaleDateString('pt-BR')}
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
              Volume (ml)
            </Label>
            <Input
              {...register('volumeMl')}
              type="number"
              className="mt-2"
              placeholder="200"
            />
            {errors.volumeMl && (
              <p className="text-sm text-danger mt-1">
                {errors.volumeMl.message}
              </p>
            )}
          </div>

          <div>
            <Label>Tipo</Label>
            <Input
              {...register('tipo')}
              className="mt-2"
              placeholder="Água, suco, chá..."
            />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2 resize-none"
              placeholder="Observações adicionais (opcional)"
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
