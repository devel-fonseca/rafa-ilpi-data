import React, { useEffect } from 'react'
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

const editIntercorrenciaSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  acaoTomada: z.string().min(1, 'Ação tomada é obrigatória'),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditIntercorrenciaFormData = z.infer<typeof editIntercorrenciaSchema>

interface EditIntercorrenciaModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  record: any
  isUpdating?: boolean
}

export function EditIntercorrenciaModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditIntercorrenciaModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditIntercorrenciaFormData>({
    resolver: zodResolver(editIntercorrenciaSchema),
  })

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        descricao: record.data.descricao || '',
        acaoTomada: record.data.acaoTomada || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditIntercorrenciaFormData) => {
    const payload = {
      time: data.time,
      data: {
        descricao: data.descricao,
        acaoTomada: data.acaoTomada,
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
            Editar Intercorrência
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
              Descrição
            </Label>
            <Textarea
              {...register('descricao')}
              rows={3}
              className="mt-2 resize-none"
              placeholder="Ex: Queixa de dor leve no joelho"
            />
            {errors.descricao && (
              <p className="text-sm text-danger mt-1">
                {errors.descricao.message}
              </p>
            )}
          </div>

          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Ação Tomada
            </Label>
            <Textarea
              {...register('acaoTomada')}
              rows={3}
              className="mt-2 resize-none"
              placeholder="Ex: Analgésico administrado (DIP 500mg)"
            />
            {errors.acaoTomada && (
              <p className="text-sm text-danger mt-1">
                {errors.acaoTomada.message}
              </p>
            )}
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
            <Button type="submit" variant="danger" disabled={isUpdating}>
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
