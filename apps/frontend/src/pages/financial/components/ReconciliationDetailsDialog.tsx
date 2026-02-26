/* eslint-disable no-restricted-syntax */
import { Button } from '@/components/ui/button'
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
  canResolveDivergence: boolean
  onResolveDivergence: (reconciliation: FinancialReconciliation) => void
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
  canResolveDivergence,
  onResolveDivergence,
}: ReconciliationDetailsDialogProps) {
  const openingBalance = Number(reconciliation?.openingBalance || 0)
  const totalIncome = Number(reconciliation?.totalIncome || 0)
  const totalExpense = Number(reconciliation?.totalExpense || 0)
  const systemBalance = Number(reconciliation?.systemBalance || 0)
  const closingBalance = Number(reconciliation?.closingBalance || 0)
  const difference = Number(reconciliation?.difference || 0)
  const periodBalance = totalIncome - totalExpense
  const isConferenced = Math.abs(difference) < 0.005

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhe da conciliação</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando detalhe...</div>
        ) : !reconciliation ? (
          <div className="text-sm text-muted-foreground">Conciliação não encontrada.</div>
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

            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-semibold">Resumo do período</div>
              <div className="grid gap-2 md:grid-cols-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Saldo inicial</div>
                  <div className="font-medium">{formatCurrency(openingBalance)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Entradas</div>
                  <div className="font-medium">{formatCurrency(totalIncome)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Saídas</div>
                  <div className="font-medium">{formatCurrency(totalExpense)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Saldo apurado no período</div>
                  <div className="font-medium">{formatCurrency(periodBalance)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-semibold">Conferência</div>
              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Saldo informado pela conta</div>
                  <div className="font-medium">{formatCurrency(closingBalance)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Saldo apurado pelo sistema</div>
                  <div className="font-medium">{formatCurrency(systemBalance)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Diferença (informado - sistema)</div>
                  <div className={`font-medium ${isConferenced ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(difference)}
                  </div>
                </div>
              </div>
              <div className={`mt-2 text-sm ${isConferenced ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isConferenced
                  ? 'Conferência validada. Não há divergências.'
                  : 'Divergência identificada. Recomenda-se verificação do caixa físico/extrato bancário.'}
              </div>
              {!isConferenced && canResolveDivergence ? (
                <div className="mt-3">
                  <Button type="button" size="sm" onClick={() => onResolveDivergence(reconciliation)}>
                    Resolver divergência
                  </Button>
                </div>
              ) : null}
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
                      Nenhum item incluído na conciliação deste período.
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
