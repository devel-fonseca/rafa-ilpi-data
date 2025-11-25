import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getCurrentTimeLocal } from '@/utils/timezone'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const intercorrenciaSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  acaoTomada: z.string().min(1, 'Ação tomada é obrigatória'),
})

type IntercorrenciaFormData = z.infer<typeof intercorrenciaSchema>

interface IntercorrenciaModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function IntercorrenciaModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: IntercorrenciaModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IntercorrenciaFormData>({
    resolver: zodResolver(intercorrenciaSchema),
    defaultValues: {
      time: getCurrentTimeLocal(),
    },
  })

  const handleFormSubmit = (data: IntercorrenciaFormData) => {
    const payload = {
      residentId,
      type: 'INTERCORRENCIA',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        descricao: data.descricao,
        acaoTomada: data.acaoTomada,
      },
    }
    onSubmit(payload)
    reset()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Intercorrência - {residentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Data: {new Date(date).toLocaleDateString('pt-BR')}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
              className="mt-2"
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
              className="mt-2"
              placeholder="Ex: Analgésico administrado (DIP 500mg)"
            />
            {errors.acaoTomada && (
              <p className="text-sm text-danger mt-1">
                {errors.acaoTomada.message}
              </p>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Responsável: <span className="font-medium">{currentUserName}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger">
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
