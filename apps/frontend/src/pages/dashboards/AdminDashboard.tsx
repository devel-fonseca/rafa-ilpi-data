import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { ResidentQuickSearch } from '@/components/caregiver/ResidentQuickSearch'
import { ResidentQuickViewModal } from '@/components/caregiver/ResidentQuickViewModal'

export function AdminDashboard() {
  const { user } = useAuthStore()
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(
    null,
  )

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
