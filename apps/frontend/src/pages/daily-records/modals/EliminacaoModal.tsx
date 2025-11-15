import React from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const eliminacaoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  tipo: z.enum(['Urina', 'Fezes'], {
    required_error: 'Tipo é obrigatório',
  }),
  frequencia: z.string().optional(),
  consistencia: z.string().optional(),
  cor: z.string().optional(),
  volume: z.string().optional(),
})

type EliminacaoFormData = z.infer<typeof eliminacaoSchema>

interface EliminacaoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function EliminacaoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: EliminacaoModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<EliminacaoFormData>({
    resolver: zodResolver(eliminacaoSchema),
    defaultValues: {
      time: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  })

  const handleFormSubmit = (data: EliminacaoFormData) => {
    const payload = {
      residentId,
      type: 'ELIMINACAO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        tipo: data.tipo,
        frequencia: data.frequencia ? parseInt(data.frequencia) : undefined,
        consistencia: data.consistencia,
        cor: data.cor,
        volume: data.volume,
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
          <DialogTitle>Eliminações - {residentName}</DialogTitle>
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
              <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">
                Tipo
              </Label>
              <Controller
                name="tipo"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Urina">Urina</SelectItem>
                      <SelectItem value="Fezes">Fezes</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tipo && (
                <p className="text-sm text-red-500 mt-1">{errors.tipo.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Frequência</Label>
            <Input
              {...register('frequencia')}
              type="number"
              className="mt-2"
              placeholder="2"
            />
          </div>

          <div>
            <Label>Consistência/Cor</Label>
            <Input
              {...register('consistencia')}
              className="mt-2"
              placeholder="Pastosa, amarela..."
            />
          </div>

          <div>
            <Label>Cor</Label>
            <Input
              {...register('cor')}
              className="mt-2"
              placeholder="Amarela, clara..."
            />
          </div>

          <div>
            <Label>Volume</Label>
            <Input
              {...register('volume')}
              className="mt-2"
              placeholder="Normal, aumentado..."
            />
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
