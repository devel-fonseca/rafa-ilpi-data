// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - TodayShiftsInfo (Equipes de Plantão de Hoje)
// ──────────────────────────────────────────────────────────────────────────────

import { Clock, Loader2 } from 'lucide-react'
import { useShifts } from '@/hooks/care-shifts/useShifts'
import { getCurrentDate } from '@/utils/dateHelpers'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Verifica se o horário atual está dentro do período do turno.
 * Lida corretamente com turnos noturnos que cruzam a meia-noite.
 */
function isCurrentShift(startTime: string, endTime: string): boolean {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  // Turno normal (não cruza meia-noite): ex 07:00-15:00
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  // Turno noturno (cruza meia-noite): ex 23:00-07:00
  // Está no turno se: após o início OU antes do fim
  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

/**
 * Componente compacto que mostra as equipes escaladas para os plantões de hoje.
 * Destaca o plantão em andamento no momento.
 */
export function TodayShiftsInfo() {
  const today = getCurrentDate()

  const { data: shifts = [], isLoading } = useShifts({
    startDate: today,
    endDate: today,
  })

  // Filtrar apenas plantões com equipe designada
  const shiftsWithTeam = shifts.filter((shift) => shift.team)

  if (isLoading) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        <Skeleton className="h-4 w-48" />
      </div>
    )
  }

  if (shiftsWithTeam.length === 0) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Nenhuma equipe escalada para hoje
        </span>
      </div>
    )
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
      <div className="mb-3">
        <span className="text-sm font-medium text-foreground">
          Equipes de Plantão Hoje
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {shiftsWithTeam.map((shift) => {
          const template = shift.shiftTemplate
          const team = shift.team
          const startTime = template.tenantConfig?.customStartTime || template.startTime
          const endTime = template.tenantConfig?.customEndTime || template.endTime
          const shiftName = template.tenantConfig?.customName || template.name
          const isCurrent = isCurrentShift(startTime, endTime)

          return (
            <div
              key={shift.id}
              className={`flex items-center gap-2 rounded-md px-3 py-2 ${
                isCurrent
                  ? 'bg-success/10 border-2 border-success'
                  : 'bg-background border border-border'
              }`}
            >
              {isCurrent && (
                <Badge variant="default" className="text-xs bg-success text-success-foreground">
                  Agora
                </Badge>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>{startTime}-{endTime}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {shiftName}
              </Badge>
              <span className="text-sm font-medium text-foreground">
                {team?.name}
              </span>
              <span className="text-xs text-muted-foreground">
                ({shift.members?.length || team?.members?.length || 0} membros)
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
