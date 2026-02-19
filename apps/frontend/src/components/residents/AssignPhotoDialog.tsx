// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - AssignPhotoDialog (Upload de foto via painel de alertas)
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
import { PhotoUploadNew } from '@/components/form/PhotoUploadNew'
import { api } from '@/services/api'
import { uploadFile } from '@/services/upload'
import { tenantKey } from '@/lib/query-keys'
import { toast } from 'sonner'

interface AssignPhotoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId: string
  residentName: string
  currentPhotoUrl?: string
  onSuccess?: () => void
}

export function AssignPhotoDialog({
  open,
  onOpenChange,
  residentId,
  residentName,
  currentPhotoUrl,
  onSuccess,
}: AssignPhotoDialogProps) {
  const queryClient = useQueryClient()
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!selectedPhoto) {
      setError('Selecione uma foto para continuar.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const fotoUrl = await uploadFile(selectedPhoto, 'photos')

      await api.patch(`/residents/${residentId}`, {
        fotoUrl,
        changeReason: 'Atualização de foto via painel de alertas',
      })

      toast.success('Foto atualizada com sucesso!', {
        description: `A foto de ${residentName} foi salva no cadastro.`,
      })

      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', residentId) })

      setSelectedPhoto(null)
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const errorResponse = (err as { response?: { data?: { message?: string } } }).response
      setError(errorResponse?.data?.message || 'Erro ao atualizar foto do residente')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setSelectedPhoto(null)
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Enviar foto do residente</DialogTitle>
          <DialogDescription>
            Faça o upload da foto do residente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Residente</Label>
            <p className="text-lg font-semibold">{residentName}</p>
          </div>

          <PhotoUploadNew
            onPhotoSelect={(file) => {
              setSelectedPhoto(file)
              setError('')
            }}
            currentPhotoUrl={currentPhotoUrl}
            label="Foto"
            description="Clique para selecionar ou arraste uma imagem"
            disabled={isSubmitting}
          />

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
            disabled={isSubmitting || !selectedPhoto}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Salvar foto'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
