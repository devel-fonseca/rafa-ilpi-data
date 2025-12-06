/**
 * 🎨 Design System RAFA ILPI - Tokens de Cores
 *
 * Este arquivo centraliza TODOS os tokens de cores semânticas do sistema.
 * Elimina 400+ cores hardcoded espalhadas pelo código.
 *
 * Princípios:
 * - Tokens específicos por contexto (ex: bed-available vs success)
 * - Mesmo cores base iguais têm tokens separados para flexibilidade
 * - HSL para compatibilidade com shadcn/ui e opacidade
 * - Type-safe com TypeScript
 *
 * @author Dr. E. (Emanuel) + Claude Code
 * @date 24 de novembro de 2025
 */

// ========== TYPES ==========

/**
 * Status de leitos na ILPI
 */
export type BedStatus = 'DISPONIVEL' | 'OCUPADO' | 'MANUTENCAO' | 'RESERVADO'

/**
 * Tipos de quartos
 */
export type RoomType = 'INDIVIDUAL' | 'DUPLO' | 'TRIPLO' | 'COLETIVO'

/**
 * Tipos de registros diários
 */
export type RecordType =
  | 'HIGIENE'
  | 'ALIMENTACAO'
  | 'HIDRATACAO'
  | 'MONITORAMENTO'
  | 'ELIMINACAO'
  | 'COMPORTAMENTO'
  | 'INTERCORRENCIA'
  | 'ATIVIDADES'
  | 'VISITA'
  | 'OUTROS'

/**
 * Níveis de severidade para alertas
 */
export type Severity = 'CRITICAL' | 'WARNING' | 'INFO'

/**
 * Severidades de notificações
 */
export type NotificationSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS'

/**
 * Categorias de notificações
 */
export type NotificationCategory = 'PRESCRIPTION' | 'VITAL_SIGN' | 'DOCUMENT' | 'MEDICATION' | 'DAILY_RECORD' | 'SYSTEM'

/**
 * Categorias de medicamentos
 */
export type MedicationCategory = 'CONTROLADO' | 'SOS' | 'ALTO_RISCO'

/**
 * Classes de medicamentos controlados
 */
export type ControlledClass = 'BZD' | 'PSICOFARMACO' | 'OPIOIDE' | 'ANTICONVULSIVANTE' | 'OUTRO'

// ========== COLOR TOKENS ==========

/**
 * Mapeamento de status de leitos para classes Tailwind
 *
 * Uso:
 * ```tsx
 * const classes = BED_STATUS_COLORS[status]
 * <Badge className={classes}>Disponível</Badge>
 * ```
 */
export const BED_STATUS_COLORS: Record<BedStatus, string> = {
  DISPONIVEL: 'bg-success/10 text-success border-success/30',
  OCUPADO: 'bg-danger/10 text-danger border-danger/30',
  MANUTENCAO: 'bg-warning/10 text-warning border-warning/30',
  RESERVADO: 'bg-info/10 text-info border-info/30',
}

/**
 * Mapeamento de tipos de quarto para classes Tailwind
 */
export const ROOM_TYPE_COLORS: Record<RoomType, string> = {
  INDIVIDUAL: 'bg-blue-100 text-blue-800 border-blue-300',
  DUPLO: 'bg-green-100 text-green-800 border-green-300',
  TRIPLO: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  COLETIVO: 'bg-purple-100 text-purple-800 border-purple-300',
}

/**
 * Mapeamento de tipos de registro diário para classes Tailwind
 *
 * Cada tipo tem cor, bgColor e label para uso em badges e tags
 */
export const RECORD_TYPE_CONFIG: Record<
  RecordType,
  { label: string; color: string; bgColor: string }
> = {
  HIGIENE: {
    label: 'Higiene',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-300',
  },
  ALIMENTACAO: {
    label: 'Alimentação',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
  },
  HIDRATACAO: {
    label: 'Hidratação',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100 border-cyan-300',
  },
  MONITORAMENTO: {
    label: 'Monitoramento',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-300',
  },
  ELIMINACAO: {
    label: 'Eliminação',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-300',
  },
  COMPORTAMENTO: {
    label: 'Comportamento',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-300',
  },
  INTERCORRENCIA: {
    label: 'Intercorrência',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
  },
  ATIVIDADES: {
    label: 'Atividades',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100 border-indigo-300',
  },
  VISITA: {
    label: 'Visita',
    color: 'text-pink-700',
    bgColor: 'bg-pink-100 border-pink-300',
  },
  OUTROS: {
    label: 'Outros',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100 border-slate-300',
  },
}

/**
 * Mapeamento de severidade para classes Tailwind
 *
 * Usado em alertas de prescrições, notificações, etc.
 */
export const SEVERITY_COLORS: Record<
  Severity,
  { bg: string; badge: string; icon: string; border: string }
