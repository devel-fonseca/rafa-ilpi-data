import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, ShieldAlert, Info } from 'lucide-react'
import { formatDateOnlySafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import type { ComportamentoRecord } from '@/types/daily-records'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ActionDetailsSheet } from '@/design-system/components'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const COMPORTAMENTO_DESCRIPTIONS: Record<string, string> = {
  Calmo: 'Apresenta-se tranquilo, colaborativo e sem sinais de sofrimento emocional.',
  Ansioso: 'Mostra inquietação, preocupação ou tensão, podendo solicitar atenção com maior frequência.',
  Triste: 'Demonstra abatimento, choro fácil ou expressão de desânimo.',
  Eufórico: 'Apresenta excitação incomum, fala acelerada ou entusiasmo desproporcional ao contexto.',
  Irritado: 'Mostra impaciência, respostas ríspidas ou baixa tolerância a contrariedades.',
  Apático: 'Revela pouca iniciativa, reduzida interação ou desinteresse pelo ambiente.',
  Outro: 'Utilizar quando o comportamento observado não se enquadrar nas opções acima.',
}

const COMPORTAMENTO_OPTIONS = Object.keys(COMPORTAMENTO_DESCRIPTIONS)

function mapDescricaoToForm(descricaoRaw: unknown): { estadoEmocional: string; outroEstado: string } {
  const descricao = typeof descricaoRaw === 'string' ? descricaoRaw.trim() : ''
  if (!descricao) {
    return { estadoEmocional: '', outroEstado: '' }
  }
  if (COMPORTAMENTO_OPTIONS.includes(descricao)) {
    return { estadoEmocional: descricao, outroEstado: '' }
  }
  return { estadoEmocional: 'Outro', outroEstado: descricao }
}

const editComportamentoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  estadoEmocional: z.string().min(1, 'Comportamento é obrigatório'),
  outroEstado: z.string().optional(),
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
}).superRefine((data, ctx) => {
  if (data.estadoEmocional === 'Outro' && !data.outroEstado?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['outroEstado'],
      message: 'Especifique o comportamento',
    })
  }
})

type EditComportamentoFormData = z.infer<typeof editComportamentoSchema>

interface EditComportamentoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: ComportamentoRecord
  isUpdating?: boolean
}

export function EditComportamentoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditComportamentoModalProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<EditComportamentoFormData>({
    resolver: zodResolver(editComportamentoSchema),
  })
  const watchEstadoEmocional = watch('estadoEmocional')

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      const recordData = record.data as Record<string, unknown>
      const comportamentoForm = mapDescricaoToForm(recordData.descricao)
      reset({
        time: record.time,
        estadoEmocional: comportamentoForm.estadoEmocional,
        outroEstado: comportamentoForm.outroEstado,
        observacoes: record.notes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditComportamentoFormData) => {
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

    const nextDescricao =
      data.estadoEmocional === 'Outro'
        ? data.outroEstado?.trim() || 'Outro'
        : data.estadoEmocional

    const recordData = record.data as Record<string, unknown>
    const nextData = {
      descricao: nextDescricao,
    }
    const currentData = {
      descricao: String(recordData.descricao || ''),
    }
    if (JSON.stringify(nextData) !== JSON.stringify(currentData)) {
      payload.data = nextData
    }

    onSubmit(payload)
  }

  const formId = 'edit-comportamento-form'

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Editar Comportamento"
      description="É obrigatório informar o motivo da edição para auditoria."
      icon={<Edit className="h-4 w-4" />}
      summary={(
        <div className="bg-muted/20 p-4 rounded-lg border text-sm text-muted-foreground">
          Registro original: <span className="font-medium text-foreground">{formatDateOnlySafe(record.date)}</span>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isUpdating}
          >
            Cancelar
          </Button>
          <Button type="submit" size="sm" variant="success" form={formId} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </>
      )}
    >
        <form id={formId} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Horário
            </Label>
            <Input {...register('time')} type="time" className="mt-2" />
            {errors.time && (
              <p className="text-sm text-danger mt-1">{errors.time.message}</p>
            )}
          </div>

        <div>
          <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
            Comportamento
          </Label>
          <Controller
            name="estadoEmocional"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {COMPORTAMENTO_OPTIONS.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {watchEstadoEmocional && COMPORTAMENTO_DESCRIPTIONS[watchEstadoEmocional] && (
            <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{COMPORTAMENTO_DESCRIPTIONS[watchEstadoEmocional]}</span>
            </p>
          )}
          {errors.estadoEmocional && <p className="text-sm text-danger mt-1">{errors.estadoEmocional.message}</p>}
        </div>

        {watchEstadoEmocional === 'Outro' && (
          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
              Especificar comportamento
            </Label>
            <Input
              {...register('outroEstado')}
              className="mt-2"
              placeholder="Descreva o comportamento observado"
            />
            {errors.outroEstado && <p className="text-sm text-danger mt-1">{errors.outroEstado.message}</p>}
          </div>
        )}

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2"
              placeholder="Observações adicionais sobre o comportamento..."
            />
          </div>

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
                    : ` em ${formatDateOnlySafe(record.date)} ${record.time}`}
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
        </form>
    </ActionDetailsSheet>
  )
}
