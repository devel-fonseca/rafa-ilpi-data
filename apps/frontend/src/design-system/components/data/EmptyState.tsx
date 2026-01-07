/**
 * 🎭 EmptyState - Estado Vazio Reutilizável
 *
 * Componente para exibir estados vazios com ícone, título,
 * descrição e call-to-action opcional.
 *
 * Substitui 50+ implementações inline diferentes.
 *
 * @example Básico
 * ```tsx
 * <EmptyState
 *   icon={Users}
 *   title="Nenhum residente encontrado"
 *   description="Comece cadastrando o primeiro residente"
 * />
 * ```
 *
 * @example Com ação
 * ```tsx
 * <EmptyState
 *   icon={FileText}
 *   title="Nenhuma prescrição ativa"
 *   description="Não há prescrições ativas no momento"
 *   action={
 *     <Button intent="create">
 *       <Plus className="h-4 w-4" />
 *       Nova Prescrição
 *     </Button>
 *   }
 * />
 * ```
 *
 * @example Variante de erro
 * ```tsx
 * <EmptyState
 *   icon={AlertCircle}
 *   title="Erro ao carregar dados"
 *   description="Ocorreu um erro ao buscar os residentes"
 *   variant="error"
 *   action={<Button onClick={retry}>Tentar Novamente</Button>}
 * />
 * ```
 *
 * @example Variante de sucesso
 * ```tsx
 * <EmptyState
 *   icon={CheckCircle2}
 *   title="Todas as tarefas concluídas!"
 *   description="Não há tarefas pendentes no momento"
 *   variant="success"
 * />
 * ```
 */

import * as React from 'react'
import { type LucideIcon } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const emptyStateVariants = cva(
  'flex flex-col items-center justify-center text-center py-12',
  {
    variants: {
      variant: {
        default: '', // Neutro (muted-foreground)
        info: '', // Informativo (azul)
        warning: '', // Atenção (amarelo)
        error: '', // Erro (vermelho)
        success: '', // Sucesso (verde)
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const iconVariants = cva('h-16 w-16 mb-4', {
  variants: {
    variant: {
      default: 'text-muted-foreground',
      info: 'text-info',
      warning: 'text-warning',
      error: 'text-danger',
      success: 'text-success',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  /**
   * Ícone do Lucide React (obrigatório)
   * Ex: Users, FileText, AlertCircle, CheckCircle2
   */
  icon: LucideIcon

  /**
   * Título do estado vazio (obrigatório)
   * Ex: "Nenhum residente encontrado"
   */
  title: string

  /**
   * Descrição/subtítulo (opcional)
   * Ex: "Comece cadastrando o primeiro residente"
   */
  description?: string

  /**
   * Call-to-action (opcional)
   * Ex: <Button>Novo Residente</Button>
   */
  action?: React.ReactNode

  /**
   * Variante visual
   * @default 'default'
   */
  variant?: 'default' | 'info' | 'warning' | 'error' | 'success'
}

/**
 * Estado vazio reutilizável para todo o sistema.
 *
 * Garante consistência em:
 * - Ícone grande (h-16 w-16)
 * - Título (text-lg font-semibold)
 * - Descrição (text-muted-foreground)
 * - Espaçamento vertical (py-12)
 * - Centralização (flex items-center justify-center)
 *
 * Uso obrigatório para substituir implementações inline.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  className,
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  ...props
}) => {
  return (
    <div
      className={cn(emptyStateVariants({ variant }), className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      <Icon className={iconVariants({ variant })} aria-hidden="true" />
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

EmptyState.displayName = 'EmptyState'
