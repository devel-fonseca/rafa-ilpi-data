import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, ChevronRight, ChevronLeft, Check, ShieldAlert } from 'lucide-react'
import { extractDateOnly, formatDateTimeSafe } from '@/utils/dateHelpers'
import { format } from 'date-fns'
import type { HigieneRecord } from '@/types/daily-records'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ActionDetailsSheet } from '@/design-system/components'

const editHigieneSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido. Use HH:mm'),
  tipoBanho: z.enum(['Sem banho', 'Chuveiro', 'Leito', 'Aspersão']).optional(),
  duracao: z.string().optional(),
  condicaoPele: z.enum(['Normal', 'Ressecada', 'Lesão', 'Edema']).optional(),
  localAlteracao: z.string().optional(),
  hidratanteAplicado: z.boolean(),
  higieneBucal: z.boolean(),
  trocaFralda: z.boolean(),
  quantidadeFraldas: z.string().optional(),
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditHigieneFormData = z.infer<typeof editHigieneSchema>

interface EditHigieneModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: HigieneRecord
  isUpdating?: boolean
}

type ComparableHigieneData = {
  tipoBanho?: string
  duracao?: string
  condicaoPele?: string
  localAlteracao?: string
  hidratanteAplicado?: boolean
  higieneBucal?: boolean
  trocaFralda?: boolean
  quantidadeFraldas?: string
}

function normalizeComparableHigieneData(data: Record<string, unknown>): ComparableHigieneData {
  return {
    tipoBanho: data.tipoBanho ? String(data.tipoBanho) : undefined,
    duracao: data.duracao !== undefined && data.duracao !== null ? String(data.duracao) : undefined,
    condicaoPele: data.condicaoPele ? String(data.condicaoPele) : undefined,
    localAlteracao: data.localAlteracao ? String(data.localAlteracao) : undefined,
    hidratanteAplicado: Boolean(data.hidratanteAplicado),
    higieneBucal: Boolean(data.higieneBucal),
    trocaFralda: Boolean(data.trocaFralda),
    quantidadeFraldas:
      data.quantidadeFraldas !== undefined && data.quantidadeFraldas !== null
        ? String(data.quantidadeFraldas)
        : undefined,
  }
}

