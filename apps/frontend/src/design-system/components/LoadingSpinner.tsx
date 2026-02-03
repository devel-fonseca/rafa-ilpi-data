import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  /**
   * Tamanho do spinner
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /**
   * Mensagem opcional a ser exibida abaixo do spinner
   */
  message?: string
  /**
   * Centralizar o spinner
   * @default true
   */
  centered?: boolean
  /**
   * Classes adicionais para o container
   */
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

/**
 * Componente de loading spinner reutilizável
 *
 * @example
 * ```tsx
 * // Spinner simples
 * <LoadingSpinner />
 *
 * // Com mensagem
 * <LoadingSpinner message="Carregando dados..." />
 *
 * // Tamanho pequeno, sem centralizar
 * <LoadingSpinner size="sm" centered={false} />
 * ```
 */
export function LoadingSpinner({
  size = 'md',
  message,
  centered = true,
  className,
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <div className="text-center">
      <div
        className={cn(
          'animate-spin rounded-full border-b-2 border-primary mx-auto',
          sizeClasses[size],
          !message && 'mb-0'
        )}
      />
      {message && (
        <p className="text-sm text-muted-foreground mt-4">{message}</p>
      )}
    </div>
  )

  if (!centered) {
    return <div className={className}>{spinnerElement}</div>
  }

  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      {spinnerElement}
    </div>
  )
}
