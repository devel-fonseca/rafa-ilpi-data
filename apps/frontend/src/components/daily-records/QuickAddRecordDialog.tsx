import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Activity,
  Bath,
  Calendar,
  Dribbble,
  Droplets,
  FileText,
  Moon,
  Smile,
  Trash2,
  Utensils,
  Weight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ResidentSearchSelect } from '@/components/residents/ResidentSearchSelect'
import { residentsAPI } from '@/api/residents.api'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { getCurrentDate } from '@/utils/dateHelpers'
import { invalidateAfterDailyRecordMutation } from '@/utils/queryInvalidation'
import { tenantKey } from '@/lib/query-keys'
import { useAuthStore } from '@/stores/auth.store'
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

// Configuração de ícones/cores por tipo de registro
const RECORD_TYPE_CONFIG: Record<string, { icon: typeof Bath; label: string; color: string }> = {
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

const RECORD_QUICK_ACTIONS = [
  { type: 'HIGIENE', label: 'Higiene' },
  { type: 'ALIMENTACAO', label: 'Alimentação' },
  { type: 'HIDRATACAO', label: 'Hidratação' },
  { type: 'MONITORAMENTO', label: 'Monitoramento' },
  { type: 'ELIMINACAO', label: 'Eliminação' },
  { type: 'COMPORTAMENTO', label: 'Comportamento' },
  { type: 'HUMOR', label: 'Humor' },
  { type: 'SONO', label: 'Sono' },
  { type: 'PESO', label: 'Peso/Altura' },
  { type: 'INTERCORRENCIA', label: 'Intercorrência' },
  { type: 'ATIVIDADES', label: 'Atividades' },
  { type: 'VISITA', label: 'Visita' },
  { type: 'OUTROS', label: 'Outros' },
] as const

interface QuickAddRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickAddRecordDialog({ open, onOpenChange }: QuickAddRecordDialogProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const today = getCurrentDate()

  // Estado do dialog de seleção
  const [quickAddResidentId, setQuickAddResidentId] = useState<string | null>(null)

  // Estado dos modais de registro
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<string | undefined>(undefined)
  const [currentResidentId, setCurrentResidentId] = useState<string>('')
  const [currentResidentName, setCurrentResidentName] = useState<string>('')

  // Query de residentes ativos (carrega apenas quando dialog está aberto)
  const { data: residentsData, isLoading: isLoadingResidents } = useQuery({
    queryKey: tenantKey('residents', 'list', 'quick-add-dialog'),
    queryFn: () => residentsAPI.getAll({ page: 1, limit: 1000, status: 'Ativo', sortBy: 'fullName', sortOrder: 'asc' }),
    enabled: open,
    staleTime: 60_000,
  })
  const residents = residentsData?.data || []

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

  const handleSelectType = (recordType: string) => {
    if (!quickAddResidentId) return
    const resident = residents.find((r) => r.id === quickAddResidentId)
    if (!resident) return
    setCurrentResidentId(resident.id)
    setCurrentResidentName(resident.fullName)
    setActiveModal(recordType)
    setSelectedMealType(undefined)
    setQuickAddResidentId(null)
    onOpenChange(false)
  }

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setQuickAddResidentId(null)
    }
    onOpenChange(openState)
  }

  return (
    <>
      {/* Dialog de 2 etapas: residente → tipo */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {quickAddResidentId ? 'Selecione o tipo de registro' : 'Registro Avulso'}
            </DialogTitle>
          </DialogHeader>
          {!quickAddResidentId ? (
            <div className="space-y-3 min-h-[320px]">
              <p className="text-sm text-muted-foreground">
                Busque e selecione o residente para registrar uma atividade avulsa.
              </p>
              <ResidentSearchSelect
                residents={residents}
                value={null}
                onValueChange={(id) => setQuickAddResidentId(id)}
                isLoading={isLoadingResidents}
                placeholder="Buscar residente por nome ou leito..."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">
                  {residents.find((r) => r.id === quickAddResidentId)?.fullName}
                </p>
                <Button variant="ghost" size="sm" onClick={() => setQuickAddResidentId(null)}>
                  Trocar
                </Button>
              </div>
              {RECORD_QUICK_ACTIONS.map((action) => {
                const config = RECORD_TYPE_CONFIG[action.type] || RECORD_TYPE_CONFIG.OUTROS
                const Icon = config.icon
                return (
                  <Button
                    key={action.type}
                    onClick={() => handleSelectType(action.type)}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    <Icon className={`h-4 w-4 mr-2 ${config.color}`} />
                    {action.label}
                  </Button>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
