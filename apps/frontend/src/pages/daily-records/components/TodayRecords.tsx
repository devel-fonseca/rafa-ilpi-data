import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  XCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Droplets,
  Utensils,
  Bath,
  Activity,
  Trash2,
  Smile,
  Moon,
  Weight,
  AlertTriangle,
  Dribbble,
  Calendar,
  FileText,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QuickAddRecordDialog } from '@/components/daily-records/QuickAddRecordDialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCaregiverTasks } from '@/hooks/useCaregiverTasks'
import { useAuthStore } from '@/stores/auth.store'
import { getCurrentDate } from '@/utils/dateHelpers'
import { invalidateAfterDailyRecordMutation } from '@/utils/queryInvalidation'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { ResidentQuickViewModal } from '@/components/residents/ResidentQuickViewModal'
import type { DailyTask } from '@/types/resident-schedule'
import type { CreateDailyRecordInput, DailyRecordData } from '@/types/daily-records'

// Modais de registro
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

// ──────────────────────────────────────────────────────────────────────────
// TIPOS E CONSTANTES
// ──────────────────────────────────────────────────────────────────────────

type ShiftType = 'morning' | 'afternoon' | 'night'

interface RecordAction {
  residentId: string
  residentName: string
  recordType: string
  scheduledTime: string
  status: 'completed' | 'pending' | 'missed'
  isCompleted: boolean
  completedBy?: string
  mealType?: string
  configId?: string
  task: DailyTask
}

function getShift(time: string): ShiftType {
  const hour = parseInt(time.split(':')[0])
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  return 'night'
}

const SHIFT_CONFIG = {
  morning: {
    label: 'Manhã (06h - 12h)',
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
  },
  afternoon: {
    label: 'Tarde (12h - 18h)',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
  },
  night: {
    label: 'Noite (18h - 06h)',
    color: 'text-danger',
    bgColor: 'bg-danger/10',
    borderColor: 'border-danger/30',
  },
}

const STATUS_CONFIG = {
  completed: {
    icon: CheckCircle2,
    color: 'text-success',
    label: 'Concluído',
  },
  pending: {
    icon: Circle,
    color: 'text-muted-foreground',
    label: 'Pendente',
  },
  missed: {
    icon: XCircle,
    color: 'text-danger',
    label: 'Vencido',
  },
}

const RECORD_TYPE_CONFIG: Record<
  string,
  { icon: typeof Bath; label: string; color: string }
> = {
  HIGIENE: { icon: Bath, label: 'Higiene', color: 'text-primary dark:text-primary/40' },
  ALIMENTACAO: { icon: Utensils, label: 'Alimentação', color: 'text-success dark:text-success/40' },
  HIDRATACAO: { icon: Droplets, label: 'Hidratação', color: 'text-cyan-600 dark:text-cyan-400' },
  MONITORAMENTO: { icon: Activity, label: 'Sinais Vitais', color: 'text-danger dark:text-danger/40' },
  ELIMINACAO: { icon: Trash2, label: 'Eliminação', color: 'text-amber-600 dark:text-amber-400' },
  COMPORTAMENTO: { icon: Smile, label: 'Comportamento', color: 'text-medication-controlled dark:text-medication-controlled/40' },
  HUMOR: { icon: Smile, label: 'Humor', color: 'text-pink-600 dark:text-pink-400' },
  SONO: { icon: Moon, label: 'Sono', color: 'text-indigo-600 dark:text-indigo-400' },
  PESO: { icon: Weight, label: 'Peso', color: 'text-muted-foreground' },
  INTERCORRENCIA: { icon: AlertTriangle, label: 'Intercorrência', color: 'text-destructive' },
  ATIVIDADES: { icon: Dribbble, label: 'Atividades', color: 'text-teal-600 dark:text-teal-400' },
  VISITA: { icon: Calendar, label: 'Visita', color: 'text-violet-600 dark:text-violet-400' },
  OUTROS: { icon: FileText, label: 'Outros', color: 'text-muted-foreground' },
}

