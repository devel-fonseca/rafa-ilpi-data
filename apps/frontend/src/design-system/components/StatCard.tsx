/**
 * 📊 StatCard - Card reutilizável para estatísticas
 *
 * Substitui 4+ implementações duplicadas de cards de estatísticas
 *
 * @author Dr. E. (Emanuel) + Claude Code
 * @date 24 de novembro de 2025
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

const statCardVariants = cva(
  'flex items-center justify-center w-12 h-12 rounded-lg transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary/10 text-secondary',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        danger: 'bg-danger/10 text-danger',
        info: 'bg-info/10 text-info',
        accent: 'bg-accent/10 text-accent',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
)

export interface StatCardProps extends VariantProps<typeof statCardVariants> {
  /** Título do card */
  title: string
  /** Valor principal (número ou texto) */
  value: string | number
  /** Ícone (componente Lucide) */
  icon: LucideIcon
  /** Descrição adicional (opcional) */
  description?: string
  /** Classes adicionais */
  className?: string
  /** Variante de cor */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
}

/**
 * Card de estatística reutilizável
 *
 * @example
 * ```tsx
 * <StatCard
 *   title="Residentes"
 *   value={123}
 *   icon={Users}
 *   variant="primary"
 *   description="Total cadastrados"
 * />
 * ```
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn(statCardVariants({ variant }))}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
