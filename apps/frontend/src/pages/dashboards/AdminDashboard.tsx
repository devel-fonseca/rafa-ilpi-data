import { useAuthStore } from '@/stores/auth.store'
import { useMemo } from 'react'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { PlanStatusSection } from '@/components/admin/PlanStatusSection'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities, type PendingItem } from '@/components/dashboard/PendingActivities'
import { TodayShiftsInfo } from '@/components/dashboard/TodayShiftsInfo'
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions'
import { ResidentsGrowthChart } from '@/components/admin/ResidentsGrowthChart'
import { MedicationAdministrationChart } from '@/components/admin/MedicationAdministrationChart'
import { MandatoryRecordsChart } from '@/components/admin/MandatoryRecordsChart'
import { OccupancyRateChart } from '@/components/admin/OccupancyRateChart'
import { useAdminDashboardOverview } from '@/hooks/useAdminDashboard'
import { useAdminDashboardRealtime } from '@/hooks/useAdminDashboardRealtime'
import { useResidentAlerts } from '@/hooks/useResidentAlerts'
import { Page, PageHeader, CollapsibleSection } from '@/design-system/components'

export function AdminDashboard() {
  const { user } = useAuthStore()
  useAdminDashboardRealtime()
  const { data: overview, isLoading } = useAdminDashboardOverview()

  const complianceStats = overview?.dailySummary
  const residentsGrowth = overview?.residentsGrowth || []
  const medicationsHistory = overview?.medicationsHistory || []
  const recordsHistory = overview?.scheduledRecordsHistory || []
  const occupancyRate = overview?.occupancyRate
  const pendingActivities = useMemo(
    () => overview?.pendingActivities ?? [],
    [overview?.pendingActivities],
  )
  const recentActivities = overview?.recentActivities || []
  const { alerts, isLoading: isLoadingResidentAlerts } = useResidentAlerts()

  const integratedPendingActivities = useMemo<PendingItem[]>(() => {
    const residentAlertPendingItems: PendingItem[] = alerts
      .filter((alert) => alert.type !== 'info')
      .map((alert) => ({
        id: `resident-alert-${alert.action.filter}`,
        type: alert.type === 'critical' ? 'RESIDENT_ALERT_CRITICAL' : 'RESIDENT_ALERT_WARNING',
        title: alert.title,
        description: `${alert.count} ${alert.count === 1 ? 'residente' : 'residentes'} • ${alert.description}`,
        priority: alert.type === 'critical' ? 'HIGH' : 'MEDIUM',
        navigateTo: `/dashboard/residentes-hub?alert=${encodeURIComponent(alert.action.filter)}`,
      }))

    const merged: PendingItem[] = []
    const seenIds = new Set<string>()
    for (const item of [...residentAlertPendingItems, ...pendingActivities]) {
      if (!item?.id || seenIds.has(item.id)) continue
      seenIds.add(item.id)
      merged.push(item as PendingItem)
    }

    const priorityOrder: Record<PendingItem['priority'], number> = {
      HIGH: 0,
      MEDIUM: 1,
      LOW: 2,
    }

    return merged.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }, [alerts, pendingActivities])

  const totalResidents = overview?.footerStats.totalResidents || 0
  const totalPrescriptions = overview?.footerStats.totalPrescriptions || 0
  const totalUsers = overview?.footerStats.totalUsers || 0
  const totalRecordsToday = overview?.footerStats.totalRecordsToday || 0

  return (
    <Page maxWidth="wide" spacing="compact">
      <PageHeader
        title={`Bem-vindo, ${user?.name?.split(' ')[0]}!`}
        subtitle={`Painel Administrativo - ${new Date().toLocaleDateString('pt-BR')}`}
      />

      {/* Equipes de Plantão Hoje - Protagonismo máximo no topo */}
      <TodayShiftsInfo timezone={overview?.timezone} />

      {/* Toolbar + Busca na mesma linha */}
      <div className="mb-6 pb-3 border-b border-border/60 flex flex-col lg:flex-row lg:items-center gap-3">
        <DashboardQuickActions
          context="admin"
          positionCode={user?.profile?.positionCode}
          mode="toolbar"
          className="lg:shrink-0"
        />
        <UniversalSearch
          variant="plain"
          className="mb-0 flex-1 min-w-0"
        />
      </div>

      {/* Seção de Compliance Operacional */}
      <OperationalComplianceSection
        stats={complianceStats}
        isLoading={isLoading}
      />

      {/* Gráficos de Análise */}
      <CollapsibleSection
        id="admin-analysis-charts"
        title="Análise de Dados"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResidentsGrowthChart
            data={residentsGrowth}
            isLoading={isLoading}
          />
          <OccupancyRateChart
            data={occupancyRate?.data || []}
            hasBedsConfigured={occupancyRate?.hasBedsConfigured}
            capacityDeclared={occupancyRate?.capacityDeclared}
            capacityLicensed={occupancyRate?.capacityLicensed}
            isLoading={isLoading}
          />
          <MandatoryRecordsChart
            data={recordsHistory}
            isLoading={isLoading}
          />
          <MedicationAdministrationChart
            data={medicationsHistory}
            isLoading={isLoading}
          />
        </div>
      </CollapsibleSection>

      {/* Atividades Recentes e Pendentes */}
      <CollapsibleSection
        id="admin-recent-activities"
        title="Pendências e Histórico Gerencial"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pending Activities */}
          <PendingActivities
            items={integratedPendingActivities}
            isLoading={isLoading || isLoadingResidentAlerts}
          />

          {/* Recent Activity */}
          <RecentActivity activities={recentActivities} isLoading={isLoading} />
        </div>
      </CollapsibleSection>

      {/* Rodapé com Estatísticas Resumidas */}
      <div className="mt-8 pt-4 border-t border-border">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground whitespace-nowrap overflow-x-auto">
          <span>
            <span className="font-medium text-foreground">{totalResidents}</span> Residentes
          </span>
          <span aria-hidden="true">•</span>
          <span>
            <span className="font-medium text-foreground">{totalUsers}</span> Usuários
          </span>
          <span aria-hidden="true">•</span>
          <span>
            <span className="font-medium text-foreground">{totalRecordsToday}</span> Registros Hoje
          </span>
          <span aria-hidden="true">•</span>
          <span>
            <span className="font-medium text-foreground">{totalPrescriptions}</span> Prescrições Ativas
          </span>
        </div>
      </div>

      {/* Plan Status Section */}
      <PlanStatusSection />
    </Page>
  )
}
