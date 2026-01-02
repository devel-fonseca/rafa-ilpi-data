import { useAuthStore } from '@/stores/auth.store'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { PlanStatusSection } from '@/components/admin/PlanStatusSection'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'

export function AdminDashboard() {
  const { user } = useAuthStore()

  const { data: complianceStats, isLoading: isLoadingCompliance } = useAdminCompliance()

  return (
    <div>
      {/* Header com boas-vindas */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Bem-vindo, {user?.name?.split(' ')[0]}!
        </h2>
        <p className="text-muted-foreground mt-1">
          Painel Administrativo - {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Busca Universal */}
      <UniversalSearch />

      {/* Seção de Compliance Operacional */}
      <div className="mt-6">
        <OperationalComplianceSection
          stats={complianceStats}
          isLoading={isLoadingCompliance}
        />
      </div>

      {/* Plan Status Section */}
      <div className="mt-6">
        <PlanStatusSection />
      </div>
    </div>
  )
}
