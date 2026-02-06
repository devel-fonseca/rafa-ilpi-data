import { useAuthStore } from '@/stores/auth.store'
import { Calendar, Activity, UserPlus, Pill, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { Medication, MedicationPresentation, AdministrationRoute, MedicationFrequency } from '@/api/medications.api'
import { toast } from 'sonner'

// Tipo estendido para medication com campo opcional preselectedScheduledTime
type MedicationWithPreselectedTime = Medication & {
  preselectedScheduledTime?: string
}
import { getCurrentDate } from '@/utils/dateHelpers'
import { useResidentStats } from '@/hooks/useResidents'
import { useDailyRecordsByDate } from '@/hooks/useDailyRecords'
import { usersApi } from '@/api/users.api'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { PendingActivities } from '@/components/dashboard/PendingActivities'
import { TodayShiftsInfo } from '@/components/dashboard/TodayShiftsInfo'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { OperationalComplianceSection } from '@/components/admin/OperationalComplianceSection'
import { TasksSection } from '@/components/caregiver/TasksSection'
import { MedicationsSection } from '@/components/caregiver/MedicationsSection'
import { EventsSection } from '@/components/caregiver/EventsSection'
import { useTechnicalManagerTasks } from '@/hooks/useTechnicalManagerTasks'
import { useAdminCompliance } from '@/hooks/useAdminCompliance'
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
  const [selectedMedication, setSelectedMedication] = useState<MedicationWithPreselectedTime | null>(null)

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

  const totalResidents = residentsStats?.total || 0
  const totalPrescriptions = prescriptionsStats?.totalActive || 0
  const totalRecordsToday = recordsToday.length
  const totalUsers = usersCount || 0

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
        prescriptionId: medicationTask.prescriptionId,
        name: medicationTask.medicationName,
        presentation: medicationTask.presentation as MedicationPresentation,
        concentration: medicationTask.concentration,
        dose: medicationTask.dose,
        route: medicationTask.route as AdministrationRoute,
        frequency: 'PERSONALIZADO' as MedicationFrequency,
        scheduledTimes: medicationTask.scheduledTimes || [scheduledTime],
        startDate: '',
        endDate: null,
        isControlled: false,
        isHighRisk: false,
        requiresDoubleCheck: medicationTask.requiresDoubleCheck || false,
        instructions: null,
        versionNumber: 1,
        createdBy: '',
        updatedBy: null,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
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
      title: 'Prescrições',
      description: 'Painel de Prescrições',
      icon: Pill,
      onClick: () => navigate('/dashboard/prescricoes/painel'),
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

      {/* Equipes de Plantão Hoje */}
      <TodayShiftsInfo />

      {/* Agendamentos de Hoje - Exibir apenas se houver eventos ou estiver carregando */}
      {isLoadingTasks || (managerTasks?.scheduledEvents && managerTasks.scheduledEvents.length > 0) ? (
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
      ) : (
        <Section title="">
          <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Sem eventos agendados para hoje
            </span>
          </div>
        </Section>
      )}

      {/* Atividades Programadas */}
      {(() => {
        // Verificar se há tarefas PENDENTES (não concluídas)
        const hasTasksPending = managerTasks?.recurringTasks.some(task => !task.isCompleted) || false
        // Verificar se há medicações PENDENTES (não administradas)
        const hasMedicationsPending = managerTasks?.medications.some(med => !med.wasAdministered) || false

        // Se ambos não têm pendências, mostrar card compacto SEM título
        if (!hasTasksPending && !hasMedicationsPending && !isLoadingTasks) {
          return (
            <Section title="">
              <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm text-muted-foreground">
                  Sem atividades programadas pendentes
                </span>
              </div>
            </Section>
          )
        }

        // Se há pendências, mostrar COM título
        return (
          <CollapsibleSection
            id="technical-manager-pending-tasks"
            title="Atividades Programadas"
            defaultCollapsed={false}
          >
            <div className={`grid grid-cols-1 gap-6 ${hasTasksPending && hasMedicationsPending ? 'lg:grid-cols-2' : ''}`}>
              {/* Coluna 1: Registros AVDs */}
              {hasTasksPending && (
                <div>
                  <TasksSection
                    title="Registros AVDs"
                    tasks={managerTasks?.recurringTasks || []}
                    onRegister={handleRegister}
                    onViewResident={handleViewResident}
                    isLoading={isLoadingTasks}
                  />
                </div>
              )}

              {/* Coluna 2: Medicações */}
              {hasMedicationsPending && (
                <div>
                  <MedicationsSection
                    title="Medicações"
                    medications={managerTasks?.medications || []}
                    onViewResident={handleViewResident}
                    onAdministerMedication={handleAdministerMedication}
                    isLoading={isLoadingTasks}
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>
        )
      })()}

      {/* Activities Grid - Recent & Pending */}
      <CollapsibleSection
        id="technical-manager-recent-activities"
        title="Pendências e Histórico"
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Activities */}
          <PendingActivities />

          {/* Recent Activity */}
          <RecentActivity />
        </div>
      </CollapsibleSection>

      {/* Rodapé com Estatísticas Resumidas */}
      <div className="mt-8 pt-4 border-t border-border">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{totalResidents}</span>
            <span>Residentes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{totalUsers}</span>
            <span>Usuários</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{totalRecordsToday}</span>
            <span>Registros Hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{totalPrescriptions}</span>
            <span>Prescrições Ativas</span>
          </div>
        </div>
      </div>

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
