import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useCreateClinicalProfile,
  useUpdateClinicalProfile,
} from '@/hooks/useClinicalProfiles'
import type { ClinicalProfile } from '@/api/clinical-profiles.api'

const clinicalProfileSchema = z.object({
  healthStatus: z.string().optional(),
  specialNeeds: z.string().optional(),
  functionalAspects: z.string().optional(),
  mobilityAid: z.boolean().optional(),
  changeReason: z.string().optional(),
})

type ClinicalProfileFormData = z.infer<typeof clinicalProfileSchema>

interface EditClinicalProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  profile?: ClinicalProfile | null
  currentMobilityAid?: boolean | null
}

export function EditClinicalProfileModal({
  open,
  onOpenChange,
  residentId,
  profile,
  currentMobilityAid,
}: EditClinicalProfileModalProps) {
  // Considera "edição" se o perfil clínico já existe
  const isEditing = !!profile

  const createMutation = useCreateClinicalProfile()
  const updateMutation = useUpdateClinicalProfile()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    watch,
    setValue,
  } = useForm<ClinicalProfileFormData>({
    resolver: zodResolver(clinicalProfileSchema),
    defaultValues: {
      healthStatus: profile?.healthStatus || '',
      specialNeeds: profile?.specialNeeds || '',
      functionalAspects: profile?.functionalAspects || '',
      mobilityAid: currentMobilityAid ?? false,
      changeReason: '',
    },
  })

  const mobilityAidValue = watch('mobilityAid')

  useEffect(() => {
    if (open) {
      reset({
        healthStatus: profile?.healthStatus || '',
        specialNeeds: profile?.specialNeeds || '',
        functionalAspects: profile?.functionalAspects || '',
        mobilityAid: currentMobilityAid ?? false,
        changeReason: '',
      })
    }
  }, [open, profile, currentMobilityAid, reset])

  const onSubmit = async (data: ClinicalProfileFormData) => {
    try {
      if (isEditing && profile) {
        // Validação manual do changeReason (RDC 502/2021)
        const trimmedReason = data.changeReason?.trim() || ''
        if (!trimmedReason || trimmedReason.length < 10) {
          setError('changeReason', {
            type: 'manual',
            message: 'Motivo da alteração deve ter no mínimo 10 caracteres (sem contar espaços)',
          })
          return
        }

        await updateMutation.mutateAsync({
          id: profile.id,
          data: {
            healthStatus: data.healthStatus || undefined,
            specialNeeds: data.specialNeeds || undefined,
            functionalAspects: data.functionalAspects || undefined,
            mobilityAid: data.mobilityAid,
            changeReason: trimmedReason,
          },
        })
      } else {
        // Criação sem changeReason (mobilityAid não faz parte do ClinicalProfile, está no Resident)
        await createMutation.mutateAsync({
          residentId,
          healthStatus: data.healthStatus || undefined,
          specialNeeds: data.specialNeeds || undefined,
          functionalAspects: data.functionalAspects || undefined,
        })
      }

      onOpenChange(false)
    } catch (error) {
      // Erro já tratado pelo hook com toast
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar' : 'Adicionar'} Perfil Clínico
          </DialogTitle>
          <DialogDescription>
            Informações clínicas completas do residente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Estado de Saúde */}
          <div>
            <Label htmlFor="healthStatus">Estado de Saúde</Label>
            <Textarea
              id="healthStatus"
              {...register('healthStatus')}
              placeholder="Hipertensão arterial sistêmica e diabetes tipo 2 controlados. Histórico de AVC isquêmico em 2021, sem sequelas motoras significativas. Necessita acompanhamento periódico de enfermagem e controle de sinais vitais."
              className="min-h-[100px] placeholder:italic"
              disabled={isLoading}
            />
            {errors.healthStatus && (
              <p className="text-sm text-destructive mt-1">{errors.healthStatus.message}</p>
            )}
          </div>

          {/* Necessidades Especiais */}
          <div>
            <Label htmlFor="specialNeeds">Necessidades Especiais</Label>
            <Textarea
              id="specialNeeds"
              {...register('specialNeeds')}
              placeholder="Necessita auxílio parcial para banho e higiene pessoal. Apresenta déficit visual importante e utiliza óculos. Requer supervisão contínua para prevenção de quedas."
              className="min-h-[100px] placeholder:italic"
              disabled={isLoading}
            />
            {errors.specialNeeds && (
              <p className="text-sm text-destructive mt-1">{errors.specialNeeds.message}</p>
            )}
          </div>

          {/* Aspectos Funcionais */}
          <div>
            <Label htmlFor="functionalAspects">Aspectos Funcionais</Label>
            <Textarea
              id="functionalAspects"
              {...register('functionalAspects')}
              placeholder="Deambula com uso de andador. Alimenta-se de forma independente. Necessita auxílio para vestir-se e para transferências da cama para a cadeira."
              className="min-h-[100px] placeholder:italic"
              disabled={isLoading}
            />
            {errors.functionalAspects && (
              <p className="text-sm text-destructive mt-1">
                {errors.functionalAspects.message}
              </p>
            )}
          </div>

          {/* Checkbox - Necessita Auxílio para Mobilidade */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mobilityAid"
              checked={mobilityAidValue}
              onCheckedChange={(checked) => setValue('mobilityAid', checked as boolean)}
              disabled={isLoading}
            />
            <Label
              htmlFor="mobilityAid"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Necessita auxílio para mobilidade
            </Label>
          </div>

          {/* Card Destacado - RDC 502/2021 (apenas para edição) */}
          {isEditing && (
            <div className="bg-warning/5 dark:bg-warning/90/20 border border-warning/30 dark:border-warning/80 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 text-warning dark:text-warning/40 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-warning/90 dark:text-warning/20">
                    Rastreabilidade Obrigatória (RDC 502/2021 Art. 39)
                  </p>
                  <p className="text-xs text-warning/80 dark:text-warning/30 mt-1">
                    Toda alteração de registro deve ter justificativa documentada para fins de
                    auditoria e conformidade regulatória.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="changeReason"
                  className="text-sm font-semibold text-warning/95 dark:text-warning/10"
                >
                  Motivo da Alteração <span className="text-danger">*</span>
                </Label>
                <Textarea
                  id="changeReason"
                  {...register('changeReason')}
                  placeholder="Ex: Atualização do perfil clínico após avaliação médica..."
                  className={`min-h-[100px] ${errors.changeReason ? 'border-danger focus:border-danger' : ''}`}
                  disabled={isLoading}
                  onChange={(e) => {
                    register('changeReason').onChange(e)
                    clearErrors('changeReason')
                  }}
                />
                {errors.changeReason && (
                  <p className="text-sm text-danger mt-2">{errors.changeReason.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Mínimo de 10 caracteres. Este motivo ficará registrado permanentemente no
                  histórico de alterações.
                </p>
              </div>
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
              {isEditing ? 'Salvar Alterações' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
