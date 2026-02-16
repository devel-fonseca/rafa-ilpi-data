/**
 * 📊 StatCard - Card reutilizável para estatísticas
 *
 * Visual inspirado no card "Residentes" do OperationalComplianceSection (Dashboard RT).
 *
 * @author Dr. E. (Emanuel) + Claude Code
 * @date 24 de novembro de 2025
 */

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const variantIconClasses: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  accent: 'bg-accent/10 text-accent',
}

export interface StatCardProps {
  /** Título do card */
  title: string
  /** Valor principal (número ou texto) */
  value: string | number
  /** Ícone (componente Lucide) */
  icon: LucideIcon
  /** Descrição adicional exibida no rodapé (opcional) */
  description?: string
  /** Classes adicionais */
  className?: string
  /** Variante de cor do ícone */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'primary',
  className,
}: StatCardProps) {
  return (
    <div className={cn('bg-card rounded-lg p-4 border border-border min-w-0', className)}>
      <div className="flex items-center gap-3">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0', variantIconClasses[variant])}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground break-words flex-1 min-w-0">
          {title}
        </p>
      </div>
      <div className="mt-3">
        <span className="text-3xl font-bold text-foreground leading-none">
          {value}
        </span>
        {description && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