export function EditHigieneModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditHigieneModalProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<EditHigieneFormData>({
    resolver: zodResolver(editHigieneSchema),
  })

  const trocaFralda = watch('trocaFralda')
  const tipoBanho = watch('tipoBanho')

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      const validCondicaoPele = ['Normal', 'Ressecada', 'Lesão', 'Edema'] as const
      const condicaoPeleValue = validCondicaoPele.includes(record.data.condicaoPele as typeof validCondicaoPele[number])
        ? (record.data.condicaoPele as typeof validCondicaoPele[number])
        : 'Normal'

      reset({
        time: record.time,
        tipoBanho: record.data.tipoBanho || 'Chuveiro',
        duracao: record.data.duracao ? String(record.data.duracao) : '',
        condicaoPele: condicaoPeleValue,
        localAlteracao: record.data.localAlteracao || '',
        hidratanteAplicado: record.data.hidratanteAplicado || false,
        higieneBucal: record.data.higieneBucal || false,
        trocaFralda: record.data.trocaFralda || false,
        quantidadeFraldas: record.data.quantidadeFraldas
          ? String(record.data.quantidadeFraldas)
          : '',
        observacoes: record.notes || '',
        editReason: '',
      })
      setCurrentStep(1)
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditHigieneFormData) => {
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

    const nextData: ComparableHigieneData = {
      tipoBanho: data.tipoBanho,
      duracao: data.duracao || undefined,
      condicaoPele: data.condicaoPele,
      localAlteracao: data.localAlteracao || undefined,
      hidratanteAplicado: data.hidratanteAplicado,
      higieneBucal: data.higieneBucal,
      trocaFralda: data.trocaFralda,
      quantidadeFraldas: data.quantidadeFraldas || undefined,
    }

    const currentData = normalizeComparableHigieneData(record.data as Record<string, unknown>)
    if (JSON.stringify(nextData) !== JSON.stringify(currentData)) {
      payload.data = nextData
    }

    onSubmit(payload)
  }

  const handleClose = () => {
    setCurrentStep(1)
    onClose()
  }

  const nextStep = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const formId = 'edit-higiene-form'

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && handleClose()}
      title="Editar Higiene Corporal"
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
      bodyClassName="space-y-6"
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
              onClick={(e) => prevStep(e)}
              disabled={isUpdating}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          )}
          {currentStep < 4 ? (
            <Button type="button" size="sm" onClick={(e) => nextStep(e)}>
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
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
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
                <span className="text-xs mt-1 text-muted-foreground">
                  {step === 1 && 'Banho'}
                  {step === 2 && 'Pele'}
                  {step === 3 && 'Observações'}
                  {step === 4 && 'Motivo'}
                </span>
              </div>
              {step < 4 && (
                <div
                  className={cn(
                    'h-1 flex-1 mx-2',
                    currentStep > step ? 'bg-success' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <form id={formId} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Etapa 1: Banho e Higiene Básica */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                    Horário
                  </Label>
                  <Input
                    {...register('time')}
                    type="time"
                    className="mt-2"
                    placeholder="HH:mm"
                  />
                  {errors.time && (
                    <p className="text-sm text-danger mt-1">
                      {errors.time.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Tipo de banho</Label>
                  <Controller
                    name="tipoBanho"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sem banho">Sem banho</SelectItem>
                          <SelectItem value="Chuveiro">Chuveiro</SelectItem>
                          <SelectItem value="Leito">Leito</SelectItem>
                          <SelectItem value="Aspersão">Aspersão</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div>
                <Label>Duração (min)</Label>
                <Input
                  {...register('duracao')}
                  type="number"
                  className="mt-2"
                  placeholder="5"
                  disabled={tipoBanho === 'Sem banho'}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Controller
                    name="higieneBucal"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="bucal"
                      />
                    )}
                  />
                  <Label htmlFor="bucal" className="font-normal cursor-pointer">
                    Higiene bucal realizada
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Controller
                    name="trocaFralda"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="fralda"
                      />
                    )}
                  />
                  <Label htmlFor="fralda" className="font-normal cursor-pointer">
                    Troca de fralda/roupa
                  </Label>
                </div>

                {trocaFralda && (
                  <div className="ml-6">
                    <Label>Quantidade de fraldas</Label>
                    <Input
                      {...register('quantidadeFraldas')}
                      type="number"
                      className="mt-2"
                      placeholder="1"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Etapa 2: Condição da Pele */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label>Condição da pele</Label>
                <Controller
                  name="condicaoPele"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Ressecada">Ressecada</SelectItem>
                        <SelectItem value="Lesão">Lesão</SelectItem>
                        <SelectItem value="Edema">Edema</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label>Local da alteração</Label>
                <Input
                  {...register('localAlteracao')}
                  className="mt-2"
                  placeholder="Ex: Braços e pernas"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Controller
                  name="hidratanteAplicado"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="hidratante"
                    />
                  )}
                />
                <Label htmlFor="hidratante" className="font-normal cursor-pointer">
                  Hidratante aplicado
                </Label>
              </div>
            </div>
          )}

          {/* Etapa 3: Observações */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Observações</Label>
                <Textarea
                  {...register('observacoes')}
                  rows={5}
                  className="mt-2"
                  placeholder="Observações adicionais sobre o procedimento"
                />
              </div>
            </div>
          )}

          {/* Etapa 4: Informações Originais e Motivo da Edição */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {/* Card de Auditoria + Motivo da Edição */}
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
            </div>
          )}

        </form>
    </ActionDetailsSheet>
  )
}
