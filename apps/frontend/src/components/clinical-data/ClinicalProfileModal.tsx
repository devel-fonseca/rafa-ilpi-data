import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  useCreateClinicalProfile,
  useUpdateClinicalProfile,
} from '@/hooks/useClinicalProfiles'
import type { ClinicalProfile } from '@/api/clinicalProfiles.api'

const clinicalProfileSchema = z.object({
  healthStatus: z.string().optional(),
  specialNeeds: z.string().optional(),
  functionalAspects: z.string().optional(),
  changeReason: z
    .string()
    .min(10, 'O motivo da alteração deve ter no mínimo 10 caracteres')
    .optional(), // Opcional no schema porque só é obrigatório na edição
})

type ClinicalProfileFormData = z.infer<typeof clinicalProfileSchema>

interface ClinicalProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  profile?: ClinicalProfile | null
  focusField?: 'healthStatus' | 'specialNeeds' | 'functionalAspects'
}

export function ClinicalProfileModal({
  open,
  onOpenChange,
  residentId,
  profile,
  focusField,
}: ClinicalProfileModalProps) {
  const isEditing = !!profile

  const createMutation = useCreateClinicalProfile()
  const updateMutation = useUpdateClinicalProfile()

  const isLoading = createMutation.isPending || updateMutation.isPending

  // Refs para foco automático nos campos
  const healthStatusRef = useRef<HTMLTextAreaElement>(null)
  const specialNeedsRef = useRef<HTMLTextAreaElement>(null)
  const functionalAspectsRef = useRef<HTMLTextAreaElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
    clearErrors,
  } = useForm<ClinicalProfileFormData>({
    resolver: zodResolver(clinicalProfileSchema),
    defaultValues: {
      healthStatus: profile?.healthStatus || '',
      specialNeeds: profile?.specialNeeds || '',
      functionalAspects: profile?.functionalAspects || '',
      changeReason: '',
    },
  })

  useEffect(() => {
    if (open && profile) {
      reset({
        healthStatus: profile.healthStatus || '',
        specialNeeds: profile.specialNeeds || '',
        functionalAspects: profile.functionalAspects || '',
        changeReason: '',
      })
    } else if (open && !profile) {
      reset({
        healthStatus: '',
        specialNeeds: '',
        functionalAspects: '',
        changeReason: '',
      })
    }

    // Foco automático no campo específico após o modal abrir
    if (open && focusField) {
      setTimeout(() => {
        if (focusField === 'healthStatus' && healthStatusRef.current) {
          healthStatusRef.current.focus()
        } else if (focusField === 'specialNeeds' && specialNeedsRef.current) {
          specialNeedsRef.current.focus()
        } else if (focusField === 'functionalAspects' && functionalAspectsRef.current) {
          functionalAspectsRef.current.focus()
        }
      }, 100)
    }
  }, [open, profile, reset, focusField])

  const onSubmit = async (data: ClinicalProfileFormData) => {
    try {
      if (isEditing && profile) {
        // Validação manual do changeReason na edição (RDC 502/2021)
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
            changeReason: trimmedReason,
          },
        })
      } else {
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Perfil Clínico' : 'Criar Perfil Clínico'}
          </DialogTitle>
          <DialogDescription>
            Estado de saúde e aspectos clínicos atuais do residente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="healthStatus">Estado de Saúde</Label>
            <Textarea
              id="healthStatus"
              {...register('healthStatus')}
              ref={healthStatusRef}
              placeholder="Descreva o estado de saúde atual..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
            {errors.healthStatus && (
              <p className="text-sm text-destructive mt-1">
                {errors.healthStatus.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="specialNeeds">Necessidades Especiais</Label>
            <Textarea
              id="specialNeeds"
              {...register('specialNeeds')}
              ref={specialNeedsRef}
              placeholder="Descreva as necessidades especiais..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
            {errors.specialNeeds && (
              <p className="text-sm text-destructive mt-1">
                {errors.specialNeeds.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="functionalAspects">Aspectos Funcionais</Label>
            <Textarea
              id="functionalAspects"
              {...register('functionalAspects')}
              ref={functionalAspectsRef}
              placeholder="Descreva os aspectos funcionais..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
            {errors.functionalAspects && (
              <p className="text-sm text-destructive mt-1">
                {errors.functionalAspects.message}
              </p>
            )}
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
                  placeholder="Ex: Atualização do perfil clínico após avaliação multidisciplinar..."
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
              {isEditing ? 'Salvar Alterações' : 'Criar Perfil'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
