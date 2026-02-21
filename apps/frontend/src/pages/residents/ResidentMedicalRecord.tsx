// ──────────────────────────────────────────────────────────────────────────────
//  PAGE - ResidentMedicalRecord (Prontuário do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useResident } from '@/hooks/useResidents'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Page,
  PageHeader,
  AccessDenied,
  EmptyState,
  LoadingSpinner,
  StatusBadge,
} from '@/design-system/components'
import {
  Eye,
  AlertCircle,
  Lock,
  Zap,
} from 'lucide-react'
import { useFeatures } from '@/hooks/useFeatures'
import {
  ViewHigieneModal,
  ViewAlimentacaoModal,
  ViewHidratacaoModal,
  ViewMonitoramentoModal,
  ViewEliminacaoModal,
  ViewComportamentoModal,
  ViewHumorModal,
  ViewSonoModal,
  ViewPesoModal,
  ViewIntercorrenciaModal,
  ViewAtividadesModal,
  ViewVisitaModal,
  ViewOutrosModal,
} from '@/components/view-modals'
import {
  EditAlimentacaoModal,
  EditMonitoramentoModal,
  EditHigieneModal,
  EditHidratacaoModal,
  EditEliminacaoModal,
  EditComportamentoModal,
  EditHumorModal,
  EditSonoModal,
  EditPesoModal,
  EditIntercorrenciaModal,
  EditAtividadesModal,
  EditVisitaModal,
  EditOutrosModal,
} from '@/components/edit-modals'
import { DailyRecordHistoryModal } from '@/components/DailyRecordHistoryModal'
import { DeleteDailyRecordModal } from '@/components/modals/DeleteDailyRecordModal'
import { dailyRecordsAPI, type RecordType } from '@/api/dailyRecords.api'
import { toast } from 'sonner'
import { getErrorMessage } from '@/utils/errorHandling'
import { useQueryClient } from '@tanstack/react-query'
import { tenantKey } from '@/lib/query-keys'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { getCurrentDate } from '@/utils/dateHelpers'
import type { DailyRecord } from '@/api/dailyRecords.api'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/services/api'
import type {
  AlimentacaoRecord,
  AtividadesRecord,
  ComportamentoRecord,
  EliminacaoRecord,
  HidratacaoRecord,
  HigieneRecord,
  HumorRecord,
  IntercorrenciaRecord,
  MonitoramentoRecord,
  OutrosRecord,
  PesoRecord,
  SonoRecord,
  VisitaRecord,
} from '@/types/daily-records'

// Medical Record Components
import {
  MedicalRecordSidebar,
  ResidentSummaryView,
  AlertsOccurrencesView,
  ClinicalProfileView,
  VaccinationsView,
  HealthDocumentsView,
  ClinicalNotesView,
  PrescriptionsView,
  MedicationsView,
  DailyRecordsView,
  ScheduleView,
  ViewMedicationAdministrationModal,
  EditMedicationAdministrationModal,
  MedicationAdministrationHistoryModal,
  DeleteMedicationAdministrationModal,
} from '@/components/medical-record'
import type { MedicalSection, MedicationAdministration } from '@/components/medical-record'

// ========== SECTION CONFIG ==========

const SECTION_CONFIG: Record<MedicalSection, { title: string; subtitle: string }> = {
  'personal': { title: 'Sumário do Residente', subtitle: 'Resumo de saúde e informações essenciais' },
  'alerts-occurrences': { title: 'Alertas e Intercorrências', subtitle: 'Linha do tempo de eventos clínicos e ocorrências' },
  'clinical-profile': { title: 'Perfil Clínico', subtitle: 'Condições de saúde e histórico clínico' },
  'vaccinations': { title: 'Vacinação', subtitle: 'Histórico de imunizações' },
  'health-documents': { title: 'Documentos de Saúde', subtitle: 'Exames, laudos e documentos anexados' },
  'clinical-notes': { title: 'Evoluções Clínicas', subtitle: 'Registros de acompanhamento clínico' },
  'prescriptions': { title: 'Prescrições', subtitle: 'Medicamentos e orientações prescritas' },
  'medications': { title: 'Medicações', subtitle: 'Administrações de medicamentos' },
  'daily-records': { title: 'Registros Diários', subtitle: 'Acompanhamento das atividades diárias' },
  'schedule': { title: 'Agenda do Residente', subtitle: 'Compromissos e atividades agendadas' },
}

// ========== HELPERS ==========

