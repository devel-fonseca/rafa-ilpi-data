import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { extractDateOnly, formatDateTimeSafe, formatTimeSafe } from '@/utils/dateHelpers'
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
  FileText,
} from 'lucide-react'
import { useVitalSignAlerts } from '@/hooks/useVitalSignAlerts'
import { ManageAlertDialog } from './ManageAlertDialog'
import type { VitalSignAlert } from '@/api/vitalSignAlerts.api'
import { AlertStatus, AlertSeverity, VitalSignAlertType } from '@/api/vitalSignAlerts.api'
import { api } from '@/services/api'
import { tenantKey } from '@/lib/query-keys'

interface VitalSignsAlertsProps {
  residentId: string
  periodDays?: number
}

interface DailyRecordWithIncident {
  id: string
  residentId: string
  date: string
  time: string
  createdAt: string
  type: string
  data?: Record<string, unknown>
  notes?: string | null
  recordedBy?: string
  incidentCategory?: string | null
  incidentSeverity?: string | null
  incidentSubtypeClinical?: string | null
}

type UnifiedAlert = {
  id: string
  source: 'RECORD' | 'VITAL_ALERT'
  title: string
  description: string
  createdAt: string
  severity: AlertSeverity
  status: AlertStatus
  value?: string
  priority: number
  tags: string[]
  recordedBy?: string
  manageableAlert?: VitalSignAlert
  type?: VitalSignAlertType
  assignedUser?: VitalSignAlert['assignedUser']
  clinicalNotes?: VitalSignAlert['clinicalNotes']
  medicalNotes?: string | null
  actionTaken?: string | null
  linkedAlertId?: string
}

const VITAL_RELATED_SUBTYPES = new Set([
  'FEBRE_HIPERTERMIA',
  'HIPOTERMIA',
  'HIPOGLICEMIA',
  'HIPERGLICEMIA',
  'DISPNEIA',
  'OUTRA_CLINICA',
])

function normalizeAlertTimestamp(timestamp: string | undefined | null): string {
  const raw = typeof timestamp === 'string' ? timestamp.trim() : ''
  if (!raw) return ''

  // Compatibilidade com formato legado incorreto: 2026-02-20T00:00:00.000ZT07:44:00
  const legacyMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2})T00:00:00\.000ZT(\d{2}:\d{2})(?::(\d{2}))?$/,
  )
  if (legacyMatch) {
    const [, day, hhmm, ss] = legacyMatch
    return `${day}T${hhmm}:${ss ?? '00'}.000Z`
  }

  return raw
}

function resolveRecordTimestamp(record: DailyRecordWithIncident): string {
  const createdAt = normalizeAlertTimestamp(record.createdAt)
  if (createdAt) {
    return createdAt
  }

  const day = extractDateOnly(record.date)
  const time = record.time && /^\d{2}:\d{2}/.test(record.time) ? record.time : '00:00'
  return `${day}T${time}:00`
}

function formatAlertDateTime(timestamp: string): string {
  const normalizedTimestamp = normalizeAlertTimestamp(timestamp)
  try {
    return formatDateTimeSafe(normalizedTimestamp)
  } catch {
    return 'Data/hora inválida'
  }
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const normalized = String(value).replace(',', '.').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseBloodPressure(value: unknown): { systolic: number | null; diastolic: number | null; raw: string } {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) {
    return { systolic: null, diastolic: null, raw: '' }
  }

  const [systolicRaw, diastolicRaw] = raw.split('/')
  return {
    systolic: parseOptionalNumber(systolicRaw),
    diastolic: parseOptionalNumber(diastolicRaw),
    raw,
  }
}

function toMinuteKey(timestamp: string): string {
  const normalizedTimestamp = normalizeAlertTimestamp(timestamp)
  if (!normalizedTimestamp) return 'invalid'

  const day = extractDateOnly(normalizedTimestamp)
  const time = formatTimeSafe(normalizedTimestamp).slice(0, 5)
  return `${day}T${time}`
}

function mapAlertTypeToTag(type?: VitalSignAlertType): string {
  switch (type) {
    case VitalSignAlertType.PRESSURE_HIGH:
    case VitalSignAlertType.PRESSURE_LOW:
      return 'BP'
    case VitalSignAlertType.GLUCOSE_HIGH:
    case VitalSignAlertType.GLUCOSE_LOW:
      return 'GLUCOSE'
    case VitalSignAlertType.TEMPERATURE_HIGH:
    case VitalSignAlertType.TEMPERATURE_LOW:
      return 'TEMP'
    case VitalSignAlertType.HEART_RATE_HIGH:
    case VitalSignAlertType.HEART_RATE_LOW:
      return 'HR'
    case VitalSignAlertType.OXYGEN_LOW:
      return 'OXYGEN'
    default:
      return 'GENERIC'
  }
}

