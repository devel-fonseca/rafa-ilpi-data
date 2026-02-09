import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, ShieldAlert } from 'lucide-react'
import { formatDateOnlySafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import type { VisitaRecord } from '@/types/daily-records'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ActionDetailsSheet } from '@/design-system/components'

const editVisitaSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  visitante: z.string().min(1, 'Visitante é obrigatório'),
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditVisitaFormData = z.infer<typeof editVisitaSchema>

interface EditVisitaModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: VisitaRecord
  isUpdating?: boolean
}

type ComparableVisitaData = {
  visitante?: string
}

function normalizeComparableVisitaData(data: Record<string, unknown>): ComparableVisitaData {
  return {
    visitante: data.visitante ? String(data.visitante) : undefined,
  }
}

export function EditVisitaModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditVisitaModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EditVisitaFormData>({
    resolver: zodResolver(editVisitaSchema),
  })

  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        visitante: record.data.visitante || '',
        observacoes: record.notes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditVisitaFormData) => {
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

    const nextData: ComparableVisitaData = {
      visitante: data.visitante,
    }
    const currentData = normalizeComparableVisitaData(record.data as Record<string, unknown>)

    if (JSON.stringify(nextData) !== JSON.stringify(currentData)) {
      payload.data = nextData
    }

    onSubmit(payload)
  }

  const formId = 'edit-visita-form'

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Editar Visita"
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
            Visitante
          </Label>
          <Input
            {...register('visitante')}
            className="mt-2"
            placeholder="Ex: João Silva (filho)"
          />
          {errors.visitante && (
            <p className="text-sm text-danger mt-1">
              {errors.visitante.message}
            </p>
          )}
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea
            {...register('observacoes')}
            rows={3}
            className="mt-2 resize-none"
            placeholder="Observações sobre a visita"
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
