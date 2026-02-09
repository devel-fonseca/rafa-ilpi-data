import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgendaItem, StatusFilterType } from '@/types/agenda'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { extractDateOnly } from '@/utils/dateHelpers'
import { AgendaItemCard } from './AgendaItemCard'
import { DayDetailModal } from './DayDetailModal'

interface Props {
  items: AgendaItem[]
  selectedDate: Date
  isLoading?: boolean
  statusFilter?: StatusFilterType
  onStatusFilterChange?: (filter: StatusFilterType) => void
}

export function WeeklyView({ items, selectedDate, isLoading, statusFilter, onStatusFilterChange }: Props) {
  // Estado do modal
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showDetailedWeekList, setShowDetailedWeekList] = useState(false)

  // Calcular início e fim da semana (domingo a sábado)
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate])
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate])
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])

  // Função de navegação entre dias no modal
  const handleNavigateDay = (direction: 'prev' | 'next') => {
    if (!selectedDay) return
    const newDay = direction === 'prev' ? subWeeks(selectedDay, 1) : addWeeks(selectedDay, 1)
    setSelectedDay(newDay)
  }

  // Agrupar itens por dia
  const itemsByDay = useMemo(() => {
    const grouped: Record<string, AgendaItem[]> = {}

    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      grouped[dayKey] = []
    })

    items.forEach(item => {
      // ✅ Usa extractDateOnly para evitar timezone shift
      const dayKey = extractDateOnly(item.scheduledDate)
      if (grouped[dayKey]) {
        grouped[dayKey].push(item)
      }
    })

    // Ordenar itens de cada dia por horário
    Object.keys(grouped).forEach(dayKey => {
      grouped[dayKey].sort((a, b) => {
        const timeA = a.scheduledTime || '00:00'
        const timeB = b.scheduledTime || '00:00'
        return timeA.localeCompare(timeB)
      })
    })

    return grouped
  }, [items, weekDays])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando agenda semanal, aguarde...</p>
        </div>
      </div>
    )
  }

  const today = new Date()

  return (
    <div className="space-y-4">
      {/* Header da semana */}
      <Card className="p-4 sticky top-2 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Semana de {format(weekStart, 'dd/MM', { locale: ptBR })} a {format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}
            </h3>
            <p className="text-sm text-muted-foreground">
              Total: {items.length} {items.length === 1 ? 'item' : 'itens'}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge
              variant="outline"
              className={`cursor-pointer transition-all ${
                statusFilter === 'pending'
                  ? 'bg-warning/60 text-white hover:bg-warning/70 border-warning/60'
                  : 'bg-warning/10 text-warning/90 hover:bg-warning/20 border-warning/30'
              }`}
              onClick={() => onStatusFilterChange?.(statusFilter === 'pending' ? 'all' : 'pending')}
            >
              {items.filter(i => i.status === 'pending').length} pendentes
            </Badge>
            <Badge
              variant="outline"
              className={`cursor-pointer transition-all ${
                statusFilter === 'completed'
                  ? 'bg-success/60 text-white hover:bg-success/70 border-success/60'
                  : 'bg-success/10 text-success/90 hover:bg-success/20 border-success/30'
              }`}
              onClick={() => onStatusFilterChange?.(statusFilter === 'completed' ? 'all' : 'completed')}
            >
              {items.filter(i => i.status === 'completed').length} concluídos
            </Badge>
            <Badge
              variant="outline"
              className={`cursor-pointer transition-all ${
                statusFilter === 'missed'
                  ? 'bg-danger/60 text-white hover:bg-danger/70 border-danger/60'
                  : 'bg-danger/10 text-danger/90 hover:bg-danger/20 border-danger/30'
              }`}
              onClick={() => onStatusFilterChange?.(statusFilter === 'missed' ? 'all' : 'missed')}
            >
              {items.filter(i => i.status === 'missed').length} perdidos
            </Badge>
          </div>
        </div>
      </Card>

      {/* Grid de dias da semana */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {weekDays.map(day => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayItems = itemsByDay[dayKey] || []
          const isToday = isSameDay(day, today)
          const isSelected = isSameDay(day, selectedDate)

          return (
            <Card
              key={dayKey}
              className={`p-4 ${isToday ? 'ring-2 ring-primary' : ''} ${isSelected ? 'bg-accent' : ''}`}
            >
              {/* Header do dia */}
              <div className="mb-3 pb-2 border-b">
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-accent/50 -mx-2 px-2 py-1 rounded transition-colors"
                  onClick={() => setSelectedDay(day)}
                >
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      {format(day, 'EEE', { locale: ptBR })}
                    </p>
                    <p className={`text-2xl font-bold ${isToday ? 'text-primary' : ''}`}>
                      {format(day, 'dd')}
                    </p>
                  </div>
                  {dayItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {dayItems.length}
                    </Badge>
                  )}
                </div>
                {isToday && (
                  <Badge variant="default" className="text-xs mt-1">
                    Hoje
                  </Badge>
                )}
              </div>

              {/* Itens do dia */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {dayItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sem itens agendados
                  </p>
                ) : (
                  dayItems.slice(0, 5).map(item => (
                    <div key={item.id} className="text-xs">
                      <div className="flex items-start gap-1">
                        <span className="text-muted-foreground shrink-0 w-10">
                          {item.scheduledTime}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-muted-foreground truncate">{item.residentName}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                          item.status === 'completed' ? 'bg-success' :
                          item.status === 'pending' ? 'bg-warning' :
                          item.status === 'missed' ? 'bg-danger' :
                          'bg-muted/40'
                        }`} />
                      </div>
                    </div>
                  ))
                )}
                {dayItems.length > 5 && (
                  <p
                    className="text-xs text-muted-foreground text-center pt-2 cursor-pointer hover:text-primary hover:underline transition-colors"
                    onClick={() => setSelectedDay(day)}
                  >
                    +{dayItems.length - 5} itens...
                  </p>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => setShowDetailedWeekList((prev) => !prev)}
        >
          {showDetailedWeekList ? 'Ocultar lista detalhada' : 'Mostrar lista detalhada'}
        </Badge>
      </div>

      {/* Lista detalhada por dia (opcional) */}
      {showDetailedWeekList && (
        <div className="space-y-3">
          {weekDays.map(day => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayItems = itemsByDay[dayKey] || []

            if (dayItems.length === 0) return null

            return (
              <details key={dayKey} className="group">
                <summary className="cursor-pointer list-none">
                  <Card className="p-4 hover:bg-accent transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            {format(day, 'EEE', { locale: ptBR })}
                          </p>
                          <p className="text-xl font-bold">
                            {format(day, 'dd/MM')}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold">
                            {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {dayItems.length} {dayItems.length === 1 ? 'item agendado' : 'itens agendados'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {dayItems.filter(i => i.status === 'completed').length}/{dayItems.length} concluídos
                        </Badge>
                        <svg
                          className="w-5 h-5 transition-transform group-open:rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </Card>
                </summary>

                <div className="mt-2 ml-4 space-y-2">
                  {dayItems.map(item => (
                    <AgendaItemCard key={item.id} item={item} />
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      )}

      {/* Modal de detalhes do dia */}
      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          items={itemsByDay[format(selectedDay, 'yyyy-MM-dd')] || []}
          isOpen={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          onNavigateDay={handleNavigateDay}
          isToday={isSameDay(selectedDay, today)}
          previousLabel="Semana anterior"
          nextLabel="Próxima semana"
        />
      )}
    </div>
  )
}
