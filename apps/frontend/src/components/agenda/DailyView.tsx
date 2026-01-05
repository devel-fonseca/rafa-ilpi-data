import { AgendaItem } from '@/types/agenda'
import { AgendaItemCard } from './AgendaItemCard'
import { Card } from '@/components/ui/card'

interface Props {
  items: AgendaItem[]
  isLoading?: boolean
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

export function DailyView({ items, isLoading }: Props) {
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

  // Combinar slots base (30min) + horários reais dos itens
  // Isso garante que horários como 06:50 também apareçam
  const allTimes = new Set([...baseTimeSlots, ...Object.keys(itemsByTime)])
  const timeSlots = Array.from(allTimes).sort()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Carregando agenda...</p>
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
  )
}
