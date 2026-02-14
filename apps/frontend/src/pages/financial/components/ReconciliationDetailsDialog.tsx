/* eslint-disable no-restricted-syntax */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { FinancialReconciliation, FinancialTransactionStatus, FinancialTransactionType } from '@/types/financial-operations'

interface ReconciliationDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reconciliation?: FinancialReconciliation
  isLoading: boolean
  formatDateOnly: (value: string) => string
  formatCurrency: (value: string | number) => string
  statusLabel: (value: FinancialTransactionStatus) => string
  typeLabel: (value: FinancialTransactionType) => string
}

export function ReconciliationDetailsDialog({
  open,
  onOpenChange,
  reconciliation,
  isLoading,
  formatDateOnly,
  formatCurrency,
  statusLabel,
  typeLabel,
}: ReconciliationDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Detalhe do fechamento</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando detalhe...</div>
        ) : !reconciliation ? (
          <div className="text-sm text-muted-foreground">Fechamento não encontrado.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-4 text-sm">
              <div>
                <div className="text-muted-foreground">Conta</div>
                <div className="font-medium">{reconciliation.bankAccount?.accountName || '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Data</div>
                <div className="font-medium">{formatDateOnly(reconciliation.reconciliationDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Período</div>
                <div className="font-medium">
                  {formatDateOnly(reconciliation.startDate)} até {formatDateOnly(reconciliation.endDate)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Itens</div>
                <div className="font-medium">{reconciliation.items?.length || 0}</div>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-4 text-sm">
              <div>
                <div className="text-muted-foreground">Saldo inicial informado</div>
                <div className="font-medium">{formatCurrency(reconciliation.openingBalance)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Entradas</div>
                <div className="font-medium">{formatCurrency(reconciliation.totalIncome)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Saídas</div>
                <div className="font-medium">{formatCurrency(reconciliation.totalExpense)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Saldo sistema</div>
                <div className="font-medium">{formatCurrency(reconciliation.systemBalance)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Saldo final informado</div>
                <div className="font-medium">{formatCurrency(reconciliation.closingBalance)}</div>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-1 text-sm">
              <div>
                <div className="text-muted-foreground">Ajuste necessário (informado - sistema)</div>
                <div className={`font-medium ${Number(reconciliation.difference || 0) === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(reconciliation.difference)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Fórmula aplicada: saldo final informado - saldo sistema.
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(reconciliation.items || []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{typeLabel(item.transaction.type)}</TableCell>
                    <TableCell>{item.transaction.description}</TableCell>
                    <TableCell>{item.transaction.paymentDate ? formatDateOnly(item.transaction.paymentDate) : '-'}</TableCell>
                    <TableCell>{statusLabel(item.transaction.status)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.transaction.netAmount)}</TableCell>
                  </TableRow>
                ))}
                {(reconciliation.items || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum item incluído no fechamento deste período.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
