import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePrescriptionsDashboard } from '@/hooks/usePrescriptions'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { StatsCards } from './components/StatsCards'
import { CriticalAlerts } from './components/CriticalAlerts'
import { TodayActions } from './components/TodayActions'
import { ExpiringList } from './components/ExpiringList'
import { ControlledResidents } from './components/ControlledResidents'

export function PrescriptionsPage() {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const { stats, alerts, expiring, controlled, isLoading, refetchAll } =
    usePrescriptionsDashboard()

  const canCreatePrescriptions = hasPermission(PermissionType.CREATE_PRESCRIPTIONS)

  const handleNewPrescription = () => {
    navigate('/dashboard/prescricoes/new')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Carregando dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gerenciamento de Prescrições
          </h1>
          <p className="text-muted-foreground mt-1">
            Dashboard completo de medicamentos e prescrições médicas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetchAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {canCreatePrescriptions && (
            <Button onClick={handleNewPrescription}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Prescrição
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="mb-8">
        <StatsCards stats={stats} />
      </div>

      {/* Alertas Críticos */}
      {alerts && alerts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Alertas Críticos</h3>
          <CriticalAlerts alerts={alerts} />
        </div>
      )}

      {/* Ações do Dia (por turno) */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Ações do Dia</h3>
        <TodayActions />
      </div>

      {/* Grid com Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prescrições Próximas do Vencimento */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Prescrições Vencendo em 5 Dias</h3>
          <ExpiringList prescriptions={expiring || []} />
        </div>

        {/* Residentes com Medicamentos Controlados */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Residentes com Medicamentos Controlados</h3>
          <ControlledResidents residents={controlled || []} />
        </div>
      </div>
    </div>
  )
}

export default PrescriptionsPage
