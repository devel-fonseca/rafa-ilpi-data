import { CheckCircle2, AlertTriangle, Clock, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useDailyRecordsByDate } from '@/hooks/useDailyRecords'
import { useAllActiveScheduleConfigs } from '@/hooks/useResidentSchedule'
import { getCurrentDate, extractDateOnly } from '@/utils/dateHelpers'
import { useMemo } from 'react'
import { parseISO } from 'date-fns'

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
}

export function DailyRecordsOverviewStats({
  residents,
  latestRecords,
}: DailyRecordsOverviewStatsProps) {
  const today = getCurrentDate()
  const { data: allRecordsToday } = useDailyRecordsByDate(today)
  const { data: scheduleConfigs } = useAllActiveScheduleConfigs()

  // Garantir que allRecordsToday é array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const safeAllRecordsToday = Array.isArray(allRecordsToday) ? allRecordsToday : []
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const safeScheduleConfigs = Array.isArray(scheduleConfigs) ? scheduleConfigs : []

  // Filtrar apenas residentes ativos
  const activeResidents = useMemo(
    () => residents.filter((r) => r.status === 'Ativo'),
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
  // CARD 3: Intercorrências hoje
  // ──────────────────────────────────────────────────────────────────────────
  const intercorrencesToday = useMemo(() => {
    return safeAllRecordsToday.filter((record: any) => record.type === 'INTERCORRENCIA')
  }, [safeAllRecordsToday])

  // ──────────────────────────────────────────────────────────────────────────
  // CARD 4: Taxa de Cobertura de Registros Obrigatórios
  // ──────────────────────────────────────────────────────────────────────────
  const mandatoryRecordsCoverage = useMemo(() => {
    // Se não há configs, retornar 100% (não há obrigações)
    if (safeScheduleConfigs.length === 0) return 100

    const todayDate = parseISO(`${today}T12:00:00.000`)
    const todayDayOfWeek = todayDate.getDay()
    const todayDayOfMonth = todayDate.getDate()

    // Filtrar configs que devem ser executadas hoje
    const configsDueToday = safeScheduleConfigs.filter((config) => {
      if (config.frequency === 'DAILY') return true
      if (config.frequency === 'WEEKLY' && config.dayOfWeek === todayDayOfWeek) return true
      if (config.frequency === 'MONTHLY') {
        if (config.dayOfMonth === todayDayOfMonth) return true
        // Fallback: se config pede dia que não existe no mês, usar último dia
        const lastDayOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate()
        if (config.dayOfMonth! > lastDayOfMonth && todayDayOfMonth === lastDayOfMonth) return true
      }
      return false
    })

    const totalExpected = configsDueToday.length
    if (totalExpected === 0) return 100

    // Contar quantas configs foram completadas hoje
    let totalCompleted = 0

    configsDueToday.forEach((config) => {
      // Para ALIMENTACAO, verificar se mealType bate
      const mealType = config.metadata && typeof config.metadata === 'object' && 'mealType' in config.metadata
        ? (config.metadata as any).mealType
        : null

      // Verificar se há registro hoje deste tipo para este residente
      const hasRecord = safeAllRecordsToday.some((record: any) => {
        const matchesResident = record.residentId === config.residentId
        const matchesType = record.type === config.recordType
        const matchesDate = extractDateOnly(record.date) === today

        // Se é ALIMENTACAO, verificar mealType também
        if (config.recordType === 'ALIMENTACAO' && mealType) {
          const recordMealType = record.data?.mealType
          return matchesResident && matchesType && matchesDate && recordMealType === mealType
        }

        return matchesResident && matchesType && matchesDate
      })

      if (hasRecord) {
        totalCompleted++
      }
    })

    return Math.round((totalCompleted / totalExpected) * 100)
  }, [safeScheduleConfigs, safeAllRecordsToday, today])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Card 1: Residentes com Registros */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="hover:shadow-md transition-shadow cursor-help">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Residentes com registros
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-success">
                        {residentsWithRecordsCount}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        / {activeResidents.length}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {residentsWithRecordsPercentage}% cobertura hoje
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
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
            <Card className={`hover:shadow-md transition-shadow cursor-help ${
              residentsWithoutRecordsFor24h.length > 0 ? 'border-destructive/50' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Sem registro há 24h+
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className={`text-2xl font-bold ${
                        residentsWithoutRecordsFor24h.length > 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {residentsWithoutRecordsFor24h.length}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        {residentsWithoutRecordsFor24h.length === 1 ? 'crítico' : 'críticos'}
                      </span>
                    </div>
                    {residentsWithoutRecordsFor24h.length > 0 && (
                      <p className="text-xs text-destructive mt-1 font-medium">
                        ⚠️ Atenção necessária
                      </p>
                    )}
                    {residentsWithoutRecordsFor24h.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Todos acompanhados
                      </p>
                    )}
                  </div>
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg shrink-0 ${
                    residentsWithoutRecordsFor24h.length > 0
                      ? 'bg-destructive/10'
                      : 'bg-muted'
                  }`}>
                    <Clock className={`h-6 w-6 ${
                      residentsWithoutRecordsFor24h.length > 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`} />
                  </div>
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

      {/* Card 3: Intercorrências Hoje */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={`hover:shadow-md transition-shadow cursor-help ${
              intercorrencesToday.length > 0 ? 'border-warning/50' : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Intercorrências hoje
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className={`text-2xl font-bold ${
                        intercorrencesToday.length > 0 ? 'text-warning' : 'text-muted-foreground'
                      }`}>
                        {intercorrencesToday.length}
                      </p>
                      <span className="text-sm text-muted-foreground">
                        {intercorrencesToday.length === 1 ? 'alerta' : 'alertas'}
                      </span>
                    </div>
                    {intercorrencesToday.length > 0 && (
                      <p className="text-xs text-warning mt-1 font-medium">
                        ⚠️ Eventos registrados
                      </p>
                    )}
                    {intercorrencesToday.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Nenhum evento hoje
                      </p>
                    )}
                  </div>
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg shrink-0 ${
                    intercorrencesToday.length > 0
                      ? 'bg-warning/10'
                      : 'bg-muted'
                  }`}>
                    <AlertTriangle className={`h-6 w-6 ${
                      intercorrencesToday.length > 0
                        ? 'text-warning'
                        : 'text-muted-foreground'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Intercorrências e eventos que exigem atenção especial</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Card 4: Taxa de Cobertura Obrigatórios */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="hover:shadow-md transition-shadow cursor-help">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Cobertura obrigatórios
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className={`text-2xl font-bold ${
                        mandatoryRecordsCoverage >= 80
                          ? 'text-success'
                          : mandatoryRecordsCoverage >= 50
                            ? 'text-warning'
                            : 'text-destructive'
                      }`}>
                        {mandatoryRecordsCoverage}%
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Registros essenciais
                    </p>
                    {/* Barra de progresso visual */}
                    <div className="mt-2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
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
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg shrink-0">
                    <Target className="h-6 w-6 text-primary" />
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
            {safeScheduleConfigs.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const todayDate = parseISO(`${today}T12:00:00.000`)
                    const todayDayOfWeek = todayDate.getDay()
                    const todayDayOfMonth = todayDate.getDate()

                    const configsDueToday = safeScheduleConfigs.filter((config) => {
                      if (config.frequency === 'DAILY') return true
                      if (config.frequency === 'WEEKLY' && config.dayOfWeek === todayDayOfWeek) return true
                      if (config.frequency === 'MONTHLY') {
                        if (config.dayOfMonth === todayDayOfMonth) return true
                        const lastDayOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate()
                        if (config.dayOfMonth! > lastDayOfMonth && todayDayOfMonth === lastDayOfMonth) return true
                      }
                      return false
                    })

                    return `${configsDueToday.length} ${configsDueToday.length === 1 ? 'registro obrigatório' : 'registros obrigatórios'} esperados hoje`
                  })()}
                </p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Meta: 80% ou mais
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhuma configuração de registro obrigatório ativa
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
