/**
 * 🏷️ StatusBadge - Badge com variantes semânticas automáticas
 *
 * Centraliza TODAS as variantes de badge do sistema
 *
 * @author Dr. E. (Emanuel) + Claude Code
 * @date 24 de novembro de 2025
 */

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Base variants (compatibilidade shadcn)
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-danger text-danger-foreground',
        outline: 'text-foreground',

        // Feedback variants
        success: 'border-success/30 bg-success/10 text-success',
        warning: 'border-warning/30 bg-warning/10 text-warning',
        danger: 'border-danger/30 bg-danger/10 text-danger',
        info: 'border-info/30 bg-info/10 text-info',

        // Bed Status variants
        'bed-available': 'border-success/30 bg-success/10 text-success',
        'bed-occupied': 'border-danger/30 bg-danger/10 text-danger',
        'bed-maintenance': 'border-warning/30 bg-warning/10 text-warning',
        'bed-reserved': 'border-info/30 bg-info/10 text-info',

        // Record Type variants (10 tipos)
        'record-higiene': 'border-blue-300 bg-blue-100 text-blue-700',
        'record-alimentacao': 'border-green-300 bg-green-100 text-green-700',
        'record-hidratacao': 'border-cyan-300 bg-cyan-100 text-cyan-700',
        'record-monitoramento': 'border-yellow-300 bg-yellow-100 text-yellow-700',
        'record-eliminacao': 'border-gray-300 bg-gray-100 text-gray-700',
        'record-comportamento': 'border-purple-300 bg-purple-100 text-purple-700',
        'record-intercorrencia': 'border-red-300 bg-red-100 text-red-700',
        'record-atividades': 'border-indigo-300 bg-indigo-100 text-indigo-700',
        'record-visita': 'border-pink-300 bg-pink-100 text-pink-700',
        'record-outros': 'border-slate-300 bg-slate-100 text-slate-700',

        // Severity variants
        'severity-critical': 'border-danger/30 bg-danger/10 text-danger',
        'severity-warning': 'border-orange-300 bg-orange-100 text-orange-700',
        'severity-info': 'border-info/30 bg-info/10 text-info',

        // Medication variants
        'medication-controlled': 'border-accent/30 bg-accent/10 text-accent',
        'medication-sos': 'border-orange-300 bg-orange-100 text-orange-700',
        'medication-high-risk': 'border-danger/30 bg-danger/10 text-danger',

        // Controlled Class variants
        'controlled-bzd': 'border-yellow-300 bg-yellow-100 text-yellow-700',
        'controlled-psicofarmaco': 'border-purple-300 bg-purple-100 text-purple-700',
        'controlled-opioide': 'border-red-300 bg-red-100 text-red-700',
        'controlled-anticonvulsivante': 'border-blue-300 bg-blue-100 text-blue-700',
        'controlled-outro': 'border-gray-300 bg-gray-100 text-gray-700',

        // Room Type variants
        'room-individual': 'border-blue-300 bg-blue-100 text-blue-800',
        'room-duplo': 'border-green-300 bg-green-100 text-green-800',
        'room-triplo': 'border-yellow-300 bg-yellow-100 text-yellow-800',
        'room-coletivo': 'border-purple-300 bg-purple-100 text-purple-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Variante semântica */
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'bed-available'
    | 'bed-occupied'
    | 'bed-maintenance'
    | 'bed-reserved'
    | 'record-higiene'
    | 'record-alimentacao'
    | 'record-hidratacao'
    | 'record-monitoramento'
    | 'record-eliminacao'
    | 'record-comportamento'
    | 'record-intercorrencia'
    | 'record-atividades'
    | 'record-visita'
    | 'record-outros'
    | 'severity-critical'
    | 'severity-warning'
    | 'severity-info'
    | 'medication-controlled'
    | 'medication-sos'
    | 'medication-high-risk'
    | 'controlled-bzd'
    | 'controlled-psicofarmaco'
    | 'controlled-opioide'
    | 'controlled-anticonvulsivante'
    | 'controlled-outro'
    | 'room-individual'
    | 'room-duplo'
    | 'room-triplo'
    | 'room-coletivo'
}

/**
 * Badge com variantes semânticas do Design System RAFA ILPI
 *
 * @example
 * ```tsx
 * <StatusBadge variant="bed-available">Disponível</StatusBadge>
 * <StatusBadge variant="record-higiene">Higiene</StatusBadge>
 * <StatusBadge variant="severity-critical">Crítico</StatusBadge>
 * <StatusBadge variant="medication-controlled">Controlado</StatusBadge>
 * ```
 */
export function StatusBadge({ className, variant, ...props }: StatusBadgeProps) {
  return <div className={cn(statusBadgeVariants({ variant }), className)} {...props} />
}
