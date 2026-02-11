// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - TodayShiftsInfo (Banner Operacional de Plantões)
// ──────────────────────────────────────────────────────────────────────────────

import { Clock, Loader2, PlayCircle, AlertCircle, Users, History, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useShifts } from '@/hooks/care-shifts/useShifts'
import { getCurrentDate } from '@/utils/dateHelpers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Shift } from '@/types/care-shifts/care-shifts'
import { addDays, format, parse, parseISO, subDays } from 'date-fns'

/**
 * Verifica se o horário atual está dentro do período do turno.
 * Lida corretamente com turnos noturnos que cruzam a meia-noite.
 */
function getShiftWindow(shiftDate: string, startTime: string, endTime: string) {
  const start = parse(`${shiftDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date())
  let end = parse(`${shiftDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date())

  // Turno noturno que cruza meia-noite (ex.: 19:00 -> 07:00)
  if (end <= start) {
    end = addDays(end, 1)
  }

  return { start, end }
}

function isCurrentShift(shiftDate: string, startTime: string, endTime: string): boolean {
  const now = new Date()
  const { start, end } = getShiftWindow(shiftDate, startTime, endTime)
  return now >= start && now < end
}

/**
 * Banner operacional que mostra o status dos plantões de hoje.
 * Destaca visualmente o plantão em andamento com protagonismo.
 */
export function TodayShiftsInfo() {
  const navigate = useNavigate()
  const today = getCurrentDate()
  const yesterday = format(subDays(parseISO(today), 1), 'yyyy-MM-dd')

  const { data: shifts = [], isLoading } = useShifts({
    // Inclui o dia anterior para cobrir turno noturno em andamento após meia-noite.
    startDate: yesterday,
    endDate: today,
  })

  // Filtrar apenas plantões com equipe designada
  const shiftsWithTeam = shifts.filter((shift) => shift.team)

  // Identificar plantão em andamento (prioridade máxima)
  const activeShift = shiftsWithTeam.find((s) => s.status === 'IN_PROGRESS')

  // Plantões aguardando check-in (dentro da janela de horário)
  const pendingShifts = shiftsWithTeam.filter((s) => {
    if (s.status !== 'CONFIRMED') return false
    const template = s.shiftTemplate
    const startTime = template.tenantConfig?.customStartTime || template.startTime
    const endTime = template.tenantConfig?.customEndTime || template.endTime
    return isCurrentShift(s.date, startTime, endTime)
  })

  // Próximos plantões confirmados (fora da janela)
  const upcomingShifts = shiftsWithTeam.filter((s) => {
    if (s.status !== 'CONFIRMED') return false
    const template = s.shiftTemplate
    const startTime = template.tenantConfig?.customStartTime || template.startTime
    const endTime = template.tenantConfig?.customEndTime || template.endTime
    return !isCurrentShift(s.date, startTime, endTime)
  })

  if (isLoading) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          <Skeleton className="h-5 w-64" />
        </div>
      </div>
    )
  }

  if (shiftsWithTeam.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Nenhuma equipe escalada para hoje
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Configure as escalas para garantir cobertura adequada
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/escala-cuidados')}
            className="border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          >
            Configurar Escalas
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    )
  }

  // Se há plantão ativo, mostrar banner de destaque
  if (activeShift) {
    return (
      <div className="space-y-3">
        <ActiveShiftBanner shift={activeShift} onNavigate={navigate} />
        {(pendingShifts.length > 0 || upcomingShifts.length > 0) && (
          <OtherShiftsRow
            pendingShifts={pendingShifts}
            upcomingShifts={upcomingShifts}
            onNavigate={navigate}
          />
        )}
      </div>
    )
  }

  // Se há plantão aguardando check-in
  if (pendingShifts.length > 0) {
    return (
      <div className="space-y-3">
        <PendingShiftBanner shift={pendingShifts[0]} onNavigate={navigate} />
        {(pendingShifts.length > 1 || upcomingShifts.length > 0) && (
          <OtherShiftsRow
            pendingShifts={pendingShifts.slice(1)}
            upcomingShifts={upcomingShifts}
            onNavigate={navigate}
          />
        )}
      </div>
    )
  }

  // Apenas plantões futuros confirmados (nenhum em andamento ou aguardando check-in)
  return (
    <div className="space-y-3">
      <UpcomingShiftsBanner shifts={upcomingShifts} onNavigate={navigate} />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ────────────────────────────────────────────────────────────────────────────

interface ShiftBannerProps {
  shift: Shift
  onNavigate: (path: string) => void
}

function ActiveShiftBanner({ shift, onNavigate }: ShiftBannerProps) {
  const template = shift.shiftTemplate
  const team = shift.team
  const startTime = template.tenantConfig?.customStartTime || template.startTime
  const endTime = template.tenantConfig?.customEndTime || template.endTime
  const shiftName = template.tenantConfig?.customName || template.name
  const memberCount = shift.members?.filter(m => !m.removedAt).length || 0

  return (
    <div className="rounded-xl border-2 border-green-500 dark:border-green-600 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          {/* Indicador pulsante */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25" />
            <div className="relative p-3 rounded-full bg-green-500 dark:bg-green-600">
              <PlayCircle className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                Plantão em Andamento
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h3 className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100 leading-tight">
                {team?.name}
              </h3>
              <span className="text-green-700 dark:text-green-300">•</span>
              <span className="text-green-700 dark:text-green-300 font-medium break-words">
                {shiftName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 text-sm text-green-600 dark:text-green-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {startTime} - {endTime}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {memberCount} cuidador{memberCount !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('/dashboard/escala-cuidados?tab=history')}
            className="flex-1 md:flex-none text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/50"
          >
            <History className="w-4 h-4 mr-1" />
            <span className="sm:hidden">Hist.</span>
            <span className="hidden sm:inline">Histórico</span>
          </Button>
          <Button
            size="sm"
            onClick={() => onNavigate('/dashboard/escala-cuidados')}
            className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white"
          >
            Ver detalhes
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function PendingShiftBanner({ shift, onNavigate }: ShiftBannerProps) {
  const template = shift.shiftTemplate
  const team = shift.team
  const startTime = template.tenantConfig?.customStartTime || template.startTime
  const endTime = template.tenantConfig?.customEndTime || template.endTime
  const shiftName = template.tenantConfig?.customName || template.name
  const memberCount = shift.members?.filter(m => !m.removedAt).length || 0

  return (
    <div className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          {/* Indicador de atenção */}
          <div className="p-3 rounded-full bg-amber-500 dark:bg-amber-600">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Aguardando Check-in
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h3 className="text-lg sm:text-xl font-bold text-amber-900 dark:text-amber-100 leading-tight">
                {team?.name}
              </h3>
              <span className="text-amber-700 dark:text-amber-300">•</span>
              <span className="text-amber-700 dark:text-amber-300 font-medium break-words">
                {shiftName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 text-sm text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {startTime} - {endTime}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {memberCount} cuidador{memberCount !== 1 ? 'es' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('/dashboard/escala-cuidados?tab=history')}
            className="flex-1 md:flex-none text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          >
            <History className="w-4 h-4 mr-1" />
            <span className="sm:hidden">Hist.</span>
            <span className="hidden sm:inline">Histórico</span>
          </Button>
          <Button
            size="sm"
            onClick={() => onNavigate('/dashboard/escala-cuidados')}
            className="flex-1 md:flex-none bg-amber-500 hover:bg-amber-600 text-white"
          >
            Fazer Check-in
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface UpcomingShiftsBannerProps {
  shifts: Shift[]
  onNavigate: (path: string) => void
}

function UpcomingShiftsBanner({ shifts, onNavigate }: UpcomingShiftsBannerProps) {
  if (shifts.length === 0) return null

  // Pegar o primeiro plantão para exibir no banner principal
  const firstShift = shifts[0]
  const template = firstShift.shiftTemplate
  const team = firstShift.team
  const startTime = template.tenantConfig?.customStartTime || template.startTime
  const endTime = template.tenantConfig?.customEndTime || template.endTime
  const shiftName = template.tenantConfig?.customName || template.name
  const memberCount = firstShift.members?.filter(m => !m.removedAt).length || 0

  const remainingShifts = shifts.slice(1)

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            {/* Indicador neutro */}
            <div className="p-3 rounded-full bg-muted">
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Plantões de Hoje
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                  {team?.name}
                </h3>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground font-medium break-words">
                  {shiftName}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {startTime} - {endTime}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {memberCount} membro{memberCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('/dashboard/escala-cuidados?tab=history')}
              className="flex-1 md:flex-none text-muted-foreground hover:text-foreground"
            >
              <History className="w-4 h-4 mr-1" />
              <span className="sm:hidden">Hist.</span>
              <span className="hidden sm:inline">Histórico</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/dashboard/escala-cuidados')}
              className="flex-1 md:flex-none"
            >
              Ver detalhes
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Outros plantões do dia */}
      {remainingShifts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Também hoje:
          </span>
          <div className="flex flex-wrap gap-2">
            {remainingShifts.map((shift) => (
              <ShiftChip key={shift.id} shift={shift} isPending={false} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

interface OtherShiftsRowProps {
  pendingShifts: Shift[]
  upcomingShifts: Shift[]
  onNavigate: (path: string) => void
}

function OtherShiftsRow({ pendingShifts, upcomingShifts }: OtherShiftsRowProps) {
  const allShifts = [...pendingShifts, ...upcomingShifts]
  if (allShifts.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        Também hoje:
      </span>
      <div className="flex flex-wrap gap-2">
        {allShifts.map((shift) => (
          <ShiftChip
            key={shift.id}
            shift={shift}
            isPending={pendingShifts.includes(shift)}
          />
        ))}
      </div>
    </div>
  )
}

interface ShiftChipProps {
  shift: Shift
  isPending?: boolean
}

function ShiftChip({ shift, isPending }: ShiftChipProps) {
  const template = shift.shiftTemplate
  const team = shift.team
  const startTime = template.tenantConfig?.customStartTime || template.startTime
  const endTime = template.tenantConfig?.customEndTime || template.endTime

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
        isPending
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
          : 'bg-muted text-muted-foreground border border-border'
      }`}
    >
      <span className="font-medium max-w-[120px] sm:max-w-none truncate">{team?.name}</span>
      <span className="opacity-60">•</span>
      <span>{startTime}-{endTime}</span>
    </div>
  )
}
