import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Syringe,
  Stethoscope,
  FlaskConical,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  Ban,
  FileText,
  GraduationCap,
  Users,
  ClipboardCheck,
  Wrench,
} from 'lucide-react'
import type { DailyTask } from '@/hooks/useResidentSchedule'

// ──────────────────────────────────────────────────────────────────────────
// ÍCONES POR TIPO DE EVENTO
// ──────────────────────────────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<
  string,
  { icon: typeof Syringe; label: string; color: string }
> = {
  // Eventos de residentes
  VACCINATION: {
    icon: Syringe,
    label: 'Vacinação',
    color: 'text-primary dark:text-primary/40',
  },
  CONSULTATION: {
    icon: Stethoscope,
    label: 'Consulta',
    color: 'text-success dark:text-success/40',
  },
  EXAM: {
    icon: FlaskConical,
    label: 'Exame',
    color: 'text-medication-controlled dark:text-medication-controlled/40',
  },
  PROCEDURE: {
    icon: Activity,
    label: 'Procedimento',
    color: 'text-severity-warning dark:text-severity-warning/40',
  },
  OTHER: {
    icon: Calendar,
    label: 'Outro',
    color: 'text-muted-foreground',
  },
  // Eventos institucionais
  DOCUMENT_EXPIRY: {
    icon: FileText,
    label: 'Vencimento de Documento',
    color: 'text-amber-600 dark:text-amber-400',
  },
  TRAINING: {
    icon: GraduationCap,
    label: 'Treinamento',
    color: 'text-blue-600 dark:text-blue-400',
  },
  MEETING: {
    icon: Users,
    label: 'Reunião',
    color: 'text-purple-600 dark:text-purple-400',
  },
  INSPECTION: {
    icon: ClipboardCheck,
    label: 'Inspeção',
    color: 'text-orange-600 dark:text-orange-400',
  },
  MAINTENANCE: {
    icon: Wrench,
    label: 'Manutenção',
    color: 'text-gray-600 dark:text-gray-400',
  },
}

// ──────────────────────────────────────────────────────────────────────────
// STATUS BADGES
// ──────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  {
    icon: typeof CheckCircle2
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  SCHEDULED: {
    icon: Clock,
    label: 'Agendado',
    variant: 'outline',
  },
  COMPLETED: {
    icon: CheckCircle2,
    label: 'Concluído',
    variant: 'secondary',
  },
  CANCELLED: {
    icon: XCircle,
    label: 'Cancelado',
    variant: 'destructive',
  },
  MISSED: {
    icon: Ban,
    label: 'Perdido',
    variant: 'destructive',
  },
}

// ──────────────────────────────────────────────────────────────────────────
// PROPS
// ──────────────────────────────────────────────────────────────────────────

interface Props {
  title: string
  events: DailyTask[]
  onViewResident: (residentId: string) => void
  isLoading?: boolean
}

// ──────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ──────────────────────────────────────────────────────────────────────────

export function EventsSection({
  title,
  events,
  onViewResident,
  isLoading,
}: Props) {
  // Ordenar por horário
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.scheduledTime) return 1
    if (!b.scheduledTime) return -1
    return a.scheduledTime.localeCompare(b.scheduledTime)
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Sem eventos agendados para hoje
        </span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {events.filter((e) => e.status === 'SCHEDULED').length} agendados de{' '}
          {events.length}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedEvents.map((event, index) => {
            const typeConfig =
              EVENT_TYPE_CONFIG[event.eventType || 'OTHER'] ||
              EVENT_TYPE_CONFIG.OTHER
            const TypeIcon = typeConfig.icon

            const statusConfig =
              STATUS_CONFIG[event.status || 'SCHEDULED'] ||
              STATUS_CONFIG.SCHEDULED
            const StatusIcon = statusConfig.icon

            return (
              <div
                key={`${event.eventId}-${index}`}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  event.status === 'COMPLETED'
                    ? 'bg-muted/50 border-border'
                    : event.status === 'CANCELLED'
                      ? 'bg-destructive/10 border-destructive/30'
                      : 'bg-card border-border hover:border-primary'
                }`}
              >
                {/* Left: Icon + Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                      event.status === 'COMPLETED'
                        ? 'bg-muted'
                        : event.status === 'CANCELLED'
                          ? 'bg-destructive/20'
                          : 'bg-muted/50'
                    }`}
                  >
                    <TypeIcon
                      className={`w-5 h-5 ${
                        event.status === 'COMPLETED'
                          ? 'text-muted-foreground'
                          : event.status === 'CANCELLED'
                            ? 'text-destructive'
                            : typeConfig.color
                      }`}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`font-medium ${
                          event.status === 'CANCELLED'
                            ? 'text-muted-foreground line-through'
                            : 'text-foreground'
                        }`}
                      >
                        {typeConfig.label}
                      </span>
                      <Badge variant={statusConfig.variant} className="text-xs">
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    <p className="text-sm font-medium text-foreground mb-1">
                      {event.title}
                    </p>

                    <p className="text-sm text-muted-foreground mb-2">
                      {event.residentName}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {event.scheduledTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Horário: {event.scheduledTime}
                        </span>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Action - Apenas para eventos de residentes */}
                {event.residentId && (
                  <div className="ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewResident(event.residentId)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Residente
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
