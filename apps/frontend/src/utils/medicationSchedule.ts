import { normalizeUTCDate } from './dateHelpers'

export type WeeklyMedicationFrequency = 'UMA_VEZ_SEMANA' | 'DUAS_VEZES_SEMANA'

const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

export const WEEKDAY_OPTIONS = [
  { value: 0, label: WEEKDAY_LABELS[0] },
  { value: 1, label: WEEKDAY_LABELS[1] },
  { value: 2, label: WEEKDAY_LABELS[2] },
  { value: 3, label: WEEKDAY_LABELS[3] },
  { value: 4, label: WEEKDAY_LABELS[4] },
  { value: 5, label: WEEKDAY_LABELS[5] },
  { value: 6, label: WEEKDAY_LABELS[6] },
]

export function normalizeScheduledWeekDays(weekDays: unknown): number[] {
  if (!Array.isArray(weekDays)) return []

  const validDays = weekDays
    .filter((day): day is number => Number.isInteger(day))
    .filter((day) => day >= 0 && day <= 6)

  return Array.from(new Set(validDays)).sort((a, b) => a - b)
}

export function isWeeklyMedicationFrequency(frequency?: string | null): frequency is WeeklyMedicationFrequency {
  return frequency === 'UMA_VEZ_SEMANA' || frequency === 'DUAS_VEZES_SEMANA'
}

export function getRequiredWeekDaysForFrequency(frequency?: string | null): number {
  if (frequency === 'UMA_VEZ_SEMANA') return 1
  if (frequency === 'DUAS_VEZES_SEMANA') return 2
  return 0
}

export function isMedicationScheduledForDate(
  frequency: string | null | undefined,
  scheduledWeekDays: unknown,
  targetDate: string | Date,
): boolean {
  if (!isWeeklyMedicationFrequency(frequency)) {
    return true
  }

  const weekDays = normalizeScheduledWeekDays(scheduledWeekDays)
  if (weekDays.length === 0) return false

  const date = targetDate instanceof Date ? targetDate : normalizeUTCDate(targetDate)
  return weekDays.includes(date.getDay())
}

export function formatScheduledWeekDays(weekDays: unknown): string {
  const normalizedDays = normalizeScheduledWeekDays(weekDays)
  if (normalizedDays.length === 0) return '-'

  return normalizedDays
    .map((day) => WEEKDAY_LABELS[day] || String(day))
    .join(', ')
}
