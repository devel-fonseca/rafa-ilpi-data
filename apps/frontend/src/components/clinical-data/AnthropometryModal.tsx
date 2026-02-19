import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import {
  useCreateAnthropometry,
  useUpdateAnthropometry,
} from '@/hooks/useResidentHealth'
import type { ResidentAnthropometry } from '@/api/resident-health.api'
import {
  calculateBmiFromKgCm,
  centimetersToMeters,
  formatHeightCmInput,
  formatWeightInput,
  metersToCentimeters,
  parseHeightCmInput,
  parseWeightInput,
} from '@/utils/anthropometryInput'

const formSchema = z.object({
  heightCm: z
    .string()
    .min(1, 'Altura é obrigatória')
    .refine((val) => {
      const heightCm = parseHeightCmInput(val)
      return heightCm !== null && heightCm >= 50 && heightCm <= 250
    }, 'Altura deve ser entre 50 e 250 cm'),
  weight: z
    .string()
    .min(1, 'Peso é obrigatório')
    .refine((val) => {
      const weight = parseWeightInput(val)
      return weight !== null && weight >= 20 && weight <= 300
    }, 'Peso deve ser entre 20 e 300 kg'),
  measurementDate: z.string().min(1, 'Data da medição é obrigatória'),
  notes: z.string().optional(),
  changeReason: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AnthropometryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  anthropometry?: ResidentAnthropometry | null
  onSuccess?: () => void
}

export function AnthropometryModal({
  open,
  onOpenChange,
  residentId,
  anthropometry,
  onSuccess,
}: AnthropometryModalProps) {
  const isEditing = !!anthropometry

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      heightCm: '',
      weight: '',
      measurementDate: '',
      notes: '',
      changeReason: '',
    },
  })

  const createMutation = useCreateAnthropometry()
  const updateMutation = useUpdateAnthropometry()

  const isLoading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open && anthropometry) {
      reset({
        heightCm: String(metersToCentimeters(Number(anthropometry.height))),
        weight: formatWeightInput(String(anthropometry.weight).replace('.', ',')),
        measurementDate: anthropometry.measurementDate.split('T')[0],
        notes: anthropometry.notes || '',
        changeReason: '',
      })
    } else if (open && !anthropometry) {
      reset({
        heightCm: '',
        weight: '',
        measurementDate: new Date().toISOString().split('T')[0],
        notes: '',
      })
    }
  }, [open, anthropometry, reset])

  const onSubmit = async (data: FormData) => {
    const heightCm = parseHeightCmInput(data.heightCm)
    const weightKg = parseWeightInput(data.weight)
    if (heightCm === null || weightKg === null) return

    try {
      if (isEditing && anthropometry) {
        if (!data.changeReason || data.changeReason.length < 10) {
          return
        }
        await updateMutation.mutateAsync({
          id: anthropometry.id,
          data: {
            height: centimetersToMeters(heightCm),
            weight: weightKg,
            measurementDate: data.measurementDate,
            notes: data.notes || undefined,
            changeReason: data.changeReason,
          },
        })
      } else {
        await createMutation.mutateAsync({
          residentId,
          height: centimetersToMeters(heightCm),
          weight: weightKg,
          measurementDate: data.measurementDate,
          notes: data.notes || undefined,
        })
      }
      onOpenChange(false)
      reset()
      onSuccess?.()
    } catch (error) {
      // Erro tratado pelo hook
    }
  }

  // Calcular IMC em tempo real
  const heightCm = watch('heightCm')
  const weight = watch('weight')
  const parsedHeightCm = parseHeightCmInput(heightCm)
  const parsedWeight = parseWeightInput(weight)
  const bmiValue =
    parsedHeightCm !== null && parsedWeight !== null
      ? calculateBmiFromKgCm(parsedWeight, parsedHeightCm)
      : null
  const bmi = bmiValue ? bmiValue.toFixed(1) : '0'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Medição Antropométrica' : 'Nova Medição Antropométrica'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Corrija os dados da medição'
              : 'Registre peso e altura do residente. O IMC será calculado automaticamente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heightCm">Altura (cm) *</Label>
              <Input
                id="heightCm"
                type="text"
                inputMode="numeric"
                placeholder="Ex: 170"
                {...register('heightCm')}
                onChange={(e) => {
                  e.target.value = formatHeightCmInput(e.target.value)
                  register('heightCm').onChange(e)
                }}
              />
              {errors.heightCm && (
                <p className="text-sm text-destructive">{errors.heightCm.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg) *</Label>
              <Input
                id="weight"
                type="text"
                inputMode="decimal"
                placeholder="Ex: 70,5"
                {...register('weight')}
                onChange={(e) => {
                  e.target.value = formatWeightInput(e.target.value)
                  register('weight').onChange(e)
                }}
              />
              {errors.weight && (
                <p className="text-sm text-destructive">{errors.weight.message}</p>
              )}
            </div>
          </div>

          {bmiValue !== null && (
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm font-medium">IMC Calculado</div>
              <div className="text-2xl font-bold">{bmi}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {Number(bmi) < 18.5
                  ? 'Abaixo do peso'
                  : Number(bmi) < 25
                    ? 'Normal'
                    : Number(bmi) < 30
                      ? 'Sobrepeso'
                      : 'Obesidade'}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="measurementDate">Data da Medição *</Label>
            <Input
              id="measurementDate"
              type="date"
              {...register('measurementDate')}
            />
            {errors.measurementDate && (
              <p className="text-sm text-destructive">{errors.measurementDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre a medição (ex: em jejum, pós-refeição)"
              {...register('notes')}
            />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="changeReason">Motivo da Alteração *</Label>
              <Textarea
                id="changeReason"
                placeholder="Descreva o motivo da correção (mínimo 10 caracteres)"
                {...register('changeReason')}
              />
              {errors.changeReason && (
                <p className="text-sm text-destructive">
                  {errors.changeReason.message}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                'Salvar Alterações'
              ) : (
                'Registrar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