> = {
  CRITICAL: {
    bg: 'bg-danger/5',
    badge: 'bg-danger/10 text-danger border-danger/30',
    icon: 'text-danger',
    border: 'border-danger/30',
  },
  WARNING: {
    bg: 'bg-warning/5',
    badge: 'bg-warning/10 text-warning border-warning/30',
    icon: 'text-warning',
    border: 'border-warning/30',
  },
  INFO: {
    bg: 'bg-info/5',
    badge: 'bg-info/10 text-info border-info/30',
    icon: 'text-info',
    border: 'border-info/30',
  },
}

/**
 * Mapeamento de categorias de medicamentos para classes Tailwind
 */
export const MEDICATION_COLORS: Record<MedicationCategory, string> = {
  CONTROLADO: 'bg-accent/10 text-accent border-accent/30',
  SOS: 'bg-warning/10 text-warning border-warning/30',
  ALTO_RISCO: 'bg-danger/10 text-danger border-danger/30',
}

/**
 * Mapeamento de classes de controlados para classes Tailwind
 */
export const CONTROLLED_CLASS_COLORS: Record<ControlledClass, string> = {
  BZD: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  PSICOFARMACO: 'bg-purple-100 text-purple-700 border-purple-300',
  OPIOIDE: 'bg-red-100 text-red-700 border-red-300',
  ANTICONVULSIVANTE: 'bg-blue-100 text-blue-700 border-blue-300',
  OUTRO: 'bg-gray-100 text-gray-700 border-gray-300',
}

/**
 * Mapeamento de severidade de notificações para classes Tailwind
 *
 * Usado no dropdown e página completa de notificações
 */
export const NOTIFICATION_SEVERITY_COLORS: Record<
  NotificationSeverity,
  { bg: string; icon: string; badge: string; border: string }
> = {
  CRITICAL: {
    bg: 'bg-danger/5',
    icon: 'text-danger',
    badge: 'bg-danger/10 text-danger border-danger/30',
    border: 'border-danger/30',
  },
  WARNING: {
    bg: 'bg-warning/5',
    icon: 'text-warning',
    badge: 'bg-warning/10 text-warning border-warning/30',
    border: 'border-warning/30',
  },
  INFO: {
    bg: 'bg-info/5',
    icon: 'text-info',
    badge: 'bg-info/10 text-info border-info/30',
    border: 'border-info/30',
  },
  SUCCESS: {
    bg: 'bg-success/5',
    icon: 'text-success',
    badge: 'bg-success/10 text-success border-success/30',
    border: 'border-success/30',
  },
}

/**
 * Mapeamento de categorias de notificações para classes Tailwind
 *
 * Cada categoria tem cor específica para ícones e badges
 */
export const NOTIFICATION_CATEGORY_COLORS: Record<
  NotificationCategory,
  { icon: string; color: string }
> = {
  PRESCRIPTION: {
    icon: 'text-blue-600',
    color: 'text-blue-600',
  },
  VITAL_SIGN: {
    icon: 'text-red-600',
    color: 'text-red-600',
  },
  DOCUMENT: {
    icon: 'text-yellow-600',
    color: 'text-yellow-600',
  },
  MEDICATION: {
    icon: 'text-green-600',
    color: 'text-green-600',
  },
  DAILY_RECORD: {
    icon: 'text-purple-600',
    color: 'text-purple-600',
  },
  SYSTEM: {
    icon: 'text-gray-600',
    color: 'text-gray-600',
  },
}

// ========== HELPER FUNCTIONS ==========

/**
 * Retorna classes Tailwind para um status de leito
 *
 * @param status - Status do leito
 * @returns Classes Tailwind para aplicar no componente
 *
 * @example
 * ```tsx
 * const classes = getBedStatusColor('DISPONIVEL')
 * <Badge className={classes}>Disponível</Badge>
 * ```
 */
export function getBedStatusColor(status: BedStatus): string {
  return BED_STATUS_COLORS[status] || BED_STATUS_COLORS.DISPONIVEL
}

/**
 * Retorna classes Tailwind para um tipo de quarto
 *
 * @param type - Tipo do quarto
 * @returns Classes Tailwind
 */
export function getRoomTypeColor(type: RoomType): string {
  return ROOM_TYPE_COLORS[type] || ROOM_TYPE_COLORS.INDIVIDUAL
}

/**
 * Retorna configuração completa de cores para um tipo de registro
 *
 * @param type - Tipo de registro diário
 * @returns Objeto com label, color e bgColor
 *
 * @example
 * ```tsx
 * const config = getRecordTypeConfig('HIGIENE')
 * <div className={config.bgColor}>
 *   <span className={config.color}>{config.label}</span>
 * </div>
 * ```
 */
export function getRecordTypeConfig(type: RecordType) {
  return RECORD_TYPE_CONFIG[type] || RECORD_TYPE_CONFIG.OUTROS
}

/**
 * Retorna apenas as classes de cor para um tipo de registro
 *
 * @param type - Tipo de registro diário
 * @returns Classes Tailwind combinadas (text + bg + border)
 */
export function getRecordTypeColor(type: RecordType): string {
  const config = getRecordTypeConfig(type)
  return `${config.color} ${config.bgColor}`
}

