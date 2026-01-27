import { useAuthStore } from '@/stores/auth.store'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { PlanStatusSection } from '@/components/admin/PlanStatusSection'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'
import { Page, PageHeader, Section } from '@/design-system/components'

export function AdminDashboard() {
  const { user } = useAuthStore()

  const { data: complianceStats, isLoading: isLoadingCompliance } = useAdminCompliance()

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

      {/* Plan Status Section */}
      <PlanStatusSection />

      {/* Atividades Recentes e Pendentes */}
      <Section title="Atividades Recentes">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivity />
          <PendingActivities />
        </div>
      </Section>
    </Page>
  )
}
