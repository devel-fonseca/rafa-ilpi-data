import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useCreateCondition,
  useUpdateCondition,
} from '@/hooks/useConditions'
import type { Condition } from '@/api/conditions.api'

const conditionSchema = z.object({
  condition: z.string().min(1, 'Condição é obrigatória'),
  icdCode: z.string().optional(),
  notes: z.string().optional(),
  contraindications: z.string().optional(),
  changeReason: z.string().optional(),
})

type ConditionFormData = z.infer<typeof conditionSchema>

interface ConditionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  condition?: Condition
}

export function ConditionModal({
  open,
  onOpenChange,
  residentId,
  condition,
}: ConditionModalProps) {
  const isEditing = !!condition

  const createMutation = useCreateCondition()
  const updateMutation = useUpdateCondition()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<ConditionFormData>({
    resolver: zodResolver(conditionSchema),
    defaultValues: {
      condition: condition?.condition || '',
      icdCode: condition?.icdCode || '',
      notes: condition?.notes || '',
      contraindications: condition?.contraindications || '',
      changeReason: '',
    },
  })

  useEffect(() => {
    if (open && condition) {
      reset({
        condition: condition.condition,
        icdCode: condition.icdCode || '',
        notes: condition.notes || '',
        contraindications: condition.contraindications || '',
        changeReason: '',
      })
    } else if (open && !condition) {
      reset({
        condition: '',
        icdCode: '',
        notes: '',
        contraindications: '',
        changeReason: '',
      })
    }
  }, [open, condition, reset])

  const onSubmit = async (data: ConditionFormData) => {
    try {
      if (isEditing && condition) {
        if (!data.changeReason?.trim()) {
          setError('changeReason', {
            type: 'manual',
            message: 'Motivo da edição é obrigatório',
          })
          return
        }

        await updateMutation.mutateAsync({
          id: condition.id,
          data: {
            condition: data.condition,
            icdCode: data.icdCode || undefined,
            notes: data.notes || undefined,
            contraindications: data.contraindications || undefined,
            changeReason: data.changeReason.trim(),
          },
        })
      } else {
        await createMutation.mutateAsync({
          residentId,
          condition: data.condition,
          icdCode: data.icdCode || undefined,
          notes: data.notes || undefined,
          contraindications: data.contraindications || undefined,
        })
      }

      onOpenChange(false)
    } catch (error) {
      // Erro já tratado pelo hook com toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Condição Crônica' : 'Registrar Nova Condição Crônica'}
          </DialogTitle>
          <DialogDescription>
            Registro de condições médicas e comorbidades
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="condition">
              Condição / Diagnóstico <span className="text-destructive">*</span>
            </Label>
            <Input
              id="condition"
              {...register('condition')}
              placeholder="Ex: Diabetes Mellitus Tipo 2, Hipertensão Arterial..."
              disabled={isLoading}
            />
            {errors.condition && (
              <p className="text-sm text-destructive mt-1">
                {errors.condition.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="icdCode">Código CID-10 (opcional)</Label>
            <Input
              id="icdCode"
              {...register('icdCode')}
              placeholder="Ex: E11.9, I10..."
              disabled={isLoading}
              maxLength={10}
            />
            {errors.icdCode && (
              <p className="text-sm text-destructive mt-1">
                {errors.icdCode.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Observações Clínicas</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Informações adicionais sobre a condição..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
            {errors.notes && (
              <p className="text-sm text-destructive mt-1">
                {errors.notes.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="contraindications">Contraindicações</Label>
            <Textarea
              id="contraindications"
              {...register('contraindications')}
              placeholder="Ex: Evitar sedativos sem avaliação médica prévia..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
            {errors.contraindications && (
              <p className="text-sm text-destructive mt-1">
                {errors.contraindications.message}
              </p>
            )}
          </div>

          {isEditing && (
            <div>
              <Label htmlFor="changeReason">
                Motivo da edição <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="changeReason"
                {...register('changeReason')}
                placeholder="Descreva o motivo da alteração deste registro..."
                className="min-h-[80px]"
                disabled={isLoading}
              />
              {errors.changeReason && (
                <p className="text-sm text-destructive mt-1">
                  {errors.changeReason.message}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Registrar Condição'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
