import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusFilterType } from '@/types/agenda'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  addDays,
  subDays
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DayDetailModalLazy } from './DayDetailModalLazy'
import { useCalendarSummary } from '@/hooks/useAgenda'
import { LoadingSpinner } from '@/design-system/components'

interface Props {
  selectedDate: Date
  residentId?: string | null
  isLoading?: boolean
  statusFilter?: StatusFilterType
  onStatusFilterChange?: (filter: StatusFilterType) => void
}

/**
 * MonthlyView otimizada para visualização mensal
 *
 * Otimizações:
 * - Usa calendar summary API (agregados) ao invés de carregar todos os itens
 * - Lazy loading: detalhes carregados apenas ao clicar no dia
 * - Redução de ~98% no payload inicial
 */
export function MonthlyViewOptimized({ selectedDate, residentId, isLoading: externalLoading, statusFilter, onStatusFilterChange }: Props) {
  // Estado do modal
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Buscar sumário do calendário (otimizado)
  const { data: summary, isLoading: summaryLoading } = useCalendarSummary({
    selectedDate,
    residentId,
  })

  const isLoading = externalLoading || summaryLoading

  // Calcular início e fim do mês
  const monthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate])
  const monthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate])

  // Incluir dias da semana anterior/posterior para preencher o calendário
  const calendarStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 0 }), [monthStart])
  const calendarEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 0 }), [monthEnd])
  const calendarDays = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd])

  // Função de navegação entre dias no modal
  const handleNavigateDay = (direction: 'prev' | 'next') => {
    if (!selectedDay) return
    const newDay = direction === 'prev' ? subDays(selectedDay, 1) : addDays(selectedDay, 1)
    setSelectedDay(newDay)
  }

  // Calcular semanas do calendário
  const weeks = useMemo(() => {
    const weeksArray: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeksArray.push(calendarDays.slice(i, i + 7))
    }
    return weeksArray
  }, [calendarDays])

  // Aplicar filtro de status aos totais se fornecido
  // IMPORTANTE: Este hook deve ser chamado ANTES de qualquer early return
  const filteredTotals = useMemo(() => {
    if (!summary || !statusFilter || statusFilter === 'all') {
      return summary?.totals || {
        totalItems: 0,
        totalDaysWithItems: 0,
        statusBreakdown: {
          pending: 0,
          completed: 0,
          missed: 0,
          canceled: 0,
        }
      }
    }

    // Recalcular totais baseado no filtro
    let filteredTotalItems = 0
    let filteredDaysWithItems = 0

    Object.values(summary.days).forEach(day => {
      const statusCount = day.statusBreakdown[statusFilter as keyof typeof day.statusBreakdown] || 0
      if (statusCount > 0) {
        filteredTotalItems += statusCount
        filteredDaysWithItems++
      }
    })

    return {
      totalItems: filteredTotalItems,
      totalDaysWithItems: filteredDaysWithItems,
      statusBreakdown: summary.totals.statusBreakdown,
    }
  }, [summary, statusFilter])

  if (isLoading || !summary) {
    return <LoadingSpinner message="Carregando agenda mensal, aguarde..." />
  }

  const today = new Date()
  const { days, totals } = summary

  return (
    <div className="space-y-4">
      {/* Header do mês */}
      <Card className="p-4 sticky top-2 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold">
              {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <p className="text-sm text-muted-foreground">
              Total: {filteredTotals.totalItems} {filteredTotals.totalItems === 1 ? 'item' : 'itens'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={`cursor-pointer transition-all ${
                statusFilter === 'pending'
                  ? 'bg-warning/60 text-white hover:bg-warning/70 border-warning/60'
                  : 'bg-warning/10 text-warning/90 hover:bg-warning/20 border-warning/30'
              }`}
              onClick={() => onStatusFilterChange?.(statusFilter === 'pending' ? 'all' : 'pending')}
            >
              {totals.statusBreakdown.pending} pendentes
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
              {totals.statusBreakdown.completed} concluídos
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
              {totals.statusBreakdown.missed} perdidos
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
                const daySummary = days[dayKey]
                const isToday = isSameDay(day, today)
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, selectedDate)
                const hasItems = daySummary && daySummary.totalItems > 0

                // Aplicar filtro de status se fornecido
                let displayCount = daySummary?.totalItems || 0
                if (statusFilter && statusFilter !== 'all' && daySummary) {
                  displayCount = daySummary.statusBreakdown[statusFilter as keyof typeof daySummary.statusBreakdown] || 0
                }

                return (
                  <div
                    key={dayKey}
                    onClick={() => hasItems && setSelectedDay(day)}
                    className={`
                      min-h-[100px] p-2 rounded-lg border transition-all
                      ${hasItems ? 'cursor-pointer' : 'cursor-default'}
                      ${isToday ? 'ring-2 ring-primary bg-primary/5' : ''}
                      ${isSelected ? 'bg-accent' : ''}
                      ${!isCurrentMonth ? 'opacity-40 bg-muted/50' : 'bg-background hover:bg-accent/50'}
                      ${hasItems ? 'border-primary/30 hover:border-primary/50' : 'border-border hover:border-primary/30'}
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
                      {hasItems && displayCount > 0 && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          {displayCount}
                        </Badge>
                      )}
                    </div>

                    {/* Indicadores visuais (breakdown por status) */}
                    {hasItems && daySummary && (
                      <div className="space-y-0.5">
                        {daySummary.statusBreakdown.completed > 0 && (!statusFilter || statusFilter === 'all' || statusFilter === 'completed') && (
                          <div className="flex items-center gap-1 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                            <span className="text-muted-foreground">
                              {daySummary.statusBreakdown.completed} OK
                            </span>
                          </div>
                        )}
                        {daySummary.statusBreakdown.pending > 0 && (!statusFilter || statusFilter === 'all' || statusFilter === 'pending') && (
                          <div className="flex items-center gap-1 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                            <span className="text-muted-foreground">
                              {daySummary.statusBreakdown.pending} pend
                            </span>
                          </div>
                        )}
                        {daySummary.statusBreakdown.missed > 0 && (!statusFilter || statusFilter === 'all' || statusFilter === 'missed') && (
                          <div className="flex items-center gap-1 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                            <span className="text-muted-foreground">
                              {daySummary.statusBreakdown.missed} perdido
                            </span>
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

      {/* Modal com detalhes do dia (lazy loading) */}
      {selectedDay && (
        <DayDetailModalLazy
          day={selectedDay}
          open={selectedDay !== null}
          onClose={() => setSelectedDay(null)}
          onNavigate={handleNavigateDay}
          residentId={residentId}
          previousLabel="Dia anterior"
          nextLabel="Próximo dia"
        />
      )}
    </div>
  )
}
