import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePrescriptions } from '@/hooks/usePrescriptions'
import { usePrescriptionsDashboard } from '@/hooks/usePrescriptions'
import type { Prescription, QueryPrescriptionParams, Medication, SOSMedication } from '@/api/prescriptions.api'
import { formatDateOnlySafe, extractDateOnly } from '@/utils/dateHelpers'
import { Card, CardContent } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  FileCheck,
} from 'lucide-react'
// parseISO removido - usar extractDateOnly para campos DATE
import { useToast } from '@/components/ui/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { MedicalReviewModal } from './modals/MedicalReviewModal'
import { DeletePrescriptionModal } from './modals/DeletePrescriptionModal'
import { Page, PageHeader, Section, EmptyState } from '@/design-system/components'

export default function PrescriptionsList() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isTechnicalManager } = usePermissions()
  const [searchParams] = useSearchParams()

  // Apenas RT pode criar, editar e excluir prescrições
  const canManagePrescriptions = isTechnicalManager()
  const canCreatePrescriptions = canManagePrescriptions
  const canUpdatePrescriptions = canManagePrescriptions
  const canDeletePrescriptions = canManagePrescriptions
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ATIVA')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<Prescription | null>(null)

  // Estado do modal de revisão médica
  const [reviewModal, setReviewModal] = useState<{ open: boolean; prescription: Prescription | null }>({
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

  // Callback após exclusão bem-sucedida
  const handleDeleteSuccess = () => {
    // Força re-fetch mantendo a query atual
    setQuery({ ...query })
    toast({
      title: 'Prescrição excluída',
      description: 'A prescrição foi excluída com sucesso.',
    })
  }

  // Obter cor do badge de status
  const getStatusBadgeColor = (prescription: Prescription) => {
    if (!prescription.isActive) return 'bg-muted text-foreground/90'

    if (prescription.validUntil) {
      const today = new Date()
      // ✅ Usa extractDateOnly para evitar timezone shift em campo DATE
      const dayKey = extractDateOnly(prescription.validUntil)
      const validUntil = new Date(dayKey + 'T12:00:00')
      if (validUntil < today) return 'bg-danger/10 text-danger/90'
    }

    return 'bg-success/10 text-success/90'
  }

  const getStatusLabel = (prescription: Prescription) => {
    if (!prescription.isActive) return 'Inativa'

    if (prescription.validUntil) {
      const today = new Date()
      // ✅ Usa extractDateOnly para evitar timezone shift em campo DATE
      const dayKey = extractDateOnly(prescription.validUntil)
      const validUntil = new Date(dayKey + 'T12:00:00')
      if (validUntil < today) return 'Vencida'
    }

    return 'Ativa'
  }

  // Determinar se a prescrição precisa de revisão médica
  const needsMedicalReview = (prescription: Prescription): boolean => {
    if (!prescription.isActive) return false

    if (prescription.reviewDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // ✅ Usa extractDateOnly para evitar timezone shift em campo DATE
      const dayKey = extractDateOnly(prescription.reviewDate)
      const reviewDate = new Date(dayKey + 'T00:00:00')
      return reviewDate <= today
    }

    return false
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
      <Page>
        <PageHeader
          title="Prescrições"
          subtitle="Gerencie as prescrições da ILPI"
          backButton={{ onClick: () => navigate('/dashboard/prescricoes') }}
        />
        <EmptyState
          icon={AlertTriangle}
          title="Erro ao carregar prescrições"
          description="Ocorreu um erro ao buscar as prescrições. Tente novamente."
          variant="error"
        />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title="Prescrições"
        subtitle="Gerencie as prescrições da ILPI"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Prescrições', href: '/dashboard/prescricoes' },
          { label: 'Lista' },
        ]}
        actions={
          canCreatePrescriptions && (
            <Button onClick={() => navigate('/dashboard/prescricoes/new')}>
              <Plus className="h-4 w-4" />
              Nova Prescrição
            </Button>
          )
        }
      />

      {/* Stats Cards */}
      {stats && (
        <Section title="Estatísticas">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
                    <p className="text-2xl font-bold text-primary mt-1">{stats.totalActive}</p>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Vencendo em 5 dias</h3>
                    <p className="text-2xl font-bold text-severity-warning mt-1">
                      {stats.expiringIn5Days}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-severity-warning/10 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-severity-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Antibióticos</h3>
                    <p className="text-2xl font-bold text-success mt-1">
                      {stats.activeAntibiotics}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg">
                    <Pill className="h-6 w-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Controlados</h3>
                    <p className="text-2xl font-bold text-medication-controlled mt-1">
                      {stats.activeControlled}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-medication-controlled/10 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-medication-controlled" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>
      )}

      {/* Search and Filters */}
      <Section title="Filtros">
        <div className="flex flex-col gap-4">
          {/* Search - ocupa linha inteira em mobile */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm">Buscar</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="Residente ou medicamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} variant="outline" size="icon" className="shrink-0">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Filtro e Botão lado a lado em mobile */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Status Filter */}
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="status" className="text-sm">Status</Label>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVA">Ativas</SelectItem>
                  <SelectItem value="VENCENDO">Vencendo (5d)</SelectItem>
                  <SelectItem value="VENCIDAS">Vencidas</SelectItem>
                  <SelectItem value="INATIVAS">Inativas</SelectItem>
                  <SelectItem value="ANTIBIOTICO">Antibióticos</SelectItem>
                  <SelectItem value="CONTROLADO">Controlados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="space-y-2 col-span-2 sm:col-span-2 flex items-end">
              <Button onClick={handleClearFilters} variant="outline" className="w-full h-10">
                Limpar
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Table */}
      <Section title={`Prescrições (${meta?.total || 0})`}>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
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
                            {(() => {
                              const continuousMeds = prescription.medications || []
                              const sosMeds = prescription.sosMedications || []
                              const totalMeds = continuousMeds.length + sosMeds.length

                              if (totalMeds === 0) {
                                return <span className="text-muted-foreground">-</span>
                              }

                              const displayMeds = [
                                ...continuousMeds.slice(0, 2).map((med: Medication) => ({
                                  id: med.id,
                                  name: med.name,
                                  type: 'contínuo',
                                })),
                                ...sosMeds
                                  .slice(0, Math.max(0, 2 - continuousMeds.length))
                                  .map((med: SOSMedication) => ({
                                    id: med.id,
                                    name: med.name,
                                    type: 'SOS',
                                  })),
                              ]

                              const remainingMeds = [
                                ...continuousMeds.slice(2).map((med: Medication) => ({
                                  name: med.name,
                                  type: 'contínuo',
                                })),
                                ...sosMeds.slice(Math.max(0, 2 - continuousMeds.length)).map((med: SOSMedication) => ({
                                  name: med.name,
                                  type: 'SOS',
                                })),
                              ]

                              return (
                                <div className="space-y-1">
                                  {displayMeds.map((med) => (
                                    <div key={med.id} className="flex items-center gap-2">
                                      <span className="text-muted-foreground">{med.name}</span>
                                      {med.type === 'SOS' && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs px-1.5 py-0 bg-severity-warning/5 text-severity-warning/80 border-severity-warning/30"
                                        >
                                          SOS
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                  {totalMeds > 2 && (
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="inline-block">
                                            <span className="text-muted-foreground italic text-xs cursor-help underline decoration-dotted">
                                              +{totalMeds - 2} mais
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-xs">
                                          <div className="space-y-1">
                                            <p className="font-semibold text-xs mb-2">Outros medicamentos:</p>
                                            {remainingMeds.map((med, idx) => (
                                              <div key={idx} className="flex items-center gap-2 text-xs">
                                                <span>• {med.name}</span>
                                                {med.type === 'SOS' && (
                                                  <Badge
                                                    variant="outline"
                                                    className="text-[10px] px-1 py-0 bg-severity-warning/5 text-severity-warning/80 border-severity-warning/30"
                                                  >
                                                    SOS
                                                  </Badge>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              )
                            })()}
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
                              {canUpdatePrescriptions && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => navigate(`/dashboard/prescricoes/${prescription.id}/edit`)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  {needsMedicalReview(prescription) && (
                                    <DropdownMenuItem
                                      onClick={() => setReviewModal({ open: true, prescription })}
                                      className="text-warning/80 dark:text-warning/40"
                                    >
                                      <FileCheck className="h-4 w-4 mr-2" />
                                      Registrar Revisão Médica
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                              {canDeletePrescriptions && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setPrescriptionToDelete(prescription)
                                      setDeleteModalOpen(true)
                                    }}
                                    className="text-danger"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Deletar
                                  </DropdownMenuItem>
                                </>
                              )}
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
                  <div className="text-sm text-muted-foreground">
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
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma prescrição encontrada
            </div>
          )}
      </Section>

      {/* Delete Prescription Modal (com reautenticação) */}
      <DeletePrescriptionModal
        prescription={prescriptionToDelete}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={handleDeleteSuccess}
      />

      {/* Medical Review Modal */}
      {reviewModal.prescription && (
        <MedicalReviewModal
          prescriptionId={reviewModal.prescription.id}
          residentId={reviewModal.prescription.residentId}
          open={reviewModal.open}
          onClose={() => setReviewModal({ open: false, prescription: null })}
        />
      )}
    </Page>
  )
}
