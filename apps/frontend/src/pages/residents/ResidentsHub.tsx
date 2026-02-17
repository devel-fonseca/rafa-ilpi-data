import { Page, PageHeader, Section, StatCard } from '@/design-system/components'
import { AlertGrid } from '@/components/residents/AlertGrid'
import { QuickActionGrid } from '@/components/residents/QuickActionGrid'
import { DependencyChart } from '@/components/residents/DependencyChart'
import { CompactResidentsList } from '@/components/residents/CompactResidentsList'
import { useResidentAlerts } from '@/hooks/useResidentAlerts'
import { useResidents, useResidentStats } from '@/hooks/useResidents'
import { Users, TrendingUp, Clock, Percent } from 'lucide-react'

export default function ResidentsHub() {
  const { alerts, metrics, isLoading: alertsLoading, totalResidents } = useResidentAlerts()
  const { data: stats, isLoading: statsLoading } = useResidentStats()
  const { residents } = useResidents({ page: 1, limit: 1000 })

  const isLoading = alertsLoading || statsLoading
  const occupancyRate = stats?.occupancyRate ?? metrics.occupancyRate
  const occupiedBeds = stats?.occupiedBeds ?? metrics.totalWithBed
  const totalBeds = stats?.totalBeds ?? (metrics.totalWithBed + metrics.totalWithoutBed)

  if (isLoading) {
    return (
      <Page>
        <PageHeader
          title="Hub de Gestão de Residentes"
          subtitle="Centro de controle e monitoramento"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Gestão de Residentes' },
          ]}

        />
        <div className="flex justify-center items-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        title="Gestão de Residentes"
        subtitle="Centro de controle e monitoramento de todos os residentes"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Gestão de Residentes' },
        ]}
      />

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total de Residentes"
          value={totalResidents}
          icon={Users}
          variant="primary"
        />

        <StatCard
          title="Média de Idade"
          value={`${metrics.averageAge} anos`}
          icon={TrendingUp}
          variant="info"
        />

        <StatCard
          title="Tempo Médio"
          value={`${metrics.averageStayDays} dias`}
          icon={Clock}
          variant="success"
          description="de permanência"
        />

        <StatCard
          title="Taxa de Ocupação"
          value={`${occupancyRate}%`}
          icon={Percent}
          variant="warning"
          description={`${occupiedBeds} de ${totalBeds} leitos ocupados`}
        />
      </div>

      {/* Ações Rápidas */}
      <Section>
        <QuickActionGrid />
      </Section>

      {/* Alertas e Verificações */}
      <Section title="Alertas e Verificações">
        <AlertGrid alerts={alerts} />
      </Section>

      {/* Grid com Gráfico de Dependência e Lista de Residentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Gráfico de Dependência */}
        {stats && <DependencyChart stats={stats} />}

        {/* Lista Compacta de Residentes */}
        <CompactResidentsList
          residents={residents}
          title="Residentes Recentes"
          limit={10}
        />
      </div>
    </Page>
  )
}
