import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const comportamentoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  estadoEmocional: z.string().min(1, 'Estado emocional é obrigatório'),
  outroEstado: z.string().optional(),
  observacoes: z.string().optional(),
})

type ComportamentoFormData = z.infer<typeof comportamentoSchema>

interface ComportamentoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function ComportamentoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: ComportamentoModalProps) {
  const [estadoEmocional, setEstadoEmocional] = useState('')

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<ComportamentoFormData>({
    resolver: zodResolver(comportamentoSchema),
    defaultValues: {
      time: getCurrentTime(),
    },
  })

  const watchEstadoEmocional = watch('estadoEmocional')

  const handleFormSubmit = (data: ComportamentoFormData) => {
    const payload = {
      residentId,
      type: 'COMPORTAMENTO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        estadoEmocional: data.estadoEmocional,
        outroEstado: data.estadoEmocional === 'Outro' ? data.outroEstado : undefined,
        observacoes: data.observacoes,
      },
    }
    onSubmit(payload)
    reset()
    setEstadoEmocional('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Estado Emocional - {residentName}</DialogTitle>
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
              Estado Emocional Relatado
            </Label>
            <Controller
              name="estadoEmocional"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Calmo">Calmo</SelectItem>
                    <SelectItem value="Ansioso">Ansioso</SelectItem>
                    <SelectItem value="Triste">Triste</SelectItem>
                    <SelectItem value="Eufórico">Eufórico</SelectItem>
                    <SelectItem value="Irritado">Irritado</SelectItem>
                    <SelectItem value="Apático">Apático</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.estadoEmocional && (
              <p className="text-sm text-danger mt-1">
                {errors.estadoEmocional.message}
              </p>
            )}
          </div>

          {watchEstadoEmocional === 'Outro' && (
            <div>
              <Label>Especificar outro estado</Label>
              <Input
                {...register('outroEstado')}
                className="mt-2"
                placeholder="Descreva o estado emocional"
              />
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2"
              placeholder="Observações adicionais sobre o comportamento..."
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
