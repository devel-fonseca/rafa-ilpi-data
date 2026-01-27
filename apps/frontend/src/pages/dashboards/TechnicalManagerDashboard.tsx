import { useAuthStore } from '@/stores/auth.store'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Calendar, Activity, UserPlus, Pill } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { Medication } from '@/api/medications.api'
import { toast } from 'sonner'
import { getCurrentDate } from '@/utils/dateHelpers'
import { useResidentStats } from '@/hooks/useResidents'
import { useDailyRecordsByDate } from '@/hooks/useDailyRecords'
import { usersApi } from '@/api/users.api'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { TasksSection } from '@/components/caregiver/TasksSection'
import { MedicationsSection } from '@/components/caregiver/MedicationsSection'
import { EventsSection } from '@/components/caregiver/EventsSection'
import { useTechnicalManagerTasks } from '@/hooks/useTechnicalManagerTasks'
import { ResidentsGrowthChart } from '@/components/admin/ResidentsGrowthChart'
import { MedicationAdministrationChart } from '@/components/admin/MedicationAdministrationChart'
import { MandatoryRecordsChart } from '@/components/admin/MandatoryRecordsChart'
import { OccupancyRateChart } from '@/components/admin/OccupancyRateChart'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'
import { useResidentsGrowth, useMedicationsHistory, useMandatoryRecordsHistory, useOccupancyRate } from '@/hooks/useAdminDashboard'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { Page, PageHeader, Section, CollapsibleSection, QuickActionsGrid } from '@/design-system/components'
import { AdministerMedicationModal } from '@/pages/prescriptions/components/AdministerMedicationModal'
import { ResidentQuickViewModal } from '@/components/residents/ResidentQuickViewModal'
import { tenantKey } from '@/lib/query-keys'

/**
 * TechnicalManagerDashboard
 *
 * Dashboard para usuários com função de Responsável Técnico (TECHNICAL_MANAGER).
 * Baseado no Dashboard.tsx padrão, adaptado para visão gerencial e supervisão.
 *
 * Foco:
 * - Supervisão de atividades operacionais
 * - Estatísticas e indicadores de qualidade
 * - Acesso rápido a funcionalidades de gestão
 * - Monitoramento de compliance e pendências
 */
