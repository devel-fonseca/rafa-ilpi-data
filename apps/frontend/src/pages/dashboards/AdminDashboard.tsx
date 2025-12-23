import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useNavigate } from 'react-router-dom'
import { ResidentQuickSearch } from '@/components/caregiver/ResidentQuickSearch'
import { ResidentQuickViewModal } from '@/components/caregiver/ResidentQuickViewModal'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'
import { Button } from '@/components/ui/button'

export function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
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

      {/* Plan Info */}
      {user?.tenant && (
        <div className="mt-6 p-4 bg-info/10 rounded-lg border border-info/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Plano Atual: <span className="font-bold">
                  {user.tenant.plan
                    ? user.tenant.plan.charAt(0).toUpperCase() + user.tenant.plan.slice(1).toLowerCase()
                    : 'Free'}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Status: <span className="font-medium">{user.tenant.status === 'ACTIVE' ? 'Ativo' : user.tenant.status}</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-info/30 hover:bg-info/10"
              onClick={() => navigate('/dashboard/settings/billing')}
            >
              Gerenciar Plano
            </Button>
          </div>
        </div>
      )}

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
