/**
 * 📄 Page - Container Principal da Aplicação
 *
 * Componente que define largura máxima, padding e ritmo vertical padrão
 * para todas as páginas do sistema RAFA ILPI.
 *
 * @example
 * ```tsx
 * <Page>
 *   <PageHeader title="Residentes" />
 *   <Section title="Lista">...</Section>
 * </Page>
 * ```
 *
 * @example Com variantes
 * ```tsx
 * <Page maxWidth="wide" spacing="compact">
 *   <div>Conteúdo</div>
 * </Page>
 * ```
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const pageVariants = cva('mx-auto', {
  variants: {
    maxWidth: {
      default: 'max-w-7xl', // 1280px - padrão produto
      wide: 'max-w-[1536px]', // 2xl - dashboards complexos
      full: 'max-w-full', // 100% - fullscreen layouts
    },
    spacing: {
      default: 'space-y-6', // 24px - padrão RAFA ILPI
      compact: 'space-y-4', // 16px - páginas densas
      relaxed: 'space-y-8', // 32px - páginas espaçadas
    },
    padding: {
      true: 'px-6 py-6', // Padding padrão (mobile-first)
      false: '', // Sem padding (fullscreen)
    },
  },
  defaultVariants: {
    maxWidth: 'default',
    spacing: 'default',
    padding: true,
  },
})

export interface PageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageVariants> {
  /**
   * Largura máxima do container
   * @default 'default' (max-w-7xl - 1280px)
   */
  maxWidth?: 'default' | 'wide' | 'full'

  /**
   * Espaçamento vertical entre filhos diretos
   * @default 'default' (space-y-6 - 24px)
   */
  spacing?: 'default' | 'compact' | 'relaxed'

  /**
   * Aplica padding horizontal e vertical
   * @default true (px-6 py-6)
   */
  padding?: boolean

  /**
   * Conteúdo da página
   */
  children: React.ReactNode
}

/**
 * Container principal para todas as páginas do sistema.
 *
 * Define:
 * - Largura máxima consistente (default: 1280px)
 * - Padding padrão (px-6 py-6)
 * - Espaçamento vertical entre seções (space-y-6)
 *
 * Uso obrigatório em todas as páginas para garantir consistência visual.
 */
export const Page = React.forwardRef<HTMLDivElement, PageProps>(
  ({ className, maxWidth, spacing, padding, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(pageVariants({ maxWidth, spacing, padding }), className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Page.displayName = 'Page'
