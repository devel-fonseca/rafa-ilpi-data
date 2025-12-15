import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useResidents, useDeleteResident, useResidentStats } from '@/hooks/useResidents'
import type { Resident } from '@/api/residents.api'
import { ResidentHistoryDrawer } from '@/components/residents/ResidentHistoryDrawer'
import { ResidentDocumentsModal } from '@/components/residents/ResidentDocumentsModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  FileText,
  Users,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Printer,
  Accessibility,
  ShieldAlert,
  ArrowLeft,
  History,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatBedFromResident } from '@/utils/formatters'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'

export default function ResidentsList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { hasPermission } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; resident: any | null }>({
    open: false,
    resident: null,
  })
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
  const [deleteChangeReason, setDeleteChangeReason] = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState('')

  // Detectar state de navegação para abrir modal automaticamente após criação
  useEffect(() => {
    const state = location.state as any
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

  const { data: stats } = useResidentStats()
  const deleteMutation = useDeleteResident()

  // Verificar se o usuário tem permissão para gerenciar residentes
  const canManageResidents = hasPermission(PermissionType.CREATE_RESIDENTS) ||
                             hasPermission(PermissionType.UPDATE_RESIDENTS) ||
                             hasPermission(PermissionType.DELETE_RESIDENTS)

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

  // Confirmar exclusão
  const handleDelete = async () => {
    if (!deleteModal.resident) return

    // Validar changeReason (mínimo 10 caracteres)
    const trimmedReason = deleteChangeReason.trim()
    if (trimmedReason.length < 10) {
      setDeleteReasonError('Motivo da exclusão deve ter no mínimo 10 caracteres (sem contar espaços)')
      return
    }

    try {
      await deleteMutation.mutateAsync({
        id: deleteModal.resident.id,
        deleteReason: deleteChangeReason,
      })
      toast({
        title: 'Sucesso',
        description: 'Residente removido com sucesso',
      })
      setDeleteModal({ open: false, resident: null })
      setDeleteChangeReason('')
      setDeleteReasonError('')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao remover residente',
        variant: 'destructive',
      })
    }
  }

  // Calcular idade
  const calculateAge = (birthDate: string) => {
    const today = new Date()
     
    // OK: Usado apenas para cálculo de idade (exibição), não envia dados ao backend
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Obter cor do badge de status
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ATIVO':
        return 'bg-success/10 text-success border-success/30'
      case 'INATIVO':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'ALTA':
        return 'bg-info/10 text-info border-info/30'
      case 'OBITO':
        return 'bg-muted text-muted-foreground border-border'
      case 'TRANSFERIDO':
        return 'bg-accent/10 text-accent border-accent/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  // Verificar se o usuário tem permissão para acessar a página
  if (!canManageResidents) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <div className="text-2xl font-semibold">Acesso Negado</div>
        <div className="text-muted-foreground text-center max-w-md">
          Você não tem permissão para acessar a gestão de residentes.
          <br />
          Entre em contato com o administrador caso precise de acesso.
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Residentes</h1>
          <p className="text-muted-foreground mt-1">Gerencie os residentes da ILPI</p>
        </div>
        <Button
          onClick={() => navigate('/dashboard/residentes/new')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Residente
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="text-xs">Total</CardDescription>
                  <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-lg">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="text-xs">Ativos</CardDescription>
                  <CardTitle className="text-2xl font-bold text-success">
                    {stats.ativos}
                  </CardTitle>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg">
                  <UserCheck className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="text-xs">Inativos</CardDescription>
                  <CardTitle className="text-2xl font-bold text-warning">
                    {stats.inativos}
                  </CardTitle>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-lg">
                  <UserX className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-3">
                <CardDescription className="text-xs">Grau de Dependência</CardDescription>
                <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg">
                  <Accessibility className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div className="flex justify-between items-center gap-6">
                <div className="flex-1 text-center">
                  <CardDescription className="text-xs">Grau I</CardDescription>
                  <CardTitle className="text-2xl font-bold text-info">{stats.grauI}</CardTitle>
                </div>
                <div className="flex-1 text-center">
                  <CardDescription className="text-xs">Grau II</CardDescription>
                  <CardTitle className="text-2xl font-bold text-warning">{stats.grauII}</CardTitle>
                </div>
                <div className="flex-1 text-center">
                  <CardDescription className="text-xs">Grau III</CardDescription>
                  <CardTitle className="text-2xl font-bold text-danger">{stats.grauIII}</CardTitle>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-danger">Erro ao carregar residentes</div>
            </div>
          ) : residents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <Users className="h-12 w-12 text-muted" />
              <div className="text-muted-foreground">Nenhum residente encontrado</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/residentes/new')}
              >
                Adicionar primeiro residente
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Acomodação</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell className="font-medium">{resident.fullName}</TableCell>
                      <TableCell>{resident.cpf || '-'}</TableCell>
                      <TableCell>{calculateAge(resident.birthDate)} anos</TableCell>
                      <TableCell>
                        {resident.bed ? (
                          <span className="text-sm font-mono">
                            {formatBedFromResident(resident)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {resident.admissionDate
                          ? formatDateOnlySafe(resident.admissionDate)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(resident.status)}>
                          {resident.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => navigate(`/dashboard/residentes/${resident.id}/view`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/dashboard/residentes/${resident.id}`)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Prontuário
                            </DropdownMenuItem>
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
                              onClick={() => setDeleteModal({ open: true, resident })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        open={deleteModal.open}
        onOpenChange={(open) => {
          setDeleteModal({ open, resident: null })
          if (!open) {
            setDeleteChangeReason('')
            setDeleteReasonError('')
          }
        }}
      >
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o residente{' '}
              <strong>{deleteModal.resident?.fullName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Campo de Motivo da Exclusão - Obrigatório (RDC 502/2021) */}
          <div className="space-y-3 py-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                ⚠️ Atenção: Remoção Permanente
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Conforme RDC 502/2021 Art. 39, é obrigatório documentar o motivo da remoção do prontuário.
                Esta ação ficará registrada permanentemente no histórico de auditoria.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deleteChangeReason" className="text-base font-semibold">
                Motivo da Exclusão <span className="text-danger">*</span>
              </Label>
              <Textarea
                id="deleteChangeReason"
                placeholder="Ex: Falecimento do residente em 12/12/2025 - Atestado de óbito nº 123456..."
                value={deleteChangeReason}
                onChange={(e) => {
                  setDeleteChangeReason(e.target.value)
                  setDeleteReasonError('')
                }}
                className={`min-h-[100px] ${deleteReasonError ? 'border-danger focus:border-danger' : ''}`}
              />
              {deleteReasonError && (
                <p className="text-sm text-danger mt-2">{deleteReasonError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Mínimo de 10 caracteres. Este motivo ficará registrado permanentemente no histórico de alterações.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteChangeReason('')
                setDeleteReasonError('')
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-danger hover:bg-danger/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover Definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  )
}