import React, { useMemo } from 'react'
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

const pesoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  peso: z
    .string()
    .min(1, 'Peso é obrigatório')
    .refine(
      (val) => {
        const num = parseFloat(val.replace(',', '.'))
        return !isNaN(num) && num > 0 && num < 500
      },
      { message: 'Peso deve ser entre 0 e 500 kg' }
    ),
  altura: z.string().optional(),
  observacoes: z.string().optional(),
})

type PesoFormData = z.infer<typeof pesoSchema>

interface PesoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function PesoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: PesoModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PesoFormData>({
    resolver: zodResolver(pesoSchema),
    defaultValues: {
      time: getCurrentTimeLocal(),
    },
  })

  const watchPeso = watch('peso')
  const watchAltura = watch('altura')

  const imc = useMemo(() => {
    if (!watchPeso || !watchAltura) return null

    const pesoNum = parseFloat(watchPeso.replace(',', '.'))
    const alturaNum = parseFloat(watchAltura.replace(',', '.'))

    if (isNaN(pesoNum) || isNaN(alturaNum) || alturaNum === 0) return null

    // Altura em metros
    const alturaMetros = alturaNum / 100
    const imcValue = pesoNum / (alturaMetros * alturaMetros)

    return imcValue
  }, [watchPeso, watchAltura])

  const imcClassificacao = useMemo(() => {
    if (!imc) return null

    if (imc < 18.5) return { texto: 'Baixo peso', cor: 'text-yellow-600' }
    if (imc < 25) return { texto: 'Peso normal', cor: 'text-green-600' }
    if (imc < 30) return { texto: 'Sobrepeso', cor: 'text-orange-600' }
    return { texto: 'Obesidade', cor: 'text-red-600' }
  }, [imc])

  const handleFormSubmit = (data: PesoFormData) => {
    const pesoNum = parseFloat(data.peso.replace(',', '.'))
    const alturaNum = data.altura ? parseFloat(data.altura.replace(',', '.')) : undefined

    const payload = {
      residentId,
      type: 'PESO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        peso: pesoNum,
        altura: alturaNum,
        imc: imc || undefined,
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
          <DialogTitle>Peso e Altura - {residentName}</DialogTitle>
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
              Peso (kg)
            </Label>
            <Input
              {...register('peso')}
              type="text"
              placeholder="Ex: 65.5"
              className="mt-2"
            />
            {errors.peso && (
              <p className="text-sm text-danger mt-1">{errors.peso.message}</p>
            )}
          </div>

          <div>
            <Label>Altura (cm)</Label>
            <Input
              {...register('altura')}
              type="text"
              placeholder="Ex: 170"
              className="mt-2"
            />
            {errors.altura && (
              <p className="text-sm text-danger mt-1">
                {errors.altura.message}
              </p>
            )}
          </div>

          {imc && imcClassificacao && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">
                IMC:{' '}
                <span className="text-primary">{imc.toFixed(1)} kg/m²</span>
              </p>
              <p className="text-sm">
                Classificação:{' '}
                <span className={`font-medium ${imcClassificacao.cor}`}>
                  {imcClassificacao.texto}
                </span>
              </p>
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2"
              placeholder="Observações adicionais sobre peso/altura..."
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
