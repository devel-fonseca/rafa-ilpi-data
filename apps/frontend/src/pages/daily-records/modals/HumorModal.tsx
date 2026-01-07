import React from 'react'
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

const humorSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  humor: z.string().min(1, 'Humor é obrigatório'),
  outroHumor: z.string().optional(),
  observacoes: z.string().optional(),
})

type HumorFormData = z.infer<typeof humorSchema>

interface HumorModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function HumorModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: HumorModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<HumorFormData>({
    resolver: zodResolver(humorSchema),
    defaultValues: {
      time: getCurrentTime(),
      humor: '',
      outroHumor: '',
      observacoes: '',
    },
  })

  const watchHumor = watch('humor')

  const handleFormSubmit = (data: HumorFormData) => {
    const payload = {
      residentId,
      type: 'HUMOR',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        humor: data.humor,
        outroHumor: data.humor === 'Outro' ? data.outroHumor : undefined,
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
          <DialogTitle>Avaliação de Humor - {residentName}</DialogTitle>
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
              Humor
            </Label>
            <Controller
              name="humor"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Eutímico">Eutímico</SelectItem>
                    <SelectItem value="Disfórico">Disfórico</SelectItem>
                    <SelectItem value="Deprimido">Deprimido</SelectItem>
                    <SelectItem value="Elevado">Elevado</SelectItem>
                    <SelectItem value="Irritável">Irritável</SelectItem>
                    <SelectItem value="Lábil">Lábil</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.humor && (
              <p className="text-sm text-danger mt-1">
                {errors.humor.message}
              </p>
            )}
          </div>

          {watchHumor === 'Outro' && (
            <div>
              <Label>Especificar outro humor</Label>
              <Input
                {...register('outroHumor')}
                className="mt-2"
                placeholder="Descreva o humor"
              />
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2"
              placeholder="Observações adicionais sobre o humor..."
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
