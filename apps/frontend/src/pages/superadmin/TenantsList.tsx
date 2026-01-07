import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Ban,
  Play,
  Trash2,
} from 'lucide-react'
import { useTenants, useReactivateTenant } from '@/hooks/useSuperAdmin'
import { getPlans } from '@/api/superadmin.api'
import { SuspendTenantDialog } from '@/components/superadmin/SuspendTenantDialog'
import { DeleteTenantDialog } from '@/components/superadmin/DeleteTenantDialog'
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
import { useToast } from '@/components/ui/use-toast'
import type { TenantFilters } from '@/api/superadmin.api'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Ativo', variant: 'default' },
  TRIAL: { label: 'Trial', variant: 'secondary' },
  SUSPENDED: { label: 'Suspenso', variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'outline' },
}

export function TenantsList() {
  const { toast } = useToast()
  const [filters, setFilters] = useState<TenantFilters>({
    page: 1,
    limit: 20,
  })

  const { data, isLoading, isError, error } = useTenants(filters)
  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
    staleTime: 1000 * 60 * 10, // 10 minutos
  })
  const reactivateMutation = useReactivateTenant()

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }))
  }

  const handleStatusFilter = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: status === 'ALL' ? undefined : status,
      page: 1,
    }))
  }

  const handlePlanFilter = (planId: string) => {
    setFilters((prev) => ({
      ...prev,
      planId: planId === 'ALL' ? undefined : planId,
      page: 1,
    }))
  }

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  const handleReactivate = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Confirma a reativação de "${tenantName}"? O acesso será restaurado imediatamente.`)) return

    try {
      await reactivateMutation.mutateAsync(tenantId)
      toast({
        title: '✓ Tenant reativado',
        description: `"${tenantName}" foi reativado. Todos os usuários recuperaram acesso à plataforma.`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha ao reativar tenant',
        description: err.response?.data?.message || 'Ocorreu um erro ao reativar o tenant. Verifique o status e tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tenants</h1>
          <p className="text-slate-400 mt-1">
            Gerencie todos os tenants da plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-slate-500" />
          {data && (
            <span className="text-2xl font-bold text-slate-900">
              {data.meta.total}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar por nome, email ou CNPJ..."
                className="pl-10 bg-white border-slate-200 text-slate-900"
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
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
                <SelectItem value="ACTIVE">Ativos</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="SUSPENDED">Suspensos</SelectItem>
                <SelectItem value="CANCELLED">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            {/* Plan Filter */}
            <Select
              value={filters.planId || 'ALL'}
              onValueChange={handlePlanFilter}
            >
              <SelectTrigger className="w-[200px] bg-white border-slate-200 text-slate-900">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">Todos os planos</SelectItem>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-8 text-center text-slate-400">
              Carregando tenants...
            </div>
          )}

          {isError && (
            <div className="p-8 text-center text-danger/40">
              Erro ao carregar: {error.message}
            </div>
          )}

          {data && data.data.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              Nenhum tenant encontrado
            </div>
          )}

          {data && data.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-slate-100/50">
                  <TableHead className="text-slate-400">Tenant</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Plano</TableHead>
                  <TableHead className="text-slate-400 text-right">
                    Usuários
                  </TableHead>
                  <TableHead className="text-slate-400 text-right">
                    Residentes
                  </TableHead>
                  <TableHead className="text-slate-400">Criado em</TableHead>
                  <TableHead className="text-slate-400 text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((tenant) => {
                  const activeSub = tenant.subscriptions.find(
                    (s) => s.status === 'active' || s.status === 'trialing'
                  )
                  const statusInfo = STATUS_LABELS[tenant.status] || {
                    label: tenant.status,
                    variant: 'outline' as const,
                  }

                  return (
                    <TableRow
                      key={tenant.id}
                      className="border-slate-200 hover:bg-slate-100/30"
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900">
                            {tenant.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {tenant.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {activeSub?.plan.displayName || 'Sem plano'}
                      </TableCell>
                      <TableCell className="text-right text-slate-400">
                        {tenant._count.users}
                      </TableCell>
                      <TableCell className="text-right text-slate-400">
                        {tenant._count.residents}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
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
                            <DropdownMenuItem asChild>
                              <Link
                                to={`/superadmin/tenants/${tenant.id}`}
                                className="cursor-pointer text-slate-400 hover:text-slate-900"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalhes
                              </Link>
                            </DropdownMenuItem>

                            {tenant.status === 'ACTIVE' && (
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="p-0"
                              >
                                <SuspendTenantDialog
                                  tenantId={tenant.id}
                                  tenantName={tenant.name}
                                  variant="menuItem"
                                />
                              </DropdownMenuItem>
                            )}

                            {tenant.status === 'SUSPENDED' && (
                              <DropdownMenuItem
                                onClick={() => handleReactivate(tenant.id, tenant.name)}
                                className="cursor-pointer text-slate-400 hover:text-slate-900"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Reativar
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="p-0"
                            >
                              <DeleteTenantDialog
                                tenantId={tenant.id}
                                tenantName={tenant.name}
                                variant="menuItem"
                              />
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

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Página {data.meta.page} de {data.meta.totalPages} ({data.meta.total}{' '}
            tenants)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(data.meta.page - 1)}
              disabled={data.meta.page === 1}
              className="bg-white border-slate-200 text-slate-400 hover:bg-slate-100"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(data.meta.page + 1)}
              disabled={data.meta.page === data.meta.totalPages}
              className="bg-white border-slate-200 text-slate-400 hover:bg-slate-100"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
