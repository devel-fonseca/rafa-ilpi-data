import { AgendaItem } from '@/types/agenda'
import { AgendaItemCard } from './AgendaItemCard'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusFilterType } from '@/types/agenda'
import { useMemo, useState } from 'react'

interface Props {
  items: AgendaItem[]
  isLoading?: boolean
  statusFilter?: StatusFilterType
  onStatusFilterChange?: (filter: StatusFilterType) => void
}

// Gerar slots de horário de 00:00 às 23:30 (intervalos de 30min)
const generateTimeSlots = () => {
  const slots: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(time)
    }
  }
  return slots
}

export function DailyView({
  items,
  isLoading,
  statusFilter,
  onStatusFilterChange,
}: Props) {
  const [showEmptyTimes, setShowEmptyTimes] = useState(false)
  const baseTimeSlots = generateTimeSlots()

  // Agrupar itens por horário
  const itemsByTime = items.reduce(
    (acc, item) => {
      const time = item.scheduledTime || '00:00'
      if (!acc[time]) {
        acc[time] = []
      }
      acc[time].push(item)
      return acc
    },
    {} as Record<string, AgendaItem[]>,
  )

  const relevantTimeSlots = useMemo(
    () => Object.keys(itemsByTime).sort(),
    [itemsByTime],
  )

  // Exibe apenas horários com itens por padrão para reduzir ruído.
  // Quando solicitado, mostra grade completa de 30 min + horários não padronizados.
  const timeSlots = useMemo(() => {
    if (!showEmptyTimes) {
      return relevantTimeSlots
    }
    const allTimes = new Set([...baseTimeSlots, ...relevantTimeSlots])
    return Array.from(allTimes).sort()
  }, [baseTimeSlots, relevantTimeSlots, showEmptyTimes])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando agenda, aguarde...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Nenhum item agendado para este dia.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-warning/10 text-warning/90 border-warning/30">
              {items.filter((i) => i.status === 'pending').length} pendentes
            </Badge>
            <Badge variant="outline" className="bg-success/10 text-success/90 border-success/30">
              {items.filter((i) => i.status === 'completed').length} concluídos
            </Badge>
            <Badge variant="outline" className="bg-danger/10 text-danger/90 border-danger/30">
              {items.filter((i) => i.status === 'missed').length} perdidos
            </Badge>
            <Badge variant="secondary">
              {relevantTimeSlots.length} horários ativos
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => onStatusFilterChange?.(statusFilter === 'pending' ? 'all' : 'pending')}
            >
              Só pendentes
            </Button>
            <Button
              size="sm"
              variant={showEmptyTimes ? 'default' : 'outline'}
              onClick={() => setShowEmptyTimes((prev) => !prev)}
            >
              {showEmptyTimes ? 'Ocultar vazios' : 'Mostrar vazios'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-1">
      {timeSlots.map((time) => {
        const timeItems = itemsByTime[time] || []
        const hasItems = timeItems.length > 0

        return (
          <div key={time} className="flex gap-3">
            {/* Coluna de horário */}
            <div className="w-16 shrink-0 text-right">
              <span
                className={`text-sm ${
                  hasItems
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground font-normal'
                }`}
              >
                {time}
              </span>
            </div>

            {/* Coluna de conteúdo */}
            <div className="flex-1 min-h-[2rem] border-l-2 border-border pl-4">
              {hasItems && (
                <div className="space-y-2 pb-2">
                  {timeItems.map((item) => (
                    <AgendaItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
