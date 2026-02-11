import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import type {
  Medication,
  MedicationPresentation,
  AdministrationRoute,
} from '@/api/prescriptions.api'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useCaregiverTasks } from '@/hooks/useCaregiverTasks'
import { CaregiverStatsCards } from '@/components/caregiver/CaregiverStatsCards'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { TasksSection } from '@/components/caregiver/TasksSection'
import { MedicationsSection } from '@/components/caregiver/MedicationsSection'
import { EventsSection } from '@/components/caregiver/EventsSection'
import { ResidentQuickViewModal } from '@/components/residents/ResidentQuickViewModal'
import { ShiftStatusBanner } from '@/components/care-shifts/shifts/ShiftStatusBanner'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { getCurrentDate } from '@/utils/dateHelpers'
import { invalidateAfterDailyRecordMutation } from '@/utils/queryInvalidation'
import { Page, PageHeader, Section, EmptyState } from '@/design-system/components'
import type { CreateDailyRecordInput, DailyRecordData } from '@/types/daily-records'
import { useCanRegister } from '@/hooks/useCanRegister'

// Modais de registro (reutilizando de DailyRecordsPage)
import { HigieneModal } from '@/pages/daily-records/modals/HigieneModal'
import { AlimentacaoModal } from '@/pages/daily-records/modals/AlimentacaoModal'
import { HidratacaoModal } from '@/pages/daily-records/modals/HidratacaoModal'
import { MonitoramentoModal } from '@/pages/daily-records/modals/MonitoramentoModal'
import { EliminacaoModal } from '@/pages/daily-records/modals/EliminacaoModal'
import { ComportamentoModal } from '@/pages/daily-records/modals/ComportamentoModal'
import { HumorModal } from '@/pages/daily-records/modals/HumorModal'
import { SonoModal } from '@/pages/daily-records/modals/SonoModal'
import { PesoModal } from '@/pages/daily-records/modals/PesoModal'
import { IntercorrenciaModal } from '@/pages/daily-records/modals/IntercorrenciaModal'
import { AtividadesModal } from '@/pages/daily-records/modals/AtividadesModal'
import { VisitaModal } from '@/pages/daily-records/modals/VisitaModal'
import { OutrosModal } from '@/pages/daily-records/modals/OutrosModal'
import { AdministerMedicationModal } from '@/pages/prescriptions/components/AdministerMedicationModal'

type MedicationWithPreselectedTime = Medication & {
  preselectedScheduledTime?: string
}

