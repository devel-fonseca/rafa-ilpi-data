import { Eye } from 'lucide-react'
import { Section } from '@/design-system/components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type {
  FinancialBankAccount,
  FinancialReconciliation,
  FinancialReconciliationStatus,
} from '@/types/financial-operations'

interface ReconciliationsSectionProps {
  reconciliations: FinancialReconciliation[]
  bankAccounts: FinancialBankAccount[]
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  reconciliationStatusFilter: '' | FinancialReconciliationStatus
  reconciliationBankAccountFilter: string
  onStatusFilterChange: (value: '' | FinancialReconciliationStatus) => void
  onBankAccountFilterChange: (value: string) => void
  onClearFilters: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  formatDateOnly: (value: string) => string
  formatCurrency: (value: string | number) => string
  reconciliationStatusLabel: (value: FinancialReconciliationStatus) => string
  onView: (reconciliationId: string) => void
}

export function ReconciliationsSection({
  reconciliations,
  bankAccounts,
  total,
  page,
  totalPages,
  isLoading,
  reconciliationStatusFilter,
  reconciliationBankAccountFilter,
  onStatusFilterChange,
  onBankAccountFilterChange,
  onClearFilters,
  onPreviousPage,
  onNextPage,
  formatDateOnly,
  formatCurrency,
  reconciliationStatusLabel,
  onView,
}: ReconciliationsSectionProps) {
  return (
    <div className="space-y-6">
      <Section title="Filtros de fechamento" spacing="compact">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Status</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={reconciliationStatusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as '' | FinancialReconciliationStatus)}
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="RECONCILED">Fechado</option>
              <option value="DISCREPANCY">Com divergência</option>
            </select>
          </div>
          <div>
            <Label>Conta</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={reconciliationBankAccountFilter}
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
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="Fechamentos"
        description={`${total} total • Os fechamentos são gerados manualmente em "Novo fechamento".`}
        spacing="compact"
        headerAction={<div className="text-sm text-muted-foreground">Página {page} de {totalPages}</div>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead className="text-right">Saída</TableHead>
              <TableHead className="text-right">Saldo sistema</TableHead>
              <TableHead className="text-right">Saldo informado</TableHead>
              <TableHead className="text-right">Ajuste (informado - sistema)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Carregando fechamentos...
                </TableCell>
              </TableRow>
            ) : null}
            {reconciliations.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{formatDateOnly(item.reconciliationDate)}</TableCell>
                <TableCell>{item.bankAccount?.accountName || '-'}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'RECONCILED' ? 'default' : 'outline'}>
                    {reconciliationStatusLabel(item.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalIncome)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.totalExpense)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.systemBalance)}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.closingBalance)}</TableCell>
                <TableCell className={`text-right ${Number(item.difference || 0) === 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(item.difference)}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => onView(item.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && reconciliations.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  <div>Nenhum fechamento encontrado</div>
                  <div className="mt-1 text-xs">
                    Lance as transações, marque como pagas e use "Novo fechamento" para gerar o primeiro registro.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Mostrando {reconciliations.length} de {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPreviousPage}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNextPage}>
              Próxima
            </Button>
          </div>
        </div>
      </Section>
    </div>
  )
}
