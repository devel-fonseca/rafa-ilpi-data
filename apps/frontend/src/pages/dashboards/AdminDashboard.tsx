import { useAuthStore } from '@/stores/auth.store'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { PlanStatusSection } from '@/components/admin/PlanStatusSection'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'
import { ResidentsGrowthChart } from '@/components/admin/ResidentsGrowthChart'
import { MedicationAdministrationChart } from '@/components/admin/MedicationAdministrationChart'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'
import { Page, PageHeader, Section } from '@/design-system/components'

export function AdminDashboard() {
  const { user } = useAuthStore()

  const { data: complianceStats, isLoading: isLoadingCompliance } = useAdminCompliance()

  // TODO: Substituir por dados reais da API
  const mockResidentsData = [
    { month: '2025-08', count: 12 },
    { month: '2025-09', count: 15 },
    { month: '2025-10', count: 17 },
    { month: '2025-11', count: 16 },
    { month: '2025-12', count: 18 },
    { month: '2026-01', count: 20 },
  ]

  const mockMedicationData = [
    { day: '2026-01-21', scheduled: 45, administered: 48 },
    { day: '2026-01-22', scheduled: 50, administered: 52 },
    { day: '2026-01-23', scheduled: 48, administered: 50 },
    { day: '2026-01-24', scheduled: 52, administered: 54 },
    { day: '2026-01-25', scheduled: 50, administered: 53 },
    { day: '2026-01-26', scheduled: 51, administered: 50 },
    { day: '2026-01-27', scheduled: 30, administered: 32 },
  ]

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
          <ResidentsGrowthChart data={mockResidentsData} />
          <MedicationAdministrationChart data={mockMedicationData} />
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
