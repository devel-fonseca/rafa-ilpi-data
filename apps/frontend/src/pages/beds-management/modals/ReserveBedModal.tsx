import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calendar, Save } from 'lucide-react'
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
import { useToast } from '@/components/ui/use-toast'
import { getErrorMessage } from '@/utils/errorHandling'
import { useReserveBed } from '@/hooks/useBedOperations'
import type { Bed } from '@/api/beds.api'

/**
 * Schema de validação para reserva de leito
 * Sincronizado com backend: ReserveBedDto
 */
const reserveSchema = z.object({
  futureResidentName: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .optional()
    .or(z.literal('')),
  expectedAdmissionDate: z.string().optional().or(z.literal('')),
  notes: z
    .string()
    .min(10, 'Observações devem ter no mínimo 10 caracteres')
    .optional()
    .or(z.literal('')),
})

type ReserveFormData = z.infer<typeof reserveSchema>

interface ReserveBedModalProps {
  bed: Bed | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Modal para reserva de leito
 * Permite marcar um leito como "Reservado" para futuro residente
 */
export function ReserveBedModal({
  bed,
  open,
  onOpenChange,
  onSuccess,
}: ReserveBedModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const reserveBed = useReserveBed()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReserveFormData>({
    resolver: zodResolver(reserveSchema),
    defaultValues: {
      futureResidentName: '',
      expectedAdmissionDate: '',
      notes: '',
    },
  })

  // Reset form when modal opens/closes or bed changes
  useEffect(() => {
    if (open) {
      reset({
        futureResidentName: '',
        expectedAdmissionDate: '',
        notes: '',
      })
    }
  }, [open, bed, reset])

  const onSubmit = async (data: ReserveFormData) => {
    if (!bed) return

    setLoading(true)
    try {
      // Remove empty strings to send undefined to backend
      const payload = {
        futureResidentName: data.futureResidentName || undefined,
        expectedAdmissionDate: data.expectedAdmissionDate || undefined,
        notes: data.notes || undefined,
      }

      await reserveBed.mutateAsync({
        bedId: bed.id,
        data: payload,
      })

      toast({
        title: 'Leito reservado',
        description: `Leito ${bed.code} foi reservado com sucesso`,
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Erro ao reservar leito',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!bed) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reservar Leito
          </DialogTitle>
          <DialogDescription>
            Reservar o leito <strong>{bed.code}</strong> para futuro residente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="futureResidentName">
              Nome do Futuro Residente <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="futureResidentName"
              placeholder="Ex: João da Silva"
              {...register('futureResidentName')}
              disabled={loading}
            />
            {errors.futureResidentName && (
              <p className="text-sm text-destructive">{errors.futureResidentName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedAdmissionDate">
              Data Prevista de Admissão <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="expectedAdmissionDate"
              type="date"
              {...register('expectedAdmissionDate')}
              disabled={loading}
            />
            {errors.expectedAdmissionDate && (
              <p className="text-sm text-destructive">{errors.expectedAdmissionDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              Observações <span className="text-muted-foreground">(opcional, mínimo 10 caracteres)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Ex: Reservado após contato da família. Aguardando documentação..."
              rows={4}
              {...register('notes')}
              disabled={loading}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Reservando...' : 'Reservar Leito'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
