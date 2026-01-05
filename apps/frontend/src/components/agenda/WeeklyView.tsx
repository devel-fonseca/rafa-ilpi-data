import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgendaItem, StatusFilterType } from '@/types/agenda'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

  // Calcular início e fim da semana (domingo a sábado)
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate])
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 0 }), [selectedDate])
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd])

  // Função de navegação entre dias no modal
  const handleNavigateDay = (direction: 'prev' | 'next') => {
    if (!selectedDay) return
    const newDay = direction === 'prev' ? subDays(selectedDay, 1) : addDays(selectedDay, 1)
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
      const itemDate = typeof item.scheduledDate === 'string'
        ? parseISO(item.scheduledDate)
        : item.scheduledDate

      const dayKey = format(itemDate, 'yyyy-MM-dd')
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
          <p className="text-sm text-muted-foreground">Carregando agenda semanal...</p>
        </div>
      </div>
    )
  }

  const today = new Date()

  return (
    <div className="space-y-4">
      {/* Header da semana */}
      <Card className="p-4">
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
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700 border-yellow-600'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300'
              }`}
              onClick={() => onStatusFilterChange?.(statusFilter === 'pending' ? 'all' : 'pending')}
            >
              {items.filter(i => i.status === 'pending').length} pendentes
            </Badge>
            <Badge
              variant="outline"
              className={`cursor-pointer transition-all ${
                statusFilter === 'completed'
                  ? 'bg-green-600 text-white hover:bg-green-700 border-green-600'
                  : 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300'
              }`}
              onClick={() => onStatusFilterChange?.(statusFilter === 'completed' ? 'all' : 'completed')}
            >
              {items.filter(i => i.status === 'completed').length} concluídos
            </Badge>
            <Badge
              variant="outline"
              className={`cursor-pointer transition-all ${
                statusFilter === 'missed'
                  ? 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                  : 'bg-red-100 text-red-800 hover:bg-red-200 border-red-300'
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
                          item.status === 'completed' ? 'bg-green-500' :
                          item.status === 'pending' ? 'bg-yellow-500' :
                          item.status === 'missed' ? 'bg-red-500' :
                          'bg-gray-400'
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

      {/* Lista detalhada por dia (opcional, colapsável) */}
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

      {/* Modal de detalhes do dia */}
      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          items={itemsByDay[format(selectedDay, 'yyyy-MM-dd')] || []}
          isOpen={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          onNavigateDay={handleNavigateDay}
          isToday={isSameDay(selectedDay, today)}
        />
      )}
    </div>
  )
}
