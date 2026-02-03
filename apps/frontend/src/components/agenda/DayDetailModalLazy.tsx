import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusFilterType } from '@/types/agenda'
import { AgendaItemCard } from './AgendaItemCard'
import { useAgendaItems } from '@/hooks/useAgenda'
import { LoadingSpinner } from '@/design-system/components'

interface Props {
  day: Date
  open: boolean
  onClose: () => void
  onNavigate: (direction: 'prev' | 'next') => void
  residentId?: string | null
}

/**
 * Modal de detalhes do dia com lazy loading
 *
 * Carrega itens da agenda apenas quando o modal é aberto
 * Usado em conjunto com MonthlyViewOptimized
 */
export function DayDetailModalLazy({ day, open, onClose, onNavigate, residentId }: Props) {
  const [localStatusFilter, setLocalStatusFilter] = useState<StatusFilterType>('all')

  // Carregar itens do dia específico (lazy loading)
  const { data: items = [], isLoading } = useAgendaItems({
    viewType: 'daily',
    selectedDate: day,
    residentId,
    statusFilter: 'all', // Carregar todos para aplicar filtro localmente
  })

  // Filtrar itens por status local
  const filteredItems = useMemo(() => {
    if (localStatusFilter === 'all') return items

    return items.filter(item => {
      switch (localStatusFilter) {
        case 'pending':
          return item.status === 'pending'
        case 'completed':
          return item.status === 'completed'
        case 'missed':
          return item.status === 'missed'
        case 'cancelled':
          return item.status === 'cancelled'
        default:
          return true
      }
    })
  }, [items, localStatusFilter])

  // Ordenar por horário
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const timeA = a.scheduledTime || '00:00'
      const timeB = b.scheduledTime || '00:00'
      return timeA.localeCompare(timeB)
    })
  }, [filteredItems])

  const today = new Date()
  const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          {/* Container flexível: navegação + info + filtros */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pr-8">
            {/* Navegação e informações do dia */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate('prev')}
                className="h-8 w-8 shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

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
                  {items.length} {items.length === 1 ? 'item agendado' : 'itens agendados'}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate('next')}
                className="h-8 w-8 shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Filtros de status */}
            <div className="flex flex-wrap gap-2 lg:mt-2">
              <Badge
                variant={localStatusFilter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setLocalStatusFilter('all')}
              >
                Todos ({items.length})
              </Badge>
              <Badge
                variant={localStatusFilter === 'pending' ? 'default' : 'outline'}
                className={`cursor-pointer ${
                  localStatusFilter === 'pending'
                    ? 'bg-warning hover:bg-warning/80'
                    : 'text-warning/90 hover:bg-warning/10'
                }`}
                onClick={() => setLocalStatusFilter('pending')}
              >
                Pendentes ({items.filter(i => i.status === 'pending').length})
              </Badge>
              <Badge
                variant={localStatusFilter === 'completed' ? 'default' : 'outline'}
                className={`cursor-pointer ${
                  localStatusFilter === 'completed'
                    ? 'bg-success hover:bg-success/80'
                    : 'text-success/90 hover:bg-success/10'
                }`}
                onClick={() => setLocalStatusFilter('completed')}
              >
                Concluídos ({items.filter(i => i.status === 'completed').length})
              </Badge>
              <Badge
                variant={localStatusFilter === 'missed' ? 'default' : 'outline'}
                className={`cursor-pointer ${
                  localStatusFilter === 'missed'
                    ? 'bg-danger hover:bg-danger/80'
                    : 'text-danger/90 hover:bg-danger/10'
                }`}
                onClick={() => setLocalStatusFilter('missed')}
              >
                Perdidos ({items.filter(i => i.status === 'missed').length})
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Lista de itens (scrollable) */}
        <div className="flex-1 overflow-y-auto px-1">
          {isLoading ? (
            <LoadingSpinner message="Carregando itens do dia, aguarde..." />
          ) : sortedItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                {localStatusFilter === 'all'
                  ? 'Nenhum item agendado para este dia'
                  : `Nenhum item ${localStatusFilter === 'pending' ? 'pendente' : localStatusFilter === 'completed' ? 'concluído' : 'perdido'}`}
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
