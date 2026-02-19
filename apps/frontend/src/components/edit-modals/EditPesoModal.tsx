import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, ShieldAlert } from 'lucide-react'
import { formatDateOnlySafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import {
  calculateBmiFromKgCm,
  formatHeightCmInput,
  formatWeightInput,
  metersToCentimeters,
  parseHeightCmInput,
  parseWeightInput,
} from '@/utils/anthropometryInput'
import type { PesoRecord } from '@/types/daily-records'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ActionDetailsSheet } from '@/design-system/components'

const editPesoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  peso: z
    .string()
    .min(1, 'Peso é obrigatório')
    .refine(
      (val) => {
        const num = parseWeightInput(val)
        return num !== null && num > 0 && num < 500
      },
      { message: 'Peso deve ser entre 0 e 500 kg' }
    ),
  altura: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true
        const num = parseHeightCmInput(val)
        return num !== null && num > 0 && num <= 300
      },
      { message: 'Altura deve ser entre 1 e 300 cm' }
    ),
  observacoes: z.string().optional(),
  editReason: z.string().min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
})

type EditPesoFormData = z.infer<typeof editPesoSchema>

interface EditPesoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => void
  record: PesoRecord
  isUpdating?: boolean
}

type ComparablePesoData = {
  peso?: number
  altura?: number
  imc?: number
}

function normalizeHeightToCm(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const height = Number(value)
  if (!Number.isFinite(height) || height <= 0) return undefined

  // Compatibilidade: alguns registros antigos podem estar em metros (ex.: 1.68).
  if (height <= 3) return metersToCentimeters(height)

  return Math.round(height)
}

function normalizeComparablePesoData(data: Record<string, unknown>): ComparablePesoData {
  const peso = data.peso !== undefined && data.peso !== null ? Number(data.peso) : undefined
  const altura = normalizeHeightToCm(data.altura)
  const imc = data.imc !== undefined && data.imc !== null ? Number(data.imc) : undefined

  return {
    peso: Number.isFinite(peso) ? peso : undefined,
    altura,
    imc: Number.isFinite(imc) ? Number(imc.toFixed(2)) : undefined,
  }
}

export function EditPesoModal({
  open,
  onClose,
  onSubmit,
  record,
  isUpdating,
}: EditPesoModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<EditPesoFormData>({
    resolver: zodResolver(editPesoSchema),
  })

  const watchPeso = watch('peso')
  const watchAltura = watch('altura')

  const imc = useMemo(() => {
    if (!watchPeso || !watchAltura) return null

    const pesoNum = parseWeightInput(watchPeso)
    const alturaCm = parseHeightCmInput(watchAltura)
    if (pesoNum === null || alturaCm === null) return null

    return calculateBmiFromKgCm(pesoNum, alturaCm)
  }, [watchPeso, watchAltura])

  const imcClassificacao = useMemo(() => {
    if (!imc) return null

    if (imc < 18.5) return { texto: 'Baixo peso', cor: 'text-warning' }
    if (imc < 25) return { texto: 'Peso normal', cor: 'text-success' }
    if (imc < 30) return { texto: 'Sobrepeso', cor: 'text-severity-warning' }
    return { texto: 'Obesidade', cor: 'text-danger' }
  }, [imc])

  // Preencher form com dados do registro ao abrir
  useEffect(() => {
    if (record && open) {
      // Formatar peso com vírgula para exibição
      const pesoFormatted = record.data.peso
        ? formatWeightInput(String(record.data.peso).replace('.', ','))
        : ''
      const alturaCm = normalizeHeightToCm(record.data.altura)

      reset({
        time: record.time,
        peso: pesoFormatted,
        altura: alturaCm ? String(alturaCm) : '',
        observacoes: record.notes || '',
        editReason: '',
      })
    }
  }, [record, open, reset])

  const handleFormSubmit = (data: EditPesoFormData) => {
    const pesoNum = parseWeightInput(data.peso)
    const alturaCm = parseHeightCmInput(data.altura)

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

    const nextData: ComparablePesoData = {
      peso: pesoNum !== null ? pesoNum : undefined,
      altura: alturaCm !== null ? alturaCm : undefined,
      imc: imc ? Number(imc.toFixed(2)) : undefined,
    }

    const currentData = normalizeComparablePesoData(record.data as Record<string, unknown>)
    if (JSON.stringify(nextData) !== JSON.stringify(currentData)) {
      payload.data = nextData
    }

    onSubmit(payload)
  }

  const formId = 'edit-peso-form'

  return (
    <ActionDetailsSheet
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
      title="Editar Peso e Altura"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="after:content-['*'] after:ml-0.5 after:text-danger">
                Peso (kg)
              </Label>
              <Input
                {...register('peso')}
                type="text"
                inputMode="decimal"
                placeholder="Ex: 65,5"
                className="mt-2"
                onChange={(e) => {
                  e.target.value = formatWeightInput(e.target.value)
                  register('peso').onChange(e)
                }}
              />
              {errors.peso && (
                <p className="text-sm text-danger mt-1">{errors.peso.message}</p>
              )}
            </div>

            <div>
              <Label>Altura (cm)</Label>
              <Input
                {...register('altura')}
                type="text"
                inputMode="numeric"
                placeholder="Ex: 170"
                className="mt-2"
                onChange={(e) => {
                  e.target.value = formatHeightCmInput(e.target.value)
                  register('altura').onChange(e)
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Digite em cm (ex: 170)
              </p>
              {errors.altura && (
                <p className="text-sm text-danger mt-1">
                  {errors.altura.message}
                </p>
              )}
            </div>
          </div>

          {imc && imcClassificacao && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">
                IMC:{' '}
                <span className="text-primary">{imc.toFixed(1)} kg/m²</span>
              </p>
              <p className="text-sm">
                Classificação:{' '}
                <span className={`font-medium ${imcClassificacao.cor}`}>
                  {imcClassificacao.texto}
                </span>
              </p>
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2 resize-none"
              placeholder="Observações adicionais sobre peso/altura..."
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
