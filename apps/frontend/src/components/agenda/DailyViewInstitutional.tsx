import { AgendaItem } from '@/types/agenda'
import { AgendaItemCard } from './AgendaItemCard'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  items: AgendaItem[]
  isLoading?: boolean
}

// Gerar apenas horários que têm itens agendados
const getRelevantTimeSlots = (items: AgendaItem[]) => {
  const times = new Set(items.map(item => item.scheduledTime))
  return Array.from(times).sort()
}

export function DailyViewInstitutional({ items, isLoading }: Props) {
  const [expandedTimes, setExpandedTimes] = useState<Set<string>>(new Set())
  const [showAllTimes, setShowAllTimes] = useState(false)

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

  // Agrupar por horário e depois por residente
  const itemsByTime = items.reduce(
    (acc, item) => {
      const time = item.scheduledTime || '00:00'
      if (!acc[time]) {
        acc[time] = {}
      }
      if (!acc[time][item.residentId]) {
        acc[time][item.residentId] = {
          residentName: item.residentName,
          items: [],
        }
      }
      acc[time][item.residentId].items.push(item)
      return acc
    },
    {} as Record<string, Record<string, { residentName: string; items: AgendaItem[] }>>,
  )

  const relevantTimes = showAllTimes
    ? getRelevantTimeSlots(items)
    : getRelevantTimeSlots(items).slice(0, 5)

  const toggleTimeExpansion = (time: string) => {
    const newExpanded = new Set(expandedTimes)
    if (newExpanded.has(time)) {
      newExpanded.delete(time)
    } else {
      newExpanded.add(time)
    }
    setExpandedTimes(newExpanded)
  }

  const totalHiddenTimes = getRelevantTimeSlots(items).length - 5

  return (
    <div className="space-y-3">
      {/* Estatísticas */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total de eventos:</span>{' '}
            <span className="font-semibold">{items.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Horários:</span>{' '}
            <span className="font-semibold">{getRelevantTimeSlots(items).length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Concluídos:</span>{' '}
            <span className="font-semibold text-success">
              {items.filter((i) => i.status === 'completed').length}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Pendentes:</span>{' '}
            <span className="font-semibold text-warning">
              {items.filter((i) => i.status === 'pending').length}
            </span>
          </div>
        </div>
      </Card>

      {/* Timeline agrupada */}
      {relevantTimes.map((time) => {
        const residentsAtTime = itemsByTime[time] || {}
        const residentIds = Object.keys(residentsAtTime)
        const totalItemsAtTime = residentIds.reduce(
          (sum, id) => sum + residentsAtTime[id].items.length,
          0,
        )
        const isExpanded = expandedTimes.has(time)

        return (
          <Card key={time} className="overflow-hidden">
            {/* Header do horário - sempre visível */}
            <button
              onClick={() => toggleTimeExpansion(time)}
              className="w-full p-4 hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary w-16">{time}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {residentIds.length} {residentIds.length === 1 ? 'residente' : 'residentes'}
                    </Badge>
                    <Badge variant="outline">
                      {totalItemsAtTime} {totalItemsAtTime === 1 ? 'item' : 'itens'}
                    </Badge>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* Preview compacto quando colapsado */}
              {!isExpanded && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {residentIds.slice(0, 3).map((residentId) => (
                    <span key={residentId} className="mr-2">
                      • {residentsAtTime[residentId].residentName}
                    </span>
                  ))}
                  {residentIds.length > 3 && (
                    <span className="text-xs">
                      +{residentIds.length - 3} mais
                    </span>
                  )}
                </div>
              )}
            </button>

            {/* Conteúdo expandido */}
            {isExpanded && (
              <div className="border-t bg-muted/30 p-4 space-y-4">
                {residentIds.map((residentId) => {
                  const { residentName, items: residentItems } = residentsAtTime[residentId]
                  return (
                    <div key={residentId} className="space-y-2">
                      <h4 className="font-semibold text-sm text-foreground">
                        👤 {residentName}
                      </h4>
                      <div className="space-y-2 pl-4">
                        {residentItems.map((item) => (
                          <AgendaItemCard key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}

      {/* Botão para mostrar mais horários */}
      {!showAllTimes && totalHiddenTimes > 0 && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setShowAllTimes(true)}>
            Mostrar mais {totalHiddenTimes} {totalHiddenTimes === 1 ? 'horário' : 'horários'}
          </Button>
        </div>
      )}

      {showAllTimes && getRelevantTimeSlots(items).length > 5 && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setShowAllTimes(false)}>
            Mostrar menos
          </Button>
        </div>
      )}
    </div>
  )
}
