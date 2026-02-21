import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tenantKey } from '@/lib/query-keys'
import { api } from '@/services/api'
import {
  AlertSeverity,
  AlertStatus,
  getVitalSignAlerts,
  type VitalSignAlert,
} from '@/api/vitalSignAlerts.api'
import type { DailyRecord } from '@/api/dailyRecords.api'
import { extractDateOnly } from '@/utils/dateHelpers'

export type ResidentClinicalEventSource = 'VITAL_ALERT' | 'INTERCORRENCIA'

export interface ResidentClinicalEvent {
  id: string
  source: ResidentClinicalEventSource
  alertId?: string
  timestamp: string
  title: string
  description: string
  severity?: AlertSeverity
  status?: AlertStatus
  value?: string
  recordedBy?: string
}

interface UseResidentAlertsOccurrencesOptions {
  residentId: string
  enableVitalAlerts?: boolean
  vitalAlertsLimit?: number
  intercurrenciasLimit?: number
}

const ACTIVE_ALERT_STATUSES: AlertStatus[] = [
  AlertStatus.ACTIVE,
  AlertStatus.IN_TREATMENT,
  AlertStatus.MONITORING,
]

function isAlertConvertedToIncident(alert: VitalSignAlert): boolean {
  const metadata = (alert.metadata ?? {}) as Record<string, unknown>
  const decision = metadata.incidentDecision
  const hasIncidentRecordId =
    typeof metadata.incidentRecordId === 'string' && metadata.incidentRecordId.trim().length > 0

  return decision === 'CONFIRMED' || hasIncidentRecordId
}

function buildIntercorrenciaTimestamp(record: DailyRecord): string {
  const day = extractDateOnly(record.date)
  const time = record.time && /^\d{2}:\d{2}/.test(record.time) ? record.time : '00:00'
  return `${day}T${time}:00`
}

function normalizeIntercorrenciaDescription(record: DailyRecord): string {
  const data = (record.data ?? {}) as Record<string, unknown>
  const description =
    (typeof data.descricao === 'string' && data.descricao.trim()) ||
    (typeof data.observacoes === 'string' && data.observacoes.trim()) ||
    (typeof record.notes === 'string' && record.notes.trim()) ||
    'Intercorrência registrada'

  return description
}

function normalizeIntercorrenciaTitle(record: DailyRecord): string {
  const data = (record.data ?? {}) as Record<string, unknown>
  const tipo = typeof data.tipo === 'string' ? data.tipo.trim() : ''
  return tipo ? `Intercorrência • ${tipo}` : 'Intercorrência'
}

export function useResidentAlertsOccurrences({
  residentId,
  enableVitalAlerts = true,
  vitalAlertsLimit = 50,
  intercurrenciasLimit = 50,
}: UseResidentAlertsOccurrencesOptions) {
  const vitalAlertsQuery = useQuery({
    queryKey: tenantKey(
      'resident-clinical-events',
      'vital-alerts',
      residentId,
      String(vitalAlertsLimit),
    ),
    enabled: enableVitalAlerts && !!residentId,
    queryFn: async (): Promise<VitalSignAlert[]> => {
      const response = await getVitalSignAlerts({
        residentId,
        page: 1,
        limit: vitalAlertsLimit,
      })
      return response.data ?? []
    },
    staleTime: 60 * 1000,
  })

  const intercurrenciasQuery = useQuery({
    queryKey: tenantKey(
      'resident-clinical-events',
      'intercorrencias',
      residentId,
      String(intercurrenciasLimit),
    ),
    enabled: !!residentId,
    queryFn: async (): Promise<DailyRecord[]> => {
      const response = await api.get('/daily-records', {
        params: {
          residentId,
          type: 'INTERCORRENCIA',
          page: '1',
          limit: String(intercurrenciasLimit),
          sortBy: 'date',
          sortOrder: 'desc',
        },
      })

      const payload = response.data as { data?: DailyRecord[] } | DailyRecord[]
      if (Array.isArray(payload)) return payload
      return Array.isArray(payload.data) ? payload.data : []
    },
    staleTime: 60 * 1000,
  })

  const events = useMemo<ResidentClinicalEvent[]>(() => {
    const visibleVitalAlerts = (vitalAlertsQuery.data ?? []).filter(
      (alert) => !isAlertConvertedToIncident(alert),
    )

    const vitalAlertEvents: ResidentClinicalEvent[] = visibleVitalAlerts.map((alert) => ({
      id: `vital-${alert.id}`,
      source: 'VITAL_ALERT',
      alertId: alert.id,
      timestamp: String(alert.createdAt),
      title: alert.title || 'Alerta de sinais vitais',
      description: alert.description || 'Alerta clínico registrado',
      severity: alert.severity,
      status: alert.status,
      value: alert.value,
    }))

    const intercurrenciaEvents: ResidentClinicalEvent[] = (intercurrenciasQuery.data ?? []).map((record) => ({
      id: `intercorrencia-${record.id}`,
      source: 'INTERCORRENCIA',
      timestamp: buildIntercorrenciaTimestamp(record),
      title: normalizeIntercorrenciaTitle(record),
      description: normalizeIntercorrenciaDescription(record),
      recordedBy: record.recordedBy,
    }))

    return [...vitalAlertEvents, ...intercurrenciaEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
  }, [intercurrenciasQuery.data, vitalAlertsQuery.data])

  const stats = useMemo(() => {
    const vitalAlerts = (vitalAlertsQuery.data ?? []).filter(
      (alert) => !isAlertConvertedToIncident(alert),
    )
    const intercurrencias = intercurrenciasQuery.data ?? []

    return {
      totalEvents: events.length,
      vitalAlertsTotal: vitalAlerts.length,
      vitalAlertsActive: vitalAlerts.filter((alert) => ACTIVE_ALERT_STATUSES.includes(alert.status)).length,
      vitalAlertsCriticalOrWarning: vitalAlerts.filter(
        (alert) => alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.WARNING,
      ).length,
      intercurrenciasTotal: intercurrencias.length,
    }
  }, [events.length, intercurrenciasQuery.data, vitalAlertsQuery.data])

  return {
    events,
    vitalAlerts: (vitalAlertsQuery.data ?? []).filter(
      (alert) => !isAlertConvertedToIncident(alert),
    ),
    intercurrencias: intercurrenciasQuery.data ?? [],
    stats,
    isLoading: vitalAlertsQuery.isLoading || intercurrenciasQuery.isLoading,
    isFetching: vitalAlertsQuery.isFetching || intercurrenciasQuery.isFetching,
    error: vitalAlertsQuery.error || intercurrenciasQuery.error,
    refetch: async () => {
      await Promise.all([vitalAlertsQuery.refetch(), intercurrenciasQuery.refetch()])
    },
  }
}
