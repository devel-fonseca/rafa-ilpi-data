import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { endOfDay, format, startOfDay, subDays } from 'date-fns'
import { Page, PageHeader } from '@/design-system/components'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'
import { useResident } from '@/hooks/useResidents'
import { ManageAlertDialog } from '@/components/vital-signs/ManageAlertDialog'
import { canManageVitalSignAlerts, useVitalSignAlerts } from '@/hooks/useVitalSignAlerts'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { useAuthStore } from '@/stores/auth.store'
import { formatDateOnlySafe, formatDateTimeSafe } from '@/utils/dateHelpers'
import type { DailyRecord } from '@/api/dailyRecords.api'
import {
  IncidentCategory,
  IncidentSeverity,
  INCIDENT_CATEGORY_LABELS,
  INCIDENT_SEVERITY_LABELS,
  getSubtypeLabel,
} from '@/types/incidents'
import {
  AlertTriangle,
  Trash2,
  RotateCw,
  Siren,
  ShieldAlert,
  SquarePen,
} from 'lucide-react'
import { DeleteDailyRecordModal } from '@/components/modals/DeleteDailyRecordModal'
import type { VitalSignAlert } from '@/api/vitalSignAlerts.api'
import { AlertStatus } from '@/api/vitalSignAlerts.api'

type IncidentRecord = DailyRecord & {
  incidentCategory?: IncidentCategory | null
  incidentSeverity?: IncidentSeverity | null
  incidentSubtypeClinical?: string | null
  incidentSubtypeAssist?: string | null
  incidentSubtypeAdmin?: string | null
  isEventoSentinela?: boolean | null
}

type SeverityFilter = 'all' | IncidentSeverity
type OriginFilter = 'all' | 'automatic' | 'manual'

const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '15', label: 'Últimos 15 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
] as const

function isAutomaticIncident(record: IncidentRecord): boolean {
  const data = (record.data ?? {}) as Record<string, unknown>
  if (data.deteccaoAutomatica === true) {
    return true
  }

  return record.recordedBy?.includes('(Detecção Automática)') ?? false
}

function getIncidentSubtypeLabel(record: IncidentRecord): string | null {
  const subtype =
    record.incidentSubtypeClinical ||
    record.incidentSubtypeAssist ||
    record.incidentSubtypeAdmin

  if (!subtype) {
    return null
  }

  const label = getSubtypeLabel(record.incidentCategory, subtype)
  return label.replace(/^🚨\s*/u, '')
}

function getIncidentDescription(record: IncidentRecord): string {
  const data = (record.data ?? {}) as Record<string, unknown>
  return (
    (typeof data.descricao === 'string' && data.descricao.trim()) ||
    (typeof data.observacoes === 'string' && data.observacoes.trim()) ||
    (typeof record.notes === 'string' && record.notes.trim()) ||
    'Intercorrência registrada'
  )
}

function getIncidentAction(record: IncidentRecord): string | null {
  const data = (record.data ?? {}) as Record<string, unknown>
  return (
    (typeof data.acaoTomada === 'string' && data.acaoTomada.trim()) ||
    (typeof data.providenciaTomada === 'string' && data.providenciaTomada.trim()) ||
    null
  )
}

function severityVariant(severity: IncidentSeverity | null | undefined): 'secondary' | 'warning' | 'danger' {
  if (severity === IncidentSeverity.LEVE) return 'secondary'
  if (severity === IncidentSeverity.MODERADA) return 'warning'
  return 'danger'
}

function getLinkedAlertId(record: IncidentRecord): string | null {
  const data = (record.data ?? {}) as Record<string, unknown>
  const alertId = data.alertaVitalId
  return typeof alertId === 'string' && alertId.trim().length > 0 ? alertId : null
}

function isAlertConvertedToIncident(alert: VitalSignAlert): boolean {
  const metadata = (alert.metadata ?? {}) as Record<string, unknown>
  const decision = metadata.incidentDecision
  const hasIncidentRecordId =
    typeof metadata.incidentRecordId === 'string' && metadata.incidentRecordId.trim().length > 0

  return decision === 'CONFIRMED' || hasIncidentRecordId
}

