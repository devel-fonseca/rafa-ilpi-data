import React from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useAdministerMedication } from '@/hooks/usePrescriptions'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import type { AdministerMedicationDto } from '@/api/prescriptions.api'
import { getCurrentDate, getCurrentTime } from '@/utils/dateHelpers'

interface AdministerMedicationModalProps {
  open: boolean
  onClose: () => void
  medication: any
}

export function AdministerMedicationModal({
  open,
  onClose,
  medication,
}: AdministerMedicationModalProps) {
  const { user } = useAuthStore()
  const administerMutation = useAdministerMedication()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AdministerMedicationDto>({
    defaultValues: {
      medicationId: medication.id,
      date: getCurrentDate(), // ✅ REFATORADO: Usar getCurrentDate do dateHelpers
      scheduledTime: medication.scheduledTimes?.[0] || '08:00',
      actualTime: getCurrentTime(), // ✅ REFATORADO: Usar getCurrentTime do dateHelpers
      wasAdministered: true,
      administeredBy: user?.name || '',
      notes: '',
    },
  })

  const wasAdministered = watch('wasAdministered')

  const onSubmit = async (data: AdministerMedicationDto) => {
    try {
      await administerMutation.mutateAsync(data)
      toast.success('Administração registrada com sucesso!')
      reset()
      onClose()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao registrar administração')
    }
  }

  React.useEffect(() => {
    if (open) {
      reset({
        medicationId: medication.id,
        date: getCurrentDate(), // ✅ REFATORADO: Usar getCurrentDate do dateHelpers
        // Usar horário pré-selecionado se disponível, senão usar o primeiro da lista
        scheduledTime: medication.preselectedScheduledTime || medication.scheduledTimes?.[0] || '08:00',
        actualTime: getCurrentTime(), // ✅ REFATORADO: Usar getCurrentTime do dateHelpers
        wasAdministered: true,
        administeredBy: user?.name || '',
        notes: '',
      })
    }
  }, [open, medication, user, reset])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Administrar Medicamento</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-1">{medication.name}</h3>
          <p className="text-sm text-blue-700">
            {medication.presentation} - {medication.concentration}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            <span className="font-medium">Dose:</span> {medication.dose} -{' '}
            <span className="font-medium">Via:</span> {medication.route}
          </p>
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
                <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="scheduledTime">Horário Programado *</Label>
              <select
                id="scheduledTime"
                {...register('scheduledTime', {
                  required: 'Horário programado é obrigatório',
                })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {medication.scheduledTimes?.map((time: string) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              {errors.scheduledTime && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.scheduledTime.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded">
            <Checkbox
              id="wasAdministered"
              checked={wasAdministered}
              onCheckedChange={(checked) =>
                setValue('wasAdministered', checked as boolean)
              }
            />
            <Label htmlFor="wasAdministered" className="font-normal cursor-pointer">
              Medicamento foi administrado
            </Label>
          </div>

          {wasAdministered ? (
            <>
              <div>
                <Label htmlFor="actualTime">Horário Real de Administração</Label>
                <Input
                  id="actualTime"
                  type="time"
                  {...register('actualTime')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deixe em branco se foi no horário programado
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
                  <p className="text-sm text-red-600 mt-1">
                    {errors.administeredBy.message}
                  </p>
                )}
              </div>

              {medication.requiresDoubleCheck && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                  <Label htmlFor="checkedBy">
                    Checado por (Dupla Checagem)
                  </Label>
                  <Input
                    id="checkedBy"
                    {...register('checkedBy')}
                    placeholder="Nome do segundo profissional"
                  />
                  <p className="text-xs text-orange-700 mt-1">
                    Este medicamento requer dupla checagem
                  </p>
                </div>
              )}
            </>
          ) : (
            <div>
              <Label htmlFor="reason">Motivo da Não Administração *</Label>
              <Textarea
                id="reason"
                {...register('reason', {
                  required: !wasAdministered
                    ? 'Motivo é obrigatório quando não administrado'
                    : false,
                })}
                placeholder="Ex: Paciente recusou, vomitou, etc."
                rows={3}
              />
              {errors.reason && (
                <p className="text-sm text-red-600 mt-1">{errors.reason.message}</p>
              )}
            </div>
          )}

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
