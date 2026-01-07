/**
 * 📦 Section - Seção de Conteúdo com Card
 *
 * Wrapper semântico do Card do shadcn/ui com título opcional
 * e padding padronizado.
 *
 * @example Básico
 * ```tsx
 * <Section>
 *   <p>Conteúdo da seção</p>
 * </Section>
 * ```
 *
 * @example Com título e descrição
 * ```tsx
 * <Section
 *   title="Dados Pessoais"
 *   description="Informações básicas do residente"
 * >
 *   <FormFields />
 * </Section>
 * ```
 *
 * @example Com ação no header
 * ```tsx
 * <Section
 *   title="Prescrições Ativas"
 *   headerAction={
 *     <Button variant="outline" size="sm">
 *       Ver Todas
 *     </Button>
 *   }
 * >
 *   <PrescriptionsList />
 * </Section>
 * ```
 *
 * @example Variante flat (sem borda/sombra)
 * ```tsx
 * <Section variant="flat" title="Resumo">
 *   <Stats />
 * </Section>
 * ```
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TYPOGRAPHY_STYLES } from '@/design-system/tokens/typography'

const sectionVariants = cva('', {
  variants: {
    variant: {
      default: '', // Card padrão shadcn (com border e shadow)
      outlined: 'border-2', // Border mais forte
      flat: 'border-0 shadow-none', // Sem borda nem sombra
    },
    spacing: {
      default: '', // p-6 (via CardContent)
      compact: '', // p-4 (via CardContent)
      relaxed: '', // p-8 (via CardContent)
    },
  },
  defaultVariants: {
    variant: 'default',
    spacing: 'default',
  },
})

const contentSpacingMap = {
  default: 'p-6',
  compact: 'p-4',
  relaxed: 'p-8',
}

export interface SectionProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sectionVariants> {
  /**
   * Título da seção (opcional)
   * Renderizado no CardHeader com text-lg font-semibold
   */
  title?: string

  /**
   * Descrição/subtítulo da seção (opcional)
   * Renderizado no CardHeader com text-sm text-muted-foreground
   */
  description?: string

  /**
   * Ação no header da seção (opcional)
   * Ex: botão "Ver todas", dropdown menu, etc.
   */
  headerAction?: React.ReactNode

  /**
   * Conteúdo da seção (obrigatório)
   */
  children: React.ReactNode

  /**
   * Variante visual do card
   * @default 'default'
   */
  variant?: 'default' | 'outlined' | 'flat'

  /**
   * Espaçamento interno (padding)
   * @default 'default' (p-6)
   */
  spacing?: 'default' | 'compact' | 'relaxed'
}

/**
 * Seção de conteúdo com Card wrapper.
 *
 * Garante consistência em:
 * - Padding interno (p-6 padrão)
 * - Tipografia de título (text-lg font-semibold)
 * - Espaçamento entre título e conteúdo
 *
 * Usa Card do shadcn/ui por baixo, então herda todos os estilos base.
 */
export const Section = React.forwardRef<HTMLDivElement, SectionProps>(
  (
    {
      className,
      title,
      description,
      headerAction,
      children,
      variant,
      spacing = 'default',
      ...props
    },
    ref
  ) => {
    const hasHeader = title || description || headerAction

    return (
      <Card
        ref={ref}
        className={cn(sectionVariants({ variant }), className)}
        {...props}
      >
        {hasHeader && (
          <CardHeader className={spacing === 'compact' ? 'p-4' : undefined}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {title && (
                  <CardTitle className={TYPOGRAPHY_STYLES.sectionTitle}>
                    {title}
                  </CardTitle>
                )}
                {description && (
                  <CardDescription className="mt-1">{description}</CardDescription>
                )}
              </div>
              {headerAction && (
                <div className="flex-shrink-0">{headerAction}</div>
              )}
            </div>
          </CardHeader>
        )}
        <CardContent className={contentSpacingMap[spacing]}>
          {children}
        </CardContent>
      </Card>
    )
  }
)

Section.displayName = 'Section'
