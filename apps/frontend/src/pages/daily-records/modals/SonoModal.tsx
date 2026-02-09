import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info } from 'lucide-react'
import { getCurrentTime, formatDateOnlySafe } from '@/utils/dateHelpers'
import type { CreateDailyRecordInput, SonoData } from '@/types/daily-records'
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

// ========== DESCRIÇÕES DOS PADRÕES DE SONO ==========

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

const sonoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  padraoSono: z.string().min(1, 'Padrão de sono é obrigatório'),
  outroPadrao: z.string().optional(),
  observacoes: z.string().optional(),
})

type SonoFormData = z.infer<typeof sonoSchema>

interface SonoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateDailyRecordInput<SonoData>) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function SonoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: SonoModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
  } = useForm<SonoFormData>({
    resolver: zodResolver(sonoSchema),
    defaultValues: {
      time: getCurrentTime(),
      padraoSono: '',
      outroPadrao: '',
      observacoes: '',
    },
  })

  const watchPadraoSono = watch('padraoSono')

  const handleFormSubmit = (data: SonoFormData) => {
    const payload: CreateDailyRecordInput<SonoData> = {
      residentId,
      type: 'SONO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        padraoSono: data.padraoSono,
        outroPadrao: data.padraoSono === 'Outro' ? data.outroPadrao : undefined,
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
          <DialogTitle>Avaliação de Sono - {residentName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Data: {formatDateOnlySafe(date)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
              Registre o padrão de sono observado no período avaliado. Alterações persistentes devem ser comunicadas à equipe técnica para investigação de possíveis causas.
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
            {/* Descrição do padrão de sono selecionado */}
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
              className="mt-2"
              placeholder="Observações adicionais sobre o sono..."
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
