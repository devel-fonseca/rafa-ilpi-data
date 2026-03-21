import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface ResponsiveChartContainerProps {
  children: ReactElement
  className?: string
  height?: number | string
  minHeight?: number | string
}

function normalizeDimension(value?: number | string) {
  if (typeof value === 'number') return `${value}px`
  return value
}

export function ResponsiveChartContainer({
  children,
  className,
  height,
  minHeight,
}: ResponsiveChartContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const [{ width, measuredHeight }, setSize] = useState({ width: 0, measuredHeight: 0 })

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return

    const measure = () => {
      const nextWidth = Math.round(element.clientWidth)
      const nextHeight = Math.round(element.clientHeight)

      setSize((current) => {
        if (current.width === nextWidth && current.measuredHeight === nextHeight) {
          return current
        }

        return {
          width: nextWidth,
          measuredHeight: nextHeight,
        }
      })
    }

    const scheduleMeasure = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        measure()
      })
    }

    measure()

    const observer = new ResizeObserver(() => {
      scheduleMeasure()
    })

    observer.observe(element)
    window.addEventListener('resize', scheduleMeasure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', scheduleMeasure)

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const hasRenderableSize = width > 0 && measuredHeight > 0

  return (
    <div
      ref={containerRef}
      className={cn('w-full', className)}
      style={{
        height: normalizeDimension(height),
        minHeight: normalizeDimension(minHeight),
      }}
    >
      {hasRenderableSize ? (
        <ResponsiveContainer key={`${width}x${measuredHeight}`} width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  )
}
