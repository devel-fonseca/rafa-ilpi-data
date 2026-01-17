import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle } from 'lucide-react'
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
import { useToast } from '@/components/ui/use-toast'
import { getErrorMessage } from '@/utils/errorHandling'
import { useBlockBed } from '@/hooks/useBedOperations'
import type { Bed } from '@/api/beds.api'

/**
 * Schema de validação para bloqueio de leito
 * Sincronizado com backend: BlockBedDto
 */
const blockSchema = z.object({
  reason: z.string().min(10, 'Motivo do bloqueio deve ter no mínimo 10 caracteres'),
  expectedReleaseDate: z.string().optional().or(z.literal('')),
})

type BlockFormData = z.infer<typeof blockSchema>

interface BlockBedModalProps {
  bed: Bed | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Modal para bloqueio de leito para manutenção
 * Marca o leito como "Manutenção" impedindo ocupação
 */
export function BlockBedModal({
  bed,
  open,
  onOpenChange,
  onSuccess,
}: BlockBedModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const blockBed = useBlockBed()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<BlockFormData>({
    resolver: zodResolver(blockSchema),
    defaultValues: {
      reason: '',
      expectedReleaseDate: '',
    },
  })

  const reason = watch('reason')
  const cleanedLength = reason?.replace(/\s+/g, '').length || 0

  // Reset form when modal opens/closes or bed changes
  useEffect(() => {
    if (open) {
      reset({
        reason: '',
        expectedReleaseDate: '',
      })
    }
  }, [open, bed, reset])

  const onSubmit = async (data: BlockFormData) => {
    if (!bed) return

    setLoading(true)
    try {
      const payload = {
        reason: data.reason,
        expectedReleaseDate: data.expectedReleaseDate || undefined,
      }

      await blockBed.mutateAsync({
        bedId: bed.id,
        data: payload,
      })

      toast({
        title: 'Leito bloqueado',
        description: `Leito ${bed.code} foi bloqueado para manutenção`,
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Erro ao bloquear leito',
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
            <AlertTriangle className="h-5 w-5 text-severity-warning" />
            Bloquear Leito para Manutenção
          </DialogTitle>
          <DialogDescription>
            Bloquear o leito <strong>{bed.code}</strong> impedindo nova ocupação
          </DialogDescription>
        </DialogHeader>

        {bed.status === 'Ocupado' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Este leito está <strong>Ocupado</strong>. Não é possível bloquear leitos ocupados.
              Primeiro realize a transferência ou alta do residente.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo do Bloqueio <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ex: Leito bloqueado para manutenção preventiva do ar condicionado e pintura da parede..."
              rows={4}
              {...register('reason')}
              disabled={loading || bed.status === 'Ocupado'}
            />
            <div className="flex items-center justify-between text-sm">
              {errors.reason && (
                <p className="text-destructive">{errors.reason.message}</p>
              )}
              <p className={`ml-auto ${cleanedLength < 10 ? 'text-muted-foreground' : 'text-success'}`}>
                {cleanedLength}/10 caracteres
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedReleaseDate">
              Data Prevista de Liberação <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="expectedReleaseDate"
              type="date"
              {...register('expectedReleaseDate')}
              disabled={loading || bed.status === 'Ocupado'}
            />
            {errors.expectedReleaseDate && (
              <p className="text-sm text-destructive">{errors.expectedReleaseDate.message}</p>
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
            <Button
              type="submit"
              disabled={loading || bed.status === 'Ocupado'}
              variant="destructive"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {loading ? 'Bloqueando...' : 'Bloquear Leito'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
