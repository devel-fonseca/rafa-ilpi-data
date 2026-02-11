import { useAuthStore } from '@/stores/auth.store'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { getCurrentDate } from '@/utils/dateHelpers'
import { useResidentStats } from '@/hooks/useResidents'
import { useDailyRecordsCountByDate } from '@/hooks/useDailyRecords'
import { usersApi } from '@/api/users.api'
import { tenantKey } from '@/lib/query-keys'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { PlanStatusSection } from '@/components/admin/PlanStatusSection'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'
import { TodayShiftsInfo } from '@/components/dashboard/TodayShiftsInfo'
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions'
import { ResidentsGrowthChart } from '@/components/admin/ResidentsGrowthChart'
import { MedicationAdministrationChart } from '@/components/admin/MedicationAdministrationChart'
import { MandatoryRecordsChart } from '@/components/admin/MandatoryRecordsChart'
import { OccupancyRateChart } from '@/components/admin/OccupancyRateChart'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'
import { useResidentsGrowth, useMedicationsHistory, useScheduledRecordsHistory, useOccupancyRate } from '@/hooks/useAdminDashboard'
import { Page, PageHeader, CollapsibleSection } from '@/design-system/components'

export function AdminDashboard() {
  const { user } = useAuthStore()
  const today = getCurrentDate()

  const { data: complianceStats, isLoading: isLoadingCompliance } = useAdminCompliance()
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

  const { data: totalRecordsToday = 0 } = useDailyRecordsCountByDate(today)

  const { data: residentsGrowth, isLoading: isLoadingResidents } = useResidentsGrowth()
  const { data: medicationsHistory, isLoading: isLoadingMedications } = useMedicationsHistory()
  const { data: recordsHistory, isLoading: isLoadingRecords } = useScheduledRecordsHistory()
  const { data: occupancyRate, isLoading: isLoadingOccupancy } = useOccupancyRate()

  const totalResidents = residentsStats?.total || 0
  const totalPrescriptions = prescriptionsStats?.totalActive || 0
  const totalUsers = usersCount || 0

  return (
    <Page maxWidth="wide" spacing="compact">
      <PageHeader
        title={`Bem-vindo, ${user?.name?.split(' ')[0]}!`}
        subtitle={`Painel Administrativo - ${new Date().toLocaleDateString('pt-BR')}`}
      />

      {/* Equipes de Plantão Hoje - Protagonismo máximo no topo */}
      <TodayShiftsInfo />

      {/* Toolbar + Busca na mesma linha */}
      <div className="mb-6 pb-3 border-b border-border/60 flex flex-col lg:flex-row lg:items-center gap-3">
        <DashboardQuickActions
          context="admin"
          positionCode={user?.profile?.positionCode}
          mode="toolbar"
          className="lg:shrink-0"
        />
        <UniversalSearch
          variant="plain"
          className="mb-0 flex-1 min-w-0"
        />
      </div>

      {/* Seção de Compliance Operacional */}
      <OperationalComplianceSection
        stats={complianceStats}
        isLoading={isLoadingCompliance}
      />

      {/* Gráficos de Análise */}
      <CollapsibleSection
        id="admin-analysis-charts"
        title="Análise de Dados"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResidentsGrowthChart
            data={residentsGrowth?.data || []}
            isLoading={isLoadingResidents}
          />
          <OccupancyRateChart
            data={occupancyRate?.data || []}
            hasBedsConfigured={occupancyRate?.hasBedsConfigured}
            capacityDeclared={occupancyRate?.capacityDeclared}
            capacityLicensed={occupancyRate?.capacityLicensed}
            isLoading={isLoadingOccupancy}
          />
          <MandatoryRecordsChart
            data={recordsHistory?.data || []}
            isLoading={isLoadingRecords}
          />
          <MedicationAdministrationChart
            data={medicationsHistory?.data || []}
            isLoading={isLoadingMedications}
          />
        </div>
      </CollapsibleSection>

      {/* Atividades Recentes e Pendentes */}
      <CollapsibleSection
        id="admin-recent-activities"
        title="Pendências e Histórico"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pending Activities */}
          <PendingActivities />

          {/* Recent Activity */}
          <RecentActivity />
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

      {/* Plan Status Section */}
      <PlanStatusSection />
    </Page>
  )
}
