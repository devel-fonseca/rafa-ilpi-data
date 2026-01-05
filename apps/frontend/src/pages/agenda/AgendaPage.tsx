import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { AgendaFilters } from '@/components/agenda/AgendaFilters'
import { DailyView } from '@/components/agenda/DailyView'
import { DailyViewInstitutional } from '@/components/agenda/DailyViewInstitutional'
import { WeeklyView } from '@/components/agenda/WeeklyView'
import { MonthlyView } from '@/components/agenda/MonthlyView'
import { InstitutionalEventModal } from '@/components/agenda/InstitutionalEventModal'
import { useAgendaItems, useInstitutionalEvents, useInstitutionalEventMutations } from '@/hooks/useAgenda'
import { ViewType, ScopeType, ContentFilterType, StatusFilterType } from '@/types/agenda'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'

const STORAGE_KEY = 'agenda-preferences'

// Todos os filtros por padrão
const ALL_FILTERS = Object.values(ContentFilterType)

export default function AgendaPage() {
  // Estado da agenda
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewType, setViewType] = useState<ViewType>('daily')
  const [scope, setScope] = useState<ScopeType>('general')
  const [residentId, setResidentId] = useState<string | null>(null)
  const [contentFilters, setContentFilters] = useState<ContentFilterType[]>(ALL_FILTERS)
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all')

  // Estado do modal de eventos institucionais
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)

  // Permissões
  const { hasPermission } = usePermissions()
  const canCreateInstitutionalEvents = hasPermission(PermissionType.CREATE_INSTITUTIONAL_EVENTS)

  // Mutations para eventos institucionais
  const { createEvent } = useInstitutionalEventMutations()

  // Carregar preferências do localStorage na montagem
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const prefs = JSON.parse(saved)
        if (prefs.viewType) setViewType(prefs.viewType)
        if (prefs.scope) setScope(prefs.scope)
        if (prefs.residentId) setResidentId(prefs.residentId)
        if (prefs.contentFilters) setContentFilters(prefs.contentFilters)
      } catch (error) {
        console.error('Erro ao carregar preferências da agenda:', error)
      }
    }
  }, [])

  // Salvar preferências no localStorage quando mudar
  useEffect(() => {
    const prefs = {
      viewType,
      scope,
      residentId,
      contentFilters,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [viewType, scope, residentId, contentFilters])

  // Buscar itens da agenda (para scopes 'general' e 'resident')
  const {
    data: agendaItems = [],
    isLoading: isLoadingAgenda,
  } = useAgendaItems({
    viewType,
    selectedDate,
    residentId: scope === 'resident' ? residentId : null,
    filters: scope === 'resident' && residentId ? contentFilters : undefined,
    statusFilter,
  })

  // Buscar eventos institucionais (para scope 'institutional')
  const {
    data: institutionalItems = [],
    isLoading: isLoadingInstitutional,
  } = useInstitutionalEvents({
    viewType,
    selectedDate,
  })

  // Determinar quais dados usar baseado no scope
  const items = scope === 'institutional' ? institutionalItems : agendaItems
  const isLoading = scope === 'institutional' ? isLoadingInstitutional : isLoadingAgenda

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1))
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1))
  const handleToday = () => setSelectedDate(new Date())
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setSelectedDate(parseISO(e.target.value))
    }
  }

  const handleCreateEvent = async (data: unknown) => {
    await createEvent.mutateAsync(data)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Agenda</h1>
        <p className="text-muted-foreground">
          Visualize medicamentos, agendamentos e registros obrigatórios
        </p>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <AgendaFilters
          scope={scope}
          residentId={residentId}
          contentFilters={contentFilters}
          onScopeChange={(newScope) => {
            setScope(newScope)
            if (newScope === 'general' || newScope === 'institutional') {
              setResidentId(null)
            }
          }}
          onResidentChange={setResidentId}
          onContentFiltersChange={setContentFilters}
        />
      </Card>

      {/* Navegação de Data */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              className="pl-9 min-w-[200px]"
            />
          </div>

          <Button variant="outline" size="icon" onClick={handleNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="outline" onClick={handleToday}>
            Hoje
          </Button>

          {/* Botão Criar Evento (apenas para scope institutional e com permissão) */}
          {scope === 'institutional' && canCreateInstitutionalEvents && (
            <Button onClick={() => setIsEventModalOpen(true)} className="ml-2">
              <Plus className="h-4 w-4 mr-2" />
              Criar Evento
            </Button>
          )}
        </div>

        {/* Seletor de Visualização */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewType === 'daily' ? 'default' : 'outline'}
            onClick={() => setViewType('daily')}
          >
            Dia
          </Button>
          <Button
            variant={viewType === 'weekly' ? 'default' : 'outline'}
            onClick={() => setViewType('weekly')}
          >
            Semana
          </Button>
          <Button
            variant={viewType === 'monthly' ? 'default' : 'outline'}
            onClick={() => setViewType('monthly')}
          >
            Mês
          </Button>
        </div>
      </div>

      {/* Visualização */}
      <div>
        {viewType === 'daily' && scope === 'general' && (
          <DailyViewInstitutional items={items} isLoading={isLoading} />
        )}
        {viewType === 'daily' && scope === 'institutional' && (
          <DailyViewInstitutional items={items} isLoading={isLoading} />
        )}
        {viewType === 'daily' && scope === 'resident' && (
          <DailyView items={items} isLoading={isLoading} />
        )}
        {viewType === 'weekly' && (
          <WeeklyView
            items={items}
            selectedDate={selectedDate}
            isLoading={isLoading}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}
        {viewType === 'monthly' && (
          <MonthlyView
            items={items}
            selectedDate={selectedDate}
            isLoading={isLoading}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}
      </div>

      {/* Modal de Criar/Editar Evento Institucional */}
      <InstitutionalEventModal
        open={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSubmit={handleCreateEvent}
        initialDate={selectedDate}
      />
    </div>
  )
}
