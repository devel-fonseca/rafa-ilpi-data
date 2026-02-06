import { useAuthStore } from '@/stores/auth.store'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { PlanStatusSection } from '@/components/admin/PlanStatusSection'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'
import { TodayShiftsInfo } from '@/components/dashboard/TodayShiftsInfo'
import { ResidentsGrowthChart } from '@/components/admin/ResidentsGrowthChart'
import { MedicationAdministrationChart } from '@/components/admin/MedicationAdministrationChart'
import { MandatoryRecordsChart } from '@/components/admin/MandatoryRecordsChart'
import { OccupancyRateChart } from '@/components/admin/OccupancyRateChart'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'
import { useResidentsGrowth, useMedicationsHistory, useMandatoryRecordsHistory, useOccupancyRate } from '@/hooks/useAdminDashboard'
import { Page, PageHeader, CollapsibleSection } from '@/design-system/components'

export function AdminDashboard() {
  const { user } = useAuthStore()

  const { data: complianceStats, isLoading: isLoadingCompliance } = useAdminCompliance()
  const { data: residentsGrowth, isLoading: isLoadingResidents } = useResidentsGrowth()
  const { data: medicationsHistory, isLoading: isLoadingMedications } = useMedicationsHistory()
  const { data: recordsHistory, isLoading: isLoadingRecords } = useMandatoryRecordsHistory()
  const { data: occupancyRate, isLoading: isLoadingOccupancy } = useOccupancyRate()

  return (
    <Page>
      <PageHeader
        title={`Bem-vindo, ${user?.name?.split(' ')[0]}!`}
        subtitle={`Painel Administrativo - ${new Date().toLocaleDateString('pt-BR')}`}
      />

      {/* Busca Universal */}
      <UniversalSearch />

      {/* Seção de Compliance Operacional */}
      <OperationalComplianceSection
        stats={complianceStats}
        isLoading={isLoadingCompliance}
      />

      {/* Equipes de Plantão Hoje */}
      <TodayShiftsInfo />

      {/* Gráficos de Análise */}
      <CollapsibleSection
        id="admin-analysis-charts"
        title="Análise de Dados"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Activities */}
          <PendingActivities />

          {/* Recent Activity */}
          <RecentActivity />
        </div>
      </CollapsibleSection>

      {/* Plan Status Section */}
      <PlanStatusSection />
    </Page>
  )
}
