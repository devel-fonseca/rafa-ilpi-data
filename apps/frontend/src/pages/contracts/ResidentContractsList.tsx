import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listResidentContracts } from '@/services/residentContractsApi'
import { Page, PageHeader, EmptyState } from '@/design-system/components'
import { Card } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Plus,
  Eye,
  FileText,
  Loader2,
  AlertCircle,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'

export default function ResidentContractsList() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Verificar permissões
  const canCreateContracts = hasPermission(PermissionType.CREATE_CONTRACTS)
  const canViewContracts = hasPermission(PermissionType.VIEW_CONTRACTS)

  // Buscar contratos
  const { data: contracts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['resident-contracts', searchTerm, statusFilter],
    queryFn: () => listResidentContracts({
      search: searchTerm || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
    }),
    enabled: canViewContracts,
  })

  // Aplicar busca
  const handleSearch = () => {
    refetch()
  }

  // Limpar filtros
  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
  }

  // Obter cor do badge de status
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'VIGENTE':
        return 'bg-success/10 text-success border-success/30'
      case 'VENCENDO_EM_30_DIAS':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'VENCIDO':
        return 'bg-danger/10 text-danger border-danger/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  // Traduzir status
  const translateStatus = (status: string) => {
    switch (status) {
      case 'VIGENTE':
        return 'Vigente'
      case 'VENCENDO_EM_30_DIAS':
        return 'Vencendo em 30 dias'
      case 'VENCIDO':
        return 'Vencido'
      default:
        return status
    }
  }

  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Verificar permissão para visualizar
  if (!canViewContracts) {
    return (
      <Page maxWidth="wide">
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div className="text-2xl font-semibold">Acesso Negado</div>
          <div className="text-muted-foreground text-center max-w-md">
            Você não tem permissão para visualizar contratos de residentes.
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page maxWidth="wide">
      <PageHeader
        title="Contratos de Prestação de Serviços"
        subtitle="Gerencie os contratos digitalizados dos residentes"
        actions={
          canCreateContracts && (
            <Button onClick={() => navigate('/dashboard/contratos/novo')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Contrato
            </Button>
          )
        }
      />

      {/* Filtros */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome do residente, número do contrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Status</SelectItem>
                <SelectItem value="VIGENTE">Vigente</SelectItem>
                <SelectItem value="VENCENDO_EM_30_DIAS">Vencendo em 30 dias</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabela de Contratos */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <AlertCircle className="h-12 w-12 text-danger" />
            <div className="text-muted-foreground">Erro ao carregar contratos</div>
            <Button variant="outline" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : contracts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum contrato encontrado"
            description={
              searchTerm || statusFilter !== 'ALL'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece cadastrando o primeiro contrato de residente'
            }
            action={
              canCreateContracts &&
              !searchTerm &&
              statusFilter === 'ALL' ? (
                <Button onClick={() => navigate('/dashboard/contratos/novo')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Contrato
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número do Contrato</TableHead>
                  <TableHead>Residente</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Valor Mensal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                      {contract.contractNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {contract.resident?.fullName || 'Nome não disponível'}
                        </span>
                        {contract.resident?.cpf && (
                          <span className="text-xs text-muted-foreground">
                            CPF: {contract.resident.cpf}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {formatDateOnlySafe(contract.startDate)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            até {formatDateOnlySafe(contract.endDate)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {formatCurrency(Number(contract.monthlyAmount))}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Venc. dia {contract.dueDay}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(contract.status)}>
                        {translateStatus(contract.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        v{contract.version}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/dashboard/contratos/${contract.residentId}/${contract.id}`
                          )
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Estatísticas (opcional) */}
      {contracts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{contracts.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vigentes</p>
                <p className="text-2xl font-bold text-success">
                  {contracts.filter((c) => c.status === 'VIGENTE').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-success" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencendo</p>
                <p className="text-2xl font-bold text-warning">
                  {
                    contracts.filter((c) => c.status === 'VENCENDO_EM_30_DIAS')
                      .length
                  }
                </p>
              </div>
              <FileText className="h-8 w-8 text-warning" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-danger">
                  {contracts.filter((c) => c.status === 'VENCIDO').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-danger" />
            </div>
          </Card>
        </div>
      )}
    </Page>
  )
}