const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'info' | 'secondary' => {
  switch (status?.toUpperCase()) {
    case 'ATIVO':
      return 'success'
    case 'INATIVO':
      return 'warning'
    case 'ALTA':
    case 'TRANSFERIDO':
      return 'info'
    case 'OBITO':
    case 'ÓBITO':
    case 'FALECIDO':
      return 'secondary'
    default:
      return 'secondary'
  }
}

// ========== COMPONENT ==========

export default function ResidentProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSectionParam = searchParams.get('section')
  const initialSection =
    initialSectionParam && initialSectionParam in SECTION_CONFIG
      ? (initialSectionParam as MedicalSection)
      : 'personal'

  const [activeSection, setActiveSection] = useState<MedicalSection>(initialSection)
  const [viewDate, setViewDate] = useState<string>(getCurrentDate())

  // View modal states
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingRecord, setViewingRecord] = useState<DailyRecord | null>(null)
  const [vitalSignsBlockedModalOpen, setVitalSignsBlockedModalOpen] = useState(false)

  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // History modal states
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

  // Delete modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<DailyRecord | null>(null)

  // Medication Administration modal states
  const [viewAdminModalOpen, setViewAdminModalOpen] = useState(false)
  const [viewingAdministration, setViewingAdministration] = useState<MedicationAdministration | null>(null)
  const [editAdminModalOpen, setEditAdminModalOpen] = useState(false)
  const [editingAdministration, setEditingAdministration] = useState<MedicationAdministration | null>(null)
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false)
  const [historyAdminModalOpen, setHistoryAdminModalOpen] = useState(false)
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null)
  const [deleteAdminModalOpen, setDeleteAdminModalOpen] = useState(false)
  const [deletingAdministration, setDeletingAdministration] = useState<MedicationAdministration | null>(null)

  const queryClient = useQueryClient()
  const shouldAutoOpenAnthropometry = searchParams.get('openModal') === 'anthropometry-create'

  const { data: resident, isLoading, error } = useResident(id || '')
  const { hasPermission } = usePermissions()
  const { hasFeature } = useFeatures()

  // Verificar se o usuário tem permissão para visualizar prontuário
  const canViewMedicalRecord = hasPermission(PermissionType.VIEW_CLINICAL_PROFILE)
  const canLoadVitalSignAlerts = hasPermission(PermissionType.VIEW_VITAL_SIGNS) && hasFeature('sinais_vitais')

  const handleSectionChange = (section: MedicalSection) => {
    setActiveSection(section)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('section', section)
    setSearchParams(nextParams, { replace: true })
  }

  const handleViewRecord = (record: DailyRecord) => {
    setViewingRecord(record)
    setViewModalOpen(true)
  }

  const handleEditRecord = (record: DailyRecord) => {
    setEditingRecord(record)
    setEditModalOpen(true)
  }

  const handleHistoryRecord = (recordId: string) => {
    setSelectedRecordId(recordId)
    setHistoryModalOpen(true)
  }

  const handleDeleteRecord = (record: DailyRecord) => {
    setDeletingRecord(record)
    setDeleteModalOpen(true)
  }

  // Handlers para Medicações (Administrações)
  const handleViewAdministration = (admin: MedicationAdministration) => {
    setViewingAdministration(admin)
    setViewAdminModalOpen(true)
  }

  const handleEditAdministration = (admin: MedicationAdministration) => {
    setEditingAdministration(admin)
    setEditAdminModalOpen(true)
  }

  const handleHistoryAdministration = (adminId: string) => {
    setSelectedAdminId(adminId)
    setHistoryAdminModalOpen(true)
  }

  const handleDeleteAdministration = (admin: MedicationAdministration) => {
    setDeletingAdministration(admin)
    setDeleteAdminModalOpen(true)
  }

  const handleConfirmEditAdministration = async (data: {
    actualTime?: string
    wasAdministered: boolean
    reason?: string
    notes?: string
    editReason: string
  }) => {
    if (!editingAdministration) {
      toast.error('Nenhuma administração selecionada para edição')
      return
    }

    try {
      setIsUpdatingAdmin(true)
      await api.patch(`/prescriptions/medication-administrations/${editingAdministration.id}`, data)

      toast.success('Administração atualizada com sucesso')
      setEditAdminModalOpen(false)
      setEditingAdministration(null)
      // Invalidar cache para recarregar
      queryClient.invalidateQueries({ queryKey: tenantKey('medication-administrations') })
    } catch (err: unknown) {
      console.error('Erro ao atualizar administração:', err)
      toast.error(getErrorMessage(err, 'Erro ao atualizar administração'))
    } finally {
      setIsUpdatingAdmin(false)
    }
  }

  const handleDeleteAdminSuccess = () => {
    setDeleteAdminModalOpen(false)
    setDeletingAdministration(null)
    // Invalidar cache para recarregar
    queryClient.invalidateQueries({ queryKey: tenantKey('medication-administrations') })
  }

  const handleConfirmEdit = async (payload: {
    type?: RecordType
    date?: string
    time?: string
    data?: Record<string, unknown>
    recordedBy?: string
    notes?: string
    editReason: string
  }) => {
    if (!editingRecord) {
      toast.error('Nenhum registro selecionado para edição')
      return
    }

    try {
      setIsUpdating(true)
      await dailyRecordsAPI.update(editingRecord.id, payload)

      toast.success('Registro atualizado com sucesso')
      setEditModalOpen(false)
      setEditingRecord(null)
      // Invalidar cache para recarregar registros
      queryClient.invalidateQueries({ queryKey: tenantKey('daily-records') })
    } catch (err: unknown) {
      console.error('Erro ao atualizar registro:', err)
      toast.error(getErrorMessage(err, 'Erro ao atualizar registro'))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEditModalSubmit = (data: Record<string, unknown>) => {
    void handleConfirmEdit(data as {
      type?: RecordType
      date?: string
      time?: string
      data?: Record<string, unknown>
      recordedBy?: string
      notes?: string
      editReason: string
    })
  }

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false)
    setDeletingRecord(null)
    // Invalidar cache para recarregar registros
    queryClient.invalidateQueries({ queryKey: tenantKey('daily-records') })
  }

  const handleRecordUpdated = () => {
    // Recarregar registros após restauração do histórico
    queryClient.invalidateQueries({ queryKey: tenantKey('daily-records') })
  }

  const handleVitalSignsClick = () => {
    if (hasFeature('sinais_vitais')) {
      navigate(`/dashboard/sinais-vitais/${id}`)
    } else {
      setVitalSignsBlockedModalOpen(true)
    }
  }

  const handleIncidentManagementClick = () => {
    navigate(`/dashboard/intercorrencias/${id}`)
  }

  useEffect(() => {
    const sectionParam = searchParams.get('section')
    if (!sectionParam || !(sectionParam in SECTION_CONFIG)) return

    const targetSection = sectionParam as MedicalSection
    if (targetSection !== activeSection) {
      setActiveSection(targetSection)
    }
  }, [searchParams, activeSection])

  const handleAnthropometryAutoOpenHandled = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('openModal')
    nextParams.delete('section')
    setSearchParams(nextParams, { replace: true })
  }

  if (isLoading) {
    return (
      <Page maxWidth="wide">
        <PageHeader
          title="Prontuário do Residente"
          subtitle="Visualização e edição de dados no prontuário do residente"
          backButton={{ onClick: () => navigate('/dashboard/residentes') }}
        />
        <LoadingSpinner message="Carregando prontuário..." />
      </Page>
    )
  }

  if (error || !resident) {
    return (
      <Page maxWidth="wide">
        <PageHeader
          title="Prontuário do Residente"
          subtitle="Visualização e edição de dados no prontuário do residente"
          backButton={{ onClick: () => navigate('/dashboard/residentes') }}
        />
        <EmptyState
          icon={AlertCircle}
          title="Residente não encontrado"
          description="Não foi possível carregar este prontuário."
          variant="error"
          action={
            <Button variant="outline" onClick={() => navigate('/dashboard/residentes')}>
              Voltar para a lista
            </Button>
          }
        />
      </Page>
    )
  }

  // Verificar se o usuário tem permissão para visualizar prontuário
  if (!canViewMedicalRecord) {
    return (
      <Page maxWidth="wide">
        <PageHeader
          title="Prontuário do Residente"
          subtitle="Visualização e edição de dados no prontuário do residente"
          backButton={{ onClick: () => navigate('/dashboard/residentes') }}
        />
        <AccessDenied
          message="Você não tem permissão para visualizar o prontuário médico dos residentes."
          backButtonText="Voltar para Residentes"
          backPath="/dashboard/residentes"
        />
      </Page>
    )
  }

  // Renderizar a view ativa
  const renderActiveView = () => {
    const commonProps = {
      residentId: id || '',
      residentName: resident.fullName,
    }

    switch (activeSection) {
      case 'personal':
        return (
          <ResidentSummaryView
            {...commonProps}
            resident={resident}
            onVitalSignsClick={handleVitalSignsClick}
            canLoadVitalSignAlerts={canLoadVitalSignAlerts}
          />
        )
      case 'alerts-occurrences':
        return (
          <AlertsOccurrencesView
            {...commonProps}
            onVitalSignsClick={handleVitalSignsClick}
            canLoadVitalSignAlerts={canLoadVitalSignAlerts}
            onOpenIncidentManagement={handleIncidentManagementClick}
          />
        )
      case 'clinical-profile':
        return (
          <ClinicalProfileView
            {...commonProps}
            autoOpenAnthropometry={shouldAutoOpenAnthropometry}
            onAutoOpenAnthropometryHandled={handleAnthropometryAutoOpenHandled}
          />
        )
      case 'vaccinations':
        return <VaccinationsView {...commonProps} />
      case 'health-documents':
        return <HealthDocumentsView {...commonProps} />
      case 'clinical-notes':
        return <ClinicalNotesView {...commonProps} />
      case 'prescriptions':
        return <PrescriptionsView {...commonProps} />
      case 'medications':
        return (
          <MedicationsView
            {...commonProps}
            viewDate={viewDate}
            onDateChange={setViewDate}
            onViewAdministration={handleViewAdministration}
            onEditAdministration={handleEditAdministration}
            onHistoryAdministration={handleHistoryAdministration}
            onDeleteAdministration={handleDeleteAdministration}
          />
        )
      case 'daily-records':
        return (
          <DailyRecordsView
            {...commonProps}
            viewDate={viewDate}
            onDateChange={setViewDate}
            onViewRecord={handleViewRecord}
            onEditRecord={handleEditRecord}
            onHistoryRecord={handleHistoryRecord}
            onDeleteRecord={handleDeleteRecord}
          />
        )
      case 'schedule':
        return <ScheduleView {...commonProps} />
      default:
        return null
    }
  }

  return (
    <Page maxWidth="wide">
      <PageHeader
        title="Prontuário do Residente"
        subtitle="Visualização e edição de dados no prontuário do residente"
        backButton={{ onClick: () => navigate('/dashboard/residentes') }}
        actions={
          <Button variant="outline" onClick={() => navigate(`/dashboard/residentes/${id}/view`)}>
            <Eye className="mr-2 h-4 w-4" />
            Ver Cadastro
          </Button>
        }
      />

      {/* Layout Split-View */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 min-w-0">
        <MedicalRecordSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-0 min-w-0">
            {/* Resident Header */}
            <div className="px-6 py-4 bg-primary/10 rounded-t-lg">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-primary">{resident.fullName}</h2>
                <StatusBadge variant={getStatusBadgeVariant(resident.status)}>
                  {resident.status}
                </StatusBadge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {SECTION_CONFIG[activeSection].title} • {SECTION_CONFIG[activeSection].subtitle}
              </p>
            </div>

            {/* Active View Content */}
            <div className="p-6 min-w-0 overflow-x-auto">
              {renderActiveView()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modais de Visualização de Registros Diários */}
      {viewingRecord?.type === 'HIGIENE' && (
        <ViewHigieneModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as HigieneRecord}
        />
      )}

      {viewingRecord?.type === 'ALIMENTACAO' && (
        <ViewAlimentacaoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as AlimentacaoRecord}
        />
      )}

      {viewingRecord?.type === 'HIDRATACAO' && (
        <ViewHidratacaoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as HidratacaoRecord}
        />
      )}

      {viewingRecord?.type === 'MONITORAMENTO' && (
        <ViewMonitoramentoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as MonitoramentoRecord}
        />
      )}

      {viewingRecord?.type === 'ELIMINACAO' && (
        <ViewEliminacaoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as EliminacaoRecord}
        />
      )}

      {viewingRecord?.type === 'COMPORTAMENTO' && (
        <ViewComportamentoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as ComportamentoRecord}
        />
      )}

      {viewingRecord?.type === 'HUMOR' && (
        <ViewHumorModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as HumorRecord}
        />
      )}

      {viewingRecord?.type === 'SONO' && (
        <ViewSonoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as SonoRecord}
        />
      )}

      {viewingRecord?.type === 'PESO' && (
        <ViewPesoModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as PesoRecord}
        />
      )}

      {viewingRecord?.type === 'INTERCORRENCIA' && (
        <ViewIntercorrenciaModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as IntercorrenciaRecord}
        />
      )}

      {viewingRecord?.type === 'ATIVIDADES' && (
        <ViewAtividadesModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as AtividadesRecord}
        />
      )}

      {viewingRecord?.type === 'VISITA' && (
        <ViewVisitaModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as VisitaRecord}
        />
      )}

      {viewingRecord?.type === 'OUTROS' && (
        <ViewOutrosModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          record={viewingRecord as unknown as OutrosRecord}
        />
      )}

      {/* Modais de Edição Específicos por Tipo */}
      {editingRecord?.type === 'ALIMENTACAO' && (
        <EditAlimentacaoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as AlimentacaoRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'MONITORAMENTO' && (
        <EditMonitoramentoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as MonitoramentoRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'HIGIENE' && (
        <EditHigieneModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as HigieneRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'HIDRATACAO' && (
        <EditHidratacaoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as HidratacaoRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'ELIMINACAO' && (
        <EditEliminacaoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as EliminacaoRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'COMPORTAMENTO' && (
        <EditComportamentoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as ComportamentoRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'HUMOR' && (
        <EditHumorModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as HumorRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'SONO' && (
        <EditSonoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as SonoRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'PESO' && (
        <EditPesoModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as PesoRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'INTERCORRENCIA' && (
        <EditIntercorrenciaModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as IntercorrenciaRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'ATIVIDADES' && (
        <EditAtividadesModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as AtividadesRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'VISITA' && (
        <EditVisitaModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as VisitaRecord}
          isUpdating={isUpdating}
        />
      )}

      {editingRecord?.type === 'OUTROS' && (
        <EditOutrosModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditModalSubmit}
          record={editingRecord as unknown as OutrosRecord}
          isUpdating={isUpdating}
        />
      )}

      {/* Modal de Histórico */}
      {selectedRecordId && (
        <DailyRecordHistoryModal
          recordId={selectedRecordId}
          open={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
          onRecordUpdated={handleRecordUpdated}
        />
      )}

      {/* Modal de Exclusão */}
      <DeleteDailyRecordModal
        record={deletingRecord ?? undefined}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={handleDeleteSuccess}
      />

      {/* ========== Modais de Administração de Medicamentos ========== */}

      {/* Modal de Visualização de Administração */}
      <ViewMedicationAdministrationModal
        open={viewAdminModalOpen}
        onClose={() => setViewAdminModalOpen(false)}
        administration={viewingAdministration}
      />

      {/* Modal de Edição de Administração */}
      <EditMedicationAdministrationModal
        open={editAdminModalOpen}
        onClose={() => setEditAdminModalOpen(false)}
        onSubmit={handleConfirmEditAdministration}
        administration={editingAdministration}
        isUpdating={isUpdatingAdmin}
      />

      {/* Modal de Histórico de Administração */}
      <MedicationAdministrationHistoryModal
        open={historyAdminModalOpen}
        onOpenChange={setHistoryAdminModalOpen}
        administrationId={selectedAdminId}
      />

      {/* Modal de Exclusão de Administração */}
      <DeleteMedicationAdministrationModal
        administration={deletingAdministration}
        open={deleteAdminModalOpen}
        onOpenChange={setDeleteAdminModalOpen}
        onSuccess={handleDeleteAdminSuccess}
      />

      {/* Modal de Feature Bloqueada - Sinais Vitais */}
      <Dialog open={vitalSignsBlockedModalOpen} onOpenChange={() => setVitalSignsBlockedModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Lock className="h-6 w-6 text-amber-600 dark:text-amber-500" />
            </div>
            <DialogTitle className="text-center">Recurso Bloqueado</DialogTitle>
            <DialogDescription className="text-center">
              <strong className="text-foreground">Sinais Vitais</strong> não está disponível no seu plano atual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Visualização de gráficos, tabelas e histórico completo de sinais vitais para análise e monitoramento clínico.
            </p>

            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground text-center">
                Faça upgrade do seu plano para desbloquear este e outros recursos avançados
              </p>
            </div>
          </div>

          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" onClick={() => setVitalSignsBlockedModalOpen(false)}>
              Voltar
            </Button>
            <Button
              onClick={() => {
                setVitalSignsBlockedModalOpen(false)
                navigate('/settings/billing')
              }}
            >
              <Zap className="mr-2 h-4 w-4" />
              Fazer Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  )
}
