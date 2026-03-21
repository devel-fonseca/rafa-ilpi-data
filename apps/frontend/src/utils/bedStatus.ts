export const BED_STATUS_VALUES = ['Disponível', 'Ocupado', 'Manutenção', 'Reservado'] as const

export type BedStatus = (typeof BED_STATUS_VALUES)[number]

const BED_STATUS_MAP: Record<string, BedStatus> = {
  DISPONIVEL: 'Disponível',
  DISPONÍVEL: 'Disponível',
  OCUPADO: 'Ocupado',
  MANUTENCAO: 'Manutenção',
  MANUTENÇÃO: 'Manutenção',
  RESERVADO: 'Reservado',
  'Disponível': 'Disponível',
  'Ocupado': 'Ocupado',
  'Manutenção': 'Manutenção',
  'Reservado': 'Reservado',
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeBedStatus(status?: string | null): BedStatus | undefined {
  if (!status) return undefined
  const trimmed = status.trim()
  if (!trimmed) return undefined

  const directMatch = BED_STATUS_VALUES.find((value) => value === trimmed)
  if (directMatch) return directMatch

  return BED_STATUS_MAP[stripDiacritics(trimmed).toUpperCase()]
}

export function isAvailableBedStatus(status?: string | null): boolean {
  return normalizeBedStatus(status) === 'Disponível'
}

export function isOccupiedBedStatus(status?: string | null): boolean {
  return normalizeBedStatus(status) === 'Ocupado'
}
