import { Ban, CheckCircle2, Pencil } from 'lucide-react'
import { Section } from '@/design-system/components'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { FinancialPaymentMethod } from '@/types/financial-operations'

interface PaymentMethodsSectionProps {
  methods: FinancialPaymentMethod[]
  isLoading: boolean
  methodSearch: string
  showInactiveMethods: boolean
  canManageAccounts: boolean
  onMethodSearchChange: (value: string) => void
  onShowInactiveMethodsChange: (value: boolean) => void
  onClearFilters: () => void
  onEdit: (method: FinancialPaymentMethod) => void
  onToggle: (method: FinancialPaymentMethod) => void
}

export function PaymentMethodsSection({
  methods,
  isLoading,
  methodSearch,
  showInactiveMethods,
  canManageAccounts,
  onMethodSearchChange,
  onShowInactiveMethodsChange,
  onClearFilters,
  onEdit,
  onToggle,
}: PaymentMethodsSectionProps) {
  return (
    <div className="space-y-6">
      <Section title="Filtros de métodos de pagamento" spacing="compact">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Busca</Label>
            <Input
              value={methodSearch}
              onChange={(event) => onMethodSearchChange(event.target.value)}
              placeholder="Nome, código ou descrição"
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactiveMethods}
                onChange={(event) => onShowInactiveMethodsChange(event.target.checked)}
              />
              Mostrar inativos
            </label>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Métodos de pagamento" spacing="compact">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Regras</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando métodos...
                </TableCell>
              </TableRow>
            ) : null}
            {methods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>
                  <div className="font-medium">{method.name}</div>
                  {method.description ? (
                    <div className="text-xs text-muted-foreground">{method.description}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="uppercase">
                    {method.code}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    Confirmação manual
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {method.allowsInstallments ? `Parcela até ${method.maxInstallments || 1}x` : 'Sem parcelamento'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={method.isActive ? 'default' : 'outline'}>
                    {method.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <TooltipProvider delayDuration={200}>
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" disabled={!canManageAccounts} onClick={() => onEdit(method)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar método de pagamento</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" disabled={!canManageAccounts} onClick={() => onToggle(method)}>
                            {method.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{method.isActive ? 'Desativar método de pagamento' : 'Ativar método de pagamento'}</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}

            {!isLoading && methods.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum método encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Section>
    </div>
  )
}
