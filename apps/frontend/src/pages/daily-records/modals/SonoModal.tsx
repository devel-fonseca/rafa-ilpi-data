import React from 'react'
import { useForm, Controller } from 'react-hook-form'
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

const sonoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  padraoSono: z.string().min(1, 'Padrão de sono é obrigatório'),
  outroPadrao: z.string().optional(),
  observacoes: z.string().optional(),
})

type SonoFormData = z.infer<typeof sonoSchema>

interface SonoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function SonoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: SonoModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<SonoFormData>({
    resolver: zodResolver(sonoSchema),
    defaultValues: {
      time: getCurrentTimeLocal(),
      padraoSono: '',
      outroPadrao: '',
      observacoes: '',
    },
  })

  const watchPadraoSono = watch('padraoSono')

  const handleFormSubmit = (data: SonoFormData) => {
    const payload = {
      residentId,
      type: 'SONO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        padraoSono: data.padraoSono,
        outroPadrao: data.padraoSono === 'Outro' ? data.outroPadrao : undefined,
        observacoes: data.observacoes,
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
          <DialogTitle>Avaliação de Sono - {residentName}</DialogTitle>
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
              Padrão de Sono
            </Label>
            <Controller
              name="padraoSono"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Preservado">Preservado</SelectItem>
                    <SelectItem value="Insônia inicial">Insônia inicial</SelectItem>
                    <SelectItem value="Insônia intermediária">Insônia intermediária</SelectItem>
                    <SelectItem value="Insônia terminal">Insônia terminal</SelectItem>
                    <SelectItem value="Hipersonia">Hipersonia</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.padraoSono && (
              <p className="text-sm text-danger mt-1">
                {errors.padraoSono.message}
              </p>
            )}
          </div>

          {watchPadraoSono === 'Outro' && (
            <div>
              <Label>Especificar outro padrão</Label>
              <Input
                {...register('outroPadrao')}
                className="mt-2"
                placeholder="Descreva o padrão de sono"
              />
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2"
              placeholder="Observações adicionais sobre o sono..."
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
