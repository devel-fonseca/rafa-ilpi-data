import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, Save } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { getErrorMessage } from '@/utils/errorHandling'
import { useReleaseBed } from '@/hooks/useBedOperations'
import type { Bed } from '@/api/beds.api'

/**
 * Schema de validação para liberação de leito
 * Sincronizado com backend: ReleaseBedDto
 */
const releaseSchema = z.object({
  reason: z
    .string()
    .min(10, 'Motivo da liberação deve ter no mínimo 10 caracteres')
    .optional()
    .or(z.literal('')),
})

type ReleaseFormData = z.infer<typeof releaseSchema>

interface ReleaseBedModalProps {
  bed: Bed | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Modal para liberação de leito
 * Libera leito bloqueado ou reservado tornando-o "Disponível"
 */
export function ReleaseBedModal({
  bed,
  open,
  onOpenChange,
  onSuccess,
}: ReleaseBedModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const releaseBed = useReleaseBed()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ReleaseFormData>({
    resolver: zodResolver(releaseSchema),
    defaultValues: {
      reason: '',
    },
  })

  const reason = watch('reason')
  const cleanedLength = reason?.replace(/\s+/g, '').length || 0

  // Reset form when modal opens/closes or bed changes
  useEffect(() => {
    if (open) {
      reset({
        reason: '',
      })
    }
  }, [open, bed, reset])

  const onSubmit = async (data: ReleaseFormData) => {
    if (!bed) return

    setLoading(true)
    try {
      const payload = {
        reason: data.reason || undefined,
      }

      await releaseBed.mutateAsync({
        bedId: bed.id,
        data: payload,
      })

      toast({
        title: 'Leito liberado',
        description: `Leito ${bed.code} está agora disponível para ocupação`,
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Erro ao liberar leito',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!bed) return null

  const canRelease = bed.status === 'Manutenção' || bed.status === 'Reservado'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Liberar Leito
          </DialogTitle>
          <DialogDescription>
            Liberar o leito <strong>{bed.code}</strong> tornando-o disponível para ocupação
          </DialogDescription>
        </DialogHeader>

        {!canRelease && (
          <Alert variant="destructive">
            <AlertDescription>
              Este leito está <strong>{bed.status}</strong>. Apenas leitos em{' '}
              <strong>Manutenção</strong> ou <strong>Reservado</strong> podem ser liberados.
            </AlertDescription>
          </Alert>
        )}

        {canRelease && bed.status === 'Reservado' && bed.notes && (
          <Alert>
            <AlertDescription>
              <strong>Reserva atual:</strong> {bed.notes}
            </AlertDescription>
          </Alert>
        )}

        {canRelease && bed.status === 'Manutenção' && bed.notes && (
          <Alert>
            <AlertDescription>
              <strong>Motivo do bloqueio:</strong> {bed.notes}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo da Liberação{' '}
              <span className="text-muted-foreground">(opcional, mínimo 10 caracteres)</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ex: Manutenção concluída com sucesso. Leito pronto para uso..."
              rows={4}
              {...register('reason')}
              disabled={loading || !canRelease}
            />
            <div className="flex items-center justify-between text-sm">
              {errors.reason && (
                <p className="text-destructive">{errors.reason.message}</p>
              )}
              {reason && (
                <p className={`ml-auto ${cleanedLength < 10 ? 'text-muted-foreground' : 'text-green-600'}`}>
                  {cleanedLength}/10 caracteres
                </p>
              )}
            </div>
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
            <Button
              type="submit"
              disabled={loading || !canRelease}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {loading ? 'Liberando...' : 'Liberar Leito'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
