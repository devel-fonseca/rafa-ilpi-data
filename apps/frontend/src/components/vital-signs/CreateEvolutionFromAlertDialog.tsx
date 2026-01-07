import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react'
import { usePrefillFromAlert } from '@/hooks/useVitalSignAlerts'
import { useCreateClinicalNote, useAuthorizedProfessions } from '@/hooks/useClinicalNotes'
import type { VitalSignAlert } from '@/api/vitalSignAlerts.api'
import type { CreateClinicalNoteDto, ClinicalProfession } from '@/api/clinicalNotes.api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuthStore } from '@/stores/auth.store'

interface CreateEvolutionFromAlertDialogProps {
  alert: VitalSignAlert | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface EvolutionFormData {
  profession: ClinicalProfession
  subjective: string
  objective: string
  assessment: string
  plan: string
  tags: string[]
}

/**
 * Mapeia positionCode + registrationType para a profissão clínica correspondente
 * Para TECHNICAL_MANAGER, usa o registrationType para determinar a profissão
 */
function getUserProfession(
  positionCode?: string | null,
  registrationType?: string | null,
): ClinicalProfession | null {
  if (!positionCode) return null

  // Mapeamento direto por cargo
  const positionToProfession: Record<string, ClinicalProfession> = {
    DOCTOR: 'MEDICINE',
    NURSE: 'NURSING',
    NURSING_COORDINATOR: 'NURSING',
    NUTRITIONIST: 'NUTRITION',
    PHYSIOTHERAPIST: 'PHYSIOTHERAPY',
    PSYCHOLOGIST: 'PSYCHOLOGY',
    SOCIAL_WORKER: 'SOCIAL_WORK',
    SPEECH_THERAPIST: 'SPEECH_THERAPY',
    OCCUPATIONAL_THERAPIST: 'OCCUPATIONAL_THERAPY',
  }

  // Se não é RT, retornar mapeamento direto
  if (positionCode !== 'TECHNICAL_MANAGER') {
    return positionToProfession[positionCode] || null
  }

  // Para RT, mapear por registrationType (conselho profissional)
  const registrationToProfession: Record<string, ClinicalProfession> = {
    CRM: 'MEDICINE',
    COREN: 'NURSING',
    CRN: 'NUTRITION',
    CREFITO: 'PHYSIOTHERAPY',
    CRP: 'PSYCHOLOGY',
    CRESS: 'SOCIAL_WORK',
    CREFONO: 'SPEECH_THERAPY',
  }

  return registrationType ? registrationToProfession[registrationType] || null : null
}

export function CreateEvolutionFromAlertDialog({
  alert,
  open,
  onOpenChange,
  onSuccess,
}: CreateEvolutionFromAlertDialogProps) {
  const [newTag, setNewTag] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Buscar usuário logado
  const user = useAuthStore((state) => state.user)

  // Determinar profissão do usuário
  const userProfession = getUserProfession(
    user?.profile?.positionCode,
    user?.profile?.registrationType,
  )

  // Buscar profissões autorizadas
  const { data: authorizedProfessions, isLoading: loadingProfessions } =
    useAuthorizedProfessions()

  // Filtrar profissões: se usuário tem profissão definida, mostrar apenas ela
  // Caso contrário, mostrar todas autorizadas
  const availableProfessions = userProfession
    ? authorizedProfessions?.filter((prof) => prof === userProfession) || []
    : authorizedProfessions || []

  // Buscar dados pré-preenchidos do alerta
  const {
    data: prefillData,
    isLoading: loadingPrefill,
    error: prefillError,
  } = usePrefillFromAlert(alert?.id || '', open && !!alert)

  const createNoteMutation = useCreateClinicalNote()

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EvolutionFormData>({
    defaultValues: {
      profession: userProfession || ('MEDICINE' as ClinicalProfession),
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      tags: [],
    },
  })

  // Pré-selecionar profissão do usuário ao abrir modal
  useEffect(() => {
    if (open && userProfession) {
      setValue('profession', userProfession)
    }
  }, [open, userProfession, setValue])

  // Pré-preencher formulário quando dados chegarem
  useEffect(() => {
    if (prefillData && open) {
      setValue('objective', prefillData.objective)
      setValue('assessment', prefillData.assessment)
      setSelectedTags(prefillData.suggestedTags || [])
    }
  }, [prefillData, open, setValue])

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      reset()
      setSelectedTags([])
      setNewTag('')
    }
  }, [open, reset])

  const onSubmit = async (data: EvolutionFormData) => {
    if (!alert) return

    const clinicalNoteData: CreateClinicalNoteDto = {
      residentId: alert.residentId,
      profession: data.profession,
      subjective: data.subjective || undefined,
      objective: data.objective || undefined,
      assessment: data.assessment || undefined,
      plan: data.plan || undefined,
      tags: selectedTags,
      // @ts-ignore - vitalSignAlertId exists in backend DTO
      vitalSignAlertId: alert.id,
    }

    try {
      await createNoteMutation.mutateAsync(clinicalNoteData)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags([...selectedTags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  if (!alert) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Criar Evolução Clínica a partir de Alerta
          </DialogTitle>
          <DialogDescription>
            Os campos Objetivo (O) e Avaliação (A) foram pré-preenchidos
            automaticamente com base nos dados do alerta. Complete os campos
            Subjetivo (S) e Plano (P) conforme necessário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Loading State */}
          {loadingPrefill && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Carregando dados do alerta...</AlertTitle>
              <AlertDescription>
                Buscando informações para pré-preencher a evolução clínica.
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {prefillError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar dados do alerta</AlertTitle>
              <AlertDescription>
                Não foi possível pré-preencher os campos automaticamente. Você
                pode preencher manualmente.
              </AlertDescription>
            </Alert>
          )}

          {/* Success Prefill Indicator */}
          {!loadingPrefill && prefillData && (
            <Alert className="border-success/30 bg-success/5 dark:bg-success/95">
              <Sparkles className="h-4 w-4 text-success dark:text-success/40" />
              <AlertTitle className="text-success/90 dark:text-success/20">
                Campos pré-preenchidos com sucesso
              </AlertTitle>
              <AlertDescription className="text-success/80 dark:text-success/30">
                Os campos Objetivo (O) e Avaliação (A) foram preenchidos
                automaticamente com base nos sinais vitais e severidade do
                alerta.
              </AlertDescription>
            </Alert>
          )}

          {/* Informações do Alerta */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{alert.title}</h4>
              <Badge variant="outline">{alert.value}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{alert.description}</p>
            {alert.resident && (
              <p className="text-sm">
                <strong>Residente:</strong> {alert.resident.fullName}
              </p>
            )}
          </div>

          {/* Profissão */}
          <div className="space-y-2">
            <Label htmlFor="profession">
              Profissão <span className="text-danger">*</span>
            </Label>
            <Controller
              name="profession"
              control={control}
              rules={{ required: 'Profissão é obrigatória' }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={loadingProfessions || !!userProfession}
                >
                  <SelectTrigger id="profession">
                    <SelectValue placeholder="Selecione sua profissão" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingProfessions ? (
                      <SelectItem value="loading" disabled>
                        Carregando profissões...
                      </SelectItem>
                    ) : availableProfessions && availableProfessions.length > 0 ? (
                      availableProfessions.map((profession) => (
                        <SelectItem key={profession} value={profession}>
                          {getProfessionLabel(profession)}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Nenhuma profissão autorizada
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {userProfession && (
              <p className="text-xs text-muted-foreground">
                ✓ Profissão pré-selecionada automaticamente com base no seu cargo
              </p>
            )}
            {errors.profession && (
              <p className="text-xs text-danger">{errors.profession.message}</p>
            )}
          </div>

          {/* SOAP Fields */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Método SOAP</h3>

            {/* Subjetivo (S) */}
            <div className="space-y-2">
              <Label htmlFor="subjective">
                Subjetivo (S) - Queixa do Paciente
              </Label>
              <Textarea
                id="subjective"
                {...register('subjective')}
                placeholder="Relato do residente ou familiar sobre sintomas, queixas e percepções..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                O que o residente ou familiar relatou? Como está se sentindo?
              </p>
            </div>

            {/* Objetivo (O) - PRÉ-PREENCHIDO */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="objective">
                  Objetivo (O) - Dados Objetivos
                </Label>
                {prefillData && (
                  <Badge
                    variant="secondary"
                    className="text-xs flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Pré-preenchido
                  </Badge>
                )}
              </div>
              <Textarea
                id="objective"
                {...register('objective')}
                rows={6}
                className="resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Sinais vitais, exames físicos, dados mensuráveis (pré-preenchido
                automaticamente)
              </p>
            </div>

            {/* Avaliação (A) - PRÉ-PREENCHIDO */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="assessment">
                  Avaliação (A) - Análise Clínica
                </Label>
                {prefillData && (
                  <Badge
                    variant="secondary"
                    className="text-xs flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Pré-preenchido
                  </Badge>
                )}
              </div>
              <Textarea
                id="assessment"
                {...register('assessment')}
                rows={4}
                className="resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Impressão diagnóstica, severidade, orientações clínicas
                (pré-preenchido automaticamente)
              </p>
            </div>

            {/* Plano (P) */}
            <div className="space-y-2">
              <Label htmlFor="plan">
                Plano (P) - Conduta <span className="text-danger">*</span>
              </Label>
              <Textarea
                id="plan"
                {...register('plan', {
                  required: 'Plano de conduta é obrigatório',
                })}
                placeholder="Condutas médicas, prescrições, exames solicitados, orientações..."
                rows={5}
                className="resize-none"
              />
              {errors.plan && (
                <p className="text-xs text-danger">{errors.plan.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                O que será feito? Tratamentos, medicamentos, exames,
                reavaliações, etc.
              </p>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">
              Tags (Classificadores){' '}
              {prefillData?.suggestedTags && prefillData.suggestedTags.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  - {prefillData.suggestedTags.length} sugestões adicionadas
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma tag e pressione Enter"
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Adicionar
              </Button>
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-danger"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Tags ajudam na organização e filtros de evoluções clínicas
            </p>
          </div>

          {/* Linking Info */}
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Vinculação Automática</AlertTitle>
            <AlertDescription>
              Esta evolução será automaticamente vinculada ao alerta médico,
              permitindo rastreamento completo e mudança automática do status
              do alerta para "Em Tratamento".
            </AlertDescription>
          </Alert>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={createNoteMutation.isPending || loadingPrefill}
              className="gap-2"
            >
              {createNoteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Criar Evolução Clínica
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Helper function para labels de profissão
function getProfessionLabel(profession: ClinicalProfession): string {
  const labels: Record<ClinicalProfession, string> = {
    MEDICINE: 'Medicina',
    NURSING: 'Enfermagem',
    NUTRITION: 'Nutrição',
    PHYSIOTHERAPY: 'Fisioterapia',
    PSYCHOLOGY: 'Psicologia',
    SOCIAL_WORK: 'Serviço Social',
    SPEECH_THERAPY: 'Fonoaudiologia',
    OCCUPATIONAL_THERAPY: 'Terapia Ocupacional',
  }
  return labels[profession] || profession
}
