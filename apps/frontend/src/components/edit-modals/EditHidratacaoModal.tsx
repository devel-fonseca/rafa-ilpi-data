import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, ShieldAlert } from 'lucide-react'
import { formatDateOnlySafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import type { HidratacaoRecord } from '@/types/daily-records'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ActionDetailsSheet } from '@/design-system/components'

const editHidratacaoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  volumeMl: z
    .number({ message: 'Volume é obrigatório' })
    .positive('Volume deve ser maior que zero')
    .max(5000, 'Volume máximo: 5000ml'),
  tipo: z.string().optional(),
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditHidratacaoFormData = z.infer<typeof editHidratacaoSchema>

interface EditHidratacaoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: HidratacaoRecord
  isUpdating?: boolean
}

type ComparableHidratacaoData = {
  volumeMl?: number
  tipo?: string
}

function normalizeComparableHidratacaoData(data: Record<string, unknown>): ComparableHidratacaoData {
  const volume = data.volumeMl !== undefined && data.volumeMl !== null
    ? Number(data.volumeMl)
    : undefined

  return {
    volumeMl: Number.isFinite(volume) ? volume : undefined,
    tipo: data.tipo ? String(data.tipo) : undefined,
  }
}

export function EditHidratacaoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditHidratacaoModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditHidratacaoFormData>({
    resolver: zodResolver(editHidratacaoSchema),
  })

  useEffect(() => {
    if (record && open) {
      const volumeMlValue = record.data.volumeMl
        ? typeof record.data.volumeMl === 'string'
          ? parseInt(record.data.volumeMl, 10)
          : record.data.volumeMl
        : 200

      reset({
        time: record.time,
        volumeMl: volumeMlValue,
        tipo: record.data.tipo || '',
        observacoes: record.notes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditHidratacaoFormData) => {
    const payload: Record<string, unknown> = {
      editReason: data.editReason,
    }

    if (data.time !== record.time) {
      payload.time = data.time
    }

    const nextData: ComparableHidratacaoData = {
      volumeMl: data.volumeMl,
      tipo: data.tipo || undefined,
    }
    const currentData = normalizeComparableHidratacaoData(record.data as Record<string, unknown>)

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

  const formId = 'edit-hidratacao-form'

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Editar Hidratação"
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
            Volume (ml)
          </Label>
          <Input
            {...register('volumeMl', { valueAsNumber: true })}
            type="number"
            className="mt-2"
            placeholder="200"
          />
          {errors.volumeMl && (
            <p className="text-sm text-danger mt-1">
              {errors.volumeMl.message}
            </p>
          )}
        </div>

        <div>
          <Label>Tipo</Label>
          <Input
            {...register('tipo')}
            className="mt-2"
            placeholder="Água, suco, chá..."
          />
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea
            {...register('observacoes')}
            rows={3}
            className="mt-2 resize-none"
            placeholder="Observações adicionais (opcional)"
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
