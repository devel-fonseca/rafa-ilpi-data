import { useEffect, useMemo, useState } from 'react'
import { Loader2, Calendar, Clock, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDailyTasksByResident } from '@/hooks/useResidentSchedule'

interface DailyAppointmentsPanelProps {
  residentId: string | null
  selectedDate: string
  pageSize?: number
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  VACCINATION: 'Vacinação',
  CONSULTATION: 'Consulta',
  EXAM: 'Exame',
  PROCEDURE: 'Procedimento',
  OTHER: 'Outro',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  SCHEDULED: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'outline',
  MISSED: 'destructive',
}

export function DailyAppointmentsPanel({
  residentId,
  selectedDate,
  pageSize = 6,
}: DailyAppointmentsPanelProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const { data: tasks = [], isLoading } = useDailyTasksByResident(
    residentId,
    selectedDate,
    !!residentId,
  )

  const eventTasks = useMemo(
    () => tasks.filter((task) => task.type === 'EVENT'),
    [tasks],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [residentId, selectedDate, eventTasks.length, pageSize])

  if (!residentId) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (eventTasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Nenhum agendamento pontual para hoje</p>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(eventTasks.length / pageSize))
  const paginatedEventTasks = eventTasks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-success dark:text-success" />
        <h3 className="font-semibold text-sm">Agendamentos do Residente</h3>
        <Badge variant="secondary" className="ml-auto">
          {eventTasks.length}
        </Badge>
      </div>

      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
        {paginatedEventTasks.map((task, index) => (
          <div
            key={`event-${task.eventId}-${index}`}
            className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-medium">
                  {task.eventType && EVENT_TYPE_LABELS[task.eventType]}
                </Badge>
                {task.status && (
                  <Badge
                    variant={STATUS_VARIANTS[task.status] || 'default'}
                    className="text-xs"
                  >
                    {task.status === 'SCHEDULED' && 'Agendado'}
                    {task.status === 'COMPLETED' && 'Concluído'}
                    {task.status === 'CANCELLED' && 'Cancelado'}
                    {task.status === 'MISSED' && 'Perdido'}
                  </Badge>
                )}
              </div>

              {task.status === 'COMPLETED' && (
                <CheckCircle2 className="h-4 w-4 text-success dark:text-success" />
              )}
            </div>

            <p className="font-medium text-sm mb-1">{task.title}</p>

            {task.scheduledTime && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{task.scheduledTime}</span>
              </div>
            )}

            {task.description && (
              <p className="text-xs text-muted-foreground mt-2">{task.description}</p>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Mostrando {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, eventTasks.length)} de {eventTasks.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
