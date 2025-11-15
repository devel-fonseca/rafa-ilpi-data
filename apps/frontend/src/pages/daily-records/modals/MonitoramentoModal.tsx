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

const monitoramentoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  pressaoArterial: z.string().optional(),
  temperatura: z.string().optional(),
  frequenciaCardiaca: z.string().optional(),
  saturacaoO2: z.string().optional(),
  glicemia: z.string().optional(),
})

type MonitoramentoFormData = z.infer<typeof monitoramentoSchema>

interface MonitoramentoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function MonitoramentoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: MonitoramentoModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MonitoramentoFormData>({
    resolver: zodResolver(monitoramentoSchema),
    defaultValues: {
      time: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  })

  const handleFormSubmit = (data: MonitoramentoFormData) => {
    const payload = {
      residentId,
      type: 'MONITORAMENTO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        pressaoArterial: data.pressaoArterial,
        temperatura: data.temperatura ? parseFloat(data.temperatura) : undefined,
        frequenciaCardiaca: data.frequenciaCardiaca
          ? parseInt(data.frequenciaCardiaca)
          : undefined,
        saturacaoO2: data.saturacaoO2
          ? parseInt(data.saturacaoO2)
          : undefined,
        glicemia: data.glicemia ? parseInt(data.glicemia) : undefined,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Monitoramento Vital - {residentName}</DialogTitle>
          <p className="text-sm text-gray-500">
            Data: {new Date(date).toLocaleDateString('pt-BR')}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                Horário
              </Label>
              <Input {...register('time')} type="time" className="mt-2" />
              {errors.time && (
                <p className="text-sm text-red-500 mt-1">{errors.time.message}</p>
              )}
            </div>

            <div>
              <Label>PA (mmHg)</Label>
              <Input
                {...register('pressaoArterial')}
                className="mt-2"
                placeholder="120/80"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Temp (°C)</Label>
              <Input
                {...register('temperatura')}
                type="number"
                step="0.1"
                className="mt-2"
                placeholder="36.5"
              />
            </div>

            <div>
              <Label>FC (bpm)</Label>
              <Input
                {...register('frequenciaCardiaca')}
                type="number"
                className="mt-2"
                placeholder="70"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SpO2 (%)</Label>
              <Input
                {...register('saturacaoO2')}
                type="number"
                className="mt-2"
                placeholder="96"
              />
            </div>

            <div>
              <Label>Glicemia (mg/dL)</Label>
              <Input
                {...register('glicemia')}
                type="number"
                className="mt-2"
                placeholder="95"
              />
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Responsável: <span className="font-medium">{currentUserName}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