const ITEMS_PER_PAGE = 10

// ──────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ──────────────────────────────────────────────────────────────────────────

interface TodayRecordsProps {
  quickAddOpen?: boolean
  onQuickAddOpenChange?: (open: boolean) => void
}

export function TodayRecords({ quickAddOpen = false, onQuickAddOpenChange }: TodayRecordsProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const today = getCurrentDate()
  const { data, isLoading, refetch } = useCaregiverTasks()

  // Estados de paginação (um por turno)
  const [morningPage, setMorningPage] = useState(1)
  const [afternoonPage, setAfternoonPage] = useState(1)
  const [nightPage, setNightPage] = useState(1)

  // Estado para modais
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<string | undefined>(undefined)
  const [currentResidentId, setCurrentResidentId] = useState<string>('')
  const [currentResidentName, setCurrentResidentName] = useState<string>('')
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null)

  // Mutation para criar registro
  const createMutation = useMutation({
    mutationFn: async (recordData: CreateDailyRecordInput<DailyRecordData>) => {
      return await api.post('/daily-records', recordData)
    },
    onSuccess: (response) => {
      const recordData = response.data
      invalidateAfterDailyRecordMutation(queryClient, recordData.residentId, recordData.date)
      setActiveModal(null)
      setSelectedMealType(undefined)
      toast.success('Registro adicionado com sucesso!')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err?.response?.data?.message || 'Erro ao adicionar registro')
    },
  })

  const handleCreateRecord = (recordData: CreateDailyRecordInput<DailyRecordData>) => {
    createMutation.mutate(recordData)
  }

  const handleRecordClick = async (action: RecordAction) => {
    // Se já concluído, mostrar toast informativo
    if (action.isCompleted) {
      toast.info('Registro já realizado', {
        description: action.completedBy
          ? `Registrado por ${action.completedBy}`
          : 'Este registro já foi concluído.',
      })
      return
    }

    // Refetch para garantir dados atualizados (evitar duplicações)
    const { data: freshData } = await refetch()

    const task = freshData?.recurringTasks.find(
      (t) =>
        t.residentId === action.residentId &&
        t.recordType === action.recordType &&
        (!action.scheduledTime || t.scheduledTime === action.scheduledTime) &&
        (action.recordType !== 'ALIMENTACAO' || t.mealType === action.mealType),
    )

    if (task?.isCompleted) {
      toast.warning(
        `Este registro já foi feito por ${task.completedBy || 'outro profissional'}`,
        { description: 'A lista foi atualizada com os dados mais recentes.' },
      )
      return
    }

    setCurrentResidentId(action.residentId)
    setCurrentResidentName(action.residentName)
    setActiveModal(action.recordType)
    setSelectedMealType(action.mealType)
  }

  // Processar tarefas e agrupar por turno
  const actionsByShift = useMemo(() => {
    const tasks = data?.recurringTasks || []

    const actions: Record<ShiftType, RecordAction[]> = {
      morning: [],
      afternoon: [],
      night: [],
    }

    tasks.forEach((task) => {
      const time = task.scheduledTime || task.suggestedTimes?.[0]
      if (!time) return

      const shift = getShift(time)

      let status: 'completed' | 'pending' | 'missed' = 'pending'

      if (task.isCompleted) {
        status = 'completed'
      } else {
        const now = new Date()
        const scheduledDateTime = new Date(`${today}T${time}`)
        if (now > scheduledDateTime) {
          status = 'missed'
        }
      }

      actions[shift].push({
        residentId: task.residentId,
        residentName: task.residentName,
        recordType: task.recordType || 'OUTROS',
        scheduledTime: time,
        status,
        isCompleted: !!task.isCompleted,
        completedBy: task.completedBy,
        mealType: task.mealType,
        configId: task.configId,
        task,
      })
    })

    // Ordenar: concluídos no final, depois por horário
    Object.keys(actions).forEach((shift) => {
      actions[shift as ShiftType].sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1
        if (a.status !== 'completed' && b.status === 'completed') return -1
        return a.scheduledTime.localeCompare(b.scheduledTime)
      })
    })

    return actions
  }, [data?.recurringTasks, today])

  const totalActions =
    actionsByShift.morning.length +
    actionsByShift.afternoon.length +
    actionsByShift.night.length

  if (isLoading) {
    return null
  }

  if (totalActions === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum registro programado para hoje
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(['morning', 'afternoon', 'night'] as ShiftType[]).map((shift) => {
              const config = SHIFT_CONFIG[shift]
              const actions = actionsByShift[shift]

              if (actions.length === 0) return null

              const currentPage = shift === 'morning' ? morningPage : shift === 'afternoon' ? afternoonPage : nightPage
              const setCurrentPage = shift === 'morning' ? setMorningPage : shift === 'afternoon' ? setAfternoonPage : setNightPage

              const totalPages = Math.ceil(actions.length / ITEMS_PER_PAGE)
              const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
              const endIndex = startIndex + ITEMS_PER_PAGE
              const paginatedActions = actions.slice(startIndex, endIndex)

              const showPagination = actions.length > ITEMS_PER_PAGE

              return (
                <div
                  key={shift}
                  className={`border rounded-lg p-4 ${config.bgColor} ${config.borderColor}`}
                >
                  <h3 className={`text-sm font-medium mb-3 ${config.color}`}>
                    {config.label}
                    <Badge variant="outline" className="ml-2">
                      {actions.length}
                    </Badge>
                  </h3>
                  <div className="space-y-2">
                    {paginatedActions.map((action, idx) => {
                      const statusConfig = STATUS_CONFIG[action.status]
                      const StatusIcon = statusConfig.icon
                      const recordConfig = RECORD_TYPE_CONFIG[action.recordType] || RECORD_TYPE_CONFIG.OUTROS
                      const RecordIcon = recordConfig.icon

                      return (
                        <div
                          key={`${action.configId || action.recordType}-${action.residentId}-${action.scheduledTime}-${idx}`}
                          className={`bg-card rounded p-3 text-sm border transition-colors ${
                            action.isCompleted
                              ? 'opacity-60'
                              : 'cursor-pointer hover:bg-accent/5 hover:border-accent'
                          }`}
                          onClick={() => handleRecordClick(action)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleRecordClick(action)
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted/50 shrink-0">
                                <RecordIcon className={`w-3.5 h-3.5 ${action.isCompleted ? 'text-muted-foreground' : recordConfig.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-medium text-foreground">
                                    {action.scheduledTime}
                                  </span>
                                  <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                                </div>
                                <p className="font-medium text-foreground truncate">
                                  {recordConfig.label}
                                  {action.mealType && ` - ${action.mealType}`}
                                </p>
                                <p className="text-muted-foreground truncate">
                                  {action.residentName}
                                </p>
                              </div>
                            </div>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="px-2 shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedResidentId(action.residentId)
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Visualização rápida do residente</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Controles de paginação */}
                  {showPagination && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Registro Avulso */}
      <QuickAddRecordDialog
        open={quickAddOpen}
        onOpenChange={(open) => onQuickAddOpenChange?.(open)}
      />

      {/* Mini Prontuário Modal */}
      {selectedResidentId && (
        <ResidentQuickViewModal
          residentId={selectedResidentId}
          onClose={() => setSelectedResidentId(null)}
          onRegister={(recordType, mealType) => {
            const tasks = data?.recurringTasks || []
            const task = tasks.find((t) => t.residentId === selectedResidentId)
            const residentName = task?.residentName || 'Residente'
            setCurrentResidentId(selectedResidentId)
            setCurrentResidentName(residentName)
            setActiveModal(recordType)
            setSelectedMealType(mealType)
          }}
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
          existingRecords={[]}
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
    </>
  )
}
