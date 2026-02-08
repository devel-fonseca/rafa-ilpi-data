import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { extractDateOnly } from '@/utils/dateHelpers'
import { useResidents } from '@/hooks/useResidents'
import type { Resident } from '@/api/residents.api'
import { ResidentHistoryDrawer } from '@/components/residents/ResidentHistoryDrawer'
import { ResidentDocumentsModal } from '@/components/residents/ResidentDocumentsModal'
import { DeleteResidentModal } from '@/components/modals/DeleteResidentModal'
import {
  Page,
  PageHeader,
  Section,
  EmptyState,
  StatusBadge,
  AccessDenied,
  LoadingSpinner,
} from '@/design-system/components'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  Printer,
  History,
  Package,
  Accessibility,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatBedFromResident } from '@/utils/formatters'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { DEPENDENCY_LEVEL_SHORT_LABELS, type DependencyLevel } from '@/api/resident-health.api'

export default function ResidentsList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { hasPermission } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [residentToDelete, setResidentToDelete] = useState<Resident | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [historyDrawer, setHistoryDrawer] = useState<{
    open: boolean
    residentId: string | null
    residentName?: string
  }>({
    open: false,
    residentId: null,
  })
  const [documentsModal, setDocumentsModal] = useState<{
    open: boolean
    residentId: string | null
    residentName?: string
  }>({
    open: false,
    residentId: null,
  })

  // Detectar state de navegação para abrir modal automaticamente após criação
  useEffect(() => {
    const state = location.state as { openDocumentsModal?: boolean; residentId?: string; residentName?: string } | null
    if (state?.openDocumentsModal && state?.residentId) {
      setDocumentsModal({
        open: true,
        residentId: state.residentId,
        residentName: state.residentName,
      })
      // Limpar state para evitar reabrir ao navegar de volta
      window.history.replaceState({}, document.title)
    }
  }, [location])

  const { residents, meta, query, setQuery, isLoading, error } = useResidents({
    page: 1,
    limit: 10,
  })

  // Verificar se o usuário tem permissão para gerenciar residentes
  const canManageResidents = hasPermission(PermissionType.CREATE_RESIDENTS) ||
                             hasPermission(PermissionType.UPDATE_RESIDENTS) ||
                             hasPermission(PermissionType.DELETE_RESIDENTS)
  const canViewBelongings = hasPermission(PermissionType.VIEW_BELONGINGS)

  // Aplicar busca
  const handleSearch = () => {
    setQuery({
      ...query,
      search: searchTerm,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      page: 1,
    })
  }

  // Limpar filtros
  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setQuery({
      page: 1,
      limit: 10,
    })
  }

  // Handler de sucesso após exclusão
  const handleDeleteSuccess = () => {
    toast({
      title: 'Sucesso',
      description: 'Residente removido com sucesso',
    })
  }

  // Calcular idade
  const calculateAge = (birthDate: string) => {
    const today = new Date()

    // ✅ Usa extractDateOnly para evitar timezone shift em campo DATE
    const dayKey = extractDateOnly(birthDate)
    const birth = new Date(dayKey + 'T12:00:00')
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Obter cor do badge de status
  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'info' | 'secondary' => {
    switch (status) {
      case 'ATIVO':
        return 'success'
      case 'INATIVO':
        return 'warning'
      case 'ALTA':
        return 'info'
      case 'OBITO':
        return 'secondary'
      case 'TRANSFERIDO':
        return 'info'
      default:
        return 'secondary'
    }
  }

  // Obter cor do badge de grau de dependência
  const getDependencyBadgeVariant = (level: DependencyLevel): 'success' | 'warning' | 'danger' => {
    switch (level) {
      case 'GRAU_I':
        return 'success'
      case 'GRAU_II':
        return 'warning'
      case 'GRAU_III':
        return 'danger'
      default:
        return 'warning'
    }
  }

  // Verificar se o usuário tem permissão para acessar a página
  if (!canManageResidents) {
    return (
      <AccessDenied message="Você não tem permissão para acessar a gestão de residentes." />
    )
  }

  return (
    <Page>
      <PageHeader
        title="Lista de Residentes"
        subtitle="Consulte e gerencie os residentes cadastrados"
        actions={
          <Button onClick={() => navigate('/dashboard/residentes/new')}>
            <Plus className="h-4 w-4" />
            Novo Residente
          </Button>
        }
      />

      {/* Filters */}
      <Section title="Filtros">
        <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ATIVO">Ativos</SelectItem>
                  <SelectItem value="INATIVO">Inativos</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="OBITO">Óbito</SelectItem>
                  <SelectItem value="TRANSFERIDO">Transferido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSearch} variant="default">
              Filtrar
            </Button>

            <Button onClick={handleClearFilters} variant="outline">
              Limpar
            </Button>
        </div>
      </Section>

      {/* Table */}
      <Section
        title="Lista de Residentes"
        description={meta ? `${meta.total} residente${meta.total !== 1 ? 's' : ''} no total` : undefined}
      >
        {isLoading ? (
          <LoadingSpinner message="Carregando residentes..." />
        ) : error ? (
          <EmptyState
            icon={Users}
            title="Erro ao carregar residentes"
            description="Ocorreu um erro ao buscar os residentes. Tente novamente."
            variant="error"
          />
        ) : residents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum residente encontrado"
            description="Comece cadastrando o primeiro residente da instituição"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/residentes/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar primeiro residente
              </Button>
            }
          />
        ) : (
          <div className="rounded-md border">{/* Wrapper for table with border */}
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {residents.map((resident: Resident) => (
                    <TableRow key={resident.id}>
                      <TableCell className="w-12">
                        <PhotoViewer
                          photoUrl={resident.fotoUrl}
                          altText={resident.fullName}
                          size="sm"
                          rounded={true}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{resident.fullName}</span>
                            <StatusBadge variant={getStatusBadgeVariant(resident.status)}>
                              {resident.status}
                            </StatusBadge>
                            {resident.dependencyLevel && (
                              <StatusBadge variant={getDependencyBadgeVariant(resident.dependencyLevel)}>
                                {DEPENDENCY_LEVEL_SHORT_LABELS[resident.dependencyLevel]}
                              </StatusBadge>
                            )}
                            {resident.mobilityAid && (
                              <StatusBadge
                                variant="info"
                                title="Auxílio de mobilidade"
                                className="h-5 min-w-5 px-1.5 justify-center"
                              >
                                <Accessibility className="h-3 w-3" />
                              </StatusBadge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {calculateAge(resident.birthDate)} anos
                            {resident.admissionDate && ` • Admitido em ${formatDateOnlySafe(resident.admissionDate)}`}
                            {resident.bed && ` • ${formatBedFromResident(resident)}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/residentes/${resident.id}/view`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Visualizar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/residentes/${resident.id}`)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Prontuário
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Mais ações</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  setHistoryDrawer({
                                    open: true,
                                    residentId: resident.id,
                                    residentName: resident.fullName,
                                  })
                                }
                              >
                                <History className="mr-2 h-4 w-4" />
                                Ver Histórico
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setDocumentsModal({
                                    open: true,
                                    residentId: resident.id,
                                    residentName: resident.fullName,
                                  })
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Documentos
                              </DropdownMenuItem>
                              {canViewBelongings && (
                                <DropdownMenuItem
                                  onClick={() => navigate(`/dashboard/residentes/${resident.id}/pertences`)}
                                >
                                  <Package className="mr-2 h-4 w-4" />
                                  Pertences
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => navigate(`/dashboard/residentes/${resident.id}/edit`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/dashboard/residentes/${resident.id}/print`)}
                              >
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir/Exportar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-danger"
                                onClick={() => {
                                  setResidentToDelete(resident)
                                  setDeleteModalOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {(meta.page - 1) * meta.limit + 1} até{' '}
                    {Math.min(meta.page * meta.limit, meta.total)} de {meta.total} residentes
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery({ ...query, page: query.page! - 1 })}
                      disabled={meta.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery({ ...query, page: query.page! + 1 })}
                      disabled={meta.page === meta.totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          </div>
        )}
      </Section>

      {/* Delete Confirmation Modal */}
      <DeleteResidentModal
        resident={residentToDelete}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={handleDeleteSuccess}
      />

      {/* Drawer de Histórico */}
      <ResidentHistoryDrawer
        residentId={historyDrawer.residentId || undefined}
        residentName={historyDrawer.residentName}
        open={historyDrawer.open}
        onOpenChange={(open) =>
          setHistoryDrawer({ open, residentId: null, residentName: undefined })
        }
      />

      {/* Modal de Documentos */}
      {documentsModal.residentId && (
        <ResidentDocumentsModal
          isOpen={documentsModal.open}
          onClose={() =>
            setDocumentsModal({ open: false, residentId: null, residentName: undefined })
          }
          residentId={documentsModal.residentId}
          residentName={documentsModal.residentName || 'Residente'}
        />
      )}
    </Page>
  )
}
