// ──────────────────────────────────────────────────────────────────────────────
//  MODAL - EditMedicationAdministrationModal (Edição de Administração)
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Edit, Pill, ShieldAlert, Loader2 } from 'lucide-react'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { formatMedicationPresentation } from '@/utils/formatters'
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
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import type { MedicationAdministration } from '../types'

// ========== VALIDATION SCHEMA ==========

const editAdministrationSchema = z.object({
  actualTime: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato inválido (HH:mm)')
    .optional()
    .or(z.literal('')),
  wasAdministered: z.boolean(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  editReason: z
    .string()
    .min(10, 'O motivo da edição deve ter pelo menos 10 caracteres'),
}).refine((data) => {
  // Se não foi administrado, motivo é obrigatório
  if (!data.wasAdministered && (!data.reason || data.reason.trim().length < 5)) {
    return false
  }
  return true
}, {
  message: 'Motivo da não administração é obrigatório (mín. 5 caracteres)',
  path: ['reason'],
})

type EditAdministrationFormData = z.infer<typeof editAdministrationSchema>

// ========== INTERFACE ==========

interface EditMedicationAdministrationModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: EditAdministrationFormData) => Promise<void>
  administration: MedicationAdministration | null
  isUpdating?: boolean
}

// ========== COMPONENT ==========

export function EditMedicationAdministrationModal({
  open,
  onClose,
  onSubmit,
  administration,
  isUpdating = false,
}: EditMedicationAdministrationModalProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
  } = useForm<EditAdministrationFormData>({
    resolver: zodResolver(editAdministrationSchema),
  })

  const wasAdministered = watch('wasAdministered')

  // Reset form when administration changes
  useEffect(() => {
    if (administration && open) {
      reset({
        actualTime: administration.actualTime || administration.scheduledTime || '',
        wasAdministered: administration.wasAdministered,
        reason: administration.reason || '',
        notes: administration.notes || '',
        editReason: '',
      })
    }
  }, [administration, open, reset])

  const handleFormSubmit = async (data: EditAdministrationFormData) => {
    await onSubmit(data)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!administration) return null

  const { type, scheduledTime, medication, administeredBy, createdAt } = administration

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Administração de Medicamento
          </DialogTitle>
          <DialogDescription>
            Edite os dados da administração. É obrigatório informar o motivo da edição.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Informações do Medicamento (readonly) */}
          {medication && (
            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Pill className="h-4 w-4 text-primary" />
                <span className="font-semibold">{medication.name}</span>
                {type === 'SOS' && (
                  <Badge variant="outline" className="bg-severity-warning/10 text-severity-warning border-severity-warning/30">
                    SOS
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {medication.dose} • {medication.route}
                {medication.presentation && ` • ${formatMedicationPresentation(medication.presentation)}`}
              </div>
              {scheduledTime && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Horário programado:</span>{' '}
                  <span className="font-medium">{scheduledTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Horário Real */}
          <div className="space-y-2">
            <Label htmlFor="actualTime">Horário Real da Administração</Label>
            <Input
              {...register('actualTime')}
              id="actualTime"
              type="time"
              className="w-40"
            />
            {errors.actualTime && (
              <p className="text-sm text-danger">{errors.actualTime.message}</p>
            )}
          </div>

          {/* Status: Administrado ou Não */}
          <div className="space-y-2">
            <Label>Status da Administração</Label>
            <Controller
              name="wasAdministered"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={(value) => field.onChange(value === 'true')}
                  value={field.value ? 'true' : 'false'}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="admin-sim" />
                    <Label htmlFor="admin-sim" className="font-normal cursor-pointer text-success">
                      Administrado
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="admin-nao" />
                    <Label htmlFor="admin-nao" className="font-normal cursor-pointer text-danger">
                      Não Administrado
                    </Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          {/* Motivo (se não administrado) */}
          {!wasAdministered && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="after:content-['*'] after:ml-0.5 after:text-danger">
                Motivo da Não Administração
              </Label>
              <Textarea
                {...register('reason')}
                id="reason"
                placeholder="Descreva o motivo pelo qual o medicamento não foi administrado..."
                rows={3}
              />
              {errors.reason && (
                <p className="text-sm text-danger">{errors.reason.message}</p>
              )}
            </div>
          )}

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              {...register('notes')}
              id="notes"
              placeholder="Observações adicionais sobre a administração..."
              rows={3}
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
                  Registrado por {administeredBy} em {formatDateTimeSafe(createdAt)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editReason" className="text-sm font-semibold after:content-['*'] after:ml-0.5 after:text-danger">
                Motivo da Edição
              </Label>
              <Textarea
                {...register('editReason')}
                id="editReason"
                placeholder="Ex: Correção de horário registrado incorretamente..."
                rows={2}
              />
              {errors.editReason ? (
                <p className="text-sm text-danger">{errors.editReason.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Campo obrigatório. A justificativa comporá o registro permanente da instituição.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