export function CaregiverDashboard() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useCaregiverTasks()
  const today = getCurrentDate()

  // Hook para verificar se pode fazer registros (baseado no plantão)
  const {
    canRegister,
    reason: cannotRegisterReason,
    activeShift,
    currentShift,
    isLoading: isLoadingShift,
    isLeaderOrSubstitute,
    hasBypass,
  } = useCanRegister()

  // Estado para modals
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(
    null,
  )
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<
    string | undefined
  >(undefined)
  const [currentResidentId, setCurrentResidentId] = useState<string>('')
  const [currentResidentName, setCurrentResidentName] = useState<string>('')

  // Estado para modal de administração de medicação
  const [selectedMedication, setSelectedMedication] = useState<MedicationWithPreselectedTime | null>(null)

  // Mutation para criar registro
  const createMutation = useMutation({
    mutationFn: async (recordData: CreateDailyRecordInput<DailyRecordData>) => {
      return await api.post('/daily-records', recordData)
    },
    onSuccess: (response) => {
      const recordData = response.data
      // Invalidar queries relacionadas (inclui caregiver-tasks automaticamente)
      invalidateAfterDailyRecordMutation(
        queryClient,
        recordData.residentId,
        recordData.date,
      )
      setActiveModal(null)
      setSelectedMealType(undefined)
      toast.success('Registro adicionado com sucesso!')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(
        err?.response?.data?.message || 'Erro ao adicionar registro',
      )
    },
  })

  const handleCreateRecord = (recordData: CreateDailyRecordInput<DailyRecordData>) => {
    createMutation.mutate(recordData)
  }

  const handleOpenModal = async (
    residentId: string,
    residentName: string,
    recordType: string,
    scheduledTime?: string,
    mealType?: string,
  ) => {
    // Refetch para garantir dados atualizados antes de abrir modal
    // Isso evita que dois cuidadores registrem a mesma tarefa programada
    const { data: freshData } = await refetch()

    // Verificar se a tarefa específica ainda está pendente (não foi registrada por outro usuário)
    // Importante: comparar também o scheduledTime para diferenciar múltiplos horários do mesmo tipo
    const task = freshData?.recurringTasks.find(
      (t) =>
        t.residentId === residentId &&
        t.recordType === recordType &&
        // Comparar horário específico (se fornecido)
        (!scheduledTime || t.scheduledTime === scheduledTime) &&
        // Para ALIMENTACAO, também comparar mealType
        (recordType !== 'ALIMENTACAO' || t.mealType === mealType),
    )

    if (task?.isCompleted) {
      toast.warning(
        `Este registro já foi feito por ${task.completedBy || 'outro profissional'}`,
        {
          description: 'A lista foi atualizada com os dados mais recentes.',
        },
      )
      return
    }

    setCurrentResidentId(residentId)
    setCurrentResidentName(residentName)
    setActiveModal(recordType)
    setSelectedMealType(mealType)
  }

  const handleAdministerMedication = async (
    medicationId: string,
    _residentId: string,
    scheduledTime: string,
  ) => {
    // Refetch para garantir dados atualizados antes de abrir modal
    // Isso evita que dois cuidadores administrem a mesma medicação programada
    const { data: freshData } = await refetch()

    // Verificar se a medicação ainda está pendente (não foi administrada por outro usuário)
    const medicationTask = freshData?.medications.find(
      (m) => m.medicationId === medicationId && m.scheduledTime === scheduledTime
    )

    if (!medicationTask) {
      toast.warning('Medicação não encontrada na lista atual', {
        description: 'A lista foi atualizada com os dados mais recentes.',
      })
      return
    }

    if (medicationTask.wasAdministered) {
      toast.warning(
        `Esta medicação já foi administrada por ${medicationTask.administeredBy || 'outro profissional'}`,
        {
          description: `Horário real: ${medicationTask.actualTime || scheduledTime}. A lista foi atualizada.`,
        },
      )
      return
    }

    // Medicação ainda pendente - abrir modal
    setSelectedMedication({
      id: medicationTask.medicationId,
      name: medicationTask.medicationName,
      presentation: medicationTask.presentation as MedicationPresentation,
      concentration: medicationTask.concentration,
      dose: medicationTask.dose,
      route: medicationTask.route as AdministrationRoute,
      requiresDoubleCheck: medicationTask.requiresDoubleCheck ?? false,
      scheduledTimes: medicationTask.scheduledTimes || [scheduledTime],
      frequency: 'PERSONALIZADO',
      startDate: today,
      isControlled: false,
      isHighRisk: false,
      createdAt: '',
      updatedAt: '',
      preselectedScheduledTime: scheduledTime, // Pré-selecionar o horário clicado
    })
  }

  // ──────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Page maxWidth="wide" spacing="compact">
        <PageHeader
          title={`Bem-vindo, ${user?.name?.split(' ')[0]}!`}
          subtitle={`Tarefas do dia - ${new Date().toLocaleDateString('pt-BR')}`}
        />
        <EmptyState
          icon={Loader2}
          title="Carregando tarefas do dia..."
          description="Aguarde enquanto buscamos suas tarefas"
          variant="info"
        />
      </Page>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ──────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Page maxWidth="wide" spacing="compact">
        <PageHeader
          title={`Bem-vindo, ${user?.name?.split(' ')[0]}!`}
          subtitle={`Tarefas do dia - ${new Date().toLocaleDateString('pt-BR')}`}
        />
        <EmptyState
          icon={AlertTriangle}
          title="Erro ao carregar tarefas"
          description={(error as Error).message || 'Não foi possível carregar as tarefas. Tente novamente.'}
          variant="error"
          action={
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Tentar novamente
            </Button>
          }
        />
      </Page>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  // EMPTY STATE - Apenas se não houver dados
  // ──────────────────────────────────────────────────────────────────────

  if (!data) {
    return (
      <Page maxWidth="wide" spacing="compact">
        <PageHeader
          title={`Bem-vindo, ${user?.name?.split(' ')[0]}!`}
          subtitle={`Tarefas do dia - ${new Date().toLocaleDateString('pt-BR')}`}
        />
        <EmptyState
          icon={CheckCircle2}
          title="Nenhuma informação disponível"
          description="Não há dados para exibir no momento."
          variant="success"
        />
      </Page>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  // MAIN DASHBOARD
  // ──────────────────────────────────────────────────────────────────────

  return (
    <Page maxWidth="wide" spacing="compact">
      <PageHeader
        title={`Bem-vindo, ${user?.name?.split(' ')[0]}!`}
        subtitle={`Tarefas do dia - ${new Date().toLocaleDateString('pt-BR')}`}
      />

      {/* Banner de Status do Plantão (apenas para cargos que precisam de plantão) */}
      {!hasBypass && (
        <ShiftStatusBanner
          shift={currentShift || activeShift}
          isLeaderOrSubstitute={isLeaderOrSubstitute}
          loading={isLoadingShift}
          onCheckInSuccess={() => refetch()}
          onHandoverSuccess={() => refetch()}
        />
      )}

      {/* Aviso se não pode registrar */}
      {!canRegister && cannotRegisterReason && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
          <strong>Atenção:</strong> {cannotRegisterReason}
        </div>
      )}

      {/* Busca Universal */}
      <UniversalSearch
        onAfterSelectResident={() => {
          // Componente UniversalSearch já controla o modal internamente
        }}
      />

      {/* Cards de estatísticas */}
      <Section title="Estatísticas do Dia">
        <CaregiverStatsCards stats={data.stats} isLoading={isLoading} />
      </Section>

      {/* Grid principal: Registros AVDs (50%) + Medicações (50%) */}
      {(() => {
        // Verificar se há tarefas PENDENTES (não concluídas)
        const hasTasksPending = data.recurringTasks.some(task => !task.isCompleted)
        // Verificar se há medicações PENDENTES (não administradas)
        const hasMedicationsPending = data.medications.some(med => !med.wasAdministered)

        // Se ambos não têm pendências, mostrar card compacto SEM título
        if (!hasTasksPending && !hasMedicationsPending) {
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
          <Section title="Atividades Programadas">
            <div className={`grid grid-cols-1 gap-6 ${hasTasksPending && hasMedicationsPending ? 'md:grid-cols-2' : ''}`}>
              {/* Coluna 1: Registros AVDs */}
              {hasTasksPending && (
                <div>
                  <TasksSection
                    title="Registros AVDs"
                    tasks={data.recurringTasks}
                    onRegister={(residentId, recordType, scheduledTime, mealType) => {
                      // Buscar nome do residente
                      const task = data.recurringTasks.find(
                        (t) => t.residentId === residentId,
                      )
                      const residentName = task?.residentName || 'Residente'
                      handleOpenModal(residentId, residentName, recordType, scheduledTime, mealType)
                    }}
                    onViewResident={(residentId) => setSelectedResidentId(residentId)}
                    isLoading={isLoading}
                  />
                </div>
              )}

              {/* Coluna 2: Medicações */}
              {hasMedicationsPending && (
                <div>
                  <MedicationsSection
                    title="Medicações"
                    medications={data.medications}
                    onViewResident={(residentId) => setSelectedResidentId(residentId)}
                    onAdministerMedication={handleAdministerMedication}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          </Section>
        )
      })()}

      {/* Seção: Agendamentos Pontuais (full width) */}
      {data.scheduledEvents.length > 0 ? (
        <Section title="Agendamentos de Hoje">
          <EventsSection
            title="Eventos"
            events={data.scheduledEvents}
            onViewResident={(residentId) => setSelectedResidentId(residentId)}
            isLoading={isLoading}
          />
        </Section>
      ) : (
        <Section title="">
          <EventsSection
            title="Eventos"
            events={data.scheduledEvents}
            onViewResident={(residentId) => setSelectedResidentId(residentId)}
            isLoading={isLoading}
          />
        </Section>
      )}

      {/* Mini Prontuário Modal */}
      {selectedResidentId && (
        <ResidentQuickViewModal
          residentId={selectedResidentId}
          onClose={() => setSelectedResidentId(null)}
          onRegister={(recordType, mealType) => {
            // Buscar nome do residente
            const allTasks = [...data.recurringTasks, ...data.medications, ...data.scheduledEvents]
            const task = allTasks.find((t) => t.residentId === selectedResidentId)
            const residentName = task?.residentName || 'Residente'
            // Registro ad hoc (sem scheduledTime) - não bloqueia verificação de duplicação
            handleOpenModal(selectedResidentId, residentName, recordType, undefined, mealType)
          }}
          onAdministerMedication={handleAdministerMedication}
        />
      )}

      {/* Modais de Registro */}
      {activeModal === 'HIGIENE' && (
        <HigieneModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'ALIMENTACAO' && (
        <AlimentacaoModal
          open={true}
          onClose={() => {
            setActiveModal(null)
            setSelectedMealType(undefined)
          }}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
          existingRecords={[]} // Dashboard não precisa validar registros existentes
          defaultMealType={selectedMealType}
        />
      )}
      {activeModal === 'HIDRATACAO' && (
        <HidratacaoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'MONITORAMENTO' && (
        <MonitoramentoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'ELIMINACAO' && (
        <EliminacaoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'COMPORTAMENTO' && (
        <ComportamentoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'HUMOR' && (
        <HumorModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'SONO' && (
        <SonoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'PESO' && (
        <PesoModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'INTERCORRENCIA' && (
        <IntercorrenciaModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'ATIVIDADES' && (
        <AtividadesModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'VISITA' && (
        <VisitaModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}
      {activeModal === 'OUTROS' && (
        <OutrosModal
          open={true}
          onClose={() => setActiveModal(null)}
          onSubmit={handleCreateRecord}
          residentId={currentResidentId}
          residentName={currentResidentName}
          date={today}
          currentUserName={user?.name || ''}
        />
      )}

      {/* Modal de Administração de Medicação */}
      {selectedMedication && (
        <AdministerMedicationModal
          open={true}
          onClose={() => {
            setSelectedMedication(null)
            // Invalidar queries para atualizar a lista de medicações
            refetch()
          }}
          medication={selectedMedication}
        />
      )}
    </Page>
  )
}
