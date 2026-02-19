import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cake, CalendarDays } from 'lucide-react'
import { PhotoViewer } from '@/components/form/PhotoViewer'
import type { Resident } from '@/api/residents.api'
import { extractDateOnly } from '@/utils/dateHelpers'
import { formatBedFromResident } from '@/utils/formatters'
import { cn } from '@/lib/utils'

interface BirthdaysSectionProps {
  residents: Resident[]
  isLoading?: boolean
  onViewResident?: (residentId: string) => void
}

type BirthdayItem = {
  resident: Resident
  birthdayLabel: string
  ageLabel: string
  statusLabel: string
  isToday: boolean
  distanceInDays: number
}

export function BirthdaysSection({
  residents,
  isLoading,
  onViewResident,
}: BirthdaysSectionProps) {
  const birthdays = useMemo<BirthdayItem[]>(() => {
    if (!residents || residents.length === 0) return []

    const today = new Date()
    const todayAtNoon = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12,
      0,
      0,
      0,
    )
    const todayDay = todayAtNoon.getDate()
    const todayMonth = todayAtNoon.getMonth()
    const todayYear = todayAtNoon.getFullYear()
    const daysInCurrentMonth = new Date(todayYear, todayMonth + 1, 0).getDate()

    return residents
      .filter((resident) => resident.status === 'Ativo' && !!resident.birthDate)
      .map((resident) => {
        const dateKey = extractDateOnly(resident.birthDate as string)
        const [birthYear, birthMonth, birthDay] = dateKey.split('-').map(Number)

        if (!Number.isFinite(birthYear) || !Number.isFinite(birthMonth) || !Number.isFinite(birthDay)) {
          return null
        }

        const birthMonthIndex = birthMonth - 1
        if (birthMonthIndex !== todayMonth) {
          return null
        }

        const birthdayThisYear = new Date(todayYear, birthMonthIndex, birthDay, 12, 0, 0, 0)
        const isToday = birthdayThisYear.getTime() === todayAtNoon.getTime()
        const hasPassed = birthdayThisYear < todayAtNoon
        const distanceInDays =
          birthDay >= todayDay
            ? birthDay - todayDay
            : birthDay + daysInCurrentMonth - todayDay

        const currentAge =
          todayYear -
          birthYear -
          (
            todayMonth < birthMonthIndex ||
            (todayMonth === birthMonthIndex && todayDay < birthDay)
              ? 1
              : 0
          )

        const birthdayLabel = `${String(birthDay).padStart(2, '0')}/${String(birthMonth).padStart(2, '0')}`

        let statusLabel = 'Já ocorreu'
        let ageLabel = `${currentAge} anos`

        if (isToday) {
          statusLabel = 'Hoje'
        } else if (!hasPassed) {
          statusLabel = distanceInDays === 1 ? 'Amanhã' : `Em ${distanceInDays} dias`
          ageLabel = `${currentAge} anos (completa ${currentAge + 1})`
        }

        return {
          resident,
          birthdayLabel,
          ageLabel,
          statusLabel,
          isToday,
          distanceInDays,
        }
      })
      .filter((item): item is BirthdayItem => item !== null)
      .sort((a, b) => a.distanceInDays - b.distanceInDays || a.resident.fullName.localeCompare(b.resident.fullName))
  }, [residents])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-primary" />
            Aniversariantes do mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (birthdays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-primary" />
            Aniversariantes do mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Nenhum aniversariante neste mês
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5 text-primary" />
          Aniversariantes do mês
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {birthdays.length} {birthdays.length === 1 ? 'residente faz' : 'residentes fazem'} aniversário neste mês
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {birthdays.map((item) => (
            <div
              key={`birthday-${item.resident.id}`}
              role={onViewResident ? 'button' : undefined}
              tabIndex={onViewResident ? 0 : undefined}
              onClick={onViewResident ? () => onViewResident(item.resident.id) : undefined}
              onKeyDown={
                onViewResident
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onViewResident(item.resident.id)
                      }
                    }
                  : undefined
              }
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border border-border',
                onViewResident && 'cursor-pointer hover:bg-accent/40 transition-colors',
              )}
            >
              <PhotoViewer
                photoUrl={item.resident.fotoUrl}
                altText={item.resident.fullName}
                size="sm"
                rounded={true}
              />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.resident.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.resident.bedId ? `Leito ${formatBedFromResident(item.resident)}` : 'Sem leito atribuído'}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Aniversário: {item.birthdayLabel} • Idade: {item.ageLabel}
                </p>
              </div>

              <Badge className={cn(item.isToday ? 'bg-success text-white' : '')} variant={item.isToday ? 'default' : 'secondary'}>
                {item.statusLabel}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

