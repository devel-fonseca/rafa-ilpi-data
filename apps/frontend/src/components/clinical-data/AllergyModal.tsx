import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
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

const allergySchema = z.object({
  substance: z.string().min(1, 'Substância é obrigatória'),
  reaction: z.string().optional(),
  severity: z.enum(['LEVE', 'MODERADA', 'GRAVE', 'ANAFILAXIA']).optional(),
  notes: z.string().optional(),
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

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AllergyFormData>({
    resolver: zodResolver(allergySchema),
    defaultValues: {
      substance: allergy?.substance || '',
      reaction: allergy?.reaction || '',
      severity: allergy?.severity || undefined,
      notes: allergy?.notes || '',
    },
  })

  useEffect(() => {
    if (open && allergy) {
      reset({
        substance: allergy.substance,
        reaction: allergy.reaction || '',
        severity: allergy.severity || undefined,
        notes: allergy.notes || '',
      })
    } else if (open && !allergy) {
      reset({
        substance: '',
        reaction: '',
        severity: undefined,
        notes: '',
      })
    }
  }, [open, allergy, reset])

  const onSubmit = async (data: AllergyFormData) => {
    try {
      if (isEditing && allergy) {
        await updateMutation.mutateAsync({
          id: allergy.id,
          data: {
            substance: data.substance,
            reaction: data.reaction || undefined,
            severity: data.severity || undefined,
            notes: data.notes || undefined,
          },
        })
      } else {
        await createMutation.mutateAsync({
          residentId,
          substance: data.substance,
          reaction: data.reaction || undefined,
          severity: data.severity || undefined,
          notes: data.notes || undefined,
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
            {isEditing ? 'Editar Alergia' : 'Registrar Nova Alergia'}
          </DialogTitle>
          <DialogDescription>
            Registro de alergias e reações adversas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {isEditing ? 'Salvar Alterações' : 'Registrar Alergia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
