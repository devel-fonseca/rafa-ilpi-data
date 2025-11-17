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
import { useAdministerSOS } from '@/hooks/usePrescriptions'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import type { AdministerSOSDto } from '@/api/prescriptions.api'

interface AdministerSOSModalProps {
  open: boolean
  onClose: () => void
  sosMedication: any
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
      sosMedicationId: sosMedication.id,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
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
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao registrar administração SOS')
    }
  }

  React.useEffect(() => {
    if (open) {
      reset({
        sosMedicationId: sosMedication.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        indication: sosMedication.indicationDetails || '',
        administeredBy: user?.name || '',
        notes: '',
      })
    }
  }, [open, sosMedication, user, reset])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Administrar Medicação SOS</DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h3 className="font-semibold text-orange-900 mb-1">{sosMedication.name}</h3>
          <p className="text-sm text-orange-700">
            {sosMedication.presentation} - {sosMedication.concentration}
          </p>
          <p className="text-sm text-orange-700 mt-1">
            <span className="font-medium">Dose:</span> {sosMedication.dose} -{' '}
            <span className="font-medium">Via:</span> {sosMedication.route}
          </p>
          <div className="mt-2 flex gap-4 text-xs text-orange-800">
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
                <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
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
                <p className="text-sm text-red-600 mt-1">{errors.time.message}</p>
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
              <p className="text-sm text-red-600 mt-1">{errors.indication.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
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
              <p className="text-sm text-red-600 mt-1">
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
      </DialogContent>
    </Dialog>
  )
}