/**
 * Retorna configuração completa de cores para uma severidade
 *
 * @param severity - Nível de severidade
 * @returns Objeto com bg, badge, icon e border
 *
 * @example
 * ```tsx
 * const colors = getSeverityColors('CRITICAL')
 * <Alert className={colors.bg}>
 *   <AlertCircle className={colors.icon} />
 *   <Badge className={colors.badge}>Crítico</Badge>
 * </Alert>
 * ```
 */
export function getSeverityColors(severity: Severity) {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS.INFO
}

/**
 * Retorna apenas a classe de badge para uma severidade
 *
 * @param severity - Nível de severidade
 * @returns Classes Tailwind para badge
 */
export function getSeverityBadgeColor(severity: Severity): string {
  return SEVERITY_COLORS[severity].badge
}

/**
 * Retorna classes Tailwind para uma categoria de medicamento
 *
 * @param category - Categoria do medicamento
 * @returns Classes Tailwind
 */
export function getMedicationColor(category: MedicationCategory): string {
  return MEDICATION_COLORS[category] || MEDICATION_COLORS.CONTROLADO
}

/**
 * Retorna classes Tailwind para uma classe de medicamento controlado
 *
 * @param controlledClass - Classe do medicamento controlado
 * @returns Classes Tailwind
 */
export function getControlledClassColor(controlledClass: ControlledClass): string {
  return CONTROLLED_CLASS_COLORS[controlledClass] || CONTROLLED_CLASS_COLORS.OUTRO
}

/**
 * Retorna cor baseada em taxa de ocupação (para indicadores visuais)
 *
 * @param rate - Taxa de ocupação (0-100)
 * @returns Classe Tailwind de cor de fundo
 *
 * @example
 * ```tsx
 * const color = getOccupancyColor(85)
 * <div className={`h-2 rounded ${color}`} />
 * ```
 */
export function getOccupancyColor(rate: number): string {
  if (rate >= 90) return 'bg-danger'
  if (rate >= 70) return 'bg-warning'
  return 'bg-success'
}

/**
 * Retorna cor baseada em percentual de aceitação alimentar
 *
 * @param percentage - Percentual de aceitação (0-100)
 * @returns Objeto com classes de background e texto
 *
 * @example
 * ```tsx
 * const colors = getAcceptanceColor(80)
 * <Badge className={`${colors.bg} ${colors.text}`}>
 *   80% aceito
 * </Badge>
 * ```
 */
export function getAcceptanceColor(percentage: number): { bg: string; text: string } {
  if (percentage >= 75) {
    return { bg: 'bg-success/10', text: 'text-success' }
  }
  if (percentage >= 50) {
    return { bg: 'bg-warning/10', text: 'text-warning' }
  }
  return { bg: 'bg-danger/10', text: 'text-danger' }
}

/**
 * Retorna configuração completa de cores para uma severidade de notificação
 *
 * @param severity - Nível de severidade da notificação
 * @returns Objeto com bg, icon, badge e border
 *
 * @example
 * ```tsx
 * const colors = getNotificationSeverityColors('CRITICAL')
 * <div className={colors.bg}>
 *   <Bell className={colors.icon} />
 *   <Badge className={colors.badge}>Crítico</Badge>
 * </div>
 * ```
 */
export function getNotificationSeverityColors(severity: NotificationSeverity) {
  return NOTIFICATION_SEVERITY_COLORS[severity] || NOTIFICATION_SEVERITY_COLORS.INFO
}

/**
 * Retorna configuração de cores para uma categoria de notificação
 *
 * @param category - Categoria da notificação
 * @returns Objeto com icon e color
 *
 * @example
 * ```tsx
 * const config = getNotificationCategoryConfig('PRESCRIPTION')
 * <FileText className={config.icon} />
 * <span className={config.color}>Prescrição</span>
 * ```
 */
export function getNotificationCategoryConfig(category: NotificationCategory) {
  return NOTIFICATION_CATEGORY_COLORS[category] || NOTIFICATION_CATEGORY_COLORS.SYSTEM
}

// ========== EXPORTS ==========

/**
 * Exporta todos os tokens e helpers para uso no sistema
 * Nota: Types não são incluídos pois são apenas para TypeScript
 */
export default {
  // Token Maps
  BED_STATUS_COLORS,
  ROOM_TYPE_COLORS,
  RECORD_TYPE_CONFIG,
  SEVERITY_COLORS,
  MEDICATION_COLORS,
  CONTROLLED_CLASS_COLORS,
  NOTIFICATION_SEVERITY_COLORS,
  NOTIFICATION_CATEGORY_COLORS,

  // Helpers
  getBedStatusColor,
  getRoomTypeColor,
  getRecordTypeConfig,
  getRecordTypeColor,
  getSeverityColors,
  getSeverityBadgeColor,
  getMedicationColor,
  getControlledClassColor,
  getOccupancyColor,
  getAcceptanceColor,
  getNotificationSeverityColors,
  getNotificationCategoryConfig,
}
