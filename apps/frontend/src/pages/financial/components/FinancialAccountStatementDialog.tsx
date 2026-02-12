import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { FinancialAccountStatement, FinancialBankAccount } from '@/types/financial-operations'

interface FinancialAccountStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: FinancialBankAccount | null
  statement?: FinancialAccountStatement
  fromDate: string
  toDate: string
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
  onApplyFilter: () => void
  isLoading: boolean
  formatCurrency: (value: string | number) => string
  formatDateOnly: (value: string) => string
}

export function FinancialAccountStatementDialog({
  open,
  onOpenChange,
  account,
  statement,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onApplyFilter,
  isLoading,
  formatCurrency,
  formatDateOnly,
}: FinancialAccountStatementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(72rem,calc(100vw-2rem))] max-w-6xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            Extrato da conta {account?.accountName || '-'} ({account?.bankName || '-'})
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-8.5rem)] space-y-4 overflow-y-auto px-6 py-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Período de</Label>
              <Input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} />
            </div>
            <div>
              <Label>Período até</Label>
              <Input type="date" value={toDate} onChange={(event) => onToDateChange(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={onApplyFilter} disabled={isLoading}>
                Atualizar extrato
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Saldo inicial</div>
              <div className="text-lg font-semibold">{formatCurrency(statement?.summary.openingBalance || 0)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Impacto no período</div>
              <div className="text-lg font-semibold">{formatCurrency(statement?.summary.periodNetImpact || 0)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Saldo final</div>
              <div className="text-lg font-semibold">{formatCurrency(statement?.summary.closingBalance || 0)}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Lançamentos</div>
              <div className="text-lg font-semibold">{statement?.summary.entriesCount || 0}</div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Impacto</TableHead>
                  <TableHead className="text-right">Saldo após</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Carregando extrato...
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading && (statement?.entries.length || 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum lançamento no período
                    </TableCell>
                  </TableRow>
                ) : null}

                {statement?.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.paymentDate ? formatDateOnly(entry.paymentDate) : '-'}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{entry.category?.name || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.netAmount)}</TableCell>
                    <TableCell
                      className={`text-right ${
                        Number(entry.impactAmount) >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {formatCurrency(entry.impactAmount)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.runningBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

