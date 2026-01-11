/**
 * 🪝 useConfirmDialog - Hook para Diálogos de Confirmação
 *
 * Simplifica o uso de diálogos de confirmação, gerenciando state automaticamente.
 *
 * @example Uso básico
 * ```tsx
 * function MyComponent() {
 *   const { ConfirmDialog, confirm } = useConfirmDialog()
 *
 *   const handleDiscard = async () => {
 *     const confirmed = await confirm({
 *       title: 'Descartar alterações?',
 *       description: 'As informações preenchidas serão perdidas.',
 *     })
 *
 *     if (confirmed) {
 *       navigate('/back')
 *     }
 *   }
 *
 *   return (
 *     <>
 *       <Button onClick={handleDiscard}>Cancelar</Button>
 *       <ConfirmDialog />
 *     </>
 *   )
 * }
 * ```
 *
 * @example Ação destrutiva
 * ```tsx
 * const { ConfirmDialog, confirm } = useConfirmDialog()
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: 'Excluir documento?',
 *     description: 'Esta ação não pode ser desfeita.',
 *     confirmText: 'Excluir',
 *     variant: 'destructive',
 *   })
 *
 *   if (confirmed) {
 *     await deleteDocument()
 *   }
 * }
 * ```
 */

import { useState, useCallback, useRef } from 'react'
import {
  ConfirmDialog as ConfirmDialogComponent,
  ConfirmDialogProps,
} from '@/components/dialogs/ConfirmDialog'

type ConfirmOptions = Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'onConfirm' | 'onCancel'>

interface UseConfirmDialogReturn {
  /** Componente ConfirmDialog para renderizar */
  ConfirmDialog: () => JSX.Element
  /** Função para solicitar confirmação (retorna Promise<boolean>) */
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

/**
 * Hook que fornece diálogo de confirmação com API Promise-based.
 *
 * Retorna:
 * - ConfirmDialog: Componente a ser renderizado
 * - confirm: Função async que retorna true se confirmado, false se cancelado
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    description: '',
  })

  // Usar ref para resolver a promise sem depender de state
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)

    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    setIsOpen(false)
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    resolveRef.current = null
    setIsOpen(false)
  }, [])

  const ConfirmDialog = useCallback(
    () => (
      <ConfirmDialogComponent
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) {
            // Se fechou sem clicar em nenhum botão (ESC ou click fora)
            resolveRef.current?.(false)
            resolveRef.current = null
          }
        }}
        title={options.title}
        description={options.description}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        variant={options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [isOpen, options, handleConfirm, handleCancel]
  )

  return { ConfirmDialog, confirm }
}
