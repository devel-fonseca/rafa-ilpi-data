import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isSameMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AgendaItem } from '@/types/agenda'
import { DayDetailModalInstitutional } from './DayDetailModalInstitutional'

interface Props {
  items: AgendaItem[]
  selectedDate: Date
  isLoading?: boolean
}

/**
 * Visualização mensal para eventos institucionais
 *
 * Otimizada para mostrar eventos da instituição:
 * - Vencimentos de documentos
 * - Treinamentos
 * - Reuniões
 * - Outros eventos institucionais
 */
export function MonthlyViewInstitutional({ items, selectedDate, isLoading }: Props) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

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

    items.forEach(item => {
      const dayKey = format(new Date(item.scheduledDate), 'yyyy-MM-dd')
      if (!grouped[dayKey]) {
        grouped[dayKey] = []
      }
      grouped[dayKey].push(item)
    })

    return grouped
  }, [items])

  // Calcular estatísticas
  const stats = useMemo(() => {
    const statusCounts = {
      pending: 0,
      completed: 0,
      missed: 0,
      cancelled: 0,
    }

    items.forEach(item => {
      if (item.status in statusCounts) {
        statusCounts[item.status as keyof typeof statusCounts]++
      }
    })

    return {
      total: items.length,
      daysWithEvents: Object.keys(itemsByDay).length,
      ...statusCounts,
    }
  }, [items, itemsByDay])

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
          <p className="text-sm text-muted-foreground">Carregando eventos institucionais, aguarde...</p>
        </div>
      </div>
    )
  }

  const today = new Date()

  return (
    <div className="space-y-4">
      {/* Header do mês com estatísticas */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">
              {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <p className="text-sm text-muted-foreground">
              {stats.total} {stats.total === 1 ? 'evento' : 'eventos'} • {stats.daysWithEvents} {stats.daysWithEvents === 1 ? 'dia' : 'dias'} com eventos
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="bg-warning/10 text-warning/90 border-warning/30"
            >
              {stats.pending} pendentes
            </Badge>
            <Badge
              variant="outline"
              className="bg-success/10 text-success/90 border-success/30"
            >
              {stats.completed} concluídos
            </Badge>
            {stats.missed > 0 && (
              <Badge
                variant="outline"
                className="bg-danger/10 text-danger/90 border-danger/30"
              >
                {stats.missed} perdidos
              </Badge>
            )}
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
                const hasEvents = dayItems.length > 0

                // Contar por status
                const statusCounts = dayItems.reduce((acc, item) => {
                  if (item.status in acc) {
                    acc[item.status as keyof typeof acc]++
                  }
                  return acc
                }, { pending: 0, completed: 0, missed: 0 })

                return (
                  <div
                    key={dayKey}
                    onClick={() => hasEvents && setSelectedDay(day)}
                    className={`
                      min-h-[100px] p-2 rounded-lg border transition-all
                      ${hasEvents ? 'cursor-pointer' : 'cursor-default'}
                      ${isToday ? 'ring-2 ring-primary bg-primary/5' : ''}
                      ${isSelected ? 'bg-accent' : ''}
                      ${!isCurrentMonth ? 'opacity-40 bg-muted/50' : 'bg-background hover:bg-accent/50'}
                      ${hasEvents ? 'border-primary/30 hover:border-primary/50' : 'border-border hover:border-primary/30'}
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
                      {hasEvents && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          {dayItems.length}
                        </Badge>
                      )}
                    </div>

                    {/* Indicadores visuais dos eventos */}
                    {hasEvents && (
                      <div className="space-y-0.5">
                        {statusCounts.completed > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                            <span className="text-muted-foreground truncate">
                              {statusCounts.completed} OK
                            </span>
                          </div>
                        )}
                        {statusCounts.pending > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                            <span className="text-muted-foreground truncate">
                              {statusCounts.pending} pend
                            </span>
                          </div>
                        )}
                        {statusCounts.missed > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                            <span className="text-muted-foreground truncate">
                              {statusCounts.missed} perdido
                            </span>
                          </div>
                        )}

                        {/* Preview dos eventos (máximo 2) */}
                        {dayItems.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground truncate">
                            • {item.title}
                          </div>
                        ))}
                        {dayItems.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayItems.length - 2} mais
                          </div>
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

      {/* Modal com detalhes do dia */}
      {selectedDay && (
        <DayDetailModalInstitutional
          day={selectedDay}
          items={itemsByDay[format(selectedDay, 'yyyy-MM-dd')] || []}
          open={selectedDay !== null}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
