import { useAuthStore } from '@/stores/auth.store'
import { Calendar } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { Medication, MedicationPresentation, AdministrationRoute, MedicationFrequency } from '@/api/medications.api'
import { toast } from 'sonner'

// Tipo estendido para medication com campo opcional preselectedScheduledTime
type MedicationWithPreselectedTime = Medication & {
  preselectedScheduledTime?: string
}
import { getCurrentDate } from '@/utils/dateHelpers'
import { useResidentStats } from '@/hooks/useResidents'
import { useDailyRecordsCountByDate } from '@/hooks/useDailyRecords'
import { usersApi } from '@/api/users.api'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'
import { TodayShiftsInfo } from '@/components/dashboard/TodayShiftsInfo'
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { EventsSection } from '@/components/caregiver/EventsSection'
import { useTechnicalManagerTasks } from '@/hooks/useTechnicalManagerTasks'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { useAdminDashboardOverview } from '@/hooks/useAdminDashboard'
import { useAdminDashboardRealtime } from '@/hooks/useAdminDashboardRealtime'
import { Page, PageHeader, Section, CollapsibleSection } from '@/design-system/components'
import { AdministerMedicationModal } from '@/pages/prescriptions/components/AdministerMedicationModal'
import { ResidentQuickViewModal } from '@/components/residents/ResidentQuickViewModal'
import { tenantKey } from '@/lib/query-keys'

/**
 * TechnicalManagerDashboard
 *
 * Dashboard para usuários com função de Responsável Técnico (TECHNICAL_MANAGER).
 * Baseado no Dashboard.tsx padrão, adaptado para visão gerencial e supervisão.
 *
 * Foco:
 * - Supervisão de atividades operacionais
 * - Estatísticas e indicadores de qualidade
 * - Acesso rápido a funcionalidades de gestão
 * - Monitoramento de compliance e pendências
 */
