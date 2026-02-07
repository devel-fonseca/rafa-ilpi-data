import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getCurrentTime, formatDateOnlySafe } from '@/utils/dateHelpers'
import type { CreateDailyRecordInput, PesoData } from '@/types/daily-records'
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
  altura: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true
        const num = parseFloat(val)
        return !isNaN(num) && num > 0 && num <= 300
      },
      { message: 'Altura deve ser entre 1 e 300 cm' }
    ),
  observacoes: z.string().optional(),
})

type PesoFormData = z.infer<typeof pesoSchema>

interface PesoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateDailyRecordInput<PesoData>) => void
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
      time: getCurrentTime(),
      peso: '',
      altura: '',
      observacoes: '',
    },
  })

  const watchPeso = watch('peso')
  const watchAltura = watch('altura')

  const imc = useMemo(() => {
    if (!watchPeso || !watchAltura) return null

    // Peso com vírgula (ex: "65,5")
    const pesoNum = parseFloat(watchPeso.replace(',', '.'))

    // Altura em centímetros inteiros (ex: "170")
    const alturaCm = parseFloat(watchAltura)

    if (isNaN(pesoNum) || isNaN(alturaCm) || alturaCm === 0) return null

    // Converte altura de cm para metros
    const alturaMetros = alturaCm / 100
    const imcValue = pesoNum / (alturaMetros * alturaMetros)

    return imcValue
  }, [watchPeso, watchAltura])

  const imcClassificacao = useMemo(() => {
    if (!imc) return null

    if (imc < 18.5) return { texto: 'Baixo peso', cor: 'text-warning' }
    if (imc < 25) return { texto: 'Peso normal', cor: 'text-success' }
    if (imc < 30) return { texto: 'Sobrepeso', cor: 'text-severity-warning' }
    return { texto: 'Obesidade', cor: 'text-danger' }
  }, [imc])

  const handleFormSubmit = (data: PesoFormData) => {
    const pesoNum = parseFloat(data.peso.replace(',', '.'))

    // Converter altura de centímetros para metros (padrão do banco)
    // Ex: 170cm → 1.70m
    const alturaMetros = data.altura ? parseFloat(data.altura) / 100 : undefined

    const payload: CreateDailyRecordInput<PesoData> = {
      residentId,
      type: 'PESO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        peso: pesoNum,
        altura: alturaMetros, // Salvar em METROS
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
              placeholder="Ex: 655"
              className="mt-2"
              onChange={(e) => {
                // Remove tudo que não é dígito
                const value = e.target.value.replace(/\D/g, '')

                // Limita a 4 dígitos (máximo 500 kg = 5000)
                const limited = value.slice(0, 4)

                // Formata com vírgula se tiver mais de 1 dígito
                let formatted = limited
                if (limited.length > 1) {
                  const intPart = limited.slice(0, -1)
                  const decPart = limited.slice(-1)
                  formatted = `${intPart},${decPart}`
                }

                e.target.value = formatted
                register('peso').onChange(e)
              }}
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
              inputMode="numeric"
              placeholder="Ex: 170"
              className="mt-2"
              onChange={(e) => {
                // Remove tudo que não é dígito
                const value = e.target.value.replace(/\D/g, '')

                // Limita a 3 dígitos (máximo 300 cm)
                const limited = value.slice(0, 3)

                // Mantém apenas números inteiros (centímetros)
                e.target.value = limited
                register('altura').onChange(e)
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Digite apenas centímetros (Ex: 170 para 1,70m)
            </p>
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
