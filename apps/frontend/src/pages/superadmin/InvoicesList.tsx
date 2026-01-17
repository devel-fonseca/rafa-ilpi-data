import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Receipt,
  Search,
  Filter,
  MoreVertical,
  Eye,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { useInvoices, type InvoiceStatus } from '@/hooks/useInvoices'
import type { Invoice } from '@/api/invoices.api'
import { CreateInvoiceDialog } from '@/components/superadmin/CreateInvoiceDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const STATUS_LABELS: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Rascunho', variant: 'outline' },
  OPEN: { label: 'Pendente', variant: 'secondary' },
  PAID: { label: 'Pago', variant: 'default' },
  VOID: { label: 'Cancelado', variant: 'destructive' },
  UNCOLLECTIBLE: { label: 'Incobrável', variant: 'destructive' },
}

interface InvoiceFilters {
  status?: InvoiceStatus
  search?: string
  onlyOverdue?: boolean
}

export function InvoicesList() {
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const { data, isLoading, isError, error } = useInvoices({
    status: filters.status,
    limit: 50,
  })

  const handleStatusFilter = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: status === 'ALL' ? undefined : (status as InvoiceStatus),
    }))
  }

  // Filtrar no frontend por search e overdue
  const filteredInvoices = data?.data?.filter((invoice: Invoice) => {
    // Filtro de search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch =
        invoice.tenant.name.toLowerCase().includes(searchLower) ||
        invoice.invoiceNumber.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // Filtro de apenas vencidas
    if (filters.onlyOverdue) {
      const isOverdue =
        invoice.status === 'OPEN' && new Date(invoice.dueDate) < new Date()
      if (!isOverdue) return false
    }

    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Faturas</h1>
          <p className="text-slate-400 mt-1">
            Gerencie todas as faturas da plataforma
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-success/60 hover:bg-success/70"
          >
            <Plus className="h-4 w-4 mr-2" />
            Gerar Fatura Manual
          </Button>
          <div className="flex items-center gap-2">
            <Receipt className="h-8 w-8 text-slate-500" />
            {data && (
              <span className="text-2xl font-bold text-slate-900">
                {data.meta.total}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar por tenant ou número da fatura..."
                className="pl-10 bg-white border-slate-200 text-slate-900"
                value={filters.search || ''}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status || 'ALL'}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-[180px] bg-white border-slate-200 text-slate-900">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="OPEN">Pendentes</SelectItem>
                <SelectItem value="PAID">Pagas</SelectItem>
                <SelectItem value="VOID">Canceladas</SelectItem>
                <SelectItem value="UNCOLLECTIBLE">Incobráveis</SelectItem>
              </SelectContent>
            </Select>

            {/* Overdue Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 bg-danger/5 border border-danger/30 rounded-md">
              <Switch
                id="only-overdue"
                checked={filters.onlyOverdue || false}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({ ...prev, onlyOverdue: checked }))
                }
              />
              <Label
                htmlFor="only-overdue"
                className="text-sm font-medium text-danger/90 cursor-pointer whitespace-nowrap"
              >
                Apenas Vencidas
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-8 text-center text-slate-400">
              Carregando faturas...
            </div>
          )}

          {isError && (
            <div className="p-8 text-center text-danger/40">
              Erro ao carregar: {error.message}
            </div>
          )}

          {filteredInvoices && filteredInvoices.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              Nenhuma fatura encontrada
            </div>
          )}

          {filteredInvoices && filteredInvoices.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 hover:bg-slate-100/50">
                    <TableHead className="text-slate-400 min-w-[140px]">Número</TableHead>
                    <TableHead className="text-slate-400 min-w-[200px]">Tenant</TableHead>
                    <TableHead className="text-slate-400 min-w-[150px]">Status / Atraso</TableHead>
                    <TableHead className="text-slate-400 min-w-[140px]">Plano</TableHead>
                    <TableHead className="text-slate-400 text-right min-w-[120px]">Valor</TableHead>
                    <TableHead className="text-slate-400 min-w-[110px]">Vencimento</TableHead>
                    <TableHead className="text-slate-400 text-right min-w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice: Invoice) => {
                  const statusInfo = STATUS_LABELS[invoice.status as InvoiceStatus] || {
                    label: invoice.status,
                    variant: 'outline' as const,
                  }

                  const isOverdue =
                    invoice.status === 'OPEN' &&
                    new Date(invoice.dueDate) < new Date()

                  const daysOverdue = isOverdue
                    ? Math.floor(
                        (new Date().getTime() - new Date(invoice.dueDate).getTime()) /
                          (1000 * 60 * 60 * 24),
                      )
                    : 0

                  const isCritical = daysOverdue >= 30

                  return (
                    <TableRow
                      key={invoice.id}
                      className="border-slate-200 hover:bg-slate-100/30"
                    >
                      {/* Número */}
                      <TableCell>
                        <div className="font-mono text-xs text-slate-900">
                          {invoice.invoiceNumber}
                        </div>
                      </TableCell>

                      {/* Tenant */}
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm text-slate-900 truncate max-w-[180px]">
                            {invoice.tenant.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[180px]">
                            {invoice.tenant.email}
                          </div>
                        </div>
                      </TableCell>

                      {/* Status / Atraso */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={statusInfo.variant} className="w-fit text-xs">
                            {statusInfo.label}
                          </Badge>
                          {isOverdue && (
                            <Badge
                              variant={isCritical ? 'destructive' : 'secondary'}
                              className={`w-fit text-xs ${
                                isCritical
                                  ? 'bg-danger/60 text-white'
                                  : 'bg-severity-warning/10 text-severity-warning/90'
                              }`}
                            >
                              {daysOverdue}d atraso
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Plano */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm text-slate-900">
                            {invoice.subscription.plan.displayName}
                          </span>
                          <div className="flex gap-1">
                            {invoice.billingCycle === 'ANNUAL' && (
                              <span className="text-xs text-success">Anual</span>
                            )}
                            {invoice.discountPercent && (
                              <span className="text-xs text-success">
                                -{invoice.discountPercent}%
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Valor */}
                      <TableCell className="text-right">
                        <span className="text-slate-900 font-medium text-sm">
                          R$ {Number(invoice.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>

                      {/* Vencimento */}
                      <TableCell>
                        <span className="text-sm text-slate-700">
                          {new Date(invoice.dueDate).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </span>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-white border-slate-200"
                          >
                            {invoice.paymentUrl && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={invoice.paymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer text-slate-400 hover:text-slate-900"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Ver no Asaas
                                </a>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem asChild>
                              <Link
                                to={`/superadmin/invoices/${invoice.id}`}
                                className="cursor-pointer text-slate-400 hover:text-slate-900"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
