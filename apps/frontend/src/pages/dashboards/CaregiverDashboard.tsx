import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { useCaregiverTasks } from '@/hooks/useCaregiverTasks'
import { CaregiverStatsCards } from '@/components/caregiver/CaregiverStatsCards'
import { UniversalSearch } from '@/components/common/UniversalSearch'
import { TasksSection } from '@/components/caregiver/TasksSection'
import { MedicationsSection } from '@/components/caregiver/MedicationsSection'
import { EventsSection } from '@/components/caregiver/EventsSection'
import { ResidentQuickViewModal } from '@/components/caregiver/ResidentQuickViewModal'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { getCurrentDateLocal } from '@/utils/timezone'
import { invalidateAfterDailyRecordMutation } from '@/utils/queryInvalidation'

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

export function CaregiverDashboard() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useCaregiverTasks()
  const today = getCurrentDateLocal()

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
  const [selectedMedication, setSelectedMedication] = useState<any>(null)

  // Mutation para criar registro
  const createMutation = useMutation({
    mutationFn: async (recordData: Record<string, unknown>) => {
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

  const handleCreateRecord = (recordData: Record<string, unknown>) => {
    createMutation.mutate(recordData)
  }

  const handleOpenModal = (
    residentId: string,
    residentName: string,
    recordType: string,
    mealType?: string,
  ) => {
    setCurrentResidentId(residentId)
    setCurrentResidentName(residentName)
    setActiveModal(recordType)
    setSelectedMealType(mealType)
  }

  const handleAdministerMedication = (
    medicationId: string,
    _residentId: string,
    scheduledTime: string,
  ) => {
    // Buscar dados completos da medicação da lista
    const medicationTask = data?.medications.find(
      (m) => m.medicationId === medicationId && m.scheduledTime === scheduledTime
    )

    if (medicationTask) {
      // Montar objeto no formato esperado pelo modal
      setSelectedMedication({
        id: medicationTask.medicationId,
        name: medicationTask.medicationName,
        presentation: medicationTask.presentation,
        concentration: medicationTask.concentration,
        dose: medicationTask.dose,
        route: medicationTask.route,
        requiresDoubleCheck: medicationTask.requiresDoubleCheck,
        scheduledTimes: medicationTask.scheduledTimes || [scheduledTime],
        preselectedScheduledTime: scheduledTime, // Pré-selecionar o horário clicado
      })
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando tarefas do dia...</p>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ──────────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar tarefas</AlertTitle>
        <AlertDescription>
          {(error as Error).message ||
            'Não foi possível carregar as tarefas. Tente novamente.'}
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ──────────────────────────────────────────────────────────────────────

  if (!data || data.stats.totalPending === 0) {
    return (
      <div>
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Bem-vindo, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-muted-foreground mt-1">
            Tarefas do dia - {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">
              Todas as tarefas concluídas!
            </h3>
            <p className="text-muted-foreground">
              Não há tarefas pendentes no momento.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────
  // MAIN DASHBOARD
  // ──────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header com boas-vindas */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Bem-vindo, {user?.name?.split(' ')[0]}!
        </h2>
        <p className="text-muted-foreground mt-1">
          Tarefas do dia - {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Busca Universal */}
      <UniversalSearch
        onAfterSelectResident={() => {
          // Componente UniversalSearch já controla o modal internamente
        }}
      />

      {/* Cards de estatísticas */}
      <div className="mt-6 mb-6">
        <CaregiverStatsCards stats={data.stats} isLoading={isLoading} />
      </div>

      {/* Grid principal: Tarefas (50%) + Medicações (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Coluna 1: Tarefas */}
        <div>
          <TasksSection
            title="Tarefas"
            tasks={data.recurringTasks}
            onRegister={(residentId, recordType, mealType) => {
              // Buscar nome do residente
              const task = data.recurringTasks.find(
                (t) => t.residentId === residentId,
              )
              const residentName = task?.residentName || 'Residente'
              handleOpenModal(residentId, residentName, recordType, mealType)
            }}
            onViewResident={(residentId) => setSelectedResidentId(residentId)}
            isLoading={isLoading}
          />
        </div>

        {/* Coluna 2: Medicações */}
        <div>
          <MedicationsSection
            title="Medicações"
            medications={data.medications}
            onViewResident={(residentId) => setSelectedResidentId(residentId)}
            onAdministerMedication={handleAdministerMedication}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Seção: Agendamentos Pontuais (full width) */}
      <EventsSection
        title="Agendamentos de Hoje"
        events={data.scheduledEvents}
        onViewResident={(residentId) => setSelectedResidentId(residentId)}
        isLoading={isLoading}
      />

      {/* Seção: Atividades Recentes (full width) */}
      <div className="mt-6">
        <RecentActivity />
      </div>

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
            handleOpenModal(selectedResidentId, residentName, recordType, mealType)
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
    </div>
  )
}
