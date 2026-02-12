import { Ban, CheckCircle2, Pencil, Plus, TrendingDown, TrendingUp } from 'lucide-react'
import { Section } from '@/design-system/components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  FinancialTransaction,
  FinancialTransactionSortDirection,
  FinancialTransactionSortField,
  FinancialTransactionStatus,
  FinancialTransactionType,
} from '@/types/financial-operations'

interface TransactionsSectionProps {
  transactions: FinancialTransaction[]
  categories: Array<{ id: string; name: string }>
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  canManageTransactions: boolean
  transactionSearch: string
  transactionType: '' | FinancialTransactionType
  transactionStatus: '' | FinancialTransactionStatus
  transactionCategoryId: string
  sortField: FinancialTransactionSortField
  sortDirection: FinancialTransactionSortDirection
  dueDateFrom: string
  dueDateTo: string
  onTransactionSearchChange: (value: string) => void
  onTransactionTypeChange: (value: '' | FinancialTransactionType) => void
  onTransactionStatusChange: (value: '' | FinancialTransactionStatus) => void
  onTransactionCategoryChange: (value: string) => void
  onSortFieldChange: (value: FinancialTransactionSortField) => void
  onSortDirectionChange: (value: FinancialTransactionSortDirection) => void
  onDueDateFromChange: (value: string) => void
  onDueDateToChange: (value: string) => void
  onClearFilters: () => void
  onCreateFirst: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onEdit: (transaction: FinancialTransaction) => void
  onOpenMarkPaid: (transaction: FinancialTransaction) => void
  onOpenCancel: (transaction: FinancialTransaction) => void
  selectedTransactionIds: string[]
  onToggleSelectTransaction: (transactionId: string, checked: boolean) => void
  onToggleSelectAllPage: (checked: boolean) => void
  onOpenBatchMarkPaid: () => void
  onOpenBatchCancel: () => void
  formatDateOnly: (value: string) => string
  formatCurrency: (value: string | number) => string
  statusLabel: (status: FinancialTransactionStatus) => string
}

const sortFieldLabel: Record<FinancialTransactionSortField, string> = {
  dueDate: 'Vencimento',
  netAmount: 'Valor líquido',
  status: 'Status',
  description: 'Descrição',
}

