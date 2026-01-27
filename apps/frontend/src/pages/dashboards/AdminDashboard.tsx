import { useAuthStore } from '@/stores/auth.store'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { PlanStatusSection } from '@/components/admin/PlanStatusSection'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'
import { ResidentsGrowthChart } from '@/components/admin/ResidentsGrowthChart'
import { MedicationAdministrationChart } from '@/components/admin/MedicationAdministrationChart'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'
import { useResidentsGrowth, useMedicationsHistory } from '@/hooks/useAdminDashboard'
import { Page, PageHeader, Section } from '@/design-system/components'

export function AdminDashboard() {
  const { user } = useAuthStore()

  const { data: complianceStats, isLoading: isLoadingCompliance } = useAdminCompliance()
  const { data: residentsGrowth, isLoading: isLoadingResidents } = useResidentsGrowth()
  const { data: medicationsHistory, isLoading: isLoadingMedications } = useMedicationsHistory()

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

      {/* Gráficos de Análise */}
      <Section title="Análise de Dados">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResidentsGrowthChart
            data={residentsGrowth?.data || []}
            isLoading={isLoadingResidents}
          />
          <MedicationAdministrationChart
            data={medicationsHistory?.data || []}
            isLoading={isLoadingMedications}
          />
        </div>
      </Section>

      {/* Atividades Recentes e Pendentes */}
      <Section title="Atividades Recentes">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity />
          <PendingActivities />
        </div>
      </Section>

      {/* Plan Status Section */}
      <PlanStatusSection />
    </Page>
  )
}
