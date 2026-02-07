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

const formSchema = z.object({
  height: z.number().min(0.5, 'Altura mínima é 0.5m').max(2.5, 'Altura máxima é 2.5m'),
  weight: z.number().min(20, 'Peso mínimo é 20kg').max(300, 'Peso máximo é 300kg'),
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
}

export function AnthropometryModal({
  open,
  onOpenChange,
  residentId,
  anthropometry,
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
      height: 0,
      weight: 0,
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
        height: Number(anthropometry.height),
        weight: Number(anthropometry.weight),
        measurementDate: anthropometry.measurementDate.split('T')[0],
        notes: anthropometry.notes || '',
        changeReason: '',
      })
    } else if (open && !anthropometry) {
      reset({
        height: 0,
        weight: 0,
        measurementDate: new Date().toISOString().split('T')[0],
        notes: '',
      })
    }
  }, [open, anthropometry, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && anthropometry) {
        if (!data.changeReason || data.changeReason.length < 10) {
          return
        }
        await updateMutation.mutateAsync({
          id: anthropometry.id,
          data: {
            height: data.height,
            weight: data.weight,
            measurementDate: data.measurementDate,
            notes: data.notes || undefined,
            changeReason: data.changeReason,
          },
        })
      } else {
        await createMutation.mutateAsync({
          residentId,
          height: data.height,
          weight: data.weight,
          measurementDate: data.measurementDate,
          notes: data.notes || undefined,
        })
      }
      onOpenChange(false)
      reset()
    } catch (error) {
      // Erro tratado pelo hook
    }
  }

  // Calcular IMC em tempo real
  const height = watch('height')
  const weight = watch('weight')
  const bmi = height > 0 ? (weight / (height * height)).toFixed(1) : '0'

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
              <Label htmlFor="height">Altura (metros) *</Label>
              <Input
                id="height"
                type="number"
                step="0.01"
                placeholder="Ex: 1.65"
                {...register('height', { valueAsNumber: true })}
              />
              {errors.height && (
                <p className="text-sm text-destructive">{errors.height.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg) *</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="Ex: 70.5"
                {...register('weight', { valueAsNumber: true })}
              />
              {errors.weight && (
                <p className="text-sm text-destructive">{errors.weight.message}</p>
              )}
            </div>
          </div>

          {height > 0 && weight > 0 && (
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
