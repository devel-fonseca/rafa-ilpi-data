import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePrescriptions } from '@/hooks/usePrescriptions'
import { usePrescriptionsDashboard } from '@/hooks/usePrescriptions'
import type { Prescription, QueryPrescriptionParams } from '@/api/prescriptions.api'
import { formatDateOnlySafe } from '@/utils/dateHelpers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  AlertTriangle,
  Pill,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { parseISO } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

export default function PrescriptionsList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ATIVA')
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; prescription: any | null }>({
    open: false,
    prescription: null,
  })

  // Aplicar query params ao carregar a página
  useEffect(() => {
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    if (status === 'VENCENDO') {
      setStatusFilter('VENCENDO')
    } else if (status === 'ATIVA') {
      setStatusFilter('ATIVA')
    } else if (status === 'VENCIDAS') {
      setStatusFilter('VENCIDAS')
    } else if (status === 'INATIVAS') {
      setStatusFilter('INATIVAS')
    } else if (type === 'ANTIBIOTICO') {
      setStatusFilter('ANTIBIOTICO')
    } else if (type === 'CONTROLADO') {
      setStatusFilter('CONTROLADO')
    }
  }, [searchParams])

  const { prescriptions, meta, query, setQuery, isLoading, error } = usePrescriptions({
    page: 1,
    limit: 10,
  })

  const { stats } = usePrescriptionsDashboard()

  // Sincronizar filtros com a query sempre que statusFilter mudar
  useEffect(() => {
    const newQuery: QueryPrescriptionParams = {
      page: 1,
      limit: 10,
    }

    // Aplicar filtro de status (isActive)
    if (statusFilter === 'INATIVAS') {
      newQuery.isActive = false
    } else if (statusFilter === 'ATIVA' || statusFilter === 'VENCENDO') {
      newQuery.isActive = true
    }

    // Aplicar filtro de tipo (prescriptionType)
    if (statusFilter === 'ANTIBIOTICO') {
      newQuery.prescriptionType = 'ANTIBIOTICO'
    } else if (statusFilter === 'CONTROLADO') {
      newQuery.prescriptionType = 'CONTROLADO'
    }

    // Aplicar filtro de vencimento
    if (statusFilter === 'VENCENDO') {
      newQuery.expiringInDays = 5
    }

    setQuery(newQuery)
  }, [statusFilter, setQuery])

  // Aplicar busca
  const handleSearch = () => {
    setQuery({
      ...query,
      page: 1,
    })
  }

  // Limpar filtros
  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ATIVA')
    navigate('/dashboard/prescricoes/list')
  }

  // Confirmar exclusão
  const handleDelete = async () => {
    if (!deleteModal.prescription) return

    try {
      // TODO: Implementar deleção de prescrição
      toast({
        title: 'Sucesso',
        description: 'Prescrição removida com sucesso',
      })
      setDeleteModal({ open: false, prescription: null })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao remover prescrição',
        variant: 'destructive',
      })
    }
  }

  // Obter cor do badge de status
  const getStatusBadgeColor = (prescription: Prescription) => {
    if (!prescription.isActive) return 'bg-gray-100 text-gray-800'

    if (prescription.validUntil) {
      const today = new Date()
      const validUntil = parseISO(prescription.validUntil)
      if (validUntil < today) return 'bg-red-100 text-red-800'
    }

    return 'bg-green-100 text-green-800'
  }

  const getStatusLabel = (prescription: Prescription) => {
    if (!prescription.isActive) return 'Inativa'

    if (prescription.validUntil) {
      const today = new Date()
      const validUntil = parseISO(prescription.validUntil)
      if (validUntil < today) return 'Vencida'
    }

    return 'Ativa'
  }

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status)
    if (status === 'VENCENDO') {
      navigate('/dashboard/prescricoes/list?status=VENCENDO')
    } else if (status === 'ATIVA') {
      navigate('/dashboard/prescricoes/list?status=ATIVA')
    } else if (status === 'VENCIDAS') {
      navigate('/dashboard/prescricoes/list?status=VENCIDAS')
    } else if (status === 'INATIVAS') {
      navigate('/dashboard/prescricoes/list?status=INATIVAS')
    } else if (status === 'ANTIBIOTICO') {
      navigate('/dashboard/prescricoes/list?type=ANTIBIOTICO')
    } else if (status === 'CONTROLADO') {
      navigate('/dashboard/prescricoes/list?type=CONTROLADO')
    }
    setQuery({
      page: 1,
      limit: 10,
    })
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-500" />
        <p className="text-red-600">Erro ao carregar prescrições</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prescrições</h1>
          <p className="text-gray-600 mt-1">Gerencie as prescrições da ILPI</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/dashboard/prescricoes')}
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={() => navigate('/dashboard/prescricoes/new')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Prescrição
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="text-xs">Total</CardDescription>
                  <CardTitle className="text-2xl font-bold">{stats.totalActive}</CardTitle>
                </div>
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="text-xs">Vencendo em 5 dias</CardDescription>
                  <CardTitle className="text-2xl font-bold text-orange-600">
                    {stats.expiringIn5Days}
                  </CardTitle>
                </div>
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="text-xs">Antibióticos</CardDescription>
                  <CardTitle className="text-2xl font-bold text-blue-600">
                    {stats.activeAntibiotics}
                  </CardTitle>
                </div>
                <Pill className="h-5 w-5 text-blue-400" />
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardDescription className="text-xs">Controlados</CardDescription>
                  <CardTitle className="text-2xl font-bold text-purple-600">
                    {stats.activeControlled}
                  </CardTitle>
                </div>
                <CheckCircle2 className="h-5 w-5 text-purple-400" />
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Buscar por residente ou medicamento</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Digite aqui..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Filtro</Label>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVA">Prescrições Ativas</SelectItem>
                  <SelectItem value="VENCENDO">Vencendo em 5 dias</SelectItem>
                  <SelectItem value="VENCIDAS">Prescrições Vencidas</SelectItem>
                  <SelectItem value="INATIVAS">Prescrições Inativas</SelectItem>
                  <SelectItem value="ANTIBIOTICO">Antibióticos</SelectItem>
                  <SelectItem value="CONTROLADO">Controlados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="space-y-2 flex items-end">
              <Button onClick={handleClearFilters} variant="outline" className="w-full">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prescrições ({meta?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : prescriptions && prescriptions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Residente</TableHead>
                      <TableHead>Medicamentos</TableHead>
                      <TableHead>Prescritor</TableHead>
                      <TableHead>Data da Prescrição</TableHead>
                      <TableHead>Válida até</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptions.map((prescription) => (
                      <TableRow key={prescription.id}>
                        <TableCell className="font-medium">
                          {prescription.resident?.fullName || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {prescription.medications && prescription.medications.length > 0 ? (
                              <div className="space-y-1">
                                {prescription.medications.slice(0, 2).map((med: any) => (
                                  <div key={med.id} className="text-gray-600">
                                    {med.name}
                                  </div>
                                ))}
                                {prescription.medications.length > 2 && (
                                  <div className="text-gray-500 italic">
                                    +{prescription.medications.length - 2} mais
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{prescription.doctorName || 'N/A'}</TableCell>
                        <TableCell>
                          {prescription.prescriptionDate
                            ? formatDateOnlySafe(prescription.prescriptionDate)
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {prescription.validUntil
                            ? formatDateOnlySafe(prescription.validUntil)
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(prescription)}>
                            {getStatusLabel(prescription)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => navigate(`/dashboard/prescricoes/${prescription.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/dashboard/prescricoes/${prescription.id}/edit`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setDeleteModal({ open: true, prescription })
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Página {meta.page} de {meta.totalPages} ({meta.total} registros)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        setQuery({ ...query, page: Math.max(1, (query.page || 1) - 1) })
                      }
                      disabled={(query.page || 1) === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() =>
                        setQuery({
                          ...query,
                          page: Math.min(meta.totalPages, (query.page || 1) + 1),
                        })
                      }
                      disabled={(query.page || 1) === meta.totalPages}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nenhuma prescrição encontrada
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Prescrição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a prescrição de{' '}
              <strong>{deleteModal.prescription?.resident?.fullName}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
