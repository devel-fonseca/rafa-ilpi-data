import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, X, Activity, AlertCircle } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getCurrentDateTimeLocal, formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  useCreateClinicalNote,
  useUpdateClinicalNote,
  useClinicalNoteTags,
} from '@/hooks/useClinicalNotes'
import { useLastVitalSign } from '@/hooks/useVitalSigns'
import type { ClinicalNote, ClinicalProfession } from '@/api/clinicalNotes.api'
import { SOAPTemplateFields } from './SOAPTemplateFields'
import {
  getProfessionConfig,
  DEFAULT_CLINICAL_TAGS,
  PROFESSION_CONFIG,
} from '@/utils/clinicalNotesConstants'
import { formatVitalSignsToText, checkCriticalVitalSigns } from '@/utils/vitalSignsFormatter'

// Validação com Zod
const clinicalNoteSchema = z
  .object({
    profession: z.enum([
      'MEDICINE',
      'NURSING',
      'NUTRITION',
      'PHYSIOTHERAPY',
      'PSYCHOLOGY',
      'SOCIAL_WORK',
      'SPEECH_THERAPY',
      'OCCUPATIONAL_THERAPY',
    ]),
    noteDate: z.string().min(1, 'Data/hora é obrigatória'),
    subjective: z.string().optional(),
    objective: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
    tags: z.array(z.string()).optional(),
    editReason: z.string().optional(), // Apenas para edição
  })
  .refine(
    (data) => data.subjective || data.objective || data.assessment || data.plan,
    {
      message: 'Ao menos um campo SOAP (S, O, A ou P) deve ser preenchido',
      path: ['subjective'],
    }
  )

type ClinicalNoteFormData = z.infer<typeof clinicalNoteSchema>

interface ClinicalNotesFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  residentName?: string
  note?: ClinicalNote
  onSuccess?: () => void
}

