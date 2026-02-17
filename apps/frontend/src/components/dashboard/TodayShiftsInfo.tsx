/* eslint-disable no-restricted-syntax */
// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - TodayShiftsInfo (Banner Operacional de Plantões)
// ──────────────────────────────────────────────────────────────────────────────

import { Clock, Loader2, PlayCircle, AlertCircle, AlertTriangle, Users, History, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useShifts } from '@/hooks/care-shifts/useShifts'
import { usePermissions, PermissionType } from '@/hooks/usePermissions'
import { getCurrentDate, SYSTEM_TIMEZONE } from '@/utils/dateHelpers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ShiftStatus, type Shift } from '@/types/care-shifts/care-shifts'
import { isShiftPendingClosure, getMinutesSinceExpectedEnd, isShiftInCurrentWindow } from '@/utils/shiftStatus'
import { AdminCloseShiftDialog } from '@/components/care-shifts/shifts/AdminCloseShiftDialog'
import { format, parseISO, subDays } from 'date-fns'

/**
 * Banner operacional que mostra o status dos plantões de hoje.
 * Destaca visualmente o plantão em andamento com protagonismo.
 */
interface TodayShiftsInfoProps {
  timezone?: string
}

export function TodayShiftsInfo({ timezone }: TodayShiftsInfoProps = {}) {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const effectiveTimezone = timezone || SYSTEM_TIMEZONE
  const today = getCurrentDate(effectiveTimezone)
  const yesterday = format(subDays(parseISO(today), 1), 'yyyy-MM-dd')
  const canAdminCloseShift = hasPermission(PermissionType.UPDATE_CARE_SHIFTS)

  const { data: shifts = [], isLoading } = useShifts({
    // Inclui o dia anterior para cobrir turno noturno em andamento após meia-noite.
    startDate: yesterday,
    endDate: today,
  })

  // Filtrar apenas plantões com equipe designada
  const shiftsWithTeam = shifts.filter((shift) => shift.team)

  // Identificar plantões com encerramento pendente (passou do horário sem passagem)
  // Inclui: status PENDING_CLOSURE ou IN_PROGRESS que passou do horário
  const pendingClosureShifts = shiftsWithTeam.filter((s) => {
    if (s.status === ShiftStatus.PENDING_CLOSURE) return true
    if (s.status === ShiftStatus.IN_PROGRESS && isShiftPendingClosure(s, effectiveTimezone)) return true
    return false
  })

  // Identificar plantão em andamento (dentro do horário)
  const activeShift = shiftsWithTeam.find((s) =>
    s.status === ShiftStatus.IN_PROGRESS && !isShiftPendingClosure(s, effectiveTimezone)
  )

  // Plantões aguardando check-in (dentro da janela de horário)
  const pendingShifts = shiftsWithTeam.filter((s) => {
    if (s.status !== ShiftStatus.CONFIRMED) return false
    return isShiftInCurrentWindow(s, effectiveTimezone)
  })

  // Próximos plantões confirmados (fora da janela)
  const upcomingShifts = shiftsWithTeam.filter((s) => {
    if (s.status !== ShiftStatus.CONFIRMED) return false
    return !isShiftInCurrentWindow(s, effectiveTimezone)
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

  // PRIORIDADE 1: Plantões com encerramento pendente (alerta crítico)
  if (pendingClosureShifts.length > 0) {
    return (
      <div className="space-y-3">
        <PendingClosureBanner
          shift={pendingClosureShifts[0]}
          timezone={effectiveTimezone}
          onNavigate={navigate}
          canAdminCloseShift={canAdminCloseShift}
        />
        {/* Se há plantão ativo além do pendente, mostrar também */}
        {activeShift && <ActiveShiftBanner shift={activeShift} onNavigate={navigate} />}
        {(pendingClosureShifts.length > 1 || pendingShifts.length > 0 || upcomingShifts.length > 0) && (
          <OtherShiftsRow
            pendingClosureShifts={pendingClosureShifts.slice(1)}
            pendingShifts={pendingShifts}
            upcomingShifts={upcomingShifts}
            onNavigate={navigate}
          />
        )}
      </div>
    )
  }

  // PRIORIDADE 2: Plantão ativo (em andamento dentro do horário)
  if (activeShift) {
    return (
      <div className="space-y-3">
        <ActiveShiftBanner shift={activeShift} onNavigate={navigate} />
        {(pendingShifts.length > 0 || upcomingShifts.length > 0) && (
          <OtherShiftsRow
            pendingClosureShifts={[]}
            pendingShifts={pendingShifts}
            upcomingShifts={upcomingShifts}
            onNavigate={navigate}
          />
        )}
      </div>
    )
  }

  // PRIORIDADE 3: Plantão aguardando check-in
  if (pendingShifts.length > 0) {
    return (
      <div className="space-y-3">
        <PendingShiftBanner shift={pendingShifts[0]} onNavigate={navigate} />
        {(pendingShifts.length > 1 || upcomingShifts.length > 0) && (
          <OtherShiftsRow
            pendingClosureShifts={[]}
            pendingShifts={pendingShifts.slice(1)}
            upcomingShifts={upcomingShifts}
            onNavigate={navigate}
          />
        )}
      </div>
    )
  }

  // PRIORIDADE 4: Apenas plantões futuros confirmados
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
  canAdminCloseShift?: boolean
  timezone?: string
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

/**
 * Banner de alerta crítico para plantões com encerramento pendente.
 * Exibe um aviso vermelho para chamar atenção do RT/Admin.
 */
function PendingClosureBanner({
  shift,
  onNavigate,
  canAdminCloseShift = false,
  timezone,
}: ShiftBannerProps) {
  const template = shift.shiftTemplate
  const team = shift.team
  const startTime = template.tenantConfig?.customStartTime || template.startTime
  const endTime = template.tenantConfig?.customEndTime || template.endTime
  const shiftName = template.tenantConfig?.customName || template.name
  const memberCount = shift.members?.filter(m => !m.removedAt).length || 0
  const minutesOverdue = getMinutesSinceExpectedEnd(shift, timezone)

  // Formatar tempo excedido
  const formatOverdueTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  return (
    <div className="rounded-xl border-2 border-red-500 dark:border-red-600 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          {/* Indicador de alerta */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-25" />
            <div className="relative p-3 rounded-full bg-red-500 dark:bg-red-600">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                Encerramento Pendente
              </span>
              {minutesOverdue > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                  +{formatOverdueTime(minutesOverdue)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h3 className="text-lg sm:text-xl font-bold text-red-900 dark:text-red-100 leading-tight">
                {team?.name}
              </h3>
              <span className="text-red-700 dark:text-red-300">•</span>
              <span className="text-red-700 dark:text-red-300 font-medium break-words">
                {shiftName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 text-sm text-red-600 dark:text-red-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {startTime} - {endTime}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {memberCount} cuidador{memberCount !== 1 ? 'es' : ''}
              </span>
            </div>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-2">
              O líder/suplente não fez a passagem de plantão. RT pode encerrar administrativamente.
            </p>
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center gap-2">
          {canAdminCloseShift ? (
            <AdminCloseShiftDialog
              shift={shift}
              triggerLabel="Resolver"
              triggerClassName="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white"
            />
          ) : (
            <Button
              size="sm"
              onClick={() => onNavigate('/dashboard/escala-cuidados')}
              className="flex-1 md:flex-none bg-red-600 hover:bg-red-700 text-white"
            >
              Ver Escala
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

interface OtherShiftsRowProps {
  pendingClosureShifts: Shift[]
  pendingShifts: Shift[]
  upcomingShifts: Shift[]
  onNavigate: (path: string) => void
}

function OtherShiftsRow({ pendingClosureShifts, pendingShifts, upcomingShifts }: OtherShiftsRowProps) {
  const allShifts = [...pendingClosureShifts, ...pendingShifts, ...upcomingShifts]
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
            isPendingClosure={pendingClosureShifts.includes(shift)}
          />
        ))}
      </div>
    </div>
  )
}

interface ShiftChipProps {
  shift: Shift
  isPending?: boolean
  isPendingClosure?: boolean
}

function ShiftChip({ shift, isPending, isPendingClosure }: ShiftChipProps) {
  const template = shift.shiftTemplate
  const team = shift.team
  const startTime = template.tenantConfig?.customStartTime || template.startTime
  const endTime = template.tenantConfig?.customEndTime || template.endTime

  // Determinar estilo baseado no estado
  const getChipStyles = (): string => {
    if (isPendingClosure) {
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
    }
    if (isPending) {
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
    }
    return 'bg-muted text-muted-foreground border border-border'
  }

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 px-3 py-1.5 rounded-full text-xs ${getChipStyles()}`}
    >
      {isPendingClosure && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
      <span className="font-medium max-w-[120px] sm:max-w-none truncate">{team?.name}</span>
      <span className="opacity-60">•</span>
      <span>{startTime}-{endTime}</span>
    </div>
  )
}
