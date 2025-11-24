/**
 * ⚠️ SeverityAlert - Alertas com níveis de severidade
 *
 * Componente para alertas críticos, avisos e informativos
 *
 * @author Dr. E. (Emanuel) + Claude Code
 * @date 24 de novembro de 2025
 */

import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const severityAlertVariants = cva('', {
  variants: {
    severity: {
      critical: 'border-danger/50 bg-danger/5 text-danger [&>svg]:text-danger',
      warning: 'border-orange-500/50 bg-orange-50 text-orange-900 [&>svg]:text-orange-600',
      info: 'border-info/50 bg-info/5 text-info [&>svg]:text-info',
    },
  },
  defaultVariants: {
    severity: 'info',
  },
})

const SEVERITY_ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const SEVERITY_TITLES = {
  critical: 'Crítico',
  warning: 'Atenção',
  info: 'Informação',
}

export interface SeverityAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof severityAlertVariants> {
  /** Nível de severidade */
  severity?: 'critical' | 'warning' | 'info'
  /** Título do alerta (opcional, usa padrão se não fornecido) */
  title?: string
  /** Mensagem do alerta */
  message: string
  /** Callback ao fechar (se fornecido, mostra botão de fechar) */
  onDismiss?: () => void
}

/**
 * Alerta com níveis de severidade
 *
 * @example
 * ```tsx
 * <SeverityAlert
 *   severity="critical"
 *   message="Prescrição vencida há 7 dias"
 *   onDismiss={() => console.log('dismissed')}
 * />
 *
 * <SeverityAlert
 *   severity="warning"
 *   title="Atenção necessária"
 *   message="Medicamento controlado sem receita anexada"
 * />
 *
 * <SeverityAlert
 *   severity="info"
 *   message="Sistema atualizado com sucesso"
 * />
 * ```
 */
export function SeverityAlert({
  severity = 'info',
  title,
  message,
  onDismiss,
  className,
  ...props
}: SeverityAlertProps) {
  const Icon = SEVERITY_ICONS[severity]
  const defaultTitle = SEVERITY_TITLES[severity]

  return (
    <Alert className={cn(severityAlertVariants({ severity }), className)} {...props}>
      <div className="flex items-start">
        <Icon className="h-4 w-4 mt-0.5" />
        <div className="flex-1 ml-3">
          {(title || defaultTitle) && <AlertTitle>{title || defaultTitle}</AlertTitle>}
          <AlertDescription>{message}</AlertDescription>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 inline-flex items-center justify-center rounded-md p-1 hover:bg-black/5 transition-colors"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </Alert>
  )
}
