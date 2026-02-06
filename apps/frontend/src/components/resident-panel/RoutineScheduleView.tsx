// ──────────────────────────────────────────────────────────────────────────────
//  COMPONENT - RoutineScheduleView (Painel do Residente)
// ──────────────────────────────────────────────────────────────────────────────

import { Badge } from '@/components/ui/badge'
import { EmptyState, LoadingSpinner } from '@/design-system/components'
import { CalendarDays } from 'lucide-react'
import { useScheduleConfigsByResident, ResidentScheduleConfig, ScheduleFrequency } from '@/hooks/useResidentSchedule'
import { RECORD_TYPE_LABELS } from '@/utils/recordTypeLabels'
import { MEAL_TYPES } from '@/constants/meal-types'

// ========== CONSTANTS ==========

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// ========== TYPES ==========

interface RoutineScheduleViewProps {
  residentId: string
}

interface GroupedConfig {
  recordType: string
  frequency: ScheduleFrequency
  dayOfWeek?: number
  dayOfMonth?: number
  configs: ResidentScheduleConfig[]
}

// ========== HELPERS ==========

function getFirstTime(config: ResidentScheduleConfig): string {
  return config.suggestedTimes.length > 0 ? config.suggestedTimes[0] : '99:99'
}

function groupConfigs(configs: ResidentScheduleConfig[]): GroupedConfig[] {
  const groups: Map<string, GroupedConfig> = new Map()

  for (const config of configs) {
    // Chave de agrupamento: tipo + frequência + dia (se aplicável)
    let key = `${config.recordType}-${config.frequency}`
    if (config.frequency === 'WEEKLY' && config.dayOfWeek !== undefined) {
      key += `-${config.dayOfWeek}`
    }
    if (config.frequency === 'MONTHLY' && config.dayOfMonth !== undefined) {
      key += `-${config.dayOfMonth}`
    }

    if (!groups.has(key)) {
      groups.set(key, {
        recordType: config.recordType,
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek,
        dayOfMonth: config.dayOfMonth,
        configs: [],
      })
    }
    groups.get(key)!.configs.push(config)
  }

  // Ordenar configs dentro de cada grupo por horário
  for (const group of groups.values()) {
    group.configs.sort((a, b) => getFirstTime(a).localeCompare(getFirstTime(b)))
  }

  // Ordenar grupos por frequência e depois por horário do primeiro config
  return Array.from(groups.values()).sort((a, b) => {
    const freqOrder = { DAILY: 0, WEEKLY: 1, MONTHLY: 2 }
    const freqDiff = freqOrder[a.frequency] - freqOrder[b.frequency]
    if (freqDiff !== 0) return freqDiff
    return getFirstTime(a.configs[0]).localeCompare(getFirstTime(b.configs[0]))
  })
}

// ========== COMPONENT ==========

export function RoutineScheduleView({ residentId }: RoutineScheduleViewProps) {
  const { data: configs = [], isLoading } = useScheduleConfigsByResident(residentId)

  if (isLoading) {
    return <LoadingSpinner size="sm" message="Carregando programação..." />
  }

  if (configs.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nenhuma programação configurada"
        description="Este residente não possui rotina programada"
      />
    )
  }

  const groupedConfigs = groupConfigs(configs)

  return (
    <div className="space-y-2">
      {groupedConfigs.map((group, index) => (
        <GroupItem key={index} group={group} />
      ))}
    </div>
  )
}

// ========== SUB-COMPONENTS ==========

interface GroupItemProps {
  group: GroupedConfig
}

function GroupItem({ group }: GroupItemProps) {
  const recordLabel = RECORD_TYPE_LABELS[group.recordType]?.label || group.recordType

  // Construir descrição de horários
  let timesDescription: string

  if (group.recordType === 'ALIMENTACAO') {
    // Para alimentação, mostrar cada refeição com horário
    timesDescription = group.configs.map((config) => {
      const metadata = config.metadata as { mealType?: string }
      const mealType = MEAL_TYPES.find((m) => m.value === metadata?.mealType)
      return `${mealType?.label || metadata?.mealType}: ${config.suggestedTimes[0]}`
    }).join(' • ')
  } else {
    // Para outros tipos, mostrar horários separados por vírgula
    timesDescription = group.configs.flatMap((c) => c.suggestedTimes).join(', ')
  }

  // Adicionar dia da semana/mês se aplicável
  const parts: string[] = []

  if (group.frequency === 'WEEKLY' && group.dayOfWeek !== undefined) {
    parts.push(WEEKDAY_SHORT[group.dayOfWeek])
  }

  if (group.frequency === 'MONTHLY' && group.dayOfMonth !== undefined) {
    parts.push(`Dia ${group.dayOfMonth}`)
  }

  parts.push(timesDescription)

  // Badge de frequência
  const frequencyBadge = group.frequency !== 'DAILY' ? (
    group.frequency === 'WEEKLY' ? 'Semanal' : 'Mensal'
  ) : null

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{recordLabel}</span>
          {frequencyBadge && (
            <Badge variant="outline" className="text-xs">
              {frequencyBadge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {parts.join(' • ')}
        </p>
      </div>
    </div>
  )
}