export function TechnicalManagerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const today = getCurrentDate()

  // Permissões
  const { hasPermission } = usePermissions()
  const canRegisterDailyRecords = hasPermission(PermissionType.CREATE_DAILY_RECORDS)
  const canAdministerMedications = hasPermission(PermissionType.ADMINISTER_MEDICATIONS)

  // Estados para modais
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null)

  // Buscar estatísticas reais (hooks devem ser chamados antes de early returns)
  const { data: complianceStats, isLoading: isLoadingCompliance } = useAdminCompliance()
  const { data: managerTasks, isLoading: isLoadingTasks, refetch: refetchTasks } = useTechnicalManagerTasks()
  const { data: residentsStats } = useResidentStats()

  const { data: prescriptionsStats } = useQuery({
    queryKey: tenantKey('prescriptions', 'stats', 'dashboard'),
    queryFn: async () => {
      const response = await api.get('/prescriptions/stats/dashboard')
      return response.data
    },
  })

  const { data: usersCount } = useQuery({
    queryKey: tenantKey('users', 'stats', 'count'),
    queryFn: () => usersApi.countActiveUsers(),
  })

  // Buscar registros de hoje (today já foi definido no início do componente)
  const { data: recordsToday = [] } = useDailyRecordsByDate(today)

  // Buscar dados para os gráficos de análise
  const { data: residentsGrowth, isLoading: isLoadingResidents } = useResidentsGrowth()
  const { data: medicationsHistory, isLoading: isLoadingMedications } = useMedicationsHistory()
  const { data: recordsHistory, isLoading: isLoadingRecords } = useMandatoryRecordsHistory()
  const { data: occupancyRate, isLoading: isLoadingOccupancy } = useOccupancyRate()

  const totalResidents = residentsStats?.total || 0
  const totalPrescriptions = prescriptionsStats?.totalActive || 0
  const totalRecordsToday = recordsToday.length

  // Cards de estatísticas
  const stats = [
    {
      title: 'Residentes',
      value: String(totalResidents),
      description: 'Total de residentes cadastrados',
      icon: Users,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      valueColor: 'text-primary',
    },
    {
      title: 'Usuários',
      value: String(usersCount || 0),
      description: 'Usuários ativos',
      icon: UserPlus,
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
      valueColor: 'text-success',
    },
    {
      title: 'Registros Hoje',
      value: String(totalRecordsToday),
      description: 'Atividades registradas',
      icon: Activity,
      iconColor: 'text-medication-controlled',
      iconBg: 'bg-medication-controlled/10',
      valueColor: 'text-medication-controlled',
    },
    {
      title: 'Prescrições',
      value: String(totalPrescriptions),
      description: 'Prescrições ativas',
      icon: Pill,
      iconColor: 'text-severity-warning',
      iconBg: 'bg-severity-warning/10',
      valueColor: 'text-severity-warning',
    },
  ]

  // Handler para administrar medicação
  const handleAdministerMedication = (
    medicationId: string,
    _residentId: string,
    scheduledTime: string,
  ) => {
    if (!canAdministerMedications) {
      toast.error('Você não tem permissão para administrar medicações')
      return
    }

    const medicationTask = managerTasks?.medications.find(
      (m) => m.medicationId === medicationId && m.scheduledTime === scheduledTime
    )

    if (medicationTask) {
      setSelectedMedication({
        id: medicationTask.medicationId,
        name: medicationTask.medicationName,
        presentation: medicationTask.presentation,
        concentration: medicationTask.concentration,
        dose: medicationTask.dose,
        route: medicationTask.route,
        requiresDoubleCheck: medicationTask.requiresDoubleCheck,
        scheduledTimes: medicationTask.scheduledTimes || [scheduledTime],
        preselectedScheduledTime: scheduledTime,
      })
    }
  }

  // Handler para visualizar residente
  const handleViewResident = (residentId: string) => {
    setSelectedResidentId(residentId)
  }

  // Handler para registrar (via modal do residente)
  const handleRegister = () => {
    if (!canRegisterDailyRecords) {
      toast.error('Você não tem permissão para registrar atividades')
      return
    }
    // A navegação será feita pelo ResidentQuickViewModal
  }

  // Ações rápidas (ordenadas por frequência de uso para responsável técnico)
  const quickActions = [
    {
      title: 'Agenda de Hoje',
      description: 'Ver medicamentos e agendamentos',
      icon: Calendar,
      onClick: () => navigate('/dashboard/agenda'),
      disabled: false,
    },
    {
      title: 'Registros Diários',
      description: 'Registrar atividades do dia',
      icon: Activity,
      onClick: () => navigate('/dashboard/registros-diarios'),
      disabled: false,
    },
    {
      title: 'Medicações',
      description: 'Gerenciar medicações',
      icon: Pill,
      onClick: () => navigate('/dashboard/prescricoes'),
      disabled: false,
    },
    {
      title: 'Adicionar Residente',
      description: 'Cadastrar novo residente',
      icon: UserPlus,
      onClick: () => navigate('/dashboard/residentes/new'),
      disabled: false,
    },
  ]

  return (
    <Page>
      <PageHeader
        title={`Bem-vindo de volta, ${user?.name?.split(' ')[0]}!`}
        subtitle="Aqui está um resumo das atividades de hoje"
      />

      {/* Busca Universal */}
      <UniversalSearch />

      {/* Seção de Compliance Operacional - Hoje */}
      <OperationalComplianceSection
        stats={complianceStats}
        isLoading={isLoadingCompliance}
      />

      {/* Quick Actions */}
      <Section title="Ações Rápidas">
        <QuickActionsGrid actions={quickActions} columns={4} />
      </Section>

      {/* Agendamentos de Hoje */}
      <CollapsibleSection
        id="technical-manager-scheduled-events"
        title="Agendamentos de Hoje"
        defaultCollapsed={false}
      >
        <EventsSection
          title="Eventos"
          events={managerTasks?.scheduledEvents || []}
          onViewResident={handleViewResident}
          isLoading={isLoadingTasks}
        />
      </CollapsibleSection>

      {/* Tarefas Pendentes */}
      <CollapsibleSection
        id="technical-manager-pending-tasks"
        title="Tarefas Pendentes"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna 1: Tarefas Recorrentes */}
          <TasksSection
            title="Tarefas"
            tasks={managerTasks?.recurringTasks || []}
            onRegister={handleRegister}
            onViewResident={handleViewResident}
            isLoading={isLoadingTasks}
          />

          {/* Coluna 2: Medicações */}
          <MedicationsSection
            title="Medicações"
            medications={managerTasks?.medications || []}
            onViewResident={handleViewResident}
            onAdministerMedication={handleAdministerMedication}
            isLoading={isLoadingTasks}
          />
        </div>
      </CollapsibleSection>

      {/* Análise de Dados */}
      <CollapsibleSection
        id="technical-manager-analysis-charts"
        title="Análise de Dados"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResidentsGrowthChart
            data={residentsGrowth?.data || []}
            isLoading={isLoadingResidents}
          />
          <OccupancyRateChart
            data={occupancyRate?.data || []}
            hasBedsConfigured={occupancyRate?.hasBedsConfigured}
            capacityDeclared={occupancyRate?.capacityDeclared}
            capacityLicensed={occupancyRate?.capacityLicensed}
            isLoading={isLoadingOccupancy}
          />
          <MandatoryRecordsChart
            data={recordsHistory?.data || []}
            isLoading={isLoadingRecords}
          />
          <MedicationAdministrationChart
            data={medicationsHistory?.data || []}
            isLoading={isLoadingMedications}
          />
        </div>
      </CollapsibleSection>

      {/* Estatísticas Gerais */}
      <CollapsibleSection
        id="technical-manager-stats"
        title="Estatísticas"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                    <p className={`text-2xl font-bold ${stat.valueColor} mt-1`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`flex items-center justify-center w-12 h-12 ${stat.iconBg} rounded-lg`}>
                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CollapsibleSection>

      {/* Activities Grid - Recent & Pending */}
      <CollapsibleSection
        id="technical-manager-recent-activities"
        title="Atividades Recentes"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <RecentActivity />

          {/* Pending Activities */}
          <PendingActivities />
        </div>
      </CollapsibleSection>

      {/* Modal: Visualização Rápida do Residente */}
      {selectedResidentId && (
        <ResidentQuickViewModal
          residentId={selectedResidentId}
          onClose={() => setSelectedResidentId(null)}
          onRegister={() => {
            // Registro será feito via modal específico do ResidentQuickViewModal
          }}
          onAdministerMedication={handleAdministerMedication}
        />
      )}

      {/* Modal: Administração de Medicação */}
      {selectedMedication && (
        <AdministerMedicationModal
          open={true}
          onClose={() => {
            setSelectedMedication(null)
            refetchTasks()
          }}
          medication={selectedMedication}
        />
      )}
    </Page>
  )
}
