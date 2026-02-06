import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info } from 'lucide-react'
import { getCurrentTime } from '@/utils/dateHelpers'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

// ========== DESCRIÇÕES DOS COMPORTAMENTOS ==========

const COMPORTAMENTO_DESCRIPTIONS: Record<string, string> = {
  Calmo: 'Apresenta-se tranquilo, colaborativo e sem sinais de sofrimento emocional.',
  Ansioso: 'Mostra inquietação, preocupação ou tensão, podendo solicitar atenção com maior frequência.',
  Triste: 'Demonstra abatimento, choro fácil ou expressão de desânimo.',
  Eufórico: 'Apresenta excitação incomum, fala acelerada ou entusiasmo desproporcional ao contexto.',
  Irritado: 'Mostra impaciência, respostas ríspidas ou baixa tolerância a contrariedades.',
  Apático: 'Revela pouca iniciativa, reduzida interação ou desinteresse pelo ambiente.',
  Outro: 'Utilizar quando o comportamento observado não se enquadrar nas opções acima, descrevendo de forma objetiva.',
}

const comportamentoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  estadoEmocional: z.string().min(1, 'Comportamento é obrigatório'),
  outroEstado: z.string().optional(),
  observacoes: z.string().optional(),
})

type ComportamentoFormData = z.infer<typeof comportamentoSchema>

interface ComportamentoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ComportamentoFormData) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function ComportamentoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: ComportamentoModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<ComportamentoFormData>({
    resolver: zodResolver(comportamentoSchema),
    defaultValues: {
      time: getCurrentTime(),
    },
  })

  const watchEstadoEmocional = watch('estadoEmocional')

  const handleFormSubmit = (data: ComportamentoFormData) => {
    const payload = {
      residentId,
      type: 'COMPORTAMENTO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        estadoEmocional: data.estadoEmocional,
        outroEstado: data.estadoEmocional === 'Outro' ? data.outroEstado : undefined,
        observacoes: data.observacoes,
      },
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
          <DialogTitle>Comportamento - {residentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Data: {formatDateOnlySafe(date)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
              Registre o comportamento conforme observado no momento do cuidado. Considere o contexto e descreva alterações em relação ao padrão habitual do residente. Mudanças relevantes devem ser comunicadas à equipe técnica.
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
                    {Object.keys(COMPORTAMENTO_DESCRIPTIONS).map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {/* Descrição do comportamento selecionado */}
            {watchEstadoEmocional && COMPORTAMENTO_DESCRIPTIONS[watchEstadoEmocional] && (
              <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{COMPORTAMENTO_DESCRIPTIONS[watchEstadoEmocional]}</span>
              </p>
            )}
            {errors.estadoEmocional && (
              <p className="text-sm text-danger mt-1">
                {errors.estadoEmocional.message}
              </p>
            )}
          </div>

          {watchEstadoEmocional === 'Outro' && (
            <div>
              <Label>Especificar outro comportamento</Label>
              <Input
                {...register('outroEstado')}
                className="mt-2"
                placeholder="Descreva o comportamento"
              />
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

          <div className="text-sm text-muted-foreground">
            Responsável: <span className="font-medium">{currentUserName}</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="success">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
