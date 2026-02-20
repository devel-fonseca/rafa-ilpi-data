import { CheckCircle2, AlertTriangle, Clock, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useDailyRecordsByDate, type DailyRecord } from '@/hooks/useDailyRecords'
import { useVitalSignAlerts } from '@/hooks/useVitalSignAlerts'
import { useScheduledRecordsStats } from '@/hooks/useResidentSchedule'
import { getCurrentDate, extractDateOnly, formatTimeSafe } from '@/utils/dateHelpers'
import { useEffect, useMemo } from 'react'

interface Resident {
  id: string
  fullName: string
  status: string
}

interface LatestRecord {
  residentId: string
  date: string
  createdAt: string
  type: string
}

interface DailyRecordsOverviewStatsProps {
  residents: Resident[]
  latestRecords: LatestRecord[]
  onApplyQuickFilter?: (
    filter: 'withoutRecord24h' | 'withClinicalOccurrences48h',
    residentIds?: string[]
  ) => void
  activeQuickFilter?: 'withoutRecord24h' | 'withClinicalOccurrences48h' | null
  onClinicalOccurrenceResidentIdsChange?: (residentIds: string[]) => void
}

export function DailyRecordsOverviewStats({
  residents,
  latestRecords,
  onApplyQuickFilter,
  activeQuickFilter,
  onClinicalOccurrenceResidentIdsChange,
}: DailyRecordsOverviewStatsProps) {
  const today = getCurrentDate()
  const now = useMemo(() => new Date(), [])
  const fortyEightHoursAgo = useMemo(
    () => new Date(now.getTime() - 48 * 60 * 60 * 1000),
    [now]
  )
  const yesterday = extractDateOnly(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  const twoDaysAgo = extractDateOnly(new Date(now.getTime() - 48 * 60 * 60 * 1000))
  const { data: allRecordsToday } = useDailyRecordsByDate(today)
  const { data: allRecordsYesterday } = useDailyRecordsByDate(yesterday)
  const { data: allRecordsTwoDaysAgo } = useDailyRecordsByDate(twoDaysAgo)
  const { data: scheduledRecordsStats } = useScheduledRecordsStats(today)

  const vitalAlertsFilters = useMemo(() => {
    return {
      startDate: fortyEightHoursAgo.toISOString(),
      endDate: now.toISOString(),
      page: 1,
      limit: 100,
    }
  }, [fortyEightHoursAgo, now])

  const { data: vitalAlertsResponse } = useVitalSignAlerts(vitalAlertsFilters)

  // Registros recentes (últimas 48h), consolidados em até 3 dias civis
  const safeAllRecordsRecent = useMemo(() => {
    const byId = new Map<string, DailyRecord>()
    const sources = [
      ...(Array.isArray(allRecordsToday) ? allRecordsToday : []),
      ...(Array.isArray(allRecordsYesterday) ? allRecordsYesterday : []),
      ...(Array.isArray(allRecordsTwoDaysAgo) ? allRecordsTwoDaysAgo : []),
    ]

    sources.forEach((record) => {
      if (record?.id) {
        byId.set(record.id, record)
      }
    })

    return Array.from(byId.values())
  }, [allRecordsToday, allRecordsYesterday, allRecordsTwoDaysAgo])

  // Filtrar apenas residentes ativos
  const activeResidents = useMemo(
    () => residents.filter((r) => r.status === 'Ativo'),
    [residents]
  )
  const residentNameMap = useMemo(
    () => new Map(residents.map((r) => [r.id, r.fullName])),
    [residents]
  )

  // ──────────────────────────────────────────────────────────────────────────
  // CARD 1: Residentes com registros hoje
  // ──────────────────────────────────────────────────────────────────────────
  const residentsWithRecordsToday = useMemo(() => {
    const residentsSet = new Set<string>()

    latestRecords.forEach((record) => {
      const recordDate = record.date ? extractDateOnly(record.date) : ''
      if (recordDate === today) {
        residentsSet.add(record.residentId)
      }
    })

    return activeResidents.filter((r) => residentsSet.has(r.id))
  }, [activeResidents, latestRecords, today])

  const residentsWithRecordsCount = residentsWithRecordsToday.length
  const residentsWithRecordsPercentage = activeResidents.length > 0
    ? Math.round((residentsWithRecordsCount / activeResidents.length) * 100)
    : 0

  // ──────────────────────────────────────────────────────────────────────────
  // CARD 2: Residentes sem registro há 24h+
  // ──────────────────────────────────────────────────────────────────────────
  const residentsWithoutRecordsFor24h = useMemo(() => {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    return activeResidents.filter((resident) => {
      // Buscar último registro deste residente
      const residentLatestRecord = latestRecords.find(
        (record) => record.residentId === resident.id
      )

      if (!residentLatestRecord) {
        // Sem registro nunca = crítico
        return true
      }

      // Verificar se último registro foi há mais de 24h
      const lastRecordDate = new Date(residentLatestRecord.createdAt)
      return lastRecordDate < twentyFourHoursAgo
    })
  }, [activeResidents, latestRecords])

  // ──────────────────────────────────────────────────────────────────────────
  // CARD 3: Intercorrências últimas 48h
  // ──────────────────────────────────────────────────────────────────────────
  const intercorrencesToday = useMemo(() => {
    return safeAllRecordsRecent.filter((record: DailyRecord) => {
      if (record.type !== 'INTERCORRENCIA') return false

      const recordDate = extractDateOnly(record.date)
      const recordTime = typeof (record as { time?: unknown }).time === 'string'
        ? ((record as { time?: string }).time || '').slice(0, 5)
        : '00:00'
      const occurredAt = new Date(`${recordDate}T${recordTime}:00`)

      return !Number.isNaN(occurredAt.getTime()) && occurredAt >= fortyEightHoursAgo && occurredAt <= now
    })
  }, [safeAllRecordsRecent, fortyEightHoursAgo, now])

  const clinicalAlertsSummary = useMemo(() => {
    type MergedClinicalEvent = {
      residentId: string
      date: string
      time: string
      label: string
      sourcePriority: number
    }

    const incidentEvents: MergedClinicalEvent[] = intercorrencesToday
      .map((record: DailyRecord) => ({
        residentId: record.residentId,
        date: extractDateOnly(record.date),
        time: typeof (record as { time?: unknown }).time === 'string'
          ? ((record as { time?: string }).time || '').slice(0, 5)
          : '00:00',
        label: 'Intercorrência',
        sourcePriority: 3,
      }))
      .filter((event) => event.residentId)

    const formatVitalDetails = (params: {
      systolic: number | null
      glucose: number | null
      oxygen: number | null
      temperature: number | null
      heartRate: number | null
      bloodPressureRaw: string
    }): string => {
      const { systolic, glucose, oxygen, temperature, heartRate, bloodPressureRaw } = params
      const abnormalParameters: string[] = []

      if (glucose !== null && (glucose >= 180 || glucose < 70)) {
        abnormalParameters.push(`Glicemia ${glucose} mg/dL`)
      }
      if (systolic !== null && (systolic >= 140 || systolic < 90)) {
        abnormalParameters.push(`PA ${bloodPressureRaw || `${systolic} mmHg`}`)
      }
      if (oxygen !== null && oxygen < 92) {
        abnormalParameters.push(`SpO2 ${oxygen}%`)
      }
      if (temperature !== null && (temperature >= 38 || temperature < 35.5)) {
        abnormalParameters.push(`Temp ${temperature.toFixed(1)}°C`)
      }
      if (heartRate !== null && (heartRate > 100 || heartRate < 60)) {
        abnormalParameters.push(`FC ${heartRate} bpm`)
      }

      return abnormalParameters.length > 0
        ? abnormalParameters.join(' • ')
        : 'Sinal vital fora da faixa'
    }

    // Fallback robusto: monitoramentos anormais do dia (mesma lógica de limiar do backend)
    // para evitar perder contagem quando alertas vierem de fontes distintas.
    const monitoringAbnormalEvents: MergedClinicalEvent[] = safeAllRecordsRecent
      .filter((record: DailyRecord) => record.type === 'MONITORAMENTO')
      .map((record: DailyRecord) => {
        const recordData = ((record as { data?: unknown }).data ?? {}) as Record<string, unknown>
        const parseNumber = (value: unknown): number | null => {
          if (value === null || value === undefined || value === '') return null
          const normalized = String(value).replace(',', '.').trim()
          const parsed = Number(normalized)
          return Number.isFinite(parsed) ? parsed : null
        }

        const bloodPressureRaw = String(recordData.pressaoArterial ?? '').trim()
        const [systolicStr] = bloodPressureRaw.split('/')
        const systolic = parseNumber(systolicStr)
        const glucose = parseNumber(recordData.glicemia)
        const temperature = parseNumber(recordData.temperatura)
        const oxygen = parseNumber(recordData.saturacaoO2)
        const heartRate = parseNumber(recordData.frequenciaCardiaca)

        const hasAbnormalVital =
          (systolic !== null && (systolic >= 140 || systolic < 90)) ||
          (glucose !== null && (glucose >= 180 || glucose < 70)) ||
          (temperature !== null && (temperature >= 38 || temperature < 35.5)) ||
          (oxygen !== null && oxygen < 92) ||
          (heartRate !== null && (heartRate > 100 || heartRate < 60))

        if (!hasAbnormalVital) return null

        const detail = formatVitalDetails({
          systolic,
          glucose,
          oxygen,
          temperature,
          heartRate,
          bloodPressureRaw,
        })

        return {
          residentId: record.residentId,
          date: extractDateOnly(record.date),
          time: typeof (record as { time?: unknown }).time === 'string'
            ? ((record as { time?: string }).time || '').slice(0, 5)
            : '00:00',
          label: `Monitoramento anormal: ${detail}`,
          sourcePriority: 2,
        }
      })
      .filter((event): event is MergedClinicalEvent => {
        if (!event) return false
        const occurredAt = new Date(`${event.date}T${event.time}:00`)
        return !Number.isNaN(occurredAt.getTime()) && occurredAt >= fortyEightHoursAgo && occurredAt <= now
      })

    // Evitar duplicações de alertas vitais no mesmo registro de sinais vitais
    // (um monitoramento pode gerar múltiplos alertas por parâmetro)
    const vitalAlertsRaw = Array.isArray(vitalAlertsResponse?.data)
      ? vitalAlertsResponse.data
      : []

    const uniqueVitalEventsByVitalSign = new Map<string, MergedClinicalEvent>()
    vitalAlertsRaw.forEach((alert) => {
      const timestamp = alert.vitalSign?.timestamp || alert.createdAt
      const eventDate = extractDateOnly(timestamp)
      const eventTime = formatTimeSafe(timestamp).slice(0, 5)
      const occurredAt = new Date(`${eventDate}T${eventTime}:00`)
      if (Number.isNaN(occurredAt.getTime()) || occurredAt < fortyEightHoursAgo || occurredAt > now) return

      const eventKey = alert.vitalSignId || alert.id
      if (!uniqueVitalEventsByVitalSign.has(eventKey)) {
        uniqueVitalEventsByVitalSign.set(eventKey, {
          residentId: alert.residentId,
          date: eventDate,
          time: eventTime,
          label: `${alert.title || 'Alerta clínico'}${alert.value ? `: ${alert.value}` : ''}`,
          sourcePriority: 1,
        })
      }
    })

    const allEvents = [
      ...incidentEvents,
      ...monitoringAbnormalEvents,
      ...Array.from(uniqueVitalEventsByVitalSign.values()),
    ]

    // Dedupe entre fontes por residente + minuto do evento.
    // Se houver conflito, priorizar fonte mais clínica (intercorrência > monitoramento > alerta vital).
    const uniqueEventsByResidentMinute = new Map<string, MergedClinicalEvent>()
    allEvents.forEach((event) => {
      const key = `${event.residentId}|${event.date}|${event.time}`
      const existing = uniqueEventsByResidentMinute.get(key)
      if (!existing || event.sourcePriority > existing.sourcePriority) {
        uniqueEventsByResidentMinute.set(key, event)
      }
    })

    const events = Array.from(uniqueEventsByResidentMinute.values()).sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
    )

    return {
      count: events.length,
      residentIds: Array.from(new Set(events.map((event) => event.residentId))),
      eventsPreview: events.slice(0, 5).map((event) => ({
        residentName: residentNameMap.get(event.residentId) || 'Residente',
        date: event.date,
        time: event.time,
        label: event.label,
      })),
      remainingCount: Math.max(0, events.length - 5),
    }
  }, [intercorrencesToday, safeAllRecordsRecent, vitalAlertsResponse?.data, fortyEightHoursAgo, now, residentNameMap])

  // ──────────────────────────────────────────────────────────────────────────
  // CARD 4: Taxa de Cobertura de Registros Obrigatórios
  // ──────────────────────────────────────────────────────────────────────────
  const mandatoryRecordsCoverage = scheduledRecordsStats?.compliancePercentage ?? 100

  useEffect(() => {
    onClinicalOccurrenceResidentIdsChange?.(clinicalAlertsSummary.residentIds)
  }, [clinicalAlertsSummary.residentIds, onClinicalOccurrenceResidentIdsChange])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Card 1: Residentes com Registros */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="hover:shadow-md transition-shadow cursor-help">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Residentes com registros
                  </h3>
                  <div className="flex items-center justify-center w-10 h-10 bg-success/10 rounded-lg shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl sm:text-4xl font-bold text-success leading-none">
                    {residentsWithRecordsCount}
                  </p>
                  <span className="text-sm font-medium ml-1 text-muted-foreground">
                    / {activeResidents.length}
                  </span>
                </div>
                <div className="mt-auto pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {residentsWithRecordsPercentage}% cobertura hoje
                  </p>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Residentes que tiveram pelo menos 1 registro hoje</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Card 2: Residentes sem Registro há 24h+ */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={`hover:shadow-md transition-shadow cursor-pointer ${
              residentsWithoutRecordsFor24h.length > 0 ? 'border-destructive/50' : ''
            } ${activeQuickFilter === 'withoutRecord24h' ? 'ring-2 ring-destructive/40' : ''}`}
            onClick={() => onApplyQuickFilter?.('withoutRecord24h')}
            >
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Sem registro há 24h+
                  </h3>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                    residentsWithoutRecordsFor24h.length > 0
                      ? 'bg-destructive/10'
                      : 'bg-muted'
                  }`}>
                    <Clock className={`h-5 w-5 ${
                      residentsWithoutRecordsFor24h.length > 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`} />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className={`text-3xl sm:text-4xl font-bold leading-none ${
                    residentsWithoutRecordsFor24h.length > 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {residentsWithoutRecordsFor24h.length}
                  </p>
                  <span className="text-sm font-medium ml-1 text-muted-foreground">
                    {residentsWithoutRecordsFor24h.length === 1 ? 'crítico' : 'críticos'}
                  </span>
                </div>
                <div className="mt-auto pt-2 border-t">
                  {residentsWithoutRecordsFor24h.length > 0 ? (
                    <p className="text-xs text-destructive font-medium">
                      Atenção necessária
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Todos acompanhados
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Residentes sem registro há mais de 24 horas</p>
            {residentsWithoutRecordsFor24h.length > 0 ? (
              <ul className="text-xs space-y-0.5">
                {residentsWithoutRecordsFor24h.slice(0, 5).map((r) => (
                  <li key={r.id}>• {r.fullName}</li>
                ))}
                {residentsWithoutRecordsFor24h.length > 5 && (
                  <li className="text-muted-foreground">
                    + {residentsWithoutRecordsFor24h.length - 5} outros
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-xs">Todos os residentes foram acompanhados nas últimas 24 horas</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Card 3: Intercorrências últimas 48h */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={`hover:shadow-md transition-shadow cursor-pointer ${
              clinicalAlertsSummary.count > 0 ? 'border-warning/50' : ''
            } ${activeQuickFilter === 'withClinicalOccurrences48h' ? 'ring-2 ring-warning/40' : ''}`}
            onClick={() => onApplyQuickFilter?.('withClinicalOccurrences48h', clinicalAlertsSummary.residentIds)}
            >
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Intercorrências 48h
                  </h3>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                    clinicalAlertsSummary.count > 0
                      ? 'bg-warning/10'
                      : 'bg-muted'
                  }`}>
                    <AlertTriangle className={`h-5 w-5 ${
                      clinicalAlertsSummary.count > 0
                        ? 'text-warning'
                        : 'text-muted-foreground'
                    }`} />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className={`text-3xl sm:text-4xl font-bold leading-none ${
                    clinicalAlertsSummary.count > 0 ? 'text-warning' : 'text-muted-foreground'
                  }`}>
                    {clinicalAlertsSummary.count}
                  </p>
                  <span className="text-sm font-medium ml-1 text-muted-foreground">
                    {clinicalAlertsSummary.count === 1 ? 'alerta' : 'alertas'}
                  </span>
                </div>
                <div className="mt-auto pt-2 border-t">
                  {clinicalAlertsSummary.count > 0 ? (
                    <p className="text-xs text-warning font-medium">
                      Acompanhar continuidade
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Nenhum evento nas últimas 48h
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Ocorrências clínicas nas últimas 48 horas</p>
            {clinicalAlertsSummary.count > 0 ? (
              <ul className="text-xs space-y-0.5">
                {clinicalAlertsSummary.eventsPreview.map((event, index) => (
                  <li key={`${event.residentName}-${event.date}-${event.time}-${index}`}>
                    • {event.residentName} - {event.label} ({event.time})
                  </li>
                ))}
                {clinicalAlertsSummary.remainingCount > 0 && (
                  <li className="text-muted-foreground">
                    + {clinicalAlertsSummary.remainingCount} outros
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-xs">Nenhuma ocorrência clínica nas últimas 48 horas</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Card 4: Taxa de Cobertura Programados */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="hover:shadow-md transition-shadow cursor-help">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cobertura programados
                  </h3>
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg shrink-0">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className={`text-3xl sm:text-4xl font-bold leading-none ${
                    mandatoryRecordsCoverage >= 80
                      ? 'text-success'
                      : mandatoryRecordsCoverage >= 50
                        ? 'text-warning'
                        : 'text-destructive'
                  }`}>
                    {mandatoryRecordsCoverage}%
                  </p>
                </div>
                <div className="mt-auto pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Registros essenciais
                  </p>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        mandatoryRecordsCoverage >= 80
                          ? 'bg-success'
                          : mandatoryRecordsCoverage >= 50
                            ? 'bg-warning'
                            : 'bg-destructive'
                      }`}
                      style={{ width: `${mandatoryRecordsCoverage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold mb-1">Taxa de cobertura dos registros obrigatórios</p>
            <p className="text-xs mb-2">
              Considera registros configurados no agendamento de cada residente.
            </p>
            {scheduledRecordsStats ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {`${scheduledRecordsStats.expected} ${scheduledRecordsStats.expected === 1 ? 'registro programado' : 'registros programados'} esperados hoje`}
                </p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Meta: 80% ou mais
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sem estatísticas de registros programados disponíveis
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
