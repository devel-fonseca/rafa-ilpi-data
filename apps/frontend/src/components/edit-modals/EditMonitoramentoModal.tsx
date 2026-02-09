import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, ShieldAlert } from 'lucide-react'
import { formatDateOnlySafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import { MaskedInput } from '@/components/form/MaskedInput'
import type { MonitoramentoRecord } from '@/types/daily-records'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ActionDetailsSheet } from '@/design-system/components'

const editMonitoramentoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  pressaoArterial: z.string().optional(),
  temperatura: z.string().optional(),
  frequenciaCardiaca: z.string().optional(),
  saturacaoO2: z.string().optional(),
  glicemia: z.string().optional(),
  observacoes: z.string().optional(),
  editReason: z
    .string()
    .min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditMonitoramentoFormData = z.infer<typeof editMonitoramentoSchema>

interface EditMonitoramentoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: MonitoramentoRecord
  isUpdating?: boolean
}

type ComparableMonitoramentoData = {
  pressaoArterial?: string
  temperatura?: number
  frequenciaCardiaca?: number
  saturacaoO2?: number
  glicemia?: number
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function normalizeComparableMonitoramentoData(data: Record<string, unknown>): ComparableMonitoramentoData {
  return {
    pressaoArterial: data.pressaoArterial ? String(data.pressaoArterial) : undefined,
    temperatura: toOptionalNumber(data.temperatura),
    frequenciaCardiaca: toOptionalNumber(data.frequenciaCardiaca),
    saturacaoO2: toOptionalNumber(data.saturacaoO2),
    glicemia: toOptionalNumber(data.glicemia),
  }
}

export function EditMonitoramentoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating = false,
}: EditMonitoramentoModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<EditMonitoramentoFormData>({
    resolver: zodResolver(editMonitoramentoSchema),
  })

  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        pressaoArterial: record.data.pressaoArterial ? String(record.data.pressaoArterial) : '',
        temperatura: record.data.temperatura?.toString() || '',
        frequenciaCardiaca: record.data.frequenciaCardiaca?.toString() || '',
        saturacaoO2: record.data.saturacaoO2?.toString() || '',
        glicemia: record.data.glicemia?.toString() || '',
        observacoes: record.notes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditMonitoramentoFormData) => {
    const payload: Record<string, unknown> = {
      editReason: data.editReason,
    }

    if (data.time !== record.time) {
      payload.time = data.time
    }

    const originalData = record.data as Record<string, unknown>
    const nextData: ComparableMonitoramentoData = {
      pressaoArterial: data.pressaoArterial || undefined,
      temperatura: data.temperatura ? parseFloat(data.temperatura) : undefined,
      frequenciaCardiaca: data.frequenciaCardiaca ? parseInt(data.frequenciaCardiaca, 10) : undefined,
      saturacaoO2: data.saturacaoO2 ? parseInt(data.saturacaoO2, 10) : undefined,
      glicemia: data.glicemia ? parseInt(data.glicemia, 10) : undefined,
    }

    const currentData = normalizeComparableMonitoramentoData(originalData)
    if (JSON.stringify(nextData) !== JSON.stringify(currentData)) {
      payload.data = nextData
    }

    const nextNotes = data.observacoes || ''
    const currentNotes = record.notes || ''
    if (nextNotes !== currentNotes) {
      payload.notes = nextNotes
    }

    onSubmit(payload)
  }

  const formId = 'edit-monitoramento-form'

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Editar Monitoramento Vital"
      description="Edite os dados do monitoramento vital. É obrigatório informar o motivo da edição."
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
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" variant="success" form={formId} disabled={isUpdating}>
            {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </>
      )}
    >
      <form id={formId} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="after:content-['*'] after:ml-0.5 after:text-danger">Horário</Label>
            <Input {...register('time')} type="time" className="mt-2" />
            {errors.time && (
              <p className="text-sm text-danger mt-1">{errors.time.message}</p>
            )}
          </div>

          <div>
            <Label>PA (mmHg)</Label>
            <Controller
              name="pressaoArterial"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  mask="999/99"
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="120/80"
                  className="mt-2"
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Temp (°C)</Label>
            <Controller
              name="temperatura"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  mask="99.9"
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="36.5"
                  className="mt-2"
                />
              )}
            />
          </div>

          <div>
            <Label>FC (bpm)</Label>
            <Controller
              name="frequenciaCardiaca"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  mask="999"
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="70"
                  className="mt-2"
                />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>SpO2 (%)</Label>
            <Controller
              name="saturacaoO2"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  mask="999"
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="96"
                  className="mt-2"
                />
              )}
            />
          </div>

          <div>
            <Label>Glicemia (mg/dL)</Label>
            <Controller
              name="glicemia"
              control={control}
              render={({ field }) => (
                <MaskedInput
                  mask="999"
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="95"
                  className="mt-2"
                />
              )}
            />
          </div>
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea
            {...register('observacoes')}
            rows={3}
            className="mt-2"
            placeholder="Observações adicionais"
          />
        </div>

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
            <Label
              htmlFor="editReason"
              className="after:content-['*'] after:ml-0.5 after:text-danger"
            >
              Motivo da edição
            </Label>
            <Textarea
              {...register('editReason')}
              id="editReason"
              placeholder="Descreva o motivo da edição (mínimo 10 caracteres)..."
              rows={4}
              className="mt-2 resize-none"
            />
            {errors.editReason ? (
              <p className="text-sm text-danger mt-1">{errors.editReason.message}</p>
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
