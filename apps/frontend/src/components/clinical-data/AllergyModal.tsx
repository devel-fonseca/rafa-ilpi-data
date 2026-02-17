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
  useCreateAllergy,
  useUpdateAllergy,
} from '@/hooks/useAllergies'
import type { Allergy, AllergySeverity } from '@/api/allergies.api'
import { ClinicalRecordSheet } from './ClinicalRecordSheet'

const allergySchema = z.object({
  substance: z.string().min(1, 'Substância é obrigatória'),
  reaction: z.string().optional(),
  severity: z.enum(['LEVE', 'MODERADA', 'GRAVE', 'ANAFILAXIA']).optional(),
  notes: z.string().optional(),
  contraindications: z.string().optional(),
  changeReason: z.string().optional(),
})

type AllergyFormData = z.infer<typeof allergySchema>

interface AllergyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  allergy?: Allergy
}

export function AllergyModal({
  open,
  onOpenChange,
  residentId,
  allergy,
}: AllergyModalProps) {
  const isEditing = !!allergy

  const createMutation = useCreateAllergy()
  const updateMutation = useUpdateAllergy()

  const isLoading = createMutation.isPending || updateMutation.isPending
  const formId = 'allergy-form'

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<AllergyFormData>({
    resolver: zodResolver(allergySchema),
    defaultValues: {
      substance: allergy?.substance || '',
      reaction: allergy?.reaction || '',
      severity: allergy?.severity || undefined,
      notes: allergy?.notes || '',
      contraindications: allergy?.contraindications || '',
      changeReason: '',
    },
  })

  useEffect(() => {
    if (open && allergy) {
      reset({
        substance: allergy.substance,
        reaction: allergy.reaction || '',
        severity: allergy.severity || undefined,
        notes: allergy.notes || '',
        contraindications: allergy.contraindications || '',
        changeReason: '',
      })
    } else if (open && !allergy) {
      reset({
        substance: '',
        reaction: '',
        severity: undefined,
        notes: '',
        contraindications: '',
        changeReason: '',
      })
    }
  }, [open, allergy, reset])

  const onSubmit = async (data: AllergyFormData) => {
    try {
      if (isEditing && allergy) {
        const reason = data.changeReason?.trim() || ''
        if (reason.length < 10) {
          setError('changeReason', {
            type: 'manual',
            message: 'O motivo da edição deve ter pelo menos 10 caracteres',
          })
          return
        }

        await updateMutation.mutateAsync({
          id: allergy.id,
          data: {
            substance: data.substance,
            reaction: data.reaction || undefined,
            severity: data.severity || undefined,
            notes: data.notes || undefined,
            contraindications: data.contraindications || undefined,
            changeReason: reason,
          },
        })
      } else {
        await createMutation.mutateAsync({
          residentId,
          substance: data.substance,
          reaction: data.reaction || undefined,
          severity: data.severity || undefined,
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
      title={isEditing ? 'Editar Alergia' : 'Registrar Nova Alergia'}
      description="Registro de alergias e reações adversas"
      formId={formId}
      isLoading={isLoading}
      isEditing={isEditing}
      createActionLabel="Registrar Alergia"
      editActionLabel="Salvar Alterações"
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="substance">
              Substância <span className="text-destructive">*</span>
            </Label>
            <Input
              id="substance"
              {...register('substance')}
              placeholder="Ex: Penicilina, Látex, Amendoim..."
              disabled={isLoading}
            />
            {errors.substance && (
              <p className="text-sm text-destructive mt-1">
                {errors.substance.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="severity">Gravidade</Label>
            <Controller
              name="severity"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || ''}
                  onValueChange={(value) => field.onChange(value as AllergySeverity)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a gravidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEVE">Leve</SelectItem>
                    <SelectItem value="MODERADA">Moderada</SelectItem>
                    <SelectItem value="GRAVE">Grave</SelectItem>
                    <SelectItem value="ANAFILAXIA">Anafilaxia</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.severity && (
              <p className="text-sm text-destructive mt-1">
                {errors.severity.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="reaction">Reação</Label>
            <Textarea
              id="reaction"
              {...register('reaction')}
              placeholder="Descreva a reação alérgica..."
              className="min-h-[80px]"
              disabled={isLoading}
            />
            {errors.reaction && (
              <p className="text-sm text-destructive mt-1">
                {errors.reaction.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Informações adicionais..."
              className="min-h-[80px]"
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
              placeholder="Ex: Evitar dipirona e anti-inflamatórios não esteroidais..."
              className="min-h-[80px]"
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
