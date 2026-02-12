import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MarkTransactionPaidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentDate: string
  transactionDescription?: string
  contextLabel?: string
  onPaymentDateChange: (value: string) => void
  onConfirm: () => void
  isSubmitting: boolean
}

export function MarkTransactionPaidDialog({
  open,
  onOpenChange,
  paymentDate,
  transactionDescription,
  contextLabel,
  onPaymentDateChange,
  onConfirm,
  isSubmitting,
}: MarkTransactionPaidDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar transação como paga</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Informe a data de pagamento para confirmar a baixa da transação.
          </p>
          {contextLabel ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Selecionado:</span> {contextLabel}
            </p>
          ) : null}
          {transactionDescription ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Transação:</span> {transactionDescription}
            </p>
          ) : null}
          <div>
            <Label>Data de pagamento</Label>
            <Input type="date" value={paymentDate} onChange={(event) => onPaymentDateChange(event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting || !paymentDate}>
            Confirmar pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
