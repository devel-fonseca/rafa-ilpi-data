/**
 * 📦 CollapsibleSection - Seção Colapsável
 *
 * Extensão do componente Section com funcionalidade de colapsar/expandir.
 * Mantém estado de colapso em localStorage para persistência entre sessões.
 *
 * @example Básico
 * ```tsx
 * <CollapsibleSection
 *   id="analysis-section"
 *   title="Análise de Dados"
 *   defaultCollapsed={false}
 * >
 *   <Charts />
 * </CollapsibleSection>
 * ```
 *
 * @example Com descrição
 * ```tsx
 * <CollapsibleSection
 *   id="activities-section"
 *   title="Atividades Recentes"
 *   description="Últimas ações realizadas no sistema"
 *   defaultCollapsed={false}
 * >
 *   <ActivityList />
 * </CollapsibleSection>
 * ```
 */

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { TYPOGRAPHY_STYLES } from '@/design-system/tokens/typography'

export interface CollapsibleSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * ID único para persistir estado no localStorage
   * Usar kebab-case: "analysis-section", "activities-section"
   */
  id: string

  /**
   * Título da seção (obrigatório para seções colapsáveis)
   */
  title: string

  /**
   * Descrição/subtítulo da seção (opcional)
   */
  description?: string

  /**
   * Ação adicional no header (opcional)
   * Renderizada ao lado do botão de colapsar
   */
  headerAction?: React.ReactNode

  /**
   * Conteúdo da seção
   */
  children: React.ReactNode

  /**
   * Estado inicial de colapso (se não houver valor no localStorage)
   * @default false (expandido)
   */
  defaultCollapsed?: boolean

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

const contentSpacingMap = {
  default: 'p-6',
  compact: 'p-4',
  relaxed: 'p-8',
}

/**
 * Seção colapsável com persistência de estado.
 *
 * Características:
 * - Estado persistido em localStorage (por ID)
 * - Botão de colapsar/expandir integrado no header
 * - Animação suave de expansão/colapso
 * - Ícone que muda (ChevronDown/ChevronUp)
 */
export const CollapsibleSection = React.forwardRef<
  HTMLDivElement,
  CollapsibleSectionProps
>(
  (
    {
      className,
      id,
      title,
      description,
      headerAction,
      children,
      defaultCollapsed = false,
      variant = 'default',
      spacing = 'default',
      ...props
    },
    ref
  ) => {
    // Estado de colapso com persistência em localStorage
    const [isOpen, setIsOpen] = React.useState<boolean>(() => {
      if (typeof window === 'undefined') return !defaultCollapsed

      const stored = localStorage.getItem(`collapsible-section-${id}`)
      if (stored !== null) {
        return stored === 'true'
      }
      return !defaultCollapsed
    })

    // Persistir estado quando mudar
    React.useEffect(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`collapsible-section-${id}`, String(isOpen))
      }
    }, [id, isOpen])

    const variantClasses = {
      default: '',
      outlined: 'border-2',
      flat: 'border-0 shadow-none',
    }

    return (
      <Card
        ref={ref}
        className={cn(variantClasses[variant], className)}
        {...props}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className={spacing === 'compact' ? 'p-4' : undefined}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className={TYPOGRAPHY_STYLES.sectionTitle}>
                  {title}
                </CardTitle>
                {description && (
                  <CardDescription className="mt-1">{description}</CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {headerAction}
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label={isOpen ? 'Colapsar seção' : 'Expandir seção'}
                  >
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className={contentSpacingMap[spacing]}>
              {children}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    )
  }
)

CollapsibleSection.displayName = 'CollapsibleSection'
