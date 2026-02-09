import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, ShieldAlert, Info } from 'lucide-react'
import { formatDateOnlySafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import type { SonoRecord } from '@/types/daily-records'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ActionDetailsSheet } from '@/design-system/components'

const SONO_DESCRIPTIONS: Record<string, string> = {
  Preservado: 'Sono ocorrido de forma contínua ou com despertares breves, mantendo padrão habitual e aspecto reparador.',
  'Insônia inicial': 'Dificuldade para iniciar o sono, com tempo prolongado até adormecer.',
  'Insônia intermediária': 'Despertares frequentes durante a noite, com dificuldade para retomar o sono.',
  'Insônia terminal': 'Despertar precoce, antes do horário habitual, sem conseguir voltar a dormir.',
  'Sono fragmentado': 'Sono interrompido por múltiplos despertares, resultando em descanso percebido como insuficiente.',
  Hipersonia: 'Períodos prolongados de sono ou sonolência excessiva ao longo do dia, acima do padrão do residente.',
  'Inversão do ciclo sono–vigília': 'Predomínio de sono durante o dia e maior estado de vigília no período noturno.',
  Outro: 'Selecionar quando o padrão observado não corresponder às opções anteriores, descrevendo de forma objetiva.',
}

const editSonoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  padraoSono: z.string().min(1, 'Padrão de sono é obrigatório'),
  outroPadrao: z.string().optional(),
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditSonoFormData = z.infer<typeof editSonoSchema>

interface EditSonoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: SonoRecord
  isUpdating?: boolean
}

type ComparableSonoData = {
  padraoSono?: string
  outroPadrao?: string
}

function normalizeComparableSonoData(data: Record<string, unknown>): ComparableSonoData {
  return {
    padraoSono: data.padraoSono ? String(data.padraoSono) : undefined,
    outroPadrao: data.outroPadrao ? String(data.outroPadrao) : undefined,
  }
}

export function EditSonoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditSonoModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<EditSonoFormData>({
    resolver: zodResolver(editSonoSchema),
  })

  const watchPadraoSono = watch('padraoSono')

  useEffect(() => {
    if (record && open) {
      reset({
        time: record.time,
        padraoSono: record.data.padraoSono || '',
        outroPadrao: record.data.outroPadrao || '',
        observacoes: record.notes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditSonoFormData) => {
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

    const nextData: ComparableSonoData = {
      padraoSono: data.padraoSono,
      outroPadrao: data.padraoSono === 'Outro' ? (data.outroPadrao || '') : undefined,
    }
    const currentData = normalizeComparableSonoData(record.data as Record<string, unknown>)

    if (JSON.stringify(nextData) !== JSON.stringify(currentData)) {
      payload.data = nextData
    }

    onSubmit(payload)
  }

  const formId = 'edit-sono-form'

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Editar Avaliação de Sono"
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
            Padrão de Sono
          </Label>
          <Controller
            name="padraoSono"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(SONO_DESCRIPTIONS).map((padrao) => (
                    <SelectItem key={padrao} value={padrao}>
                      {padrao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {watchPadraoSono && SONO_DESCRIPTIONS[watchPadraoSono] && (
            <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{SONO_DESCRIPTIONS[watchPadraoSono]}</span>
            </p>
          )}
          {errors.padraoSono && (
            <p className="text-sm text-danger mt-1">
              {errors.padraoSono.message}
            </p>
          )}
        </div>

        {watchPadraoSono === 'Outro' && (
          <div>
            <Label>Especificar outro padrão</Label>
            <Input
              {...register('outroPadrao')}
              className="mt-2"
              placeholder="Descreva o padrão de sono"
            />
          </div>
        )}

        <div>
          <Label>Observações</Label>
          <Textarea
            {...register('observacoes')}
            rows={3}
            className="mt-2 resize-none"
            placeholder="Observações adicionais sobre o sono..."
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
