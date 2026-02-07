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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import {
  useCreateDependencyAssessment,
  useUpdateDependencyAssessment,
} from '@/hooks/useResidentHealth'
import type {
  ResidentDependencyAssessment,
  DependencyLevel,
} from '@/api/resident-health.api'
import { DEPENDENCY_LEVEL_LABELS } from '@/api/resident-health.api'

const formSchema = z.object({
  dependencyLevel: z.string().min(1, 'Grau de dependência é obrigatório'),
  effectiveDate: z.string().optional(),
  endDate: z.string().optional(),
  assessmentInstrument: z.string().min(1, 'Instrumento de avaliação é obrigatório'),
  assessmentScore: z.number().optional(),
  mobilityAid: z.boolean(),
  mobilityAidDescription: z.string().optional(),
  notes: z.string().optional(),
  changeReason: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface DependencyAssessmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  assessment?: ResidentDependencyAssessment | null
}

const DEPENDENCY_LEVELS: DependencyLevel[] = ['GRAU_I', 'GRAU_II', 'GRAU_III']

const ASSESSMENT_INSTRUMENTS = [
  'Escala de Katz (AVDs)',
  'Índice de Barthel',
  'Escala de Lawton (AIVDs)',
  'Mini Exame do Estado Mental (MEEM)',
  'Avaliação Geriátrica Ampla',
  'Escala de Pfeffer',
  'Outro',
]

const MOBILITY_AID_OPTIONS = [
  'Cadeira de rodas',
  'Cadeira de rodas motorizada',
  'Andador',
  'Muletas',
  'Bengala',
  'Órteses',
  'Próteses',
  'Outro',
]

export function DependencyAssessmentModal({
  open,
  onOpenChange,
  residentId,
  assessment,
}: DependencyAssessmentModalProps) {
  const isEditing = !!assessment

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dependencyLevel: '',
      effectiveDate: '',
      endDate: '',
      assessmentInstrument: '',
      assessmentScore: undefined,
      mobilityAid: false,
      mobilityAidDescription: '',
      notes: '',
      changeReason: '',
    },
  })

  const createMutation = useCreateDependencyAssessment()
  const updateMutation = useUpdateDependencyAssessment()

  const isLoading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (open && assessment) {
      reset({
        dependencyLevel: assessment.dependencyLevel,
        assessmentInstrument: assessment.assessmentInstrument,
        assessmentScore: assessment.assessmentScore
          ? Number(assessment.assessmentScore)
          : undefined,
        mobilityAid: assessment.mobilityAid,
        mobilityAidDescription: assessment.mobilityAidDescription || '',
        notes: assessment.notes || '',
        changeReason: '',
        endDate: assessment.endDate ? assessment.endDate.split('T')[0] : '',
      })
    } else if (open && !assessment) {
      reset({
        dependencyLevel: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        assessmentInstrument: '',
        assessmentScore: undefined,
        mobilityAid: false,
        mobilityAidDescription: '',
        notes: '',
      })
    }
  }, [open, assessment, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && assessment) {
        if (!data.changeReason || data.changeReason.length < 10) {
          return
        }
        await updateMutation.mutateAsync({
          id: assessment.id,
          data: {
            dependencyLevel: data.dependencyLevel as DependencyLevel | undefined,
            endDate: data.endDate || undefined,
            assessmentInstrument: data.assessmentInstrument || undefined,
            assessmentScore: data.assessmentScore || undefined,
            mobilityAid: data.mobilityAid,
            mobilityAidDescription: data.mobilityAidDescription || undefined,
            notes: data.notes || undefined,
            changeReason: data.changeReason,
          },
        })
      } else {
        if (!data.effectiveDate) {
          return
        }
        await createMutation.mutateAsync({
          residentId,
          dependencyLevel: data.dependencyLevel as DependencyLevel,
          effectiveDate: data.effectiveDate,
          assessmentInstrument: data.assessmentInstrument,
          assessmentScore: data.assessmentScore || undefined,
          mobilityAid: data.mobilityAid,
          mobilityAidDescription: data.mobilityAidDescription || undefined,
          notes: data.notes || undefined,
        })
      }
      onOpenChange(false)
      reset()
    } catch (error) {
      // Erro tratado pelo hook
    }
  }

  const watchMobilityAid = watch('mobilityAid')
  const watchDependencyLevel = watch('dependencyLevel')
  const watchInstrument = watch('assessmentInstrument')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Avaliação de Dependência' : 'Nova Avaliação de Dependência'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Corrija os dados da avaliação'
              : 'Registre uma nova avaliação de dependência. A avaliação anterior será encerrada automaticamente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Grau de Dependência (RDC 502/2021) *</Label>
            <Select
              value={watchDependencyLevel}
              onValueChange={(value) => setValue('dependencyLevel', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o grau" />
              </SelectTrigger>
              <SelectContent>
                {DEPENDENCY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {DEPENDENCY_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dependencyLevel && (
              <p className="text-sm text-destructive">{errors.dependencyLevel.message}</p>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Data de Início *</Label>
              <Input
                id="effectiveDate"
                type="date"
                {...register('effectiveDate')}
              />
              {errors.effectiveDate && (
                <p className="text-sm text-destructive">
                  {errors.effectiveDate.message}
                </p>
              )}
            </div>
          )}

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término (para encerrar a avaliação)</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
              />
              <p className="text-xs text-muted-foreground">
                Preencha apenas se deseja encerrar esta avaliação
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Instrumento de Avaliação *</Label>
              <Select
                value={watchInstrument}
                onValueChange={(value) => setValue('assessmentInstrument', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_INSTRUMENTS.map((instrument) => (
                    <SelectItem key={instrument} value={instrument}>
                      {instrument}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assessmentInstrument && (
                <p className="text-sm text-destructive">{errors.assessmentInstrument.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessmentScore">Pontuação</Label>
              <Input
                id="assessmentScore"
                type="number"
                step="0.1"
                placeholder="Ex: 4.5"
                {...register('assessmentScore', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-3 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label>Necessita Auxílio para Mobilidade?</Label>
                <p className="text-xs text-muted-foreground">
                  Indica se o residente utiliza dispositivo de auxílio
                </p>
              </div>
              <Switch
                checked={watchMobilityAid}
                onCheckedChange={(checked) => setValue('mobilityAid', checked)}
              />
            </div>

            {watchMobilityAid && (
              <div className="space-y-2">
                <Label>Descrição do Auxílio</Label>
                <Select
                  value={watch('mobilityAidDescription') || ''}
                  onValueChange={(value) => setValue('mobilityAidDescription', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de auxílio utilizado" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOBILITY_AID_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações adicionais sobre a avaliação"
              {...register('notes')}
            />
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="changeReason">Motivo da Alteração *</Label>
              <Textarea
                id="changeReason"
                placeholder="Descreva o motivo da correção (mínimo 10 caracteres)"
                {...register('changeReason')}
              />
              {errors.changeReason && (
                <p className="text-sm text-destructive">
                  {errors.changeReason.message}
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
                'Registrar Avaliação'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
