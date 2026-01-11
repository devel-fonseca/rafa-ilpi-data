/**
 * 🔔 ConfirmDialog - Diálogo de Confirmação Padronizado
 *
 * Componente reutilizável para confirmações de ações destrutivas ou importantes.
 * Substitui window.confirm() com UI consistente do design system.
 *
 * @example Básico
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Descartar alterações?"
 *   description="As informações preenchidas serão perdidas."
 *   onConfirm={() => navigate('/back')}
 * />
 * ```
 *
 * @example Ação destrutiva
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Excluir documento?"
 *   description="Esta ação não pode ser desfeita."
 *   confirmText="Excluir"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 * />
 * ```
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, Info, AlertCircle } from 'lucide-react'

export interface ConfirmDialogProps {
  /** Controla visibilidade do diálogo */
  open: boolean
  /** Callback quando estado de abertura muda */
  onOpenChange: (open: boolean) => void
  /** Título do diálogo */
  title: string
  /** Descrição/mensagem explicativa */
  description: string
  /** Texto do botão de confirmação (default: "Confirmar") */
  confirmText?: string
  /** Texto do botão de cancelamento (default: "Cancelar") */
  cancelText?: string
  /** Variante visual do diálogo */
  variant?: 'default' | 'destructive' | 'warning'
  /** Callback executado ao confirmar */
  onConfirm: () => void
  /** Callback executado ao cancelar (opcional) */
  onCancel?: () => void
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  destructive: {
    icon: AlertCircle,
    iconColor: 'text-danger',
    iconBg: 'bg-danger/10',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10',
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            {/* Ícone */}
            <div className={`flex-shrink-0 h-10 w-10 rounded-full ${config.iconBg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>

            {/* Textos */}
            <div className="flex-1 space-y-2">
              <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              variant === 'destructive'
                ? 'bg-danger hover:bg-danger/90 text-white'
                : ''
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
