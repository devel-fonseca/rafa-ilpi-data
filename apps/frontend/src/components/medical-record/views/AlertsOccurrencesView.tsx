import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Clock3, Edit, FileWarning, HeartPulse } from 'lucide-react'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { AlertSeverity, AlertStatus } from '@/api/vitalSignAlerts.api'
import { useResidentAlertsOccurrences } from '@/hooks/useResidentAlertsOccurrences'
import { canManageVitalSignAlerts } from '@/hooks/useVitalSignAlerts'
import { useAuthStore } from '@/stores/auth.store'
import { ManageAlertDialog } from '@/components/vital-signs/ManageAlertDialog'
import type { AlertsOccurrencesViewProps } from '../types'

type EventFilter = 'all' | 'vital-alerts' | 'intercorrencias'

const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  [AlertStatus.ACTIVE]: 'Ativo',
  [AlertStatus.IN_TREATMENT]: 'Em tratamento',
  [AlertStatus.MONITORING]: 'Monitorando',
  [AlertStatus.RESOLVED]: 'Resolvido',
  [AlertStatus.IGNORED]: 'Ignorado',
}

const ALERT_SEVERITY_VARIANTS: Record<AlertSeverity, 'danger' | 'warning' | 'secondary'> = {
  [AlertSeverity.CRITICAL]: 'danger',
  [AlertSeverity.WARNING]: 'warning',
  [AlertSeverity.INFO]: 'secondary',
}

const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  [AlertSeverity.CRITICAL]: 'Crítico',
  [AlertSeverity.WARNING]: 'Atenção',
  [AlertSeverity.INFO]: 'Informativo',
}

export function AlertsOccurrencesView({
  residentId,
  onVitalSignsClick,
  canLoadVitalSignAlerts,
  onOpenIncidentManagement,
}: AlertsOccurrencesViewProps) {
  const [filter, setFilter] = useState<EventFilter>('all')
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const user = useAuthStore((state) => state.user)
  const canManageAlerts = canManageVitalSignAlerts(user)

  const { events, stats, isLoading, vitalAlerts } = useResidentAlertsOccurrences({
    residentId,
    enableVitalAlerts: canLoadVitalSignAlerts,
    vitalAlertsLimit: 100,
    intercurrenciasLimit: 100,
  })

  const selectedAlert = useMemo(() => {
    if (!selectedAlertId) return null
    return vitalAlerts.find((alert) => alert.id === selectedAlertId) ?? null
  }, [selectedAlertId, vitalAlerts])

  const filteredEvents = useMemo(() => {
    switch (filter) {
      case 'vital-alerts':
        return events.filter((event) => event.source === 'VITAL_ALERT')
      case 'intercorrencias':
        return events.filter((event) => event.source === 'INTERCORRENCIA')
      case 'all':
      default:
        return events
    }
  }, [events, filter])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Eventos Clínicos
              </h3>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                <FileWarning className="h-5 w-5 text-foreground" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-3xl font-bold leading-none">{stats.totalEvents}</p>
            </div>
            <div className="mt-auto pt-2 border-t">
              <p className="text-xs text-muted-foreground">Alertas + intercorrências</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Alertas de Sinais Vitais
              </h3>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-danger/10">
                <HeartPulse className="h-5 w-5 text-danger" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-3xl font-bold leading-none text-danger">{stats.vitalAlertsActive}</p>
              <span className="text-sm text-muted-foreground">ativos</span>
            </div>
            <div className="mt-auto pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {canLoadVitalSignAlerts
                  ? `${stats.vitalAlertsCriticalOrWarning} em nível crítico/atenção`
                  : 'Módulo de sinais vitais indisponível no plano'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Intercorrências
              </h3>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-3xl font-bold leading-none text-warning">{stats.intercurrenciasTotal}</p>
            </div>
            <div className="mt-auto pt-2 border-t">
              <p className="text-xs text-muted-foreground">Registros de intercorrência do residente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todos
        </Button>
        <Button
          variant={filter === 'vital-alerts' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('vital-alerts')}
          disabled={!canLoadVitalSignAlerts}
        >
          Alertas de sinais vitais
        </Button>
        <Button
          variant={filter === 'intercorrencias' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('intercorrencias')}
        >
          Intercorrências
        </Button>
        {onOpenIncidentManagement && (
          <Button variant="outline" size="sm" onClick={onOpenIncidentManagement}>
            Gerenciar intercorrências
          </Button>
        )}
        {canLoadVitalSignAlerts && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={onVitalSignsClick}>
            Ver Sinais Vitais
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Carregando alertas e intercorrências...
            </CardContent>
          </Card>
        ) : filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground italic">
              Nenhum evento encontrado para o filtro selecionado.
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={event.source === 'VITAL_ALERT' ? 'danger' : 'warning'}>
                        {event.source === 'VITAL_ALERT' ? 'Alerta vital' : 'Intercorrência'}
                      </Badge>
                      {event.severity && (
                        <Badge variant={ALERT_SEVERITY_VARIANTS[event.severity]}>
                          {ALERT_SEVERITY_LABELS[event.severity]}
                        </Badge>
                      )}
                      {event.status && (
                        <Badge variant="outline">
                          {ALERT_STATUS_LABELS[event.status]}
                        </Badge>
                      )}
                      {event.value && (
                        <Badge variant="outline">{event.value}</Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDateTimeSafe(event.timestamp)}
                  </div>
                </div>
                {event.recordedBy && (
                  <p className="text-xs text-muted-foreground">Registrado por {event.recordedBy}</p>
                )}
                {event.source === 'VITAL_ALERT' && event.alertId && canManageAlerts && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAlertId(event.alertId || null)}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Gerenciar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <ManageAlertDialog
        alert={selectedAlert}
        open={!!selectedAlertId}
        onOpenChange={(open) => {
          if (!open) setSelectedAlertId(null)
        }}
      />
    </div>
  )
}
