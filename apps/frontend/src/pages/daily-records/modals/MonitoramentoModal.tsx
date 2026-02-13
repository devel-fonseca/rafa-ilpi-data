import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getCurrentTime, formatDateOnlySafe } from '@/utils/dateHelpers'
import type { CreateDailyRecordInput, MonitoramentoData } from '@/types/daily-records'
import { MaskedInput } from '@/components/form/MaskedInput'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const monitoramentoSchema = z.object({
  time: z
    .string()
    .min(1, 'Horário é obrigatório')
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido'),
  pressaoArterial: z.string().optional(),
  temperatura: z.string().optional(),
  frequenciaCardiaca: z.string().optional(),
  saturacaoO2: z.string().optional(),
  glicemia: z.string().optional(),
})

type MonitoramentoFormData = z.infer<typeof monitoramentoSchema>

interface MonitoramentoModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateDailyRecordInput<MonitoramentoData>) => void
  residentId: string
  residentName: string
  date: string
  currentUserName: string
}

export function MonitoramentoModal({
  open,
  onClose,
  onSubmit,
  residentId,
  residentName,
  date,
  currentUserName,
}: MonitoramentoModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid, isSubmitting, submitCount },
    reset,
  } = useForm<MonitoramentoFormData>({
    resolver: zodResolver(monitoramentoSchema),
    mode: 'onChange',
    defaultValues: {
      time: getCurrentTime(),
    },
  })

  const handleFormSubmit = (data: MonitoramentoFormData) => {
    const payload: CreateDailyRecordInput<MonitoramentoData> = {
      residentId,
      type: 'MONITORAMENTO',
      date,
      time: data.time,
      recordedBy: currentUserName,
      data: {
        pressaoArterial: data.pressaoArterial,
        temperatura: data.temperatura ? parseFloat(data.temperatura) : undefined,
        frequenciaCardiaca: data.frequenciaCardiaca
          ? parseInt(data.frequenciaCardiaca)
          : undefined,
        saturacaoO2: data.saturacaoO2
          ? parseInt(data.saturacaoO2)
          : undefined,
        glicemia: data.glicemia ? parseInt(data.glicemia) : undefined,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Monitoramento Vital - {residentName}</DialogTitle>
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
          <div className="grid grid-cols-2 gap-4">
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
