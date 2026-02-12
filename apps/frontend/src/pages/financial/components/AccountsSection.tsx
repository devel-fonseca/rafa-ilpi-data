import { Ban, CheckCircle2, Eye, Pencil } from 'lucide-react'
import { Section } from '@/design-system/components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { FinancialAccountType, FinancialBankAccount } from '@/types/financial-operations'

interface AccountsSectionProps {
  accounts: FinancialBankAccount[]
  isLoading: boolean
  accountSearch: string
  accountTypeFilter: '' | FinancialAccountType
  showInactiveAccounts: boolean
  canManageAccounts: boolean
  onAccountSearchChange: (value: string) => void
  onAccountTypeFilterChange: (value: '' | FinancialAccountType) => void
  onShowInactiveAccountsChange: (value: boolean) => void
  onClearFilters: () => void
  onEdit: (account: FinancialBankAccount) => void
  onToggle: (account: FinancialBankAccount) => void
  onViewStatement: (account: FinancialBankAccount) => void
  accountTypeLabel: (type: FinancialAccountType) => string
  formatCurrency: (value: string | number) => string
}

export function AccountsSection({
  accounts,
  isLoading,
  accountSearch,
  accountTypeFilter,
  showInactiveAccounts,
  canManageAccounts,
  onAccountSearchChange,
  onAccountTypeFilterChange,
  onShowInactiveAccountsChange,
  onClearFilters,
  onEdit,
  onToggle,
  onViewStatement,
  accountTypeLabel,
  formatCurrency,
}: AccountsSectionProps) {
  return (
    <div className="space-y-6">
      <Section title="Filtros de contas" spacing="compact">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Busca</Label>
            <Input
              value={accountSearch}
              onChange={(event) => onAccountSearchChange(event.target.value)}
              placeholder="Nome da conta, banco ou número"
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={accountTypeFilter}
              onChange={(event) => onAccountTypeFilterChange(event.target.value as '' | FinancialAccountType)}
            >
              <option value="">Todos</option>
              <option value="CHECKING">Corrente</option>
              <option value="SAVINGS">Poupança</option>
              <option value="PAYMENT">Pagamento</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactiveAccounts}
                onChange={(event) => onShowInactiveAccountsChange(event.target.checked)}
              />
              Mostrar inativas
            </label>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Contas bancárias" spacing="compact">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Carregando contas...
                </TableCell>
              </TableRow>
            ) : null}
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <div className="font-medium">
                    {account.accountName}
                    {account.isDefault ? <span className="text-xs text-muted-foreground ml-2">(Padrão)</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ag. {account.branch || '-'} • Conta {account.accountNumber || '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{accountTypeLabel(account.accountType)}</Badge>
                </TableCell>
                <TableCell>
                  <div>{account.bankName}</div>
                  <div className="text-xs text-muted-foreground">Código {account.bankCode || '-'}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={account.isActive ? 'default' : 'outline'}>
                    {account.isActive ? 'Ativa' : 'Inativa'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(account.currentBalance || 0)}</TableCell>
                <TableCell>
                  <TooltipProvider delayDuration={200}>
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" onClick={() => onViewStatement(account)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Abrir extrato da conta</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" disabled={!canManageAccounts} onClick={() => onEdit(account)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar conta</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" disabled={!canManageAccounts} onClick={() => onToggle(account)}>
                            {account.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{account.isActive ? 'Desativar conta' : 'Ativar conta'}</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}

            {!isLoading && accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma conta encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Section>
    </div>
  )
}
