import { useEffect, useState, Fragment, MouseEvent } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, ChevronRight, ChevronLeft, Check, ShieldAlert } from 'lucide-react'
import { extractDateOnly, formatDateTimeSafe } from '@/utils/dateHelpers'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { EliminacaoRecord } from '@/types/daily-records'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ActionDetailsSheet } from '@/design-system/components'

const editEliminacaoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  tipo: z.enum(['Urina', 'Fezes'], {
    message: 'Tipo é obrigatório',
  }),
  consistencia: z.string().optional(),
  cor: z.string().optional(),
  volume: z.string().optional(),
  odor: z.string().optional(),
  observacoes: z.string().optional(),
  trocaFralda: z.boolean(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditEliminacaoFormData = z.infer<typeof editEliminacaoSchema>

interface EditEliminacaoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: EliminacaoRecord
  isUpdating?: boolean
}

type ComparableEliminacaoData = {
  tipo?: string
  consistencia?: string
  cor?: string
  volume?: string
  odor?: string
  trocaFralda?: boolean
}

export function EditEliminacaoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditEliminacaoModalProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<EditEliminacaoFormData>({
    resolver: zodResolver(editEliminacaoSchema),
  })

  const tipo = watch('tipo')

  // Ajustar valores padrão quando o tipo mudar
  useEffect(() => {
    if (tipo === 'Fezes') {
      setValue('odor', undefined)
    } else if (tipo === 'Urina') {
      setValue('consistencia', undefined)
    }
  }, [tipo, setValue])

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        tipo: record.data.tipo || 'Fezes',
        consistencia: record.data.consistencia || undefined,
        cor: record.data.cor || undefined,
        volume: record.data.volume || undefined,
        odor: record.data.odor || undefined,
        observacoes: record.notes || '',
        trocaFralda: record.data.trocaFralda || false,
        editReason: '',
      })
      setCurrentStep(1)
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditEliminacaoFormData) => {
    const payload: Record<string, unknown> = {
      editReason: data.editReason,
    }

    if (data.time !== record.time) {
      payload.time = data.time
    }

    const nextNotes = data.observacoes || ''
    const currentNotes = record.notes || ''
    if (nextNotes !== currentNotes) {
      payload.notes = nextNotes
    }

    const nextData: ComparableEliminacaoData = {
      tipo: data.tipo,
      consistencia: data.consistencia || undefined,
      cor: data.cor || undefined,
      volume: data.volume || undefined,
      odor: data.odor || undefined,
      trocaFralda: data.trocaFralda,
    }
    const currentData: ComparableEliminacaoData = {
      tipo: record.data.tipo,
      consistencia: record.data.consistencia || undefined,
      cor: record.data.cor || undefined,
      volume: record.data.volume || undefined,
      odor: record.data.odor || undefined,
      trocaFralda: Boolean(record.data.trocaFralda),
    }
    if (JSON.stringify(nextData) !== JSON.stringify(currentData)) {
      payload.data = nextData
    }

    onSubmit(payload)
  }

  const handleClose = () => {
    setCurrentStep(1)
    onClose()
  }

  const nextStep = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    if (currentStep < 3) setCurrentStep(currentStep + 1)
  }

  const prevStep = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const formId = 'edit-eliminacao-form'

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && handleClose()}
      title="Editar Eliminações"
      description="É obrigatório informar o motivo da edição para auditoria."
      icon={<Edit className="h-4 w-4" />}
      summary={(
        <div className="bg-muted/20 p-4 rounded-lg border text-sm text-muted-foreground">
          Registro original: <span className="font-medium text-foreground">{format(new Date(extractDateOnly(record.date) + 'T12:00:00'), 'dd/MM/yyyy')}</span>
          {' • '}
          <span className="font-medium text-foreground">{record.time}</span>
          {' • '}
          Por <span className="font-medium text-foreground">{record.recordedBy}</span>
        </div>
      )}
      bodyClassName="space-y-4"
      showDefaultClose={false}
      footer={(
        <>
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={prevStep}
              disabled={isUpdating}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          )}
          {currentStep < 3 ? (
            <Button type="button" size="sm" onClick={nextStep} disabled={!tipo}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" size="sm" variant="success" form={formId} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Salvar Alterações
                </>
              )}
            </Button>
          )}
        </>
      )}
    >

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3].map((step) => (
            <Fragment key={step}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
                    currentStep === step
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > step
                        ? 'bg-success text-success-foreground'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {currentStep > step ? <Check className="h-5 w-5" /> : step}
                </div>
                <span className="text-xs text-muted-foreground">
                  {step === 1 && 'Tipo'}
                  {step === 2 && 'Detalhes'}
                  {step === 3 && 'Motivo'}
                </span>
              </div>
              {step < 3 && (
                <div
                  className={cn(
                    'h-0.5 w-12 transition-colors',
                    currentStep > step ? 'bg-success' : 'bg-muted'
                  )}
                />
              )}
            </Fragment>
          ))}
        </div>

        <form id={formId} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Step 1: Tipo e Horário */}
          {currentStep === 1 && (
            <>
              <div>
                <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                  Horário
                </Label>
                <Input {...register('time')} type="time" className="mt-2" />
                {errors.time && (
                  <p className="text-sm text-danger mt-1">
                    {errors.time.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                  Tipo
                </Label>
                <Controller
                  name="tipo"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fezes">Eliminação Intestinal</SelectItem>
                        <SelectItem value="Urina">Eliminação Urinária</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tipo && (
                  <p className="text-sm text-danger mt-1">
                    {errors.tipo.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Step 2: Campos condicionais baseados no tipo */}
          {currentStep === 2 && (
            <>
              {tipo === 'Fezes' && (
                <>
                  <div>
                    <Label>Consistência</Label>
                    <Controller
                      name="consistencia"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Formada">Formada</SelectItem>
                            <SelectItem value="Macia">Macia</SelectItem>
                            <SelectItem value="Pastosa">Pastosa</SelectItem>
                            <SelectItem value="Diarréica">Diarréica</SelectItem>
                            <SelectItem value="Ressecada">Ressecada</SelectItem>
                            <SelectItem value="Endurecida">Endurecida</SelectItem>
                            <SelectItem value="Caprinoide">Caprinoide</SelectItem>
                            <SelectItem value="Muco presente">Muco presente</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Cor</Label>
                    <Controller
                      name="cor"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Marrom (normal)">Marrom (normal)</SelectItem>
                            <SelectItem value="Marrom-claro">Marrom-claro</SelectItem>
                            <SelectItem value="Marrom-escuro">Marrom-escuro</SelectItem>
                            <SelectItem value="Amarelada">Amarelada</SelectItem>
                            <SelectItem value="Esverdeada">Esverdeada</SelectItem>
                            <SelectItem value="Avermelhada (atenção)">Avermelhada (atenção)</SelectItem>
                            <SelectItem value="Preta/borra de café (atenção)">Preta/borra de café (atenção)</SelectItem>
                            <SelectItem value="Branca/Esbranquiçada (atenção)">Branca/Esbranquiçada (atenção)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Volume</Label>
                    <Controller
                      name="volume"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pequeno">Pequeno</SelectItem>
                            <SelectItem value="Médio (normal)">Médio (normal)</SelectItem>
                            <SelectItem value="Grande">Grande</SelectItem>
                            <SelectItem value="Traços apenas">Traços apenas</SelectItem>
                            <SelectItem value="Ausente">Ausente</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </>
              )}

              {tipo === 'Urina' && (
                <>
                  <div>
                    <Label>Cor</Label>
                    <Controller
                      name="cor"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Amarelo-clara (normal)">Amarelo-clara (normal)</SelectItem>
                            <SelectItem value="Amarelo intensa">Amarelo intensa</SelectItem>
                            <SelectItem value="Transparente">Transparente</SelectItem>
                            <SelectItem value="Escurecida">Escurecida</SelectItem>
                            <SelectItem value="Avermelhada/Hematúria (atenção)">Avermelhada/Hematúria (atenção)</SelectItem>
                            <SelectItem value="Turva">Turva</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Odor</Label>
                    <Controller
                      name="odor"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Normal">Normal</SelectItem>
                            <SelectItem value="Forte">Forte</SelectItem>
                            <SelectItem value="Amoniacal">Amoniacal</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Volume</Label>
                    <Controller
                      name="volume"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pequeno">Pequeno</SelectItem>
                            <SelectItem value="Médio (normal)">Médio (normal)</SelectItem>
                            <SelectItem value="Grande">Grande</SelectItem>
                            <SelectItem value="Gotejamento/Poucas gotas">Gotejamento/Poucas gotas</SelectItem>
                            <SelectItem value="Ausência">Ausência</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Controller
                  name="trocaFralda"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="trocaFralda"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="trocaFralda" className="font-normal cursor-pointer">
                  Troca de fralda/roupa
                </Label>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  {...register('observacoes')}
                  rows={3}
                  className="mt-2"
                  placeholder="Observações adicionais..."
                />
              </div>
            </>
          )}

          {/* Step 3: Informações Originais e Motivo */}
          {currentStep === 3 && (
            <>
              <div className="bg-warning/5 dark:bg-warning/20 border border-warning/30 dark:border-warning/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-warning/90 dark:text-warning">
                      Este registro integra trilha de auditoria permanente
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Registrado por {record.recordedBy}
                      {record.createdAt
                        ? ` em ${formatDateTimeSafe(record.createdAt)}`
                        : ` em ${format(new Date(extractDateOnly(record.date) + 'T12:00:00'), 'dd/MM/yyyy')} ${record.time}`}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                    Motivo da edição
                  </Label>
                  <Textarea
                    {...register('editReason')}
                    rows={4}
                    className="mt-2 resize-none"
                    placeholder="Descreva o motivo da edição (mínimo 10 caracteres)..."
                  />
                  {errors.editReason ? (
                    <p className="text-sm text-danger mt-1">
                      {errors.editReason.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">
                      Campo obrigatório. A justificativa comporá o registro permanente da instituição.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </form>
    </ActionDetailsSheet>
  )
}