export function TechnicalManagerDashboard() {
  const { user } = useAuthStore()
  const today = getCurrentDate()

  // Permissões
  const { hasPermission } = usePermissions()
  const canAdministerMedications = hasPermission(PermissionType.ADMINISTER_MEDICATIONS)
  const canViewDashboardOverview =
    user?.profile?.positionCode === 'TECHNICAL_MANAGER' ||
    user?.profile?.positionCode === 'ADMINISTRATOR' ||
    hasPermission(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  useAdminDashboardRealtime({ enabled: canViewDashboardOverview })
  const { data: overview, isLoading: isLoadingOverview } = useAdminDashboardOverview({
    enabled: canViewDashboardOverview,
  })

  // Estados para modais
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)
  const [selectedMedication, setSelectedMedication] = useState<MedicationWithPreselectedTime | null>(null)

  // Buscar estatísticas reais (hooks devem ser chamados antes de early returns)
  const { data: complianceStats, isLoading: isLoadingCompliance } = useAdminCompliance()
  const { data: managerTasks, isLoading: isLoadingTasks, refetch: refetchTasks } = useTechnicalManagerTasks()
  const { data: residentsStats } = useResidentStats()

  const { data: prescriptionsStats } = useQuery({
    queryKey: tenantKey('prescriptions', 'stats', 'dashboard'),
    queryFn: async () => {
      const response = await api.get('/prescriptions/stats/dashboard')
      return response.data
    },
  })

  const { data: usersCount } = useQuery({
    queryKey: tenantKey('users', 'stats', 'count'),
    queryFn: () => usersApi.countActiveUsers(),
  })

  // Buscar total real de registros de hoje (não depende do tamanho da página da API)
  const { data: totalRecordsToday = 0 } = useDailyRecordsCountByDate(today)

  const totalResidents = residentsStats?.total || 0
  const totalPrescriptions = prescriptionsStats?.totalActive || 0
  const totalUsers = usersCount || 0
  const pendingActivities = overview?.pendingActivities || []
  const recentActivities = overview?.recentActivities || []

  // Handler para administrar medicação
  const handleAdministerMedication = (
    medicationId: string,
    _residentId: string,
    scheduledTime: string,
  ) => {
    if (!canAdministerMedications) {
      toast.error('Você não tem permissão para administrar medicações')
      return
    }

    const medicationTask = managerTasks?.medications.find(
      (m) => m.medicationId === medicationId && m.scheduledTime === scheduledTime
    )

    if (medicationTask) {
      setSelectedMedication({
        id: medicationTask.medicationId,
        prescriptionId: medicationTask.prescriptionId,
        name: medicationTask.medicationName,
        presentation: medicationTask.presentation as MedicationPresentation,
        concentration: medicationTask.concentration,
        dose: medicationTask.dose,
        route: medicationTask.route as AdministrationRoute,
        frequency: 'PERSONALIZADO' as MedicationFrequency,
        scheduledTimes: medicationTask.scheduledTimes || [scheduledTime],
        startDate: '',
        endDate: null,
        isControlled: false,
        isHighRisk: false,
        requiresDoubleCheck: medicationTask.requiresDoubleCheck || false,
        instructions: null,
        versionNumber: 1,
        createdBy: '',
        updatedBy: null,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        preselectedScheduledTime: scheduledTime,
      })
    }
  }

  // Handler para visualizar residente
  const handleViewResident = (residentId: string) => {
    setSelectedResidentId(residentId)
  }

  return (
    <Page maxWidth="wide" spacing="compact">
      <PageHeader
        title={`Bem-vindo de volta, ${user?.name?.split(' ')[0]}!`}
        subtitle="Aqui está um resumo das atividades de hoje"
      />

      {/* Equipes de Plantão Hoje - Protagonismo máximo no topo */}
      <TodayShiftsInfo />

      {/* Toolbar + Busca na mesma linha */}
      <div className="mb-6 pb-3 border-b border-border/60 flex flex-col lg:flex-row lg:items-center gap-3">
        <DashboardQuickActions
          context="technical_manager"
          positionCode={user?.profile?.positionCode}
          mode="toolbar"
          className="lg:shrink-0"
        />
        <UniversalSearch
          variant="plain"
          className="mb-0 flex-1 min-w-0"
        />
      </div>

      {/* Seção de Compliance Operacional - Hoje */}
      <OperationalComplianceSection
        stats={complianceStats}
        isLoading={isLoadingCompliance}
      />

      {/* Agendamentos de Hoje - Exibir apenas se houver eventos ou estiver carregando */}
      {isLoadingTasks || (managerTasks?.scheduledEvents && managerTasks.scheduledEvents.length > 0) ? (
        <CollapsibleSection
          id="technical-manager-scheduled-events"
          title="Agendamentos de Hoje"
          defaultCollapsed={false}
        >
          <EventsSection
            title="Eventos"
            events={managerTasks?.scheduledEvents || []}
            onViewResident={handleViewResident}
            isLoading={isLoadingTasks}
          />
        </CollapsibleSection>
      ) : (
        <Section title="">
          <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Sem eventos agendados para hoje
            </span>
          </div>
        </Section>
      )}

      {/* Activities Grid - Recent & Pending */}
      <CollapsibleSection
        id="technical-manager-recent-activities"
        title="Pendências e Histórico Assistencial"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pending Activities */}
          <PendingActivities
            items={pendingActivities}
            isLoading={isLoadingOverview}
          />

          {/* Recent Activity */}
          <RecentActivity
            activities={recentActivities}
            isLoading={isLoadingOverview}
          />
        </div>
      </CollapsibleSection>

      {/* Rodapé com Estatísticas Resumidas */}
      <div className="mt-8 pt-4 border-t border-border">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground whitespace-nowrap overflow-x-auto">
          <span>
            <span className="font-medium text-foreground">{totalResidents}</span> Residentes
          </span>
          <span aria-hidden="true">•</span>
          <span>
            <span className="font-medium text-foreground">{totalUsers}</span> Usuários
          </span>
          <span aria-hidden="true">•</span>
          <span>
            <span className="font-medium text-foreground">{totalRecordsToday}</span> Registros Hoje
          </span>
          <span aria-hidden="true">•</span>
          <span>
            <span className="font-medium text-foreground">{totalPrescriptions}</span> Prescrições Ativas
          </span>
        </div>
      </div>

      {/* Modal: Visualização Rápida do Residente */}
      {selectedResidentId && (
        <ResidentQuickViewModal
          residentId={selectedResidentId}
          onClose={() => setSelectedResidentId(null)}
          onRegister={() => {
            // Registro será feito via modal específico do ResidentQuickViewModal
          }}
          onAdministerMedication={handleAdministerMedication}
        />
      )}

      {/* Modal: Administração de Medicação */}
      {selectedMedication && (
        <AdministerMedicationModal
          open={true}
          onClose={() => {
            setSelectedMedication(null)
            refetchTasks()
          }}
          medication={selectedMedication}
        />
      )}
    </Page>
  )
}
