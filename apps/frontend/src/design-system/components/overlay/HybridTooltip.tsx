import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface HybridTooltipProps {
  children: ReactElement
  content: ReactNode
  desktopMinWidth?: number
  disabled?: boolean
  tooltipClassName?: string
  popoverClassName?: string
}

export function HybridTooltip({
  children,
  content,
  desktopMinWidth = 768,
  disabled = false,
  tooltipClassName,
  popoverClassName,
}: HybridTooltipProps) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(`(min-width: ${desktopMinWidth}px)`).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia(`(min-width: ${desktopMinWidth}px)`)
    const update = () => setIsDesktop(media.matches)
    update()

    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [desktopMinWidth])

  if (disabled) {
    return children
  }

  if (isDesktop) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{children}</TooltipTrigger>
          <TooltipContent className={tooltipClassName}>{content}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className={cn('w-72 p-3 text-sm', popoverClassName)}>
        {content}
      </PopoverContent>
    </Popover>
  )
}

