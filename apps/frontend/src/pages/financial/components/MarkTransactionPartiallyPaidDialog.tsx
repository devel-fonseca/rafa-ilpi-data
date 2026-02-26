import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MarkTransactionPartiallyPaidDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentDate: string
  amount: string
  transactionDescription?: string
  onPaymentDateChange: (value: string) => void
  onAmountChange: (value: string) => void
  onConfirm: () => void
  isSubmitting: boolean
}

export function MarkTransactionPartiallyPaidDialog({
  open,
  onOpenChange,
  paymentDate,
  amount,
  transactionDescription,
  onPaymentDateChange,
  onAmountChange,
  onConfirm,
  isSubmitting,
}: MarkTransactionPartiallyPaidDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar baixa parcial</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Informe a data e o valor pago parcialmente para atualizar o saldo da transação.
          </p>
          {transactionDescription ? (
            <p className="text-sm">
              <span className="text-muted-foreground">Transação:</span> {transactionDescription}
            </p>
          ) : null}
          <div>
            <Label>Data de pagamento</Label>
            <Input type="date" value={paymentDate} onChange={(event) => onPaymentDateChange(event.target.value)} />
          </div>
          <div>
            <Label>Valor parcial</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting || !paymentDate || !amount}>
            Confirmar baixa parcial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
