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
import { CreateInvoiceDialog } from '@/components/superadmin/CreateInvoiceDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  // Filtrar no frontend por search (nome do tenant)
  const filteredInvoices = data?.data?.filter((invoice: any) => {
    if (!filters.search) return true
    const searchLower = filters.search.toLowerCase()
    return (
      invoice.tenant.name.toLowerCase().includes(searchLower) ||
      invoice.invoiceNumber.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-purple-50">Faturas</h1>
          <p className="text-purple-300 mt-1">
            Gerencie todas as faturas da plataforma
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Gerar Fatura Manual
          </Button>
          <div className="flex items-center gap-2">
            <Receipt className="h-8 w-8 text-purple-400" />
            {data && (
              <span className="text-2xl font-bold text-purple-50">
                {data.meta.total}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-purple-900 border-purple-800">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
              <Input
                placeholder="Buscar por tenant ou número da fatura..."
                className="pl-10 bg-purple-950 border-purple-700 text-purple-50"
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
              <SelectTrigger className="w-[180px] bg-purple-950 border-purple-700 text-purple-50">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-purple-950 border-purple-700">
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="OPEN">Pendentes</SelectItem>
                <SelectItem value="PAID">Pagas</SelectItem>
                <SelectItem value="VOID">Canceladas</SelectItem>
                <SelectItem value="UNCOLLECTIBLE">Incobráveis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-purple-900 border-purple-800">
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-8 text-center text-purple-300">
              Carregando faturas...
            </div>
          )}

          {isError && (
            <div className="p-8 text-center text-red-400">
              Erro ao carregar: {error.message}
            </div>
          )}

          {filteredInvoices && filteredInvoices.length === 0 && (
            <div className="p-8 text-center text-purple-300">
              Nenhuma fatura encontrada
            </div>
          )}

          {filteredInvoices && filteredInvoices.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-purple-800 hover:bg-purple-800/50">
                  <TableHead className="text-purple-300">Número</TableHead>
                  <TableHead className="text-purple-300">Tenant</TableHead>
                  <TableHead className="text-purple-300">Status</TableHead>
                  <TableHead className="text-purple-300">Plano</TableHead>
                  <TableHead className="text-purple-300 text-right">
                    Valor
                  </TableHead>
                  <TableHead className="text-purple-300">Vencimento</TableHead>
                  <TableHead className="text-purple-300">Criado em</TableHead>
                  <TableHead className="text-purple-300 text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice: any) => {
                  const statusInfo = STATUS_LABELS[invoice.status as InvoiceStatus] || {
                    label: invoice.status,
                    variant: 'outline' as const,
                  }

                  const isOverdue =
                    invoice.status === 'OPEN' &&
                    new Date(invoice.dueDate) < new Date()

                  return (
                    <TableRow
                      key={invoice.id}
                      className="border-purple-800 hover:bg-purple-800/30"
                    >
                      <TableCell>
                        <div className="font-mono text-sm text-purple-50">
                          {invoice.invoiceNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-purple-50">
                            {invoice.tenant.name}
                          </div>
                          <div className="text-sm text-purple-400">
                            {invoice.tenant.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              Vencida
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-purple-300">
                        {invoice.subscription.plan.displayName}
                      </TableCell>
                      <TableCell className="text-right text-purple-50 font-medium">
                        R$ {Number(invoice.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-purple-300">
                        {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-purple-300">
                        {new Date(invoice.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-purple-300 hover:text-purple-50 hover:bg-purple-800"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-purple-900 border-purple-700"
                          >
                            {invoice.paymentUrl && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={invoice.paymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer text-purple-300 hover:text-purple-50"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Ver no Asaas
                                </a>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem asChild>
                              <Link
                                to={`/superadmin/invoices/${invoice.id}`}
                                className="cursor-pointer text-purple-300 hover:text-purple-50"
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