function normalizeAlertForIncidentManagement(alert: VitalSignAlert | null): VitalSignAlert | null {
  if (!alert) return null

  if (isAlertConvertedToIncident(alert) && alert.status === AlertStatus.RESOLVED) {
    return {
      ...alert,
      status: AlertStatus.ACTIVE,
    }
  }

  return alert
}

export default function ResidentIncidentsPage() {
  const { residentId } = useParams<{ residentId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all')

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<IncidentRecord | null>(null)

  const { data: resident, isLoading: isLoadingResident } = useResident(residentId || '')
  const { data: alertsResponse } = useVitalSignAlerts({
    residentId: residentId || '',
    page: 1,
    limit: 100,
  })
  const allResidentAlerts = useMemo(() => alertsResponse?.data ?? [], [alertsResponse?.data])

  const { hasPermission } = usePermissions()
  const canManageAlerts = canManageVitalSignAlerts(user)
  const canDeleteRecords = hasPermission(PermissionType.DELETE_DAILY_RECORDS)
  const alertsById = useMemo(() => {
    const entries = allResidentAlerts.map((alert) => [alert.id, alert] as const)
    return new Map<string, VitalSignAlert>(entries)
  }, [allResidentAlerts])
  const selectedAlert = normalizeAlertForIncidentManagement(
    selectedAlertId ? alertsById.get(selectedAlertId) ?? null : null,
  )

  const { data: incidents = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: tenantKey('resident-incidents', residentId, selectedPeriod),
    enabled: !!residentId,
    queryFn: async (): Promise<IncidentRecord[]> => {
      const endDate = endOfDay(new Date())
      const startDate = startOfDay(subDays(new Date(), Number(selectedPeriod)))

      const response = await api.get('/daily-records', {
        params: {
          residentId,
          type: 'INTERCORRENCIA',
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          page: '1',
          limit: '200',
          sortBy: 'date',
          sortOrder: 'desc',
        },
      })

      const payload = response.data as { data?: IncidentRecord[] } | IncidentRecord[]
      if (Array.isArray(payload)) {
        return payload
      }

      return Array.isArray(payload.data) ? payload.data : []
    },
  })

  const filteredIncidents = useMemo(() => {
    return incidents.filter((record) => {
      if (severityFilter !== 'all' && record.incidentSeverity !== severityFilter) {
        return false
      }

      if (originFilter !== 'all') {
        const automatic = isAutomaticIncident(record)
        if (originFilter === 'automatic' && !automatic) {
          return false
        }
        if (originFilter === 'manual' && automatic) {
          return false
        }
      }

      return true
    })
  }, [incidents, originFilter, severityFilter])

  const stats = useMemo(() => {
    const automatic = incidents.filter((record) => isAutomaticIncident(record)).length
    const sentinel = incidents.filter((record) => record.isEventoSentinela).length
    const criticalOrSevere = incidents.filter(
      (record) =>
        record.incidentSeverity === IncidentSeverity.GRAVE ||
        record.incidentSeverity === IncidentSeverity.CRITICA,
    ).length

    return {
      total: incidents.length,
      automatic,
      manual: Math.max(incidents.length - automatic, 0),
      sentinel,
      criticalOrSevere,
    }
  }, [incidents])

  const handleDeleteRecord = (record: IncidentRecord) => {
    setDeletingRecord(record)
    setDeleteModalOpen(true)
  }

  const handleManageRecord = (record: IncidentRecord) => {
    const alertId = getLinkedAlertId(record)
    if (!alertId) return
    setSelectedAlertId(alertId)
  }

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false)
    setDeletingRecord(null)
    queryClient.invalidateQueries({ queryKey: tenantKey('resident-incidents') })
    queryClient.invalidateQueries({ queryKey: tenantKey('daily-records') })
  }

  if (isLoadingResident || !resident) {
    return (
      <Page maxWidth="wide">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Page>
    )
  }

  return (
    <Page maxWidth="wide">
      <PageHeader
        title={`Intercorrências - ${resident.fullName}`}
        subtitle="Gestão de intercorrências clínicas, assistenciais e administrativas"
        backButton={{
          onClick: () => navigate(`/dashboard/residentes/${residentId}`),
        }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/dashboard/residentes/${residentId}?section=alerts-occurrences`)
              }
            >
              <Siren className="h-4 w-4 mr-2" />
              Linha do tempo
            </Button>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RotateCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">No período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Automáticas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-warning">{stats.automatic}</p>
              <p className="text-xs text-muted-foreground">Detecção automática</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Manuais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{stats.manual}</p>
              <p className="text-xs text-muted-foreground">Registradas pela equipe</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Graves/Críticas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-danger">{stats.criticalOrSevere}</p>
              <p className="text-xs text-muted-foreground">Prioridade alta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sentinela</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-danger">{stats.sentinel}</p>
              <p className="text-xs text-muted-foreground">Exigem protocolo</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full lg:w-[220px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as SeverityFilter)}>
            <SelectTrigger className="w-full lg:w-[220px]">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as severidades</SelectItem>
              <SelectItem value={IncidentSeverity.LEVE}>Leve</SelectItem>
              <SelectItem value={IncidentSeverity.MODERADA}>Moderada</SelectItem>
              <SelectItem value={IncidentSeverity.GRAVE}>Grave</SelectItem>
              <SelectItem value={IncidentSeverity.CRITICA}>Crítica</SelectItem>
            </SelectContent>
          </Select>

          <Select value={originFilter} onValueChange={(value) => setOriginFilter(value as OriginFilter)}>
            <SelectTrigger className="w-full lg:w-[220px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="manual">Registro manual</SelectItem>
              <SelectItem value="automatic">Detecção automática</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Carregando intercorrências...
            </CardContent>
          </Card>
        ) : filteredIncidents.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhuma intercorrência encontrada para os filtros selecionados.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredIncidents.map((record) => {
              const automatic = isAutomaticIncident(record)
              const subtypeLabel = getIncidentSubtypeLabel(record)
              const description = getIncidentDescription(record)
              const actionTaken = getIncidentAction(record)

              return (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {formatDateOnlySafe(record.date)} • {record.time}
                        </Badge>
                        {record.incidentCategory && (
                          <Badge variant="info">
                            {INCIDENT_CATEGORY_LABELS[record.incidentCategory]}
                          </Badge>
                        )}
                        {record.incidentSeverity && (
                          <Badge variant={severityVariant(record.incidentSeverity)}>
                            {INCIDENT_SEVERITY_LABELS[record.incidentSeverity]}
                          </Badge>
                        )}
                        {subtypeLabel && <Badge variant="warning">{subtypeLabel}</Badge>}
                        {automatic ? (
                          <Badge variant="secondary">Detecção automática</Badge>
                        ) : (
                          <Badge variant="secondary">Registro manual</Badge>
                        )}
                        {record.isEventoSentinela && (
                          <Badge variant="danger">
                            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                            Evento sentinela
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium">{description}</p>
                        {actionTaken && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Ação tomada:</span>{' '}
                            {actionTaken}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Registrado por {record.recordedBy}</span>
                          <span>•</span>
                          <span>{formatDateTimeSafe(record.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {canManageAlerts && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManageRecord(record)}
                              disabled={!getLinkedAlertId(record)}
                              title={
                                getLinkedAlertId(record)
                                  ? 'Gerenciar alerta vinculado à intercorrência'
                                  : 'Sem alerta vital vinculado'
                              }
                            >
                              <SquarePen className="h-3.5 w-3.5 mr-1" />
                              Gerenciar
                            </Button>
                          )}
                          {canDeleteRecords && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-danger hover:text-danger"
                              onClick={() => handleDeleteRecord(record)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Excluir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <DeleteDailyRecordModal
        record={deletingRecord ?? undefined}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={handleDeleteSuccess}
      />

      <ManageAlertDialog
        alert={selectedAlert}
        open={!!selectedAlert}
        onOpenChange={(open) => {
          if (!open) setSelectedAlertId(null)
        }}
      />
    </Page>
  )
}
