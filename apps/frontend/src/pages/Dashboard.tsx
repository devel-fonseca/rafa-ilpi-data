import { useAuthStore } from '@/stores/auth.store'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { CaregiverDashboard } from '@/pages/dashboards/CaregiverDashboard'
import { AdminDashboard } from '@/pages/dashboards/AdminDashboard'
import { TechnicalManagerDashboard } from '@/pages/dashboards/TechnicalManagerDashboard'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { EventsSection } from '@/components/caregiver/EventsSection'
import { Page, PageHeader, Section } from '@/design-system/components'
import { getCurrentDate } from '@/utils/dateHelpers'
import { useDailyEvents } from '@/hooks/useDailyEvents'

export default function Dashboard() {
  const { user } = useAuthStore()
  const today = getCurrentDate()

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

      {/* Recent Activity */}
      <RecentActivity />
    </Page>
  )
}