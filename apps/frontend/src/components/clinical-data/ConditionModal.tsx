import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateCondition,
  useUpdateCondition,
} from '@/hooks/useConditions'
import type { Condition } from '@/api/conditions.api'
import { ClinicalRecordSheet } from './ClinicalRecordSheet'

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
  const formId = 'condition-form'

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
        const reason = data.changeReason?.trim() || ''
        if (reason.length < 10) {
          setError('changeReason', {
            type: 'manual',
            message: 'O motivo da edição deve ter pelo menos 10 caracteres',
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
            changeReason: reason,
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
    <ClinicalRecordSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Editar Condição Crônica' : 'Registrar Nova Condição Crônica'}
      description="Registro de condições médicas e comorbidades"
      formId={formId}
      isLoading={isLoading}
      isEditing={isEditing}
      createActionLabel="Registrar Condição"
      editActionLabel="Salvar Alterações"
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <div className="bg-warning/5 dark:bg-warning/20 border border-warning/30 dark:border-warning/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-warning/90 dark:text-warning">
                    Este registro integra trilha de auditoria permanente
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O motivo da edição será registrado no histórico.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="changeReason">
                  Motivo da edição <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="changeReason"
                  {...register('changeReason')}
                  placeholder="Descreva o motivo da alteração (mínimo 10 caracteres)..."
                  className="min-h-[96px] mt-2 resize-none"
                  disabled={isLoading}
                />
                {errors.changeReason ? (
                  <p className="text-sm text-destructive mt-1">
                    {errors.changeReason.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    Campo obrigatório. A justificativa comporá o registro permanente da instituição.
                  </p>
                )}
              </div>
            </div>
          )}
      </form>
    </ClinicalRecordSheet>
  )
}
