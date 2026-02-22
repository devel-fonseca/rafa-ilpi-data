import { AlertSeverity, AlertStatus } from '@/api/vitalSignAlerts.api'
import type { IncidentCategory } from '@/types/incidents'
import { INCIDENT_CATEGORY_LABELS } from '@/types/incidents'

export type ClinicalBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

export interface ClinicalBadgeConfig {
  label: string
  variant: ClinicalBadgeVariant
}

export function getClinicalSeverityBadge(
  severity: AlertSeverity | string | null | undefined,
): ClinicalBadgeConfig | null {
  if (!severity) return null

  switch (String(severity).toUpperCase()) {
    case 'CRITICAL':
      return { label: 'Crítico', variant: 'danger' }
    case 'CRITICA':
      return { label: 'Crítica', variant: 'danger' }
    case 'GRAVE':
      return { label: 'Grave', variant: 'danger' }
    case 'WARNING':
      return { label: 'Atenção', variant: 'warning' }
    case 'MODERADA':
      return { label: 'Moderada', variant: 'warning' }
    case 'INFO':
      return { label: 'Info', variant: 'secondary' }
    case 'LEVE':
      return { label: 'Leve', variant: 'secondary' }
    default:
      return { label: String(severity), variant: 'outline' }
  }
}

export function getAlertStatusBadge(
  status: AlertStatus | null | undefined,
): ClinicalBadgeConfig | null {
  if (!status) return null

  switch (status) {
    case AlertStatus.ACTIVE:
      return { label: 'Ativo', variant: 'outline' }
    case AlertStatus.IN_TREATMENT:
      return { label: 'Em tratamento', variant: 'default' }
    case AlertStatus.MONITORING:
      return { label: 'Monitorando', variant: 'secondary' }
    case AlertStatus.RESOLVED:
      return { label: 'Resolvido', variant: 'success' }
    case AlertStatus.IGNORED:
      return { label: 'Ignorado', variant: 'secondary' }
    default:
      return { label: status, variant: 'outline' }
  }
}

export function getIncidentTypeBadge(
  category: IncidentCategory | null | undefined,
): ClinicalBadgeConfig | null {
  if (!category) return null
  return {
    label: INCIDENT_CATEGORY_LABELS[category],
    variant: 'info',
  }
}

export function getContextBadge(
  context: string | null | undefined,
): ClinicalBadgeConfig | null {
  if (!context?.trim()) return null
  return {
    label: context.trim(),
    variant: 'outline',
  }
}

export function getOriginBadge(
  origin: 'RECORD' | 'VITAL_ALERT' | 'automatic' | 'manual',
): ClinicalBadgeConfig {
  if (origin === 'RECORD') {
    return { label: 'Registro diário', variant: 'default' }
  }
  if (origin === 'VITAL_ALERT') {
    return { label: 'Alerta vital', variant: 'secondary' }
  }
  if (origin === 'automatic') {
    return { label: 'Detecção automática', variant: 'secondary' }
  }
  return { label: 'Registro manual', variant: 'secondary' }
}

export function getPriorityBadge(
  priority: number | null | undefined,
): ClinicalBadgeConfig | null {
  if (!priority || priority < 4) return null
  return {
    label: `Prioridade ${priority}`,
    variant: 'danger',
  }
}

export function getSentinelBadge(
  isSentinel: boolean | null | undefined,
): ClinicalBadgeConfig | null {
  if (!isSentinel) return null
  return {
    label: 'Evento sentinela',
    variant: 'danger',
  }
}
