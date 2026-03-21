export const BED_STATUS_VALUES = ['Disponível', 'Ocupado', 'Manutenção', 'Reservado'] as const

export type BedStatus = (typeof BED_STATUS_VALUES)[number]

const BED_STATUS_ALIASES: Record<string, BedStatus> = {
  DISPONIVEL: 'Disponível',
  DISPONÍVEL: 'Disponível',
  OCUPADO: 'Ocupado',
  MANUTENCAO: 'Manutenção',
  MANUTENÇÃO: 'Manutenção',
  RESERVADO: 'Reservado',
}

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeInfrastructureCode(value: string): string {
  return stripDiacritics(value).trim().toUpperCase()
}

export function normalizeBedStatus(value?: string | null): BedStatus | undefined {
  if (!value) return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  const directMatch = BED_STATUS_VALUES.find((status) => status === trimmed)
  if (directMatch) return directMatch

  const normalizedKey = stripDiacritics(trimmed).toUpperCase()
  return BED_STATUS_ALIASES[normalizedKey]
}

export function extractBedSuffix(value: string): string {
  const normalized = normalizeInfrastructureCode(value)
  const parts = normalized.split('-').filter(Boolean)
  return parts[parts.length - 1] || normalized
}

export function composeBedCode(
  buildingCode: string,
  floorCode: string,
  roomCode: string,
  bedSuffix: string,
): string {
  return `${normalizeInfrastructureCode(buildingCode)}${normalizeInfrastructureCode(floorCode)}-${normalizeInfrastructureCode(roomCode)}-${normalizeInfrastructureCode(bedSuffix)}`
}
