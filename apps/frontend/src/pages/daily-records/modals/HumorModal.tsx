/* eslint-disable no-restricted-syntax */
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info } from 'lucide-react'
import { getCurrentTime, formatDateOnlySafe } from '@/utils/dateHelpers'
import type { CreateDailyRecordInput, HumorData } from '@/types/daily-records'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Alert, AlertDescription } from '@/components/ui/alert'

// ========== DESCRIÇÕES DOS HUMORES ==========

const HUMOR_DESCRIPTIONS: Record<string, string> = {
  Eutímico: 'Humor estável e compatível com o contexto, sem alterações aparentes.',
  Disfórico: 'Relata ou demonstra mal-estar emocional persistente, como irritação ou insatisfação.',
  Deprimido: 'Apresenta humor rebaixado, com sinais consistentes de tristeza ou perda de interesse.',
  Elevado: 'Humor acima do habitual, com expansividade ou otimismo excessivo.',
  Irritável: 'Predomínio de irritabilidade ou reatividade emocional.',
  Lábil: 'Oscilações rápidas e pouco previsíveis do estado emocional.',
  Outro: 'Selecionar quando o humor não corresponder às categorias anteriores, descrevendo brevemente.',
}

const humorSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  humor: z.string().min(1, 'Humor é obrigatório'),
  outroHumor: z.string().optional(),
  observacoes: z.string().optional(),
})

type HumorFormData = z.infer<typeof humorSchema>

interface HumorModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateDailyRecordInput<HumorData>) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function HumorModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: HumorModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid, isSubmitting, submitCount },
    reset,
    watch,
  } = useForm<HumorFormData>({
    resolver: zodResolver(humorSchema),
    mode: 'onChange',
    defaultValues: {
      time: getCurrentTime(),
      humor: '',
      outroHumor: '',
      observacoes: '',
    },
  })

  const watchHumor = watch('humor')

  const handleFormSubmit = (data: HumorFormData) => {
    const payload: CreateDailyRecordInput<HumorData> = {
      residentId,
      type: 'HUMOR',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        humor: data.humor,
        outroHumor: data.humor === 'Outro' ? data.outroHumor : undefined,
      },
      notes: data.observacoes,
    }
    onSubmit(payload)
    reset()
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avaliação de Humor - {residentName}</DialogTitle>
          <DialogDescription className="text-sm">
            Preencha os campos obrigatórios marcados com * para salvar este registro.
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            Data: {formatDateOnlySafe(date)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {submitCount > 0 && !isValid && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              Revise os campos obrigatórios destacados para continuar.
            </div>
          )}
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
              Selecione o humor que melhor represente o estado afetivo predominante do residente. Por ser um indicador mais estável, alterações podem sinalizar necessidade de avaliação técnica.
            </AlertDescription>
          </Alert>

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
              Humor
            </Label>
            <Controller
              name="humor"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(HUMOR_DESCRIPTIONS).map((humor) => (
                      <SelectItem key={humor} value={humor}>
                        {humor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {/* Descrição do humor selecionado */}
            {watchHumor && HUMOR_DESCRIPTIONS[watchHumor] && (
              <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{HUMOR_DESCRIPTIONS[watchHumor]}</span>
              </p>
            )}
            {errors.humor && (
              <p className="text-sm text-danger mt-1">
                {errors.humor.message}
              </p>
            )}
          </div>

          {watchHumor === 'Outro' && (
            <div>
              <Label>Especificar outro humor</Label>
              <Input
                {...register('outroHumor')}
                className="mt-2"
                placeholder="Descreva o humor"
              />
            </div>
          )}

          <div>
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={3}
              className="mt-2"
              placeholder="Observações adicionais sobre o humor..."
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Responsável: <span className="font-medium">{currentUserName}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
