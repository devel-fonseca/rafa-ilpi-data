import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getCurrentTimeLocal } from '@/utils/timezone'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
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

const atividadesSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  atividade: z.string().min(1, 'Atividade é obrigatória'),
  participacao: z.string().optional(),
})

type AtividadesFormData = z.infer<typeof atividadesSchema>

interface AtividadesModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function AtividadesModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: AtividadesModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AtividadesFormData>({
    resolver: zodResolver(atividadesSchema),
    defaultValues: {
      time: getCurrentTimeLocal(),
    },
  })

  const handleFormSubmit = (data: AtividadesFormData) => {
    const payload = {
      residentId,
      type: 'ATIVIDADES',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        atividade: data.atividade,
        participacao: data.participacao,
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
          <DialogTitle>Atividades Coletivas - {residentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Data: {formatDateOnlySafe(date)}
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
              Atividade
            </Label>
            <Input
              {...register('atividade')}
              className="mt-2"
              placeholder="Ex: Música na sala"
            />
            {errors.atividade && (
              <p className="text-sm text-danger mt-1">
                {errors.atividade.message}
              </p>
            )}
          </div>

          <div>
            <Label>Participação</Label>
            <Textarea
              {...register('participacao')}
              rows={3}
              className="mt-2"
              placeholder="Ex: Participou ativamente, cantou junto"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Responsável: <span className="font-medium">{currentUserName}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="success">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
