import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePrescriptionsDashboard } from '@/hooks/usePrescriptions'
import { usePermissions } from '@/hooks/usePermissions'
import { StatsCards } from './components/StatsCards'
import { CriticalAlerts } from './components/CriticalAlerts'
import { TodayActions } from './components/TodayActions'
import { ExpiringList } from './components/ExpiringList'
import { ControlledResidents } from './components/ControlledResidents'
import { Page, PageHeader, Section, EmptyState } from '@/design-system/components'

export function PrescriptionsPage() {
  const navigate = useNavigate()
  const { isTechnicalManager } = usePermissions()

  const prescriptionsBreadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Prescrições' },
  ]
  const { stats, alerts, expiring, controlled, isLoading, refetchAll } =
    usePrescriptionsDashboard()

  // Apenas RT pode criar e editar prescrições
  const canManagePrescriptions = isTechnicalManager()

  const handleNewPrescription = () => {
    navigate('/dashboard/prescricoes/new')
  }

  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="Gerenciamento de Prescrições"
          subtitle="Dashboard completo de medicamentos e prescrições médicas"
          breadcrumbs={prescriptionsBreadcrumbs}

        />
        <EmptyState
          icon={Loader2}
          title="Carregando dashboard..."
          description="Aguarde enquanto buscamos os dados"
          variant="info"
        />
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title="Gerenciamento de Prescrições"
        subtitle="Dashboard completo de medicamentos e prescrições médicas"
        breadcrumbs={prescriptionsBreadcrumbs}
        backButton={{ onClick: () => navigate('/dashboard') }}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetchAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            {canManagePrescriptions && (
              <Button onClick={handleNewPrescription}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Prescrição
              </Button>
            )}
          </div>
        }
      />

      {/* Cards de Estatísticas */}
      <StatsCards stats={stats} />

      {/* Alertas Críticos */}
      {alerts && alerts.length > 0 && (
        <Section title="Alertas Críticos">
          <CriticalAlerts alerts={alerts} />
        </Section>
      )}

      {/* Ações do Dia (por turno) */}
      <Section title="Ações do Dia">
        <TodayActions />
      </Section>

      {/* Grid com Listas */}
      <Section
        title="Monitoramento"
        headerAction={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/prescricoes/painel')}
          >
            Ver monitoramento
          </Button>
        }
      >
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
      </Section>
    </Page>
  )
}

export default PrescriptionsPage
