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
        'record-higiene': 'border-primary/30 bg-primary/10 text-primary/80',
        'record-alimentacao': 'border-success/30 bg-success/10 text-success/80',
        'record-hidratacao': 'border-cyan-300 bg-cyan-100 text-cyan-700',
        'record-monitoramento': 'border-warning/30 bg-warning/10 text-warning/80',
        'record-eliminacao': 'border-border bg-muted text-foreground/80',
        'record-comportamento': 'border-medication-controlled/30 bg-medication-controlled/10 text-medication-controlled/80',
        'record-intercorrencia': 'border-danger/30 bg-danger/10 text-danger/80',
        'record-atividades': 'border-indigo-300 bg-indigo-100 text-indigo-700',
        'record-visita': 'border-accent/30 bg-pink-100 text-pink-700',
        'record-outros': 'border-slate-300 bg-slate-100 text-slate-700',

        // Severity variants
        'severity-critical': 'border-danger/30 bg-danger/10 text-danger',
        'severity-warning': 'border-severity-warning/30 bg-severity-warning/10 text-severity-warning/80',
        'severity-info': 'border-info/30 bg-info/10 text-info',

        // Medication variants
        'medication-controlled': 'border-accent/30 bg-accent/10 text-accent',
        'medication-sos': 'border-severity-warning/30 bg-severity-warning/10 text-severity-warning/80',
        'medication-high-risk': 'border-danger/30 bg-danger/10 text-danger',

        // Controlled Class variants
        'controlled-bzd': 'border-warning/30 bg-warning/10 text-warning/80',
        'controlled-psicofarmaco': 'border-medication-controlled/30 bg-medication-controlled/10 text-medication-controlled/80',
        'controlled-opioide': 'border-danger/30 bg-danger/10 text-danger/80',
        'controlled-anticonvulsivante': 'border-primary/30 bg-primary/10 text-primary/80',
        'controlled-outro': 'border-border bg-muted text-foreground/80',

        // Room Type variants
        'room-individual': 'border-primary/30 bg-primary/10 text-primary/90',
        'room-duplo': 'border-success/30 bg-success/10 text-success/90',
        'room-triplo': 'border-warning/30 bg-warning/10 text-warning/90',
        'room-coletivo': 'border-medication-controlled/30 bg-medication-controlled/10 text-medication-controlled/90',
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
