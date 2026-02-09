import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AgendaItem, StatusFilterType } from '@/types/agenda'
import { AgendaItemCard } from './AgendaItemCard'

interface Props {
  day: Date
  items: AgendaItem[]
  isOpen: boolean
  onClose: () => void
  onNavigateDay: (direction: 'prev' | 'next') => void
  isToday?: boolean
  previousLabel?: string
  nextLabel?: string
}

export function DayDetailModal({
  day,
  items,
  isOpen,
  onClose,
  onNavigateDay,
  isToday,
  previousLabel = 'Dia anterior',
  nextLabel = 'Próximo dia',
}: Props) {
  const [localStatusFilter, setLocalStatusFilter] = useState<StatusFilterType>('all')

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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-2xl flex flex-col"
      >
        <SheetHeader className="p-6 pb-0">
          {/* Container flexível: navegação + info + filtros */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pr-8">
            {/* Navegação e informações do dia */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigateDay('prev')}
                className="h-8 w-8 shrink-0"
                title={previousLabel}
                aria-label={previousLabel}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {format(day, 'EEEE', { locale: ptBR })}
                  </span>
                  <span className="text-2xl font-bold">
                    {format(day, 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                  {isToday && (
                    <Badge variant="default" className="text-xs ml-2">
                      Hoje
                    </Badge>
                  )}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {items.length} {items.length === 1 ? 'item agendado' : 'itens agendados'}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigateDay('next')}
                className="h-8 w-8 shrink-0"
                title={nextLabel}
                aria-label={nextLabel}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Filtros - ao lado em desktop, embaixo em mobile */}
            <div className="flex flex-wrap gap-2 lg:items-start">
          <Badge
            variant="outline"
            className={`cursor-pointer transition-all ${
              localStatusFilter === 'all'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary'
                : 'hover:bg-accent'
            }`}
            onClick={() => setLocalStatusFilter('all')}
          >
            Todos ({items.length})
          </Badge>
          <Badge
            variant="outline"
            className={`cursor-pointer transition-all ${
              localStatusFilter === 'pending'
                ? 'bg-warning/60 text-white hover:bg-warning/70 border-warning/60'
                : 'bg-warning/10 text-warning/90 hover:bg-warning/20 border-warning/30'
            }`}
            onClick={() => setLocalStatusFilter('pending')}
          >
            {items.filter(i => i.status === 'pending').length} pendentes
          </Badge>
          <Badge
            variant="outline"
            className={`cursor-pointer transition-all ${
              localStatusFilter === 'completed'
                ? 'bg-success/60 text-white hover:bg-success/70 border-success/60'
                : 'bg-success/10 text-success/90 hover:bg-success/20 border-success/30'
            }`}
            onClick={() => setLocalStatusFilter('completed')}
          >
            {items.filter(i => i.status === 'completed').length} concluídos
          </Badge>
          <Badge
            variant="outline"
            className={`cursor-pointer transition-all ${
              localStatusFilter === 'missed'
                ? 'bg-danger/60 text-white hover:bg-danger/70 border-danger/60'
                : 'bg-danger/10 text-danger/90 hover:bg-danger/20 border-danger/30'
            }`}
            onClick={() => setLocalStatusFilter('missed')}
          >
            {items.filter(i => i.status === 'missed').length} perdidos
          </Badge>
            </div>
          </div>
        </SheetHeader>

        {/* Lista de itens */}
        <div className="flex-1 overflow-y-auto space-y-2 px-6 pr-8 mt-4">
          {sortedItems.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                {localStatusFilter === 'all'
                  ? 'Nenhum item agendado para este dia'
                  : `Nenhum item ${
                      localStatusFilter === 'pending' ? 'pendente' :
                      localStatusFilter === 'completed' ? 'concluído' :
                      localStatusFilter === 'missed' ? 'perdido' :
                      'cancelado'
                    } para este dia`}
              </p>
            </div>
          ) : (
            sortedItems.map(item => (
              <AgendaItemCard key={item.id} item={item} />
            ))
          )}
        </div>

        {/* Footer com ações */}
        <div className="flex items-center justify-between p-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Mostrando {sortedItems.length} de {items.length} itens
          </div>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
