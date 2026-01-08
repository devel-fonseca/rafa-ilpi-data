/**
 * 📋 PageHeader - Header Padronizado de Página
 *
 * Componente que padroniza o cabeçalho de todas as páginas,
 * incluindo título, subtítulo, breadcrumbs e ações.
 *
 * @example Básico
 * ```tsx
 * <PageHeader
 *   title="Residentes"
 *   subtitle="Gerencie os residentes da instituição"
 * />
 * ```
 *
 * @example Com actions
 * ```tsx
 * <PageHeader
 *   title="Prescrições"
 *   subtitle="Gerencie as prescrições médicas"
 *   actions={
 *     <Button intent="create">
 *       <Plus className="h-4 w-4" />
 *       Nova Prescrição
 *     </Button>
 *   }
 * />
 * ```
 *
 * @example Com breadcrumbs e badge
 * ```tsx
 * <PageHeader
 *   title="Detalhes do Residente"
 *   badge={<StatusBadge variant="success">Ativo</StatusBadge>}
 *   breadcrumbs={[
 *     { label: 'Início', href: '/' },
 *     { label: 'Residentes', href: '/residents' },
 *     { label: 'João Silva' }
 *   ]}
 *   backButton={{ onClick: () => navigate(-1) }}
 * />
 * ```
 */

import * as React from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TYPOGRAPHY_STYLES } from '@/design-system/tokens/typography'

export interface Breadcrumb {
  /** Label do breadcrumb */
  label: string
  /** URL (opcional - se ausente, não é clicável) */
  href?: string
}

export interface BackButtonConfig {
  /** Label do botão (default: "Voltar") */
  label?: string
  /** Callback ao clicar */
  onClick: () => void
}

export interface PageHeaderProps {
  /**
   * Título principal da página (obrigatório)
   * Renderizado como h1 com text-3xl font-semibold tracking-tight
   */
  title: string

  /**
   * Subtítulo/descrição da página (opcional)
   * Renderizado com text-muted-foreground
   */
  subtitle?: string

  /**
   * Badge ou elemento adicional ao lado do título (opcional)
   * Útil para status, tags, etc.
   */
  badge?: React.ReactNode

  /**
   * Breadcrumbs de navegação (opcional)
   * Renderizado acima do título
   */
  breadcrumbs?: Breadcrumb[]

  /**
   * Ações da página (botões, dropdowns, etc.) (opcional)
   * Desktop: renderizado à direita do título
   * Mobile: renderizado abaixo do título
   */
  actions?: React.ReactNode

  /**
   * Configuração do botão "Voltar" (opcional)
   * Renderizado antes do título
   */
  backButton?: BackButtonConfig

  /**
   * Classes CSS adicionais para o container
   */
  className?: string
}

/**
 * Header padronizado para todas as páginas do sistema.
 *
 * Garante consistência em:
 * - Tipografia (text-3xl font-semibold para título)
 * - Espaçamento (mb-6 após header)
 * - Layout responsivo (actions à direita no desktop, abaixo no mobile)
 * - Breadcrumbs (navegação hierárquica)
 *
 * Uso obrigatório em todas as páginas.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  backButton,
  className,
}) => {
  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1

              return (
                <li key={index} className="flex items-center">
                  {index > 0 && (
                    <span className="mx-2 text-muted-foreground">/</span>
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      to={crumb.href}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? 'font-medium text-foreground' : ''}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      {/* Botão Voltar */}
      {backButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={backButton.onClick}
          className="mb-2 -ml-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {backButton.label || 'Voltar'}
        </Button>
      )}

      {/* Header Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Título + Badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className={cn(TYPOGRAPHY_STYLES.pageTitle, 'text-2xl sm:text-3xl truncate')}>{title}</h1>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className={cn(TYPOGRAPHY_STYLES.subtitle, 'mt-1')}>{subtitle}</p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap w-full sm:w-auto">{actions}</div>
        )}
      </div>
    </div>
  )
}

PageHeader.displayName = 'PageHeader'
