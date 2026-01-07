import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface RecordCalendarProps {
  datesWithRecords: string[] // Array de datas em formato YYYY-MM-DD
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onMonthChange?: (year: number, month: number) => void // Notificar mudança de mês
  isLoading?: boolean
}

export function RecordCalendar({
  datesWithRecords,
  selectedDate,
  onDateSelect,
  onMonthChange,
  isLoading = false,
}: RecordCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Preencher com dias do mês anterior
  const firstDayOfWeek = monthStart.getDay()
  const daysFromPrevMonth = Array(firstDayOfWeek)
    .fill(null)
    .map((_, i) => new Date(monthStart.getTime() - (firstDayOfWeek - i) * 24 * 60 * 60 * 1000))

  // Preencher com dias do mês seguinte
  const lastDayOfWeek = monthEnd.getDay()
  const daysFromNextMonth = Array(6 - lastDayOfWeek)
    .fill(null)
    .map((_, i) => new Date(monthEnd.getTime() + (i + 1) * 24 * 60 * 60 * 1000))

  const allDays = [...daysFromPrevMonth, ...daysInMonth, ...daysFromNextMonth]
  const weeks = []
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7))
  }

  const hasRecord = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return datesWithRecords.includes(dateStr)
  }

  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth.getFullYear(), newMonth.getMonth() + 1)
  }

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth.getFullYear(), newMonth.getMonth() + 1)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    onMonthChange?.(today.getFullYear(), today.getMonth() + 1)
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="h-8 px-2 text-xs"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Cabeçalho com dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do calendário */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day) => {
                    const isCurrentMonth = isSameMonth(day, currentMonth)
                    const isSelected = isSameDay(day, selectedDate)
                    const isTodayDate = isToday(day)
                    const hasRecordToday = hasRecord(day)

                    return (
                      <button
                        key={day.toString()}
                        onClick={() => onDateSelect(day)}
                        className={`
                          relative p-2 text-sm rounded-lg transition-all
                          ${isCurrentMonth ? 'opacity-100' : 'opacity-40'}
                          ${isSelected ? 'ring-2 ring-blue-500' : ''}
                          ${hasRecordToday && isCurrentMonth
                            ? 'bg-success/20 hover:bg-green-300 font-semibold'
                            : 'bg-muted hover:bg-muted/20'
                          }
                          ${isSelected && 'ring-2 ring-offset-2 ring-blue-500'}
                          ${isTodayDate && isCurrentMonth ? 'border border-primary/40' : ''}
                        `}
                      >
                        <span>{format(day, 'd')}</span>
                        {hasRecordToday && isCurrentMonth && (
                          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-success/60 rounded-full" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Legenda */}
            <div className="mt-4 pt-3 border-t space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success/20 rounded" />
                <span>Tem registros</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-muted rounded" />
                <span>Sem registros</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
