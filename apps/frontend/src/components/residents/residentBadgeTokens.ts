import type { DependencyLevel } from '@/api/resident-health.api'
import type { StatusBadgeProps } from '@/design-system/components'

type ResidentBadgeVariant = NonNullable<StatusBadgeProps['variant']>

interface ResidentStatusBadgeConfig {
  label: string
  variant: ResidentBadgeVariant
}

const RESIDENT_STATUS_BADGE_CONFIG: Record<string, ResidentStatusBadgeConfig> = {
  ATIVO: { label: 'Ativo', variant: 'success' },
  INATIVO: { label: 'Inativo', variant: 'warning' },
  ALTA: { label: 'Alta', variant: 'info' },
  TRANSFERIDO: { label: 'Transferido', variant: 'info' },
  OBITO: { label: 'Óbito', variant: 'danger' },
  FALECIDO: { label: 'Óbito', variant: 'danger' },
}

const DEPENDENCY_LEVEL_BADGE_VARIANTS: Record<DependencyLevel, ResidentBadgeVariant> = {
  GRAU_I: 'primary',
  GRAU_II: 'warning',
  GRAU_III: 'danger',
}

export const RESIDENT_MOBILITY_BADGE_VARIANT: ResidentBadgeVariant = 'info'

function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeResidentStatus(status?: string | null): string {
  if (!status) return ''

  return removeDiacritics(status)
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase()
}

export function getResidentStatusBadge(status?: string | null): ResidentStatusBadgeConfig {
  const normalizedStatus = normalizeResidentStatus(status)
  const config = RESIDENT_STATUS_BADGE_CONFIG[normalizedStatus]

  if (config) return config

  return {
    label: status || 'Não informado',
    variant: 'secondary',
  }
}

export function getDependencyLevelBadgeVariant(level: DependencyLevel): ResidentBadgeVariant {
  return DEPENDENCY_LEVEL_BADGE_VARIANTS[level]
}
