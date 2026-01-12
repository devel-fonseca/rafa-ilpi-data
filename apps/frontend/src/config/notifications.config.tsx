/**
 * Configuração centralizada de notificações
 *
 * Este arquivo contém todas as configurações visuais e labels para
 * categorias e severidades de notificações, garantindo consistência
 * entre NotificationsPage e NotificationsDropdown.
 */

import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileText,
  HeartPulse,
  Pill,
  Calendar,
  BookOpen,
} from 'lucide-react'
import { NotificationCategory, NotificationSeverity } from '@/api/notifications.api'
import type { LucideIcon } from 'lucide-react'

export interface CategoryConfig {
  label: string
  icon: LucideIcon
}

/**
 * Configuração de categorias de notificações
 *
 * ⚠️ IMPORTANTE: Sempre adicionar TODAS as categorias do enum NotificationCategory
 * para evitar erros de acesso a propriedades undefined
 */
export const NOTIFICATION_CATEGORY_CONFIG: Record<NotificationCategory, CategoryConfig> = {
  [NotificationCategory.PRESCRIPTION]: {
    label: 'Prescrições',
    icon: Pill,
  },
  [NotificationCategory.VITAL_SIGN]: {
    label: 'Sinais Vitais',
    icon: HeartPulse,
  },
  [NotificationCategory.DOCUMENT]: {
    label: 'Documentos',
    icon: FileText,
  },
  [NotificationCategory.MEDICATION]: {
    label: 'Medicação',
    icon: Pill,
  },
  [NotificationCategory.DAILY_RECORD]: {
    label: 'Registros',
    icon: FileText,
  },
  [NotificationCategory.POP]: {
    label: 'POPs',
    icon: BookOpen,
  },
  [NotificationCategory.SYSTEM]: {
    label: 'Sistema',
    icon: Info,
  },
  [NotificationCategory.SCHEDULED_EVENT]: {
    label: 'Agendamentos',
    icon: Calendar,
  },
  [NotificationCategory.INSTITUTIONAL_EVENT]: {
    label: 'Eventos Institucionais',
    icon: Calendar,
  },
  [NotificationCategory.INCIDENT]: {
    label: 'Intercorrências',
    icon: AlertTriangle,
  },
}

/**
 * Fallback para categorias desconhecidas
 * Usado quando uma categoria não existe no config acima
 */
export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  label: 'Sistema',
  icon: Bell,
}

/**
 * Ícones para severidades de notificações
 */
export const NOTIFICATION_SEVERITY_ICONS: Record<NotificationSeverity, LucideIcon> = {
  [NotificationSeverity.CRITICAL]: AlertTriangle,
  [NotificationSeverity.WARNING]: AlertTriangle,
  [NotificationSeverity.INFO]: Info,
  [NotificationSeverity.SUCCESS]: CheckCircle2,
}

/**
 * Labels user-friendly para severidades
 */
export const NOTIFICATION_SEVERITY_LABELS: Record<NotificationSeverity, string> = {
  [NotificationSeverity.CRITICAL]: 'Crítico',
  [NotificationSeverity.WARNING]: 'Aviso',
  [NotificationSeverity.INFO]: 'Info',
  [NotificationSeverity.SUCCESS]: 'Sucesso',
}

/**
 * Helper para obter configuração de categoria com fallback seguro
 *
 * @param category - Categoria da notificação
 * @returns Configuração da categoria ou fallback padrão
 */
export function getCategoryConfig(category: NotificationCategory): CategoryConfig {
  return NOTIFICATION_CATEGORY_CONFIG[category] || DEFAULT_CATEGORY_CONFIG
}

/**
 * Helper para obter ícone de severidade
 *
 * @param severity - Severidade da notificação
 * @returns Componente de ícone Lucide
 */
export function getSeverityIcon(severity: NotificationSeverity): LucideIcon {
  return NOTIFICATION_SEVERITY_ICONS[severity] || Info
}

/**
 * Helper para obter label de severidade
 *
 * @param severity - Severidade da notificação
 * @returns Label user-friendly
 */
export function getSeverityLabel(severity: NotificationSeverity): string {
  return NOTIFICATION_SEVERITY_LABELS[severity] || 'Info'
}
