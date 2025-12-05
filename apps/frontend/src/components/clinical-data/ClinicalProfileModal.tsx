import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
})

type ClinicalProfileFormData = z.infer<typeof clinicalProfileSchema>

interface ClinicalProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  profile?: ClinicalProfile | null
}

export function ClinicalProfileModal({
  open,
  onOpenChange,
  residentId,
  profile,
}: ClinicalProfileModalProps) {
  const isEditing = !!profile

  const createMutation = useCreateClinicalProfile()
  const updateMutation = useUpdateClinicalProfile()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClinicalProfileFormData>({
    resolver: zodResolver(clinicalProfileSchema),
    defaultValues: {
      healthStatus: profile?.healthStatus || '',
      specialNeeds: profile?.specialNeeds || '',
      functionalAspects: profile?.functionalAspects || '',
    },
  })

  useEffect(() => {
    if (open && profile) {
      reset({
        healthStatus: profile.healthStatus || '',
        specialNeeds: profile.specialNeeds || '',
        functionalAspects: profile.functionalAspects || '',
      })
    } else if (open && !profile) {
      reset({
        healthStatus: '',
        specialNeeds: '',
        functionalAspects: '',
      })
    }
  }, [open, profile, reset])

  const onSubmit = async (data: ClinicalProfileFormData) => {
    try {
      if (isEditing && profile) {
        await updateMutation.mutateAsync({
          id: profile.id,
          data: {
            healthStatus: data.healthStatus || undefined,
            specialNeeds: data.specialNeeds || undefined,
            functionalAspects: data.functionalAspects || undefined,
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
