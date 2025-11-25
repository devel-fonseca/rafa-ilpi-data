import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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

const outrosSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
})

type OutrosFormData = z.infer<typeof outrosSchema>

interface OutrosModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function OutrosModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: OutrosModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OutrosFormData>({
    resolver: zodResolver(outrosSchema),
    defaultValues: {
      time: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  })

  const handleFormSubmit = (data: OutrosFormData) => {
    const payload = {
      residentId,
      type: 'OUTROS',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        descricao: data.descricao,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Outros Registros - {residentName}</DialogTitle>
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
              rows={5}
              className="mt-2"
              placeholder="Descrição livre do registro"
            />
            {errors.descricao && (
              <p className="text-sm text-danger mt-1">
                {errors.descricao.message}
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
            <Button type="submit" variant="success">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