function mapSubtypeToTag(subtype?: string | null, data?: Record<string, unknown>): string[] {
  if (!subtype) return ['GENERIC']

  if (subtype === 'HIPOGLICEMIA' || subtype === 'HIPERGLICEMIA') return ['GLUCOSE']
  if (subtype === 'FEBRE_HIPERTERMIA' || subtype === 'HIPOTERMIA') return ['TEMP']
  if (subtype === 'DISPNEIA') return ['OXYGEN']

  if (subtype === 'OUTRA_CLINICA') {
    const autoSubtypeKey = typeof data?.autoSubtypeKey === 'string' ? data.autoSubtypeKey : ''
    if (autoSubtypeKey.includes('PRESSAO')) return ['BP']
    if (autoSubtypeKey.includes('FREQUENCIA')) return ['HR']
    if (autoSubtypeKey.includes('MONITORAMENTO')) return ['BP', 'HR', 'TEMP', 'GLUCOSE', 'OXYGEN']
  }

  return ['GENERIC']
}

function isAlertConvertedToIncident(alert: VitalSignAlert): boolean {
  const metadata = (alert.metadata ?? {}) as Record<string, unknown>
  const decision = metadata.incidentDecision
  const hasIncidentRecordId =
    typeof metadata.incidentRecordId === 'string' && metadata.incidentRecordId.trim().length > 0

  return decision === 'CONFIRMED' || hasIncidentRecordId
}

function detectMonitoringAnomalies(record: DailyRecordWithIncident): {
  tags: string[]
  details: string[]
  severity: AlertSeverity
  type: VitalSignAlertType
} | null {
  const data = (record.data ?? {}) as Record<string, unknown>
  const { systolic, diastolic, raw: bloodPressureRaw } = parseBloodPressure(data.pressaoArterial)
  const temperature = parseOptionalNumber(data.temperatura)
  const heartRate = parseOptionalNumber(data.frequenciaCardiaca)
  const oxygenSaturation = parseOptionalNumber(data.saturacaoO2)
  const bloodGlucose = parseOptionalNumber(data.glicemia)

  const tags = new Set<string>()
  const details: string[] = []
  let isCritical = false
  let primaryType: VitalSignAlertType = VitalSignAlertType.PRESSURE_HIGH

  if (systolic !== null || diastolic !== null) {
    const critical =
      (systolic !== null && (systolic >= 160 || systolic < 80)) ||
      (diastolic !== null && (diastolic >= 100 || diastolic < 50))
    const warning =
      (systolic !== null && (systolic >= 140 || systolic <= 90)) ||
      (diastolic !== null && (diastolic >= 90 || diastolic < 60))

    if (critical || warning) {
      tags.add('BP')
      details.push(`PA ${bloodPressureRaw || `${systolic ?? '-'} / ${diastolic ?? '-'}`} mmHg`)
      const isHigh =
        (systolic !== null && systolic >= 140) ||
        (diastolic !== null && diastolic >= 90)
      primaryType = isHigh ? VitalSignAlertType.PRESSURE_HIGH : VitalSignAlertType.PRESSURE_LOW
      isCritical = isCritical || critical
    }
  }

  if (bloodGlucose !== null) {
    const critical = bloodGlucose >= 250 || bloodGlucose < 60
    const warning = bloodGlucose >= 180 || bloodGlucose < 70
    if (critical || warning) {
      tags.add('GLUCOSE')
      details.push(`Glicemia ${bloodGlucose} mg/dL`)
      primaryType =
        bloodGlucose >= 180
          ? VitalSignAlertType.GLUCOSE_HIGH
          : VitalSignAlertType.GLUCOSE_LOW
      isCritical = isCritical || critical
    }
  }

  if (temperature !== null) {
    const critical = temperature >= 39 || temperature < 35
    const warning = temperature >= 38 || temperature < 35.5
    if (critical || warning) {
      tags.add('TEMP')
      details.push(`Temperatura ${temperature.toFixed(1)} °C`)
      primaryType =
        temperature >= 38
          ? VitalSignAlertType.TEMPERATURE_HIGH
          : VitalSignAlertType.TEMPERATURE_LOW
      isCritical = isCritical || critical
    }
  }

  if (oxygenSaturation !== null && oxygenSaturation < 92) {
    tags.add('OXYGEN')
    details.push(`SpO₂ ${oxygenSaturation}%`)
    primaryType = VitalSignAlertType.OXYGEN_LOW
    isCritical = isCritical || oxygenSaturation < 90
  }

  if (heartRate !== null) {
    const critical = heartRate > 120 || heartRate < 50
    const warning = heartRate > 100 || heartRate < 60
    if (critical || warning) {
      tags.add('HR')
      details.push(`FC ${heartRate} bpm`)
      primaryType =
        heartRate > 100
          ? VitalSignAlertType.HEART_RATE_HIGH
          : VitalSignAlertType.HEART_RATE_LOW
      isCritical = isCritical || critical
    }
  }

  if (details.length === 0) {
    return null
  }

  return {
    tags: Array.from(tags),
    details,
    severity: isCritical ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
    type: primaryType,
  }
}

