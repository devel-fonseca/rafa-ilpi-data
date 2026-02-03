import { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { AgendaItem } from '@/types/agenda'
import { AgendaItemCard } from './AgendaItemCard'

interface Props {
  day: Date
  items: AgendaItem[]
  open: boolean
  onClose: () => void
}

/**
 * Modal de detalhes do dia para eventos institucionais
 *
 * Exibe todos os eventos institucionais de um dia específico
 */
export function DayDetailModalInstitutional({ day, items, open, onClose }: Props) {
  // Ordenar por horário
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const timeA = a.scheduledTime || '00:00'
      const timeB = b.scheduledTime || '00:00'
      return timeA.localeCompare(timeB)
    })
  }, [items])

  // Calcular estatísticas
  const stats = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      completed: items.filter(i => i.status === 'completed').length,
      missed: items.filter(i => i.status === 'missed').length,
    }
  }, [items])

  const today = new Date()
  const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex flex-col gap-4 pr-8">
            {/* Informações do dia */}
            <div>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {format(day, 'EEEE', { locale: ptBR })}
                </span>
                <span className="text-2xl font-bold">
                  {format(day, 'dd/MM/yyyy', { locale: ptBR })}
                </span>
                {isToday && (
                  <Badge variant="default" className="ml-2">
                    Hoje
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.total} {stats.total === 1 ? 'evento institucional' : 'eventos institucionais'}
              </p>
            </div>

            {/* Estatísticas */}
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
        </DialogHeader>

        {/* Lista de eventos (scrollable) */}
        <div className="flex-1 overflow-y-auto px-1">
          {sortedItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                Nenhum evento institucional agendado para este dia
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {sortedItems.map(item => (
                <AgendaItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
