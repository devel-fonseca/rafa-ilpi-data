import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit } from 'lucide-react'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const editPesoSchema = z.object({
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
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditPesoFormData = z.infer<typeof editPesoSchema>

interface PesoRecord {
  time: string
  data: Record<string, unknown>
  [key: string]: unknown
}

interface EditPesoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: PesoRecord
  isUpdating?: boolean
}

export function EditPesoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditPesoModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<EditPesoFormData>({
    resolver: zodResolver(editPesoSchema),
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

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      // Formatar peso com vírgula para exibição
      const pesoFormatted = record.data.peso
        ? String(record.data.peso).replace('.', ',')
        : ''

      reset({
        time: record.time,
        peso: pesoFormatted,
        altura: record.data.altura ? String(record.data.altura) : '',
        observacoes: record.data.observacoes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditPesoFormData) => {
    const pesoNum = parseFloat(data.peso.replace(',', '.'))
    const alturaCm = data.altura ? parseFloat(data.altura) : undefined

    const payload = {
      time: data.time,
      data: {
        peso: pesoNum,
        altura: alturaCm,
        imc: imc || undefined,
        observacoes: data.observacoes,
      },
      notes: '',
      editReason: data.editReason,
    }
    onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Peso e Altura
          </DialogTitle>
          <DialogDescription>
            É obrigatório informar o motivo da edição para auditoria.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Box com info do registro original */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <span className="font-medium">Registrado por:</span>{' '}
              {record?.recordedBy}
            </p>
            <p className="text-sm">
              <span className="font-medium">Data:</span>{' '}
              {record && formatDateOnlySafe(record.date)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Horário original:</span> {record?.time}
            </p>
          </div>

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
              placeholder="Ex: 65,5"
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
              className="mt-2 resize-none"
              placeholder="Observações adicionais sobre peso/altura..."
            />
          </div>

          {/* Campo de motivo OBRIGATÓRIO */}
          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Motivo da edição
            </Label>
            <Textarea
              {...register('editReason')}
              rows={4}
              className="mt-2 resize-none"
              placeholder="Descreva o motivo da edição (mínimo 10 caracteres)..."
            />
            {errors.editReason && (
              <p className="text-sm text-danger mt-1">
                {errors.editReason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