export function ClinicalNotesForm({
  open,
  onOpenChange,
  residentId,
  residentName,
  note,
  onSuccess,
}: ClinicalNotesFormProps) {
  const isEditing = !!note
  const [customTagInput, setCustomTagInput] = useState('')

  const createMutation = useCreateClinicalNote()
  const updateMutation = useUpdateClinicalNote()
  const { data: suggestedTags = [] } = useClinicalNoteTags()
  const { data: lastVitalSign, isLoading: vitalSignsLoading } = useLastVitalSign(residentId)

  const isLoading = createMutation.isPending || updateMutation.isPending

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ClinicalNoteFormData>({
    resolver: zodResolver(clinicalNoteSchema),
    defaultValues: note
      ? {
          profession: note.profession,
          noteDate: note.noteDate,
          subjective: note.subjective || '',
          objective: note.objective || '',
          assessment: note.assessment || '',
          plan: note.plan || '',
          tags: note.tags || [],
          editReason: '',
        }
      : {
          profession: 'MEDICINE',
          noteDate: getCurrentDateTimeLocal(),
          subjective: '',
          objective: '',
          assessment: '',
          plan: '',
          tags: [],
        },
  })

  const selectedProfession = watch('profession')
  const selectedTags = watch('tags') || []
  const subjective = watch('subjective') || ''
  const objective = watch('objective') || ''
  const assessment = watch('assessment') || ''
  const plan = watch('plan') || ''

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset()
      setCustomTagInput('')
    }
  }, [open, reset])

  // Combinar tags pré-definidas + tags sugeridas do backend (sem duplicatas)
  const allAvailableTags = Array.from(
    new Set([
      ...DEFAULT_CLINICAL_TAGS.map((t) => t.value),
      ...suggestedTags,
    ])
  )

  const addTag = (tagValue: string) => {
    if (!tagValue.trim()) return
    if (selectedTags.includes(tagValue)) {
      toast.error('Tag já adicionada')
      return
    }

    setValue('tags', [...selectedTags, tagValue])
    setCustomTagInput('')
  }

  const removeTag = (tagValue: string) => {
    setValue(
      'tags',
      selectedTags.filter((t) => t !== tagValue)
    )
  }

  const insertVitalSignsIntoObjective = () => {
    const vitalSignsText = formatVitalSignsToText(lastVitalSign)
    const currentObjective = objective || ''
    const newObjective = currentObjective
      ? `${currentObjective}\n\n${vitalSignsText}`
      : vitalSignsText
    setValue('objective', newObjective)
    toast.success('Sinais vitais inseridos no campo Objetivo')
  }

  const onSubmit = async (data: ClinicalNoteFormData) => {
    try {
      if (isEditing) {
        // Validar editReason
        if (!data.editReason || data.editReason.trim().length < 10) {
          toast.error('Motivo da edição deve ter no mínimo 10 caracteres')
          return
        }

        await updateMutation.mutateAsync({
          id: note.id,
          data: {
            subjective: data.subjective || undefined,
            objective: data.objective || undefined,
            assessment: data.assessment || undefined,
            plan: data.plan || undefined,
            tags: data.tags || [],
            editReason: data.editReason,
          },
        })
      } else {
        await createMutation.mutateAsync({
          residentId,
          profession: data.profession,
          noteDate: data.noteDate,
          subjective: data.subjective || undefined,
          objective: data.objective || undefined,
          assessment: data.assessment || undefined,
          plan: data.plan || undefined,
          tags: data.tags || [],
        })
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      // Erro já tratado pelo hook com toast
    }
  }

  const professionConfig = getProfessionConfig(selectedProfession)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{professionConfig.icon}</span>
            {isEditing ? 'Editar Evolução Clínica' : 'Nova Evolução Clínica (SOAP)'}
          </DialogTitle>
          <DialogDescription>
            {residentName && `Residente: ${residentName} • `}
            Preencha ao menos um campo SOAP (S, O, A ou P)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Profissão e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="profession">
                Profissão <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="profession"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEditing} // Não pode mudar profissão ao editar
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROFESSION_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span>{config.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.profession && (
                <p className="text-sm text-destructive mt-1">
                  {errors.profession.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="noteDate">
                Data/Hora da Evolução <span className="text-destructive">*</span>
              </Label>
              <Input
                id="noteDate"
                type="datetime-local"
                {...register('noteDate')}
                disabled={isEditing} // Não pode mudar data ao editar
              />
              {errors.noteDate && (
                <p className="text-sm text-destructive mt-1">
                  {errors.noteDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Campos SOAP com template dinâmico */}
          <div className={`rounded-lg border-2 p-4 ${professionConfig.borderColor} ${professionConfig.bgColor}`}>
            <h3 className={`font-semibold mb-4 ${professionConfig.color}`}>
              Método SOAP - {professionConfig.label}
            </h3>

            <SOAPTemplateFields
              profession={selectedProfession}
              subjective={subjective}
              objective={objective}
              assessment={assessment}
              plan={plan}
              onSubjectiveChange={(value) => setValue('subjective', value)}
              onObjectiveChange={(value) => setValue('objective', value)}
              onAssessmentChange={(value) => setValue('assessment', value)}
              onPlanChange={(value) => setValue('plan', value)}
              disabled={isLoading}
            />
          </div>

          {/* Sinais Vitais */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Últimos Sinais Vitais
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={insertVitalSignsIntoObjective}
                disabled={isLoading || vitalSignsLoading || !lastVitalSign}
                className="gap-2"
              >
                Inserir no Objetivo
              </Button>
            </div>

            {vitalSignsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando sinais vitais...
              </div>
            ) : lastVitalSign ? (
              <div className="space-y-3">
                {/* Dados dos sinais vitais */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {lastVitalSign.systolicBloodPressure && lastVitalSign.diastolicBloodPressure && (
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-muted-foreground">Pressão Arterial</div>
                      <div className="font-semibold">
                        {lastVitalSign.systolicBloodPressure}/{lastVitalSign.diastolicBloodPressure} mmHg
                      </div>
                    </div>
                  )}
                  {lastVitalSign.heartRate && (
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-muted-foreground">Frequência Cardíaca</div>
                      <div className="font-semibold">{lastVitalSign.heartRate} bpm</div>
                    </div>
                  )}
                  {lastVitalSign.temperature && (
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-muted-foreground">Temperatura</div>
                      <div className="font-semibold">{lastVitalSign.temperature.toFixed(1)}°C</div>
                    </div>
                  )}
                  {lastVitalSign.oxygenSaturation && (
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-muted-foreground">SpO2</div>
                      <div className="font-semibold">{lastVitalSign.oxygenSaturation}%</div>
                    </div>
                  )}
                  {lastVitalSign.bloodGlucose && (
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-muted-foreground">Glicemia</div>
                      <div className="font-semibold">{lastVitalSign.bloodGlucose} mg/dL</div>
                    </div>
                  )}
                </div>

                {/* Alertas críticos */}
                {(() => {
                  const alerts = checkCriticalVitalSigns(lastVitalSign)
                  return alerts.length > 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <div className="flex items-center gap-2 text-yellow-800 font-semibold text-sm mb-2">
                        <AlertCircle className="h-4 w-4" />
                        Alertas Críticos
                      </div>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {alerts.map((alert, index) => (
                          <li key={index}>{alert}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null
                })()}

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground">
                  Registrado em: {formatDateTimeSafe(lastVitalSign.timestamp)}
                  {lastVitalSign.recordedBy && ` por ${lastVitalSign.recordedBy}`}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Nenhum sinal vital registrado recentemente.
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (opcional)</Label>
            <div className="flex gap-2">
              <Input
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="Digite uma tag customizada ou selecione abaixo"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag(customTagInput)
                  }
                }}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTag(customTagInput)}
                disabled={isLoading || !customTagInput.trim()}
              >
                Adicionar
              </Button>
            </div>

            {/* Tags selecionadas */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Tags sugeridas */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tags sugeridas:</p>
              <div className="flex flex-wrap gap-1">
                {allAvailableTags
                  .filter((tag) => !selectedTags.includes(tag))
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => addTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>

          {/* Motivo da edição (apenas se editing) */}
          {isEditing && (
            <div>
              <Label htmlFor="editReason">
                Motivo da Edição <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="editReason"
                {...register('editReason')}
                placeholder="Descreva o motivo desta edição (mínimo 10 caracteres)"
                className="min-h-[80px]"
                disabled={isLoading}
              />
              {errors.editReason && (
                <p className="text-sm text-destructive mt-1">
                  {errors.editReason.message}
                </p>
              )}
            </div>
          )}

          {/* Erro geral (ao menos 1 campo SOAP) */}
          {errors.subjective && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/30">
              {errors.subjective.message}
            </div>
          )}

          {/* Botões */}
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
              {isEditing ? 'Salvar Alterações' : 'Criar Evolução'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
