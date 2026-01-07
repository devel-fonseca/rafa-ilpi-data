import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getCurrentTime } from '@/utils/dateHelpers'
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

const hidratacaoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  volumeMl: z.coerce
    .number({ required_error: 'Volume é obrigatório' })
    .positive('Volume deve ser maior que zero')
    .max(5000, 'Volume máximo: 5000ml'),
  tipo: z.string().optional(),
})

type HidratacaoFormData = z.infer<typeof hidratacaoSchema>

interface HidratacaoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function HidratacaoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: HidratacaoModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<HidratacaoFormData>({
    resolver: zodResolver(hidratacaoSchema),
    defaultValues: {
      time: getCurrentTime(),
      volumeMl: 200,
      tipo: 'Água',
    },
  })

  const handleFormSubmit = (data: HidratacaoFormData) => {
    const payload = {
      residentId,
      type: 'HIDRATACAO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        volumeMl: data.volumeMl, // Já vem como número do Zod
        tipo: data.tipo,
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
          <DialogTitle>Hidratação - {residentName}</DialogTitle>
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
