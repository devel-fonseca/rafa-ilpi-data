import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ActionDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  icon?: ReactNode
  summary?: ReactNode
  children: ReactNode
  footer?: ReactNode
  closeLabel?: string
  showDefaultClose?: boolean
  size?: 'md' | 'lg'
  contentClassName?: string
  bodyClassName?: string
}

export function ActionDetailsSheet({
  open,
  onOpenChange,
  title,
  description,
  icon,
  summary,
  children,
  footer,
  closeLabel = 'Fechar',
  showDefaultClose = true,
  size = 'md',
  contentClassName,
  bodyClassName,
}: ActionDetailsSheetProps) {
  const widthClass = size === 'lg' ? 'sm:max-w-xl' : 'sm:max-w-lg'
  const hasFooter = Boolean(footer) || showDefaultClose

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('w-full p-0 flex flex-col bg-muted', widthClass, contentClassName)}>
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="flex items-center gap-2 text-xl font-semibold">
            {icon}
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>

        {summary && (
          <div className="px-6 pt-4">
            {summary}
          </div>
        )}

        <div className={cn('flex-1 overflow-y-auto px-6 py-4', bodyClassName)}>
          {children}
        </div>

        {hasFooter && (
          <div className="flex justify-end gap-2 p-4 pt-3 border-t">
            {footer ?? (
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                {closeLabel}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
