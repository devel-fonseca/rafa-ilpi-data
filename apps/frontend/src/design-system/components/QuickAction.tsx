import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type LucideIcon } from 'lucide-react'

// ──────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────

export interface QuickActionProps {
  /**
   * Título da ação (sempre visível)
   */
  title: string

  /**
   * Descrição detalhada (aparece no tooltip ao hover)
   */
  description: string

  /**
   * Ícone da ação (Lucide React)
   */
  icon: LucideIcon

  /**
   * Callback ao clicar
   */
  onClick: () => void

  /**
   * Se a ação está desabilitada
   * @default false
   */
  disabled?: boolean

  /**
   * Variante do botão
   * @default 'outline'
   */
  variant?: 'outline' | 'default' | 'secondary' | 'ghost'

  /**
   * Tamanho do botão
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg'
}

// ──────────────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────────────

/**
 * QuickAction - Botão de ação rápida com tooltip
 *
 * Design minimalista: ícone + título visível, descrição no tooltip.
 * Padrão recomendado para dashboards e ações principais.
 *
 * @example
 * ```tsx
 * <QuickAction
 *   title="Agenda de Hoje"
 *   description="Ver medicamentos e agendamentos do dia"
 *   icon={Calendar}
 *   onClick={() => navigate('/agenda')}
 * />
 * ```
 */
export function QuickAction({
  title,
  description,
  icon: Icon,
  onClick,
  disabled = false,
  variant = 'outline',
  size = 'default',
}: QuickActionProps) {
  const heightClass = size === 'sm' ? 'h-16' : size === 'lg' ? 'h-24' : 'h-20'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          className={`${heightClass} p-4 flex-col gap-2 hover:shadow-md transition-shadow`}
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="h-6 w-6 text-primary" />
          <span className="font-medium text-sm text-center leading-tight">
            {title}
          </span>
          {disabled && (
            <span className="text-xs text-warning">Em breve</span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// CONTAINER COMPONENT
// ──────────────────────────────────────────────────────────────────────────

export interface QuickActionsGridProps {
  /**
   * Lista de ações rápidas
   */
  actions: QuickActionProps[]

  /**
   * Número de colunas no desktop (lg breakpoint)
   * @default 4
   */
  columns?: 2 | 3 | 4 | 5 | 6
}

/**
 * QuickActionsGrid - Container responsivo para ações rápidas
 *
 * Grid responsivo que exibe ações em:
 * - Mobile: 1 coluna
 * - Tablet: 2 colunas
 * - Desktop: número configurável de colunas
 *
 * @example
 * ```tsx
 * <QuickActionsGrid
 *   columns={4}
 *   actions={[
 *     {
 *       title: 'Agenda',
 *       description: 'Ver agenda do dia',
 *       icon: Calendar,
 *       onClick: () => navigate('/agenda'),
 *     },
 *     // ... more actions
 *   ]}
 * />
 * ```
 */
export function QuickActionsGrid({
  actions,
  columns = 4,
}: QuickActionsGridProps) {
  const colsClass = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  }[columns]

  return (
    <TooltipProvider>
      <div className={`grid grid-cols-1 md:grid-cols-2 ${colsClass} gap-4`}>
        {actions.map((action) => (
          <QuickAction key={action.title} {...action} />
        ))}
      </div>
    </TooltipProvider>
  )
}
