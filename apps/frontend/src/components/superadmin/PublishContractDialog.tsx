import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { usePublishTermsOfService } from '@/hooks/useTermsOfService'
import type { TermsOfService } from '@/api/terms-of-service.api'

interface PublishContractDialogProps {
  contract: TermsOfService | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PublishContractDialog({
  contract,
  open,
  onOpenChange,
}: PublishContractDialogProps) {
  const [confirmed, setConfirmed] = useState(false)
  const publishContract = usePublishTermsOfService()

  const handlePublish = async () => {
    if (!contract || !confirmed) return

    await publishContract.mutateAsync({
      id: contract.id,
      dto: {}, // effectiveFrom será now() por padrão
    })

    setConfirmed(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar Contrato</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-warning/5 border-warning/30">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning/90">
              <strong>Atenção!</strong> Ao publicar este contrato:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Ele ficará disponível para novos cadastros</li>
                <li>A versão anterior do mesmo plano será revogada automaticamente</li>
                <li>Esta ação não pode ser desfeita</li>
              </ul>
            </AlertDescription>
          </Alert>

          {contract && (
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Contrato a ser publicado:</h4>
              <p className="text-sm text-muted-foreground">
                <strong>Versão:</strong> {contract.version}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Título:</strong> {contract.title}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Plano:</strong>{' '}
                {contract.plan ? contract.plan.displayName : 'Genérico (todos os planos)'}
              </p>
            </div>
          )}

          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(!!checked)}
            />
            <label
              htmlFor="confirm"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Confirmo que revisei o contrato e desejo publicá-lo
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handlePublish}
              disabled={!confirmed || publishContract.isPending}
              className="bg-success/60 hover:bg-success/70"
            >
              {publishContract.isPending ? 'Publicando...' : 'Publicar Contrato'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
