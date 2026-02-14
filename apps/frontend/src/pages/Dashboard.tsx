import { useAuthStore } from '@/stores/auth.store'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'
import { CaregiverDashboard } from '@/pages/dashboards/CaregiverDashboard'
import { AdminDashboard } from '@/pages/dashboards/AdminDashboard'
import { TechnicalManagerDashboard } from '@/pages/dashboards/TechnicalManagerDashboard'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { EventsSection } from '@/components/caregiver/EventsSection'
import { Page, PageHeader, Section, CollapsibleSection } from '@/design-system/components'
import { getCurrentDate } from '@/utils/dateHelpers'
import { useDailyEvents } from '@/hooks/useDailyEvents'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { useAdminDashboardOverview } from '@/hooks/useAdminDashboard'
import { useAdminDashboardRealtime } from '@/hooks/useAdminDashboardRealtime'

export default function Dashboard() {
  const { user } = useAuthStore()
  const today = getCurrentDate()
  const { hasPermission } = usePermissions()
  const canViewDashboardOverview = hasPermission(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  useAdminDashboardRealtime({ enabled: canViewDashboardOverview })
  const { data: overview, isLoading: isLoadingOverview } = useAdminDashboardOverview({
    enabled: canViewDashboardOverview,
  })

  // Buscar TODOS os eventos do dia (residentes + institucionais)
  const { data: scheduledEvents = [], isLoading } = useDailyEvents(today)

  // Detectar cargo e renderizar dashboard específico
  if (user?.profile?.positionCode === 'CAREGIVER') {
    return <CaregiverDashboard />
  }

  if (user?.profile?.positionCode === 'ADMINISTRATOR') {
    return <AdminDashboard />
  }

  if (user?.profile?.positionCode === 'TECHNICAL_MANAGER') {
    return <TechnicalManagerDashboard />
  }

  return (
    <Page>
      <PageHeader
        title={`Bem-vindo, ${user?.name?.split(' ')[0]}!`}
        subtitle={`Dashboard - ${new Date().toLocaleDateString('pt-BR')}`}
      />

      {/* Busca Universal */}
      <UniversalSearch />

      {/* Agendamentos de Hoje */}
      {scheduledEvents.length > 0 ? (
        <Section title="Agendamentos de Hoje">
          <EventsSection
            title="Eventos"
            events={scheduledEvents}
            onViewResident={() => {}} // Sem ação no dashboard genérico
            isLoading={isLoading}
          />
        </Section>
      ) : (
        <Section title="">
          <EventsSection
            title="Eventos"
            events={scheduledEvents}
            onViewResident={() => {}} // Sem ação no dashboard genérico
            isLoading={isLoading}
          />
        </Section>
      )}

      <CollapsibleSection
        id="generic-dashboard-pending-history"
        title="Pendências e Histórico"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PendingActivities
            items={overview?.pendingActivities || []}
            isLoading={canViewDashboardOverview && isLoadingOverview}
          />
          <RecentActivity
            activities={overview?.recentActivities || []}
            isLoading={canViewDashboardOverview && isLoadingOverview}
          />
        </div>
      </CollapsibleSection>
    </Page>
  )
}
