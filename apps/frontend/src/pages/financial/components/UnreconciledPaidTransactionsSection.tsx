import { Section } from '@/design-system/components'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { FinancialBankAccount, UnreconciledPaidTransaction } from '@/types/financial-operations'

interface UnreconciledPaidTransactionsSectionProps {
  items: UnreconciledPaidTransaction[]
  total: number
  isLoading: boolean
  bankAccounts: FinancialBankAccount[]
  bankAccountFilter: string
  search: string
  fromDate: string
  toDate: string
  onBankAccountFilterChange: (value: string) => void
  onSearchChange: (value: string) => void
  onFromDateChange: (value: string) => void
  onToDateChange: (value: string) => void
  onClearFilters: () => void
  onOpenReconciliationWithFilters: () => void
  formatCurrency: (value: string | number) => string
  formatDateOnly: (value: string) => string
}

export function UnreconciledPaidTransactionsSection({
  items,
  total,
  isLoading,
  bankAccounts,
  bankAccountFilter,
  search,
  fromDate,
  toDate,
  onBankAccountFilterChange,
  onSearchChange,
  onFromDateChange,
  onToDateChange,
  onClearFilters,
  onOpenReconciliationWithFilters,
  formatCurrency,
  formatDateOnly,
}: UnreconciledPaidTransactionsSectionProps) {
  return (
    <div className="space-y-4">
      <Section
        title="Pagas sem fechamento"
        description={`${total} total • Exibe somente transações pagas ainda não incluídas em nenhum fechamento.`}
        spacing="compact"
        headerAction={
          <Button size="sm" onClick={onOpenReconciliationWithFilters}>
            Novo fechamento com estes filtros
          </Button>
        }
      >
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <div>
            <Label>Conta</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={bankAccountFilter}
              onChange={(event) => onBankAccountFilterChange(event.target.value)}
            >
              <option value="">Todas</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Busca</Label>
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Descrição ou observação"
            />
          </div>
          <div>
            <Label>Pagamento de</Label>
            <Input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} />
          </div>
          <div>
            <Label>Pagamento até</Label>
            <Input type="date" value={toDate} onChange={(event) => onToDateChange(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Limpar
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pagamento</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando transações...
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.paymentDate ? formatDateOnly(item.paymentDate) : '-'}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.category?.name || '-'}</TableCell>
                <TableCell>{item.bankAccount?.accountName || '-'}</TableCell>
                <TableCell className={`text-right font-medium ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(item.netAmount)}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhuma transação paga pendente de fechamento neste filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Section>
    </div>
  )
}
