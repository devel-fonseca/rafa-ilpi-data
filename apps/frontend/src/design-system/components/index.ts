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
  type PageProps,
  type PageHeaderProps,
  type SectionProps,
  type Breadcrumb,
  type BackButtonConfig,
} from './layout'

// Componentes de dados (novos)
export { EmptyState, type EmptyStateProps } from './data'
