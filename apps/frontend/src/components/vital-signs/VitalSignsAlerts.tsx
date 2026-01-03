import { useState, useMemo } from 'react'
import { formatDateTimeSafe } from '@/utils/dateHelpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  Activity,
  Thermometer,
  Heart,
  Droplet,
  TrendingUp,
  Bell,
  Edit,
  Loader2,
} from 'lucide-react'
import { useActiveAlertsByResident } from '@/hooks/useVitalSignAlerts'
import { ManageAlertDialog } from './ManageAlertDialog'
import type { VitalSignAlert } from '@/api/vitalSignAlerts.api'
import { AlertStatus, AlertSeverity, VitalSignAlertType } from '@/api/vitalSignAlerts.api'

interface VitalSignsAlertsProps {
  residentId: string
}

export function VitalSignsAlerts({ residentId }: VitalSignsAlertsProps) {
  const [selectedAlert, setSelectedAlert] = useState<VitalSignAlert | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<'all' | AlertSeverity>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'in_treatment' | 'monitoring' | 'resolved' | 'ignored'>('all')

  // Buscar alertas ativos do residente
  const {
    data: alerts = [],
    isLoading,
    error,
  } = useActiveAlertsByResident(residentId)

  // Filtrar alertas
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false
      if (filterStatus === 'active' && alert.status !== AlertStatus.ACTIVE) return false
      if (filterStatus === 'in_treatment' && alert.status !== AlertStatus.IN_TREATMENT) return false
      if (filterStatus === 'monitoring' && alert.status !== AlertStatus.MONITORING) return false
      if (filterStatus === 'resolved' && alert.status !== AlertStatus.RESOLVED) return false
      if (filterStatus === 'ignored' && alert.status !== AlertStatus.IGNORED) return false
      return true
    })
  }, [alerts, filterSeverity, filterStatus])

  // Agrupar alertas por severidade
  const alertsBySeverity = useMemo(() => {
    return {
      critical: filteredAlerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length,
      warning: filteredAlerts.filter((a) => a.severity === AlertSeverity.WARNING).length,
      info: filteredAlerts.filter((a) => a.severity === AlertSeverity.INFO).length,
    }
  }, [filteredAlerts])

  // Ícone por tipo
  const getIcon = (type: VitalSignAlertType) => {
    switch (type) {
      case VitalSignAlertType.PRESSURE_HIGH:
      case VitalSignAlertType.PRESSURE_LOW:
        return <Activity className="h-4 w-4" />
      case VitalSignAlertType.TEMPERATURE_HIGH:
      case VitalSignAlertType.TEMPERATURE_LOW:
        return <Thermometer className="h-4 w-4" />
      case VitalSignAlertType.HEART_RATE_HIGH:
      case VitalSignAlertType.HEART_RATE_LOW:
        return <Heart className="h-4 w-4" />
      case VitalSignAlertType.OXYGEN_LOW:
        return <Droplet className="h-4 w-4" />
      case VitalSignAlertType.GLUCOSE_HIGH:
      case VitalSignAlertType.GLUCOSE_LOW:
        return <TrendingUp className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  // Cor por severidade
  const getSeverityVariant = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'destructive'
      case AlertSeverity.WARNING:
        return 'warning'
      case AlertSeverity.INFO:
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getSeverityLabel = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'Crítico'
      case AlertSeverity.WARNING:
        return 'Atenção'
      case AlertSeverity.INFO:
        return 'Info'
      default:
        return severity
    }
  }

  const getStatusLabel = (status: AlertStatus) => {
    switch (status) {
      case AlertStatus.ACTIVE:
        return 'Ativo'
      case AlertStatus.IN_TREATMENT:
        return 'Em Tratamento'
      case AlertStatus.MONITORING:
        return 'Monitorando'
      case AlertStatus.RESOLVED:
        return 'Resolvido'
      case AlertStatus.IGNORED:
        return 'Ignorado'
      default:
        return status
    }
  }

  const handleManageAlert = (alert: VitalSignAlert) => {
    setSelectedAlert(alert)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando alertas...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar alertas</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os alertas médicos. Tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAlerts.length}</div>
            <p className="text-xs text-muted-foreground">ativos ou em tratamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Severidade Crítica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{alertsBySeverity.critical}</div>
            <p className="text-xs text-muted-foreground">requerem atenção imediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Severidade Atenção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{alertsBySeverity.warning}</div>
            <p className="text-xs text-muted-foreground">monitoramento necessário</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Informativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{alertsBySeverity.info}</div>
            <p className="text-xs text-muted-foreground">observação</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select
          value={filterSeverity}
          onValueChange={(value: any) => setFilterSeverity(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Severidades</SelectItem>
            <SelectItem value={AlertSeverity.CRITICAL}>Crítico</SelectItem>
            <SelectItem value={AlertSeverity.WARNING}>Atenção</SelectItem>
            <SelectItem value={AlertSeverity.INFO}>Info</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterStatus}
          onValueChange={(value: any) => setFilterStatus(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="in_treatment">Em Tratamento</SelectItem>
            <SelectItem value="monitoring">Monitorando</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="ignored">Ignorados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertTitle>Sem alertas</AlertTitle>
            <AlertDescription>
              Não há alertas médicos para este residente no momento.
            </AlertDescription>
          </Alert>
        ) : (
          filteredAlerts.map((alert) => (
            <Alert key={alert.id} className="relative">
              <div className="flex items-start gap-4">
                <div className="mt-1">{getIcon(alert.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <AlertTitle className="mb-0">{alert.title}</AlertTitle>
                    <Badge variant={getSeverityVariant(alert.severity)}>
                      {getSeverityLabel(alert.severity)}
                    </Badge>
                    <Badge variant="outline">{alert.value}</Badge>
                    <Badge
                      variant={
                        alert.status === AlertStatus.RESOLVED
                          ? 'secondary'
                          : alert.status === AlertStatus.IN_TREATMENT
                            ? 'default'
                            : 'outline'
                      }
                    >
                      {getStatusLabel(alert.status)}
                    </Badge>
                    {alert.priority >= 4 && (
                      <Badge variant="destructive" className="text-xs">
                        Prioridade {alert.priority}
                      </Badge>
                    )}
                  </div>
                  <AlertDescription className="mb-2">
                    {alert.description}
                  </AlertDescription>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDateTimeSafe(alert.createdAt)}
                      </p>
                      {alert.assignedUser && (
                        <p className="text-xs text-muted-foreground">
                          Atribuído para: <strong>{alert.assignedUser.name}</strong>
                        </p>
                      )}
                      {alert.clinicalNotes && alert.clinicalNotes.length > 0 && (
                        <p className="text-xs text-blue-600">
                          📋 {alert.clinicalNotes.length} evolução(ões) vinculada(s)
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleManageAlert(alert)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Gerenciar
                    </Button>
                  </div>
                  {alert.medicalNotes && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <strong>Notas Médicas:</strong> {alert.medicalNotes}
                    </div>
                  )}
                  {alert.actionTaken && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                      <strong>Ações Tomadas:</strong> {alert.actionTaken}
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          ))
        )}
      </div>

      {/* Modal de Gerenciamento de Alerta */}
      <ManageAlertDialog
        alert={selectedAlert}
        open={!!selectedAlert}
        onOpenChange={(open) => {
          if (!open) setSelectedAlert(null)
        }}
      />
    </div>
  )
}