export function VitalSignsAlerts({ residentId, periodDays = 7 }: VitalSignsAlertsProps) {
  const navigate = useNavigate()
  const [selectedAlert, setSelectedAlert] = useState<VitalSignAlert | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<'all' | AlertSeverity>('all')
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'in_treatment' | 'monitoring' | 'resolved' | 'ignored'
  >('all')

  const {
    data: alertsResponse,
    isLoading: isLoadingAlerts,
    error: alertsError,
  } = useVitalSignAlerts({
    residentId,
    page: 1,
    limit: 100,
  })
  const alerts = useMemo(() => alertsResponse?.data ?? [], [alertsResponse?.data])

  const { data: recordsEvents = [], isLoading: isLoadingRecords, error: recordsError } = useQuery({
    queryKey: tenantKey('vital-signs', 'record-alerts', residentId, String(periodDays)),
    enabled: !!residentId,
    queryFn: async (): Promise<UnifiedAlert[]> => {
      const endDate = endOfDay(new Date())
      const startDate = startOfDay(subDays(new Date(), periodDays))

      const [intercorrenciasResponse, monitoramentosResponse] = await Promise.all([
        api.get('/daily-records', {
          params: {
            residentId,
            type: 'INTERCORRENCIA',
            startDate: startDate.toISOString().slice(0, 10),
            endDate: endDate.toISOString().slice(0, 10),
            page: '1',
            limit: '300',
            sortBy: 'date',
            sortOrder: 'desc',
          },
        }),
        api.get('/daily-records', {
          params: {
            residentId,
            type: 'MONITORAMENTO',
            startDate: startDate.toISOString().slice(0, 10),
            endDate: endDate.toISOString().slice(0, 10),
            page: '1',
            limit: '300',
            sortBy: 'date',
            sortOrder: 'desc',
          },
        }),
      ])

      const normalizePayload = (
        payload: unknown,
      ): DailyRecordWithIncident[] => {
        if (Array.isArray(payload)) {
          return payload as DailyRecordWithIncident[]
        }
        const container = payload as { data?: DailyRecordWithIncident[] }
        return Array.isArray(container?.data) ? container.data : []
      }

      const intercorrencias = normalizePayload(intercorrenciasResponse.data)
      const monitoramentos = normalizePayload(monitoramentosResponse.data)

      const incidentEvents: UnifiedAlert[] = intercorrencias
        .filter((record) => {
          const subtype = record.incidentSubtypeClinical
          const data = (record.data ?? {}) as Record<string, unknown>
          const autoSubtypeKey =
            typeof data.autoSubtypeKey === 'string' ? data.autoSubtypeKey : ''

          return (
            !!subtype &&
            (VITAL_RELATED_SUBTYPES.has(subtype) ||
              autoSubtypeKey.startsWith('MONITORAMENTO'))
          )
        })
        .map((record) => {
          const subtype = record.incidentSubtypeClinical || undefined
          const data = (record.data ?? {}) as Record<string, unknown>
          const tags = mapSubtypeToTag(subtype, data)
          const linkedAlertId =
            typeof data.alertaVitalId === 'string' && data.alertaVitalId.trim().length > 0
              ? data.alertaVitalId
              : undefined
          const description =
            (typeof data.descricao === 'string' && data.descricao.trim()) ||
            (typeof data.observacoes === 'string' && data.observacoes.trim()) ||
            (typeof record.notes === 'string' && record.notes.trim()) ||
            'Intercorrência clínica registrada'

          const severity =
            record.incidentSeverity === 'GRAVE' || record.incidentSeverity === 'CRITICA'
              ? AlertSeverity.CRITICAL
              : AlertSeverity.WARNING

          return {
            id: `incident-${record.id}`,
            source: 'RECORD',
            title: 'Intercorrência clínica',
            description,
            createdAt: resolveRecordTimestamp(record),
            severity,
            status: AlertStatus.ACTIVE,
            value: subtype ? subtype.replaceAll('_', ' ') : 'INTERCORRENCIA',
            priority: severity === AlertSeverity.CRITICAL ? 5 : 3,
            tags,
            recordedBy: record.recordedBy,
            linkedAlertId,
          }
        })

      const monitoringEvents: UnifiedAlert[] = monitoramentos
        .map((record) => {
          const anomalies = detectMonitoringAnomalies(record)
          if (!anomalies) return null

          return {
            id: `monitoring-${record.id}`,
            source: 'RECORD',
            title: 'Monitoramento anormal',
            description: anomalies.details.join(' • '),
            createdAt: resolveRecordTimestamp(record),
            severity: anomalies.severity,
            status: AlertStatus.ACTIVE,
            value: anomalies.details.join(' • '),
            priority: anomalies.severity === AlertSeverity.CRITICAL ? 5 : 3,
            tags: anomalies.tags,
            recordedBy: record.recordedBy,
            type: anomalies.type,
          } satisfies UnifiedAlert
        })
        .filter((event): event is UnifiedAlert => !!event)

      // Evitar duplicação: se já existe intercorrência clínica no mesmo minuto/parâmetro,
      // suprimir o evento "Monitoramento anormal" correspondente.
      const incidentKeys = new Set<string>()
      incidentEvents.forEach((event) => {
        const minute = toMinuteKey(event.createdAt)
        event.tags.forEach((tag) => {
          incidentKeys.add(`${minute}|${tag}`)
        })
      })

      const deduplicatedMonitoringEvents = monitoringEvents.filter((event) => {
        const minute = toMinuteKey(event.createdAt)
        return !event.tags.some((tag) => incidentKeys.has(`${minute}|${tag}`))
      })

      return [...incidentEvents, ...deduplicatedMonitoringEvents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    },
    staleTime: 60 * 1000,
  })

  const mergedAlerts = useMemo(() => {
    const recordEventsEnriched = recordsEvents.map((event) => ({ ...event }))
    const recordIndexesByMinuteAndTag = new Map<string, number[]>()

    recordEventsEnriched.forEach((event, index) => {
      const minute = toMinuteKey(event.createdAt)
      event.tags.forEach((tag) => {
        const key = `${minute}|${tag}`
        const existingIndexes = recordIndexesByMinuteAndTag.get(key) ?? []
        existingIndexes.push(index)
        recordIndexesByMinuteAndTag.set(key, existingIndexes)
      })
    })

    const vitalAlertsEvents: UnifiedAlert[] = alerts.map((alert) => {
      const tag = mapAlertTypeToTag(alert.type)
      return {
        id: `vital-${alert.id}`,
        source: 'VITAL_ALERT',
        title: alert.title,
        description: alert.description,
        createdAt: normalizeAlertTimestamp(String(alert.createdAt)),
        severity: alert.severity,
        status: alert.status,
        value: alert.value,
        priority: alert.priority,
        tags: [tag],
        manageableAlert: alert,
        type: alert.type,
        assignedUser: alert.assignedUser,
        clinicalNotes: alert.clinicalNotes,
        medicalNotes: alert.medicalNotes,
        actionTaken: alert.actionTaken,
      }
    })

    const vitalAlertsById = new Map<string, UnifiedAlert>()
    const vitalAlertsByIncidentRecordId = new Map<string, UnifiedAlert>()
    const convertedAlertMatches: Array<{
      timestamp: number
      tags: Set<string>
      value?: string
    }> = []
    vitalAlertsEvents.forEach((event) => {
      const manageable = event.manageableAlert
      if (!manageable) return

      vitalAlertsById.set(manageable.id, event)

      const incidentRecordId = (manageable.metadata as Record<string, unknown> | undefined)
        ?.incidentRecordId
      if (typeof incidentRecordId === 'string' && incidentRecordId.trim().length > 0) {
        vitalAlertsByIncidentRecordId.set(incidentRecordId, event)
      }

      if (isAlertConvertedToIncident(manageable)) {
        convertedAlertMatches.push({
          timestamp: new Date(event.createdAt).getTime(),
          tags: new Set(event.tags),
          value: event.value,
        })
      }
    })

    const consumedVitalAlertIds = new Set<string>()

    // 1) Priorizar vínculo explícito alerta -> intercorrência confirmada
    recordEventsEnriched.forEach((recordEvent) => {
      if (recordEvent.source !== 'RECORD') return

      const recordId = recordEvent.id.startsWith('incident-')
        ? recordEvent.id.slice('incident-'.length)
        : null

      const linkedByAlertId =
        recordEvent.linkedAlertId ? vitalAlertsById.get(recordEvent.linkedAlertId) : undefined
      const linkedByIncidentRecordId =
        recordId ? vitalAlertsByIncidentRecordId.get(recordId) : undefined

      const linkedAlertEvent = linkedByAlertId ?? linkedByIncidentRecordId
      if (!linkedAlertEvent?.manageableAlert) return

      recordEvent.manageableAlert = linkedAlertEvent.manageableAlert
      recordEvent.type = linkedAlertEvent.type ?? recordEvent.type
      recordEvent.assignedUser = linkedAlertEvent.assignedUser
      recordEvent.clinicalNotes = linkedAlertEvent.clinicalNotes
      recordEvent.medicalNotes = linkedAlertEvent.medicalNotes
      recordEvent.actionTaken = linkedAlertEvent.actionTaken

      consumedVitalAlertIds.add(linkedAlertEvent.id)
    })

    // 2) Fallback: vínculo por minuto/parâmetro para alertas ainda não consumidos
    vitalAlertsEvents.forEach((event) => {
      if (consumedVitalAlertIds.has(event.id)) {
        return
      }

      const minute = toMinuteKey(event.createdAt)

      let matchedRecordIndex: number | null = null
      for (const tag of event.tags) {
        const key = `${minute}|${tag}`
        const candidates = recordIndexesByMinuteAndTag.get(key)
        if (candidates && candidates.length > 0) {
          matchedRecordIndex = candidates[0]
          break
        }
      }

      if (matchedRecordIndex === null) {
        return
      }

      const matchedRecord = recordEventsEnriched[matchedRecordIndex]
      const currentHasLinkedAlert = !!matchedRecord.manageableAlert

      if (!currentHasLinkedAlert || event.priority >= matchedRecord.priority) {
        matchedRecord.manageableAlert = event.manageableAlert
        matchedRecord.status = event.status
        matchedRecord.type = event.type ?? matchedRecord.type
        matchedRecord.assignedUser = event.assignedUser
        matchedRecord.clinicalNotes = event.clinicalNotes
        matchedRecord.medicalNotes = event.medicalNotes
        matchedRecord.actionTaken = event.actionTaken

        if (
          matchedRecord.title === 'Intercorrência clínica' &&
          event.manageableAlert &&
          isAlertConvertedToIncident(event.manageableAlert)
        ) {
          // Intercorrência confirmada deve iniciar como "Ativo" para acompanhamento clínico.
          matchedRecord.status = AlertStatus.ACTIVE
        }
      }

      consumedVitalAlertIds.add(event.id)
    })

    // Quando o alerta foi convertido em intercorrência, suprimir o card
    // de "Monitoramento anormal" correspondente para manter somente a intercorrência.
    const recordEventsWithoutConvertedMonitoring = recordEventsEnriched.filter((event) => {
      if (event.source !== 'RECORD' || event.title !== 'Monitoramento anormal') {
        return true
      }

      const eventTimestamp = new Date(event.createdAt).getTime()
      return !convertedAlertMatches.some((match) => {
        const hasSharedTag = event.tags.some((tag) => match.tags.has(tag))
        if (!hasSharedTag) return false

        const isCloseInTime = Math.abs(eventTimestamp - match.timestamp) <= 15 * 60 * 1000
        if (!isCloseInTime) return false

        if (!match.value || !event.value) return true
        return event.value.includes(match.value) || match.value.includes(event.value)
      })
    })

    const unmatchedVitalAlerts = vitalAlertsEvents.filter((event) => {
      if (event.manageableAlert && isAlertConvertedToIncident(event.manageableAlert)) {
        return false
      }

      if (consumedVitalAlertIds.has(event.id)) {
        return false
      }

      const minute = toMinuteKey(event.createdAt)
      return !event.tags.some((tag) =>
        recordIndexesByMinuteAndTag.has(`${minute}|${tag}`),
      )
    })

    return [...recordEventsWithoutConvertedMonitoring, ...unmatchedVitalAlerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [alerts, recordsEvents])

  const filteredAlerts = useMemo(() => {
    return mergedAlerts.filter((alert) => {
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false
      if (filterStatus === 'active' && alert.status !== AlertStatus.ACTIVE) return false
      if (filterStatus === 'in_treatment' && alert.status !== AlertStatus.IN_TREATMENT) return false
      if (filterStatus === 'monitoring' && alert.status !== AlertStatus.MONITORING) return false
      if (filterStatus === 'resolved' && alert.status !== AlertStatus.RESOLVED) return false
      if (filterStatus === 'ignored' && alert.status !== AlertStatus.IGNORED) return false
      return true
    })
  }, [mergedAlerts, filterSeverity, filterStatus])

  const alertsBySeverity = useMemo(() => {
    return {
      critical: filteredAlerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length,
      warning: filteredAlerts.filter((a) => a.severity === AlertSeverity.WARNING).length,
      info: filteredAlerts.filter((a) => a.severity === AlertSeverity.INFO).length,
    }
  }, [filteredAlerts])

  const getIcon = (type?: VitalSignAlertType) => {
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

  const handleManageAlert = (alert: UnifiedAlert) => {
    if (alert.manageableAlert) {
      setSelectedAlert(alert.manageableAlert)
    }
  }

  if (isLoadingAlerts || isLoadingRecords) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando alertas...</span>
      </div>
    )
  }

  if (alertsError || recordsError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar alertas</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os alertas e intercorrências clínicas. Tente novamente.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAlerts.length}</div>
            <p className="text-xs text-muted-foreground">priorizando registros diários</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Severidade Crítica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">{alertsBySeverity.critical}</div>
            <p className="text-xs text-muted-foreground">requerem atenção imediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Severidade Atenção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{alertsBySeverity.warning}</div>
            <p className="text-xs text-muted-foreground">monitoramento necessário</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Informativo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{alertsBySeverity.info}</div>
            <p className="text-xs text-muted-foreground">observação</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Select
          value={filterSeverity}
          onValueChange={(value: string) => setFilterSeverity(value as 'all' | AlertSeverity)}
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
          onValueChange={(value: string) =>
            setFilterStatus(
              value as 'all' | 'active' | 'in_treatment' | 'monitoring' | 'resolved' | 'ignored',
            )
          }
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

      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertTitle>Sem alertas</AlertTitle>
            <AlertDescription>
              Não há alertas clínicos para este residente no período selecionado.
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
                    {alert.value && <Badge variant="outline">{alert.value}</Badge>}
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
                    <Badge variant={alert.source === 'RECORD' ? 'default' : 'secondary'}>
                      {alert.source === 'RECORD' ? (
                        <>
                          <FileText className="h-3 w-3 mr-1" />
                          Registro diário
                        </>
                      ) : (
                        'Alerta vital'
                      )}
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
                        {formatAlertDateTime(alert.createdAt)}
                      </p>
                      {alert.recordedBy && (
                        <p className="text-xs text-muted-foreground">
                          Registrado por: <strong>{alert.recordedBy}</strong>
                        </p>
                      )}
                      {alert.assignedUser && (
                        <p className="text-xs text-muted-foreground">
                          Atribuído para: <strong>{alert.assignedUser.name}</strong>
                        </p>
                      )}
                      {alert.clinicalNotes && alert.clinicalNotes.length > 0 && (
                        <p className="text-xs text-primary">
                          📋 {alert.clinicalNotes.length} evolução(ões) vinculada(s)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {alert.source === 'RECORD' && !alert.manageableAlert && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/dashboard/residentes/${residentId}?section=clinical-notes`)
                          }
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Criar evolução
                        </Button>
                      )}
                      {alert.manageableAlert && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageAlert(alert)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Gerenciar
                        </Button>
                      )}
                    </div>
                  </div>
                  {alert.medicalNotes && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <strong>Notas Médicas:</strong> {alert.medicalNotes}
                    </div>
                  )}
                  {alert.actionTaken && (
                    <div className="mt-2 p-2 bg-primary/5 dark:bg-primary/95 rounded text-sm">
                      <strong>Ações Tomadas:</strong> {alert.actionTaken}
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          ))
        )}
      </div>

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
