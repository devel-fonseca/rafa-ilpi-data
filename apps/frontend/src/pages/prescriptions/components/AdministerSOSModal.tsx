import React from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAdministerSOS } from '@/hooks/usePrescriptions'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import type { AdministerSOSDto, SOSMedication } from '@/api/prescriptions.api'
import { getCurrentDate, getCurrentTime } from '@/utils/dateHelpers'
import { formatMedicationPresentation } from '@/utils/formatters'

interface AdministerSOSModalProps {
  open: boolean
  onClose: () => void
  sosMedication: SOSMedication | null
}

export function AdministerSOSModal({
  open,
  onClose,
  sosMedication,
}: AdministerSOSModalProps) {
  const { user } = useAuthStore()
  const administerMutation = useAdministerSOS()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdministerSOSDto>({
    defaultValues: {
      sosMedicationId: sosMedication?.id || '',
      date: getCurrentDate(),
      time: getCurrentTime(),
      indication: '',
      administeredBy: user?.name || '',
      notes: '',
    },
  })

  const onSubmit = async (data: AdministerSOSDto) => {
    try {
      await administerMutation.mutateAsync(data)
      toast.success('Administração SOS registrada com sucesso!')
      reset()
      onClose()
    } catch (error: unknown) {
      const errorResponse = error as { response?: { data?: { message?: string } } }
      toast.error(errorResponse?.response?.data?.message || 'Erro ao registrar administração SOS')
    }
  }

  React.useEffect(() => {
    if (open && sosMedication) {
      reset({
        sosMedicationId: sosMedication.id,
        date: getCurrentDate(),
        time: getCurrentTime(),
        indication: sosMedication.indicationDetails || '',
        administeredBy: user?.name || '',
        notes: '',
      })
    }
  }, [open, sosMedication, user, reset])

  // Early return se não há medicação SOS
  if (!sosMedication) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Administrar Medicação SOS</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="mb-4 p-4 bg-severity-warning/5 rounded-lg border border-severity-warning/30">
          <h3 className="font-semibold text-severity-warning/90 mb-1">{sosMedication.name}</h3>
          <p className="text-sm text-severity-warning/80">
            {formatMedicationPresentation(sosMedication.presentation)} - {sosMedication.concentration}
          </p>
          <p className="text-sm text-severity-warning/80 mt-1">
            <span className="font-medium">Dose:</span> {sosMedication.dose} -{' '}
            <span className="font-medium">Via:</span> {sosMedication.route}
          </p>
          <div className="mt-2 flex gap-4 text-xs text-severity-warning/90">
            <span>
              <strong>Intervalo Mínimo:</strong> {sosMedication.minInterval}
            </span>
            <span>
              <strong>Máx. Diária:</strong> {sosMedication.maxDailyDoses}x
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                {...register('date', { required: 'Data é obrigatória' })}
              />
              {errors.date && (
                <p className="text-sm text-danger mt-1">{errors.date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="time">Horário *</Label>
              <Input
                id="time"
                type="time"
                {...register('time', { required: 'Horário é obrigatório' })}
              />
              {errors.time && (
                <p className="text-sm text-danger mt-1">{errors.time.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="indication">Motivo da Administração *</Label>
            <Textarea
              id="indication"
              {...register('indication', {
                required: 'Motivo é obrigatório',
              })}
              placeholder={`Ex: ${sosMedication.indicationDetails || 'Descreva o motivo...'}`}
              rows={3}
            />
            {errors.indication && (
              <p className="text-sm text-danger mt-1">{errors.indication.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Descreva o motivo específico da administração (sintomas, queixas, etc.)
            </p>
          </div>

          <div>
            <Label htmlFor="administeredBy">Administrado por *</Label>
            <Input
              id="administeredBy"
              {...register('administeredBy', {
                required: 'Nome do profissional é obrigatório',
              })}
              placeholder="Nome do profissional"
            />
            {errors.administeredBy && (
              <p className="text-sm text-danger mt-1">
                {errors.administeredBy.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={administerMutation.isPending}
            >
              {administerMutation.isPending
                ? 'Salvando...'
                : 'Registrar Administração'}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
