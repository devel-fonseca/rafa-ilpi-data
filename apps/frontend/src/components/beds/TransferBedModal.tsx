import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface TransferBedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentName: string
  fromBedCode: string
  toBedCode: string
  fromLocation: string
  toLocation: string
  onConfirm: (reason: string) => Promise<void>
}

export function TransferBedModal({
  open,
  onOpenChange,
  residentName,
  fromBedCode,
  toBedCode,
  fromLocation,
  toLocation,
  onConfirm,
}: TransferBedModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    // Validar motivo (mínimo 10 caracteres)
    if (reason.trim().length < 10) {
      setError('O motivo deve ter no mínimo 10 caracteres')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onConfirm(reason)
      // Limpar e fechar modal após sucesso
      setReason('')
      onOpenChange(false)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao transferir residente')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setReason('')
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Confirmar Transferência de Leito</DialogTitle>
          <DialogDescription>
            Esta ação ficará registrada permanentemente no histórico do residente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Residente */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Residente</Label>
            <p className="text-lg font-semibold">{residentName}</p>
          </div>

          {/* Transferência */}
          <div className="flex items-center gap-3 bg-muted/50 p-4 rounded-lg">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-base">
                  {fromBedCode}
                </Badge>
                <p className="text-xs text-muted-foreground">{fromLocation}</p>
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />

            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Para</Label>
              <div className="space-y-1">
                <Badge variant="outline" className="font-mono text-base bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/50">
                  {toBedCode}
                </Badge>
                <p className="text-xs text-muted-foreground">{toLocation}</p>
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo da Transferência <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ex: Transferência para quarto individual a pedido da família..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              rows={4}
              className={error ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de 10 caracteres. {reason.length}/10
            </p>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || reason.trim().length < 10}
          >
            {isSubmitting ? 'Transferindo...' : 'Confirmar Transferência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
