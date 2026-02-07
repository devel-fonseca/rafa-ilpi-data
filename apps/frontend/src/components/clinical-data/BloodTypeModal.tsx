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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import {
  useCreateBloodType,
  useUpdateBloodType,
} from '@/hooks/useResidentHealth'
import type {
  ResidentBloodType,
  BloodType,
} from '@/api/resident-health.api'
import { BLOOD_TYPE_LABELS } from '@/api/resident-health.api'

const createSchema = z.object({
  bloodType: z.string().min(1, 'Tipo sanguíneo é obrigatório'),
  source: z.string().optional(),
  confirmedAt: z.string().optional(),
})

const updateSchema = createSchema.extend({
  changeReason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
})

type CreateFormData = z.infer<typeof createSchema>
type UpdateFormData = z.infer<typeof updateSchema>

interface BloodTypeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  bloodType?: ResidentBloodType | null
}

const BLOOD_TYPE_OPTIONS: BloodType[] = [
  'A_POSITIVO',
  'A_NEGATIVO',
  'B_POSITIVO',
  'B_NEGATIVO',
  'AB_POSITIVO',
  'AB_NEGATIVO',
  'O_POSITIVO',
  'O_NEGATIVO',
]

const SOURCE_OPTIONS = [
  'Exame laboratorial',
  'Auto-declarado',
  'Carteira de doador',
  'Documento médico',
]

export function BloodTypeModal({
  open,
  onOpenChange,
  residentId,
  bloodType,
}: BloodTypeModalProps) {
  const isEditing = !!bloodType

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateFormData | UpdateFormData>({
    resolver: zodResolver(isEditing ? updateSchema : createSchema),
    defaultValues: {
      bloodType: '',
      source: '',
      confirmedAt: '',
      ...(isEditing ? { changeReason: '' } : {}),
    },
  })

  const createMutation = useCreateBloodType()
  const updateMutation = useUpdateBloodType()

  const isLoading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open && bloodType) {
      reset({
        bloodType: bloodType.bloodType,
        source: bloodType.source || '',
        confirmedAt: bloodType.confirmedAt
          ? bloodType.confirmedAt.split('T')[0]
          : '',
        changeReason: '',
      })
    } else if (open && !bloodType) {
      reset({
        bloodType: '',
        source: '',
        confirmedAt: '',
      })
    }
  }, [open, bloodType, reset])

  const onSubmit = async (data: CreateFormData | UpdateFormData) => {
    try {
      if (isEditing && bloodType) {
        const updateData = data as UpdateFormData
        await updateMutation.mutateAsync({
          id: bloodType.id,
          data: {
            bloodType: updateData.bloodType as BloodType,
            source: updateData.source || undefined,
            confirmedAt: updateData.confirmedAt || undefined,
            changeReason: updateData.changeReason,
          },
        })
      } else {
        await createMutation.mutateAsync({
          residentId,
          bloodType: data.bloodType as BloodType,
          source: data.source || undefined,
          confirmedAt: data.confirmedAt || undefined,
        })
      }
      onOpenChange(false)
      reset()
    } catch (error) {
      // Erro tratado pelo hook
    }
  }

  const watchBloodType = watch('bloodType')
  const watchSource = watch('source')

  // Limpar data de confirmação quando fonte for Auto-declarado
  useEffect(() => {
    if (watchSource === 'Auto-declarado') {
      setValue('confirmedAt', '')
    }
  }, [watchSource, setValue])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tipo Sanguíneo' : 'Registrar Tipo Sanguíneo'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Corrija os dados do tipo sanguíneo do residente'
              : 'Informe o tipo sanguíneo do residente'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bloodType">Tipo Sanguíneo *</Label>
            <Select
              value={watchBloodType}
              onValueChange={(value) => setValue('bloodType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo sanguíneo" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {BLOOD_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bloodType && (
              <p className="text-sm text-destructive">{errors.bloodType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Fonte da Informação</Label>
            <Select
              value={watch('source') || ''}
              onValueChange={(value) => setValue('source', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Como foi obtida a informação?" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {watchSource !== 'Auto-declarado' && (
            <div className="space-y-2">
              <Label htmlFor="confirmedAt">Data de Confirmação</Label>
              <Input
                id="confirmedAt"
                type="date"
                {...register('confirmedAt')}
              />
              <p className="text-xs text-muted-foreground">
                Data em que o tipo sanguíneo foi confirmado (exame, documento, etc.)
              </p>
            </div>
          )}

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="changeReason">Motivo da Alteração *</Label>
              <Textarea
                id="changeReason"
                placeholder="Descreva o motivo da correção (mínimo 10 caracteres)"
                {...register('changeReason' as keyof (CreateFormData | UpdateFormData))}
              />
              {(errors as { changeReason?: { message?: string } }).changeReason && (
                <p className="text-sm text-destructive">
                  {(errors as { changeReason?: { message?: string } }).changeReason?.message}
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
