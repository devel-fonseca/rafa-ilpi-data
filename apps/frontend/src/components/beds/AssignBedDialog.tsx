// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - AssignBedDialog (Atribuição de leito a residente sem acomodação)
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BedSearchCombobox } from '@/components/beds/BedSearchCombobox'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { toast } from 'sonner'

// ========== TYPES ==========

interface AssignBedDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  residentName: string
  onSuccess?: () => void
}

// ========== COMPONENT ==========

export function AssignBedDialog({
  open,
  onOpenChange,
  residentId,
  residentName,
  onSuccess,
}: AssignBedDialogProps) {
  const queryClient = useQueryClient()
  const [selectedBedId, setSelectedBedId] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!selectedBedId) return

    setIsSubmitting(true)
    setError('')

    try {
      await api.patch(`/residents/${residentId}`, {
        bedId: selectedBedId,
        changeReason: 'Atribuição de leito via painel de alertas',
      })

      toast.success('Leito atribuído com sucesso!', {
        description: `${residentName} foi vinculado ao leito selecionado.`,
      })

      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })

      setSelectedBedId(undefined)
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response
      setError(errorResponse?.data?.message || 'Erro ao atribuir leito')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedBedId(undefined)
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Atribuir Leito</DialogTitle>
          <DialogDescription>
            Selecione um leito disponível para o residente. Esta ação ficará registrada no histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Residente */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Residente</Label>
            <p className="text-lg font-semibold">{residentName}</p>
          </div>

          {/* Seleção de Leito */}
          <div className="space-y-2">
            <Label>Leito</Label>
            <BedSearchCombobox
              value={selectedBedId}
              onValueChange={(bedId) => {
                setSelectedBedId(bedId)
                setError('')
              }}
              disabled={isSubmitting}
              placeholder="Buscar leito por código, prédio ou quarto..."
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
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
            disabled={isSubmitting || !selectedBedId}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Atribuindo...
              </>
            ) : (
              'Atribuir Leito'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