export function TransactionsSection({
  transactions,
  categories,
  total,
  page,
  totalPages,
  isLoading,
  canManageTransactions,
  transactionSearch,
  transactionType,
  transactionStatus,
  transactionCategoryId,
  sortField,
  sortDirection,
  dueDateFrom,
  dueDateTo,
  onTransactionSearchChange,
  onTransactionTypeChange,
  onTransactionStatusChange,
  onTransactionCategoryChange,
  onSortFieldChange,
  onSortDirectionChange,
  onDueDateFromChange,
  onDueDateToChange,
  onClearFilters,
  onCreateFirst,
  onPreviousPage,
  onNextPage,
  onEdit,
  onOpenMarkPaid,
  onOpenCancel,
  selectedTransactionIds,
  onToggleSelectTransaction,
  onToggleSelectAllPage,
  onOpenBatchMarkPaid,
  onOpenBatchCancel,
  formatDateOnly,
  formatCurrency,
  statusLabel,
}: TransactionsSectionProps) {
  const selectableIds = transactions
    .filter((transaction) => transaction.status !== 'CANCELLED')
    .map((transaction) => transaction.id)

  const selectedInPage = selectableIds.filter((id) => selectedTransactionIds.includes(id))
  const allPageSelected = selectableIds.length > 0 && selectedInPage.length === selectableIds.length

  return (
    <div className="space-y-6">
      <Section title="Filtros de transações" spacing="compact">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-2">
            <Label>Busca</Label>
            <Input
              value={transactionSearch}
              onChange={(event) => onTransactionSearchChange(event.target.value)}
              placeholder="Buscar por descrição ou observação"
            />
          </div>
          <div className="xl:col-span-2">
            <Label>Tipo</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={transactionType}
              onChange={(event) => onTransactionTypeChange(event.target.value as '' | FinancialTransactionType)}
            >
              <option value="">Todos</option>
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </div>
          <div className="xl:col-span-2">
            <Label>Status</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={transactionStatus}
              onChange={(event) => onTransactionStatusChange(event.target.value as '' | FinancialTransactionStatus)}
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="OVERDUE">Vencido</option>
              <option value="CANCELLED">Cancelado</option>
              <option value="REFUNDED">Estornado</option>
              <option value="PARTIALLY_PAID">Parcial</option>
            </select>
          </div>
          <div className="xl:col-span-2">
            <Label>Categoria</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={transactionCategoryId}
              onChange={(event) => onTransactionCategoryChange(event.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="xl:col-span-2">
            <Label>Ordenar por</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={sortField}
              onChange={(event) => onSortFieldChange(event.target.value as FinancialTransactionSortField)}
            >
              <option value="dueDate">Vencimento</option>
              <option value="netAmount">Valor líquido</option>
              <option value="status">Status</option>
              <option value="description">Descrição</option>
            </select>
          </div>
          <div className="xl:col-span-2 xl:col-start-1">
            <Label>Ordem</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={sortDirection}
              onChange={(event) => onSortDirectionChange(event.target.value as FinancialTransactionSortDirection)}
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>
          <div className="xl:col-span-2">
            <Label>Vencimento de</Label>
            <Input type="date" value={dueDateFrom} onChange={(event) => onDueDateFromChange(event.target.value)} />
          </div>
          <div className="xl:col-span-2">
            <Label>Vencimento até</Label>
            <Input type="date" value={dueDateTo} onChange={(event) => onDueDateToChange(event.target.value)} />
          </div>
          <div className="flex items-end md:col-span-2 xl:col-span-2 xl:justify-end">
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="Transações"
        description={`${total} total`}
        spacing="compact"
        headerAction={
          <div className="flex items-center gap-3">
            {selectedInPage.length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selectedInPage.length} selecionada(s)</span>
                <Button size="sm" variant="outline" onClick={onOpenBatchMarkPaid} disabled={!canManageTransactions}>
                  Marcar pagas
                </Button>
                <Button size="sm" variant="outline" onClick={onOpenBatchCancel} disabled={!canManageTransactions}>
                  Cancelar
                </Button>
              </div>
            ) : null}
            <div className="text-xs text-muted-foreground">
              Ordenado por {sortFieldLabel[sortField]} ({sortDirection === 'asc' ? 'asc' : 'desc'})
            </div>
            <div className="text-sm text-muted-foreground">Página {page} de {totalPages}</div>
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={(event) => onToggleSelectAllPage(event.target.checked)}
                  aria-label="Selecionar transações da página"
                />
              </TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Valor líquido</TableHead>
              <TableHead className="w-[132px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Carregando transações...
                </TableCell>
              </TableRow>
            ) : null}
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedTransactionIds.includes(transaction.id)}
                    disabled={transaction.status === 'CANCELLED'}
                    onChange={(event) => onToggleSelectTransaction(transaction.id, event.target.checked)}
                    aria-label={`Selecionar transação ${transaction.description}`}
                  />
                </TableCell>
                <TableCell>
                  {transaction.type === 'INCOME' ? (
                    <Badge variant="secondary" className="gap-1">
                      <TrendingUp className="h-3 w-3" /> Receita
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <TrendingDown className="h-3 w-3" /> Despesa
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.description}</div>
                  {transaction.notes && <div className="text-xs text-muted-foreground line-clamp-1">{transaction.notes}</div>}
                </TableCell>
                <TableCell>{transaction.category?.name || '-'}</TableCell>
                <TableCell>{formatDateOnly(transaction.dueDate)}</TableCell>
                <TableCell>
                  <Badge variant={transaction.status === 'PAID' ? 'default' : 'outline'}>{statusLabel(transaction.status)}</Badge>
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(transaction.netAmount)}</TableCell>
                <TableCell className="w-[132px]">
                  <TooltipProvider delayDuration={200}>
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={() => onEdit(transaction)} disabled={!canManageTransactions}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar transação</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onOpenMarkPaid(transaction)}
                            disabled={!canManageTransactions || transaction.status === 'PAID' || transaction.status === 'CANCELLED'}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Confirmar pagamento da transação</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onOpenCancel(transaction)}
                            disabled={!canManageTransactions || transaction.status === 'CANCELLED'}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cancelar transação</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                    {canManageTransactions && (
                      <Button size="sm" onClick={onCreateFirst}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar primeira transação
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Mostrando {transactions.length} de {total}</p>
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
