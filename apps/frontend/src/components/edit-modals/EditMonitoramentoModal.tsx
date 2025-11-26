import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import InputMask from 'react-input-mask'
import { Edit } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
  onSubmit: (data: any) => void
  record: any
  isUpdating?: boolean
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
        pressaoArterial: record.data.pressaoArterial || '',
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
    const payload = {
      time: data.time,
      data: {
        pressaoArterial: data.pressaoArterial,
        temperatura: data.temperatura ? parseFloat(data.temperatura) : undefined,
        frequenciaCardiaca: data.frequenciaCardiaca
          ? parseInt(data.frequenciaCardiaca)
          : undefined,
        saturacaoO2: data.saturacaoO2 ? parseInt(data.saturacaoO2) : undefined,
        glicemia: data.glicemia ? parseInt(data.glicemia) : undefined,
      },
      notes: data.observacoes,
      editReason: data.editReason,
    }
    onSubmit(payload)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!record) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Monitoramento Vital
          </DialogTitle>
          <DialogDescription>
            Edite os dados do monitoramento vital. É obrigatório informar o motivo da edição.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
                  <InputMask
                    mask="999/99"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        className="mt-2"
                        placeholder="120/80"
                      />
                    )}
                  </InputMask>
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
                  <InputMask
                    mask="99.9"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        className="mt-2"
                        placeholder="36.5"
                      />
                    )}
                  </InputMask>
                )}
              />
            </div>

            <div>
              <Label>FC (bpm)</Label>
              <Controller
                name="frequenciaCardiaca"
                control={control}
                render={({ field }) => (
                  <InputMask
                    mask="999"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        className="mt-2"
                        placeholder="70"
                      />
                    )}
                  </InputMask>
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
                  <InputMask
                    mask="999"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        className="mt-2"
                        placeholder="96"
                      />
                    )}
                  </InputMask>
                )}
              />
            </div>

            <div>
              <Label>Glicemia (mg/dL)</Label>
              <Controller
                name="glicemia"
                control={control}
                render={({ field }) => (
                  <InputMask
                    mask="999"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        className="mt-2"
                        placeholder="95"
                      />
                    )}
                  </InputMask>
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

          <div className="bg-muted/30 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-sm">Informações do Registro Original</h4>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Registrado por:</span>{' '}
                {record.recordedBy}
              </p>
              <p>
                <span className="text-muted-foreground">Data:</span>{' '}
                {new Date(record.date).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
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
              className="resize-none"
            />
            {errors.editReason ? (
              <p className="text-sm text-danger">{errors.editReason.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Campo obrigatório para auditoria
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdating} className="bg-primary">
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
