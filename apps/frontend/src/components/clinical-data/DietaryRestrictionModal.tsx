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
  useCreateDietaryRestriction,
  useUpdateDietaryRestriction,
} from '@/hooks/useDietaryRestrictions'
import type { DietaryRestriction, RestrictionType } from '@/api/dietary-restrictions.api'

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

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DietaryRestrictionFormData>({
    resolver: zodResolver(dietaryRestrictionSchema),
    defaultValues: {
      restrictionType: restriction?.restrictionType || 'RESTRICAO_MEDICA',
      description: restriction?.description || '',
      notes: restriction?.notes || '',
    },
  })

  useEffect(() => {
    if (open && restriction) {
      reset({
        restrictionType: restriction.restrictionType,
        description: restriction.description,
        notes: restriction.notes || '',
      })
    } else if (open && !restriction) {
      reset({
        restrictionType: 'RESTRICAO_MEDICA',
        description: '',
        notes: '',
      })
    }
  }, [open, restriction, reset])

  const onSubmit = async (data: DietaryRestrictionFormData) => {
    try {
      if (isEditing && restriction) {
        await updateMutation.mutateAsync({
          id: restriction.id,
          data: {
            restrictionType: data.restrictionType,
            description: data.description,
            notes: data.notes || undefined,
          },
        })
      } else {
        await createMutation.mutateAsync({
          residentId,
          restrictionType: data.restrictionType,
          description: data.description,
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
            {isEditing ? 'Editar Restrição Alimentar' : 'Registrar Nova Restrição Alimentar'}
          </DialogTitle>
          <DialogDescription>
            Restrições dietéticas e orientações nutricionais
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {isEditing ? 'Salvar Alterações' : 'Registrar Restrição'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
