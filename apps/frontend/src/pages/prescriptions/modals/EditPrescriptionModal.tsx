import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Save } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { prescriptionsApi, type Prescription } from '@/api/prescriptions.api'
import { useToast } from '@/components/ui/use-toast'
import { extractDateOnly } from '@/utils/dateHelpers'
import { format } from 'date-fns'

/**
 * Schema de validação para edição de Prescription
 * Sincronizado com backend: UpdatePrescriptionDto
 */
const editSchema = z.object({
  changeReason: z
    .string()
    .min(1, 'Motivo da edição é obrigatório')
    .refine(
      (value) => {
        // Remove espaços para validar tamanho real
        const cleaned = value.replace(/\s+/g, '')
        return cleaned.length >= 10
      },
      { message: 'Motivo deve ter pelo menos 10 caracteres (sem contar espaços)' }
    ),
  validUntil: z.string().optional(),
  reviewDate: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

type EditFormData = z.infer<typeof editSchema>

interface EditPrescriptionModalProps {
  prescription: Prescription | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Modal para edição de Prescriptions
 * Implementa validação obrigatória de changeReason (min 10 chars) conforme RDC 502/2021
 *
 * @example
 * ```tsx
 * <EditPrescriptionModal
 *   prescription={selectedPrescription}
 *   open={isEditModalOpen}
 *   onOpenChange={setIsEditModalOpen}
 *   onSuccess={() => {
 *     queryClient.invalidateQueries(['prescriptions'])
 *   }}
 * />
 * ```
 */
export function EditPrescriptionModal({
  prescription,
  open,
  onOpenChange,
  onSuccess,
}: EditPrescriptionModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      changeReason: '',
      validUntil: prescription?.validUntil || '',
      reviewDate: prescription?.reviewDate || '',
      notes: prescription?.notes || '',
      isActive: prescription?.isActive ?? true,
    },
  })

  const changeReason = watch('changeReason')
  const cleanedLength = changeReason?.replace(/\s+/g, '').length || 0

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = async (data: EditFormData) => {
    if (!prescription) return

    try {
      setLoading(true)

      await prescriptionsApi.update(prescription.id, {
        changeReason: data.changeReason,
        validUntil: data.validUntil,
        reviewDate: data.reviewDate,
        notes: data.notes,
        isActive: data.isActive,
      })

      toast({
        title: 'Prescrição atualizada',
        description: 'As alterações foram salvas com sucesso.',
      })

      handleClose()
      onSuccess?.()
    } catch (error: unknown) {
      console.error('Erro ao atualizar prescrição:', error)
      const errorResponse = error as { response?: { data?: { message?: string } } }
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description:
          errorResponse?.response?.data?.message ||
          'Não foi possível atualizar a prescrição. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!prescription) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Prescrição</DialogTitle>
          <DialogDescription>
            Para conformidade com RDC 502/2021 (ANVISA), toda edição deve ser justificada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Alerta de Conformidade */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta ação será registrada no histórico de auditoria
              do prontuário eletrônico. O motivo da edição é obrigatório.
            </AlertDescription>
          </Alert>

          {/* Informações da Prescrição */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <h4 className="font-medium text-sm">Prescrição:</h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Médico:</dt>
              <dd className="font-medium">{prescription.doctorName}</dd>

              <dt className="text-muted-foreground">CRM:</dt>
              <dd>
                {prescription.doctorCrm}/{prescription.doctorCrmState}
              </dd>

              <dt className="text-muted-foreground">Tipo:</dt>
              <dd>{prescription.prescriptionType}</dd>

              <dt className="text-muted-foreground">Data:</dt>
              <dd>{format(new Date(extractDateOnly(prescription.prescriptionDate) + 'T12:00:00'), 'dd/MM/yyyy')}</dd>
            </dl>
          </div>

          {/* Campo: Motivo da Edição (obrigatório) */}
          <div className="space-y-2">
            <Label htmlFor="changeReason" className="required">
              Motivo da Edição *
            </Label>
            <Textarea
              id="changeReason"
              placeholder="Ex: Atualização da data de validade conforme nova prescrição médica"
              {...register('changeReason')}
              className={errors.changeReason ? 'border-danger' : ''}
              rows={3}
            />
            {errors.changeReason && (
              <p className="text-sm text-danger">{errors.changeReason.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Caracteres (sem espaços): {cleanedLength}/10
            </p>
          </div>

          {/* Campo: Data de Validade (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="validUntil">Data de Validade</Label>
            <Input
              id="validUntil"
              type="date"
              {...register('validUntil')}
              className={errors.validUntil ? 'border-danger' : ''}
            />
            {errors.validUntil && (
              <p className="text-sm text-danger">{errors.validUntil.message}</p>
            )}
          </div>

          {/* Campo: Data de Revisão (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="reviewDate">Data de Revisão</Label>
            <Input
              id="reviewDate"
              type="date"
              {...register('reviewDate')}
              className={errors.reviewDate ? 'border-danger' : ''}
            />
            {errors.reviewDate && (
              <p className="text-sm text-danger">{errors.reviewDate.message}</p>
            )}
          </div>

          {/* Campo: Observações (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações adicionais sobre a prescrição"
              {...register('notes')}
              rows={2}
            />
          </div>

          {/* Campo: Status Ativo */}
          <div className="flex items-center space-x-2">
            <input
              id="isActive"
              type="checkbox"
              {...register('isActive')}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Prescrição ativa
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Salvando...'
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
