import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgendaItem } from '@/types/agenda'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
  isSameMonth
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AgendaItemCard } from './AgendaItemCard'

interface Props {
  items: AgendaItem[]
  selectedDate: Date
  isLoading?: boolean
}

export function MonthlyView({ items, selectedDate, isLoading }: Props) {
  // Calcular início e fim do mês
  const monthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate])
  const monthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate])

  // Incluir dias da semana anterior/posterior para preencher o calendário
  const calendarStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 0 }), [monthStart])
  const calendarEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 0 }), [monthEnd])
  const calendarDays = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd])

  // Agrupar itens por dia
  const itemsByDay = useMemo(() => {
    const grouped: Record<string, AgendaItem[]> = {}

    calendarDays.forEach(day => {
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
  }, [items, calendarDays])

  // Calcular semanas do calendário
  const weeks = useMemo(() => {
    const weeksArray: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeksArray.push(calendarDays.slice(i, i + 7))
    }
    return weeksArray
  }, [calendarDays])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando agenda mensal...</p>
        </div>
      </div>
    )
  }

  const today = new Date()

  // Estatísticas do mês
  const monthItems = items.filter(item => {
    const itemDate = typeof item.scheduledDate === 'string'
      ? parseISO(item.scheduledDate)
      : item.scheduledDate
    return isSameMonth(itemDate, selectedDate)
  })

  return (
    <div className="space-y-4">
      {/* Header do mês */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">
              {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <p className="text-sm text-muted-foreground">
              Total: {monthItems.length} {monthItems.length === 1 ? 'item' : 'itens'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {monthItems.filter(i => i.status === 'pending').length} pendentes
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {monthItems.filter(i => i.status === 'completed').length} concluídos
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              {monthItems.filter(i => i.status === 'missed').length} perdidos
            </Badge>
          </div>
        </div>
      </Card>

      {/* Calendário */}
      <Card className="p-4">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Grid do calendário */}
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd')
                const dayItems = itemsByDay[dayKey] || []
                const isToday = isSameDay(day, today)
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, selectedDate)
                const hasItems = dayItems.length > 0

                return (
                  <div
                    key={dayKey}
                    className={`
                      min-h-[100px] p-2 rounded-lg border transition-colors
                      ${isToday ? 'ring-2 ring-primary bg-primary/5' : ''}
                      ${isSelected ? 'bg-accent' : ''}
                      ${!isCurrentMonth ? 'opacity-40 bg-muted/50' : 'bg-background'}
                      ${hasItems ? 'border-primary/30' : 'border-border'}
                    `}
                  >
                    {/* Número do dia */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`
                        text-sm font-semibold
                        ${isToday ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                      `}>
                        {format(day, 'd')}
                      </span>
                      {hasItems && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          {dayItems.length}
                        </Badge>
                      )}
                    </div>

                    {/* Indicadores de status (mini dots) */}
                    {hasItems && (
                      <div className="space-y-0.5">
                        {dayItems.slice(0, 4).map(item => (
                          <div
                            key={item.id}
                            className="flex items-center gap-1 text-xs truncate"
                            title={`${item.scheduledTime} - ${item.title}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              item.status === 'completed' ? 'bg-green-500' :
                              item.status === 'pending' ? 'bg-yellow-500' :
                              item.status === 'missed' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`} />
                            <span className="truncate text-muted-foreground">
                              {item.scheduledTime}
                            </span>
                          </div>
                        ))}
                        {dayItems.length > 4 && (
                          <p className="text-xs text-muted-foreground pl-2.5">
                            +{dayItems.length - 4}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </Card>

      {/* Lista detalhada de dias com eventos (apenas do mês atual) */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold px-1">Detalhamento dos Eventos</h3>
        {calendarDays
          .filter(day => isSameMonth(day, selectedDate))
          .map(day => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const dayItems = itemsByDay[dayKey] || []

            if (dayItems.length === 0) return null

            const isToday = isSameDay(day, today)

            return (
              <details key={dayKey} className="group" open={isToday}>
                <summary className="cursor-pointer list-none">
                  <Card className={`p-4 hover:bg-accent transition-colors ${isToday ? 'ring-2 ring-primary' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            {format(day, 'EEE', { locale: ptBR })}
                          </p>
                          <p className={`text-xl font-bold ${isToday ? 'text-primary' : ''}`}>
                            {format(day, 'dd/MM')}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">
                              {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </p>
                            {isToday && (
                              <Badge variant="default" className="text-xs">
                                Hoje
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {dayItems.length} {dayItems.length === 1 ? 'item agendado' : 'itens agendados'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {dayItems.filter(i => i.status === 'completed').length > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-xs text-muted-foreground">
                                {dayItems.filter(i => i.status === 'completed').length}
                              </span>
                            </div>
                          )}
                          {dayItems.filter(i => i.status === 'pending').length > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              <span className="text-xs text-muted-foreground">
                                {dayItems.filter(i => i.status === 'pending').length}
                              </span>
                            </div>
                          )}
                          {dayItems.filter(i => i.status === 'missed').length > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              <span className="text-xs text-muted-foreground">
                                {dayItems.filter(i => i.status === 'missed').length}
                              </span>
                            </div>
                          )}
                        </div>
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

      {/* Mensagem se não houver eventos no mês */}
      {monthItems.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum evento agendado neste mês.</p>
        </Card>
      )}
    </div>
  )
}
