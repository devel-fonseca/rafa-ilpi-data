import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { ResidentQuickSearch } from '@/components/caregiver/ResidentQuickSearch'
import { ResidentQuickViewModal } from '@/components/caregiver/ResidentQuickViewModal'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'

export function AdminDashboard() {
  const { user } = useAuthStore()
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(
    null,
  )

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

      {/* Busca Rápida de Residentes */}
      <ResidentQuickSearch
        onSelectResident={(residentId) => setSelectedResidentId(residentId)}
      />

      {/* Seção de Compliance Operacional */}
      <div className="mt-6">
        <OperationalComplianceSection
          stats={complianceStats}
          isLoading={isLoadingCompliance}
        />
      </div>

      {/* Mini Prontuário Modal */}
      {selectedResidentId && (
        <ResidentQuickViewModal
          residentId={selectedResidentId}
          onClose={() => setSelectedResidentId(null)}
        />
      )}
    </div>
  )
}
