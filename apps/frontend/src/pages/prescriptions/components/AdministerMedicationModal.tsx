import { useEffect, useRef } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useAdministerMedication } from '@/hooks/usePrescriptions'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import type { AdministerMedicationDto, Medication } from '@/api/prescriptions.api'
import { getCurrentDate, getCurrentTime } from '@/utils/dateHelpers'
import { lockMedication, unlockMedication } from '@/api/medications.api'
import { formatMedicationPresentation } from '@/utils/formatters'

// Tipo estendido para medication com campo opcional preselectedScheduledTime
type MedicationWithPreselectedTime = Medication & {
  preselectedScheduledTime?: string
}

interface AdministerMedicationModalProps {
  open: boolean
  onClose: () => void
  medication: MedicationWithPreselectedTime | null
}

export function AdministerMedicationModal({
  open,
  onClose,
  medication,
}: AdministerMedicationModalProps) {
  const { user } = useAuthStore()
  const isTechnicalManager = user?.profile?.positionCode === 'TECHNICAL_MANAGER'
  const administerMutation = useAdministerMedication()
  const lockCreatedRef = useRef(false) // Rastrear se lock foi criado

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AdministerMedicationDto>({
    defaultValues: {
      medicationId: medication?.id,
      date: getCurrentDate(), // ✅ REFATORADO: Usar getCurrentDate do dateHelpers
      scheduledTime: medication?.scheduledTimes?.[0] || '08:00',
      actualTime: getCurrentTime(), // ✅ REFATORADO: Usar getCurrentTime do dateHelpers
      wasAdministered: true,
      administeredBy: user?.name || '',
      notes: '',
    },
  })

  const wasAdministered = watch('wasAdministered')

  const onSubmit = async (data: AdministerMedicationDto) => {
    const payload: AdministerMedicationDto = {
      ...data,
      // Apenas RT pode editar manualmente "Administrado por"
      administeredBy: isTechnicalManager ? data.administeredBy : (user?.name || data.administeredBy),
    }

    try {
      await administerMutation.mutateAsync(payload)
      toast.success('Administração registrada com sucesso!')

      // Desbloquear medicamento após administração bem-sucedida (Sprint 2)
      await handleUnlockMedication()

      reset()
      onClose()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined
      toast.error(errorMessage || 'Erro ao registrar administração')
    }
  }

  /**
   * Criar lock ao abrir modal (Sprint 2 - WebSocket)
   */
  const handleLockMedication = async () => {
    if (!medication || lockCreatedRef.current) return

    try {
      await lockMedication({
        medicationId: medication.id,
        scheduledDate: getCurrentDate(),
        scheduledTime: medication.preselectedScheduledTime || medication.scheduledTimes?.[0] || '08:00',
      })
      lockCreatedRef.current = true
      console.log('[Lock] Medicamento bloqueado:', medication.name)
    } catch (error: unknown) {
      console.error('[Lock] Erro ao bloquear medicamento:', error)
      // Se já está bloqueado, apenas logar (toast já foi exibido em TodayActions)
    }
  }

  /**
   * Remover lock ao fechar modal ou administrar (Sprint 2 - WebSocket)
   */
  const handleUnlockMedication = async () => {
    if (!medication || !lockCreatedRef.current) return

    try {
      await unlockMedication({
        medicationId: medication.id,
        scheduledDate: getCurrentDate(),
        scheduledTime: medication.preselectedScheduledTime || medication.scheduledTimes?.[0] || '08:00',
      })
      lockCreatedRef.current = false
      console.log('[Lock] Medicamento desbloqueado:', medication.name)
    } catch (error: unknown) {
      console.error('[Lock] Erro ao desbloquear medicamento:', error)
    }
  }

  /**
   * Fechar modal com cleanup de lock (Sprint 2)
   */
  const handleClose = async () => {
    await handleUnlockMedication()
    onClose()
  }

  // Resetar form e criar lock ao abrir modal (Sprint 2)
  useEffect(() => {
    if (open && medication) {
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

      // Criar lock ao abrir modal (Sprint 2)
      handleLockMedication()
    }

    // Cleanup: remover lock ao desmontar componente
    return () => {
      if (lockCreatedRef.current) {
        handleUnlockMedication()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, medication, user, reset])

  if (!medication) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Administrar Medicamento</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="mb-4 p-4 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/30 dark:border-primary/40">
          <h3 className="font-semibold text-primary dark:text-primary mb-1">{medication.name} {medication.concentration}</h3>
          <p className="text-sm text-primary/80 dark:text-primary/90">
            {formatMedicationPresentation(medication.presentation)}
          </p>
          <p className="text-sm text-primary/80 dark:text-primary/90 mt-1">
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
                <p className="text-sm text-danger mt-1">{errors.date.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="scheduledTime">Horário Programado *</Label>
              <Input
                id="scheduledTime"
                type="time"
                readOnly
                {...register('scheduledTime', {
                  required: 'Horário programado é obrigatório',
                })}
                className="bg-muted/50 cursor-default"
              />
              {errors.scheduledTime && (
                <p className="text-sm text-danger mt-1">
                  {errors.scheduledTime.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-muted/50 dark:bg-muted/20 rounded">
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
                <p className="text-xs text-muted-foreground mt-1">
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
                  readOnly={!isTechnicalManager}
                  className={!isTechnicalManager ? 'bg-muted/50 cursor-default' : undefined}
                />
                {errors.administeredBy && (
                  <p className="text-sm text-danger mt-1">
                    {errors.administeredBy.message}
                  </p>
                )}
                {!isTechnicalManager && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Preenchido automaticamente com o usuário logado.
                  </p>
                )}
              </div>

              {medication.requiresDoubleCheck && (
                <div className="p-3 bg-severity-warning/10 dark:bg-severity-warning/20 border border-severity-warning/30 dark:border-severity-warning/40 rounded">
                  <Label htmlFor="checkedBy">
                    Checado por (Dupla Checagem)
                  </Label>
                  <Input
                    id="checkedBy"
                    {...register('checkedBy')}
                    placeholder="Nome do segundo profissional"
                  />
                  <p className="text-xs text-severity-warning dark:text-severity-warning mt-1">
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
                <p className="text-sm text-danger mt-1">{errors.reason.message}</p>
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
