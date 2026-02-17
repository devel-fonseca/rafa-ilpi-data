import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateDietaryRestriction,
  useUpdateDietaryRestriction,
} from '@/hooks/useDietaryRestrictions'
import type { DietaryRestriction, RestrictionType } from '@/api/dietary-restrictions.api'
import { ClinicalRecordSheet } from './ClinicalRecordSheet'

const dietaryRestrictionSchema = z.object({
  restrictionType: z.enum([
    'ALERGIA_ALIMENTAR',
    'INTOLERANCIA',
    'RESTRICAO_MEDICA',
    'RESTRICAO_RELIGIOSA',
    'DISFAGIA',
    'DIABETES',
    'HIPERTENSAO',
    'OUTRA',
  ]),
  description: z.string().min(1, 'Descrição é obrigatória'),
  notes: z.string().optional(),
  contraindications: z.string().optional(),
  changeReason: z.string().optional(),
})

type DietaryRestrictionFormData = z.infer<typeof dietaryRestrictionSchema>

interface DietaryRestrictionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  restriction?: DietaryRestriction
}

export function DietaryRestrictionModal({
  open,
  onOpenChange,
  residentId,
  restriction,
}: DietaryRestrictionModalProps) {
  const isEditing = !!restriction

  const createMutation = useCreateDietaryRestriction()
  const updateMutation = useUpdateDietaryRestriction()

  const isLoading = createMutation.isPending || updateMutation.isPending
  const formId = 'dietary-restriction-form'

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<DietaryRestrictionFormData>({
    resolver: zodResolver(dietaryRestrictionSchema),
    defaultValues: {
      restrictionType: restriction?.restrictionType || 'RESTRICAO_MEDICA',
      description: restriction?.description || '',
      notes: restriction?.notes || '',
      contraindications: restriction?.contraindications || '',
      changeReason: '',
    },
  })

  useEffect(() => {
    if (open && restriction) {
      reset({
        restrictionType: restriction.restrictionType,
        description: restriction.description,
        notes: restriction.notes || '',
        contraindications: restriction.contraindications || '',
        changeReason: '',
      })
    } else if (open && !restriction) {
      reset({
        restrictionType: 'RESTRICAO_MEDICA',
        description: '',
        notes: '',
        contraindications: '',
        changeReason: '',
      })
    }
  }, [open, restriction, reset])

  const onSubmit = async (data: DietaryRestrictionFormData) => {
    try {
      if (isEditing && restriction) {
        const reason = data.changeReason?.trim() || ''
        if (reason.length < 10) {
          setError('changeReason', {
            type: 'manual',
            message: 'O motivo da edição deve ter pelo menos 10 caracteres',
          })
          return
        }

        await updateMutation.mutateAsync({
          id: restriction.id,
          data: {
            restrictionType: data.restrictionType,
            description: data.description,
            notes: data.notes?.trim() ? data.notes.trim() : null,
            contraindications: data.contraindications?.trim()
              ? data.contraindications.trim()
              : null,
            changeReason: reason,
          },
        })
      } else {
        await createMutation.mutateAsync({
          residentId,
          restrictionType: data.restrictionType,
          description: data.description,
          notes: data.notes?.trim() ? data.notes.trim() : null,
          contraindications: data.contraindications?.trim()
            ? data.contraindications.trim()
            : null,
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
      title={isEditing ? 'Editar Restrição Alimentar' : 'Registrar Nova Restrição Alimentar'}
      description="Restrições dietéticas e orientações nutricionais"
      formId={formId}
      isLoading={isLoading}
      isEditing={isEditing}
      createActionLabel="Registrar Restrição"
      editActionLabel="Salvar Alterações"
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="restrictionType">
              Tipo de Restrição <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="restrictionType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as RestrictionType)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALERGIA_ALIMENTAR">Alergia Alimentar</SelectItem>
                    <SelectItem value="INTOLERANCIA">Intolerância</SelectItem>
                    <SelectItem value="RESTRICAO_MEDICA">Restrição Médica</SelectItem>
                    <SelectItem value="RESTRICAO_RELIGIOSA">Restrição Religiosa</SelectItem>
                    <SelectItem value="DISFAGIA">Disfagia</SelectItem>
                    <SelectItem value="DIABETES">Diabetes</SelectItem>
                    <SelectItem value="HIPERTENSAO">Hipertensão</SelectItem>
                    <SelectItem value="OUTRA">Outra</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.restrictionType && (
              <p className="text-sm text-destructive mt-1">
                {errors.restrictionType.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Input
              id="description"
              {...register('description')}
              placeholder="Ex: Sem glúten, Dieta hipossódica, Textura pastosa..."
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Observações do Nutricionista</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Orientações nutricionais adicionais..."
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
              placeholder="Ex: Evitar embutidos, ultraprocessados e adição de sal..."
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
