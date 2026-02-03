/**
 * Design System RAFA ILPI - Componentes
 *
 * Export centralizado de todos os componentes customizados
 */

// Componentes existentes (feedback e display)
export { StatCard, type StatCardProps } from './StatCard'
export { StatusBadge, type StatusBadgeProps } from './StatusBadge'
export { SeverityAlert, type SeverityAlertProps } from './SeverityAlert'

// Componentes de layout (novos)
export {
  Page,
  PageHeader,
  Section,
  CollapsibleSection,
  type PageProps,
  type PageHeaderProps,
  type SectionProps,
  type CollapsibleSectionProps,
  type Breadcrumb,
  type BackButtonConfig,
} from './layout'

// Componentes de dados (novos)
export { EmptyState, type EmptyStateProps } from './data'

// Componentes de feedback
export { AccessDenied } from './feedback'
export { LoadingSpinner } from './LoadingSpinner'

// Componentes de ações
export {
  QuickAction,
  QuickActionsGrid,
  type QuickActionProps,
  type QuickActionsGridProps,
} from './QuickAction'
