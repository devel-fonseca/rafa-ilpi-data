import { useEffect, useRef } from 'react'

interface UseInactivityLogoutOptions {
  enabled: boolean
  onTimeout: () => void | Promise<void>
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MINUTES = 30

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
]

/**
 * Realiza logout automático por inatividade do usuário.
 * O timeout padrão é 30 minutos (configurável por VITE_INACTIVITY_TIMEOUT_MINUTES).
 */
export function useInactivityLogout({
  enabled,
  onTimeout,
  timeoutMs,
}: UseInactivityLogoutOptions) {
  const timerRef = useRef<number | null>(null)
  const hasTimedOutRef = useRef(false)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      hasTimedOutRef.current = false
      return
    }

    const envTimeoutMinutes = Number(
      import.meta.env.VITE_INACTIVITY_TIMEOUT_MINUTES ?? DEFAULT_TIMEOUT_MINUTES,
    )
    const timeout = timeoutMs ?? Math.max(1, envTimeoutMinutes) * 60 * 1000

    const clearTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }

    const startTimer = () => {
      if (hasTimedOutRef.current) return
      clearTimer()
      timerRef.current = window.setTimeout(async () => {
        if (hasTimedOutRef.current) return
        hasTimedOutRef.current = true
        await onTimeoutRef.current()
      }, timeout)
    }

    const handleActivity = () => {
      startTimer()
    }

    hasTimedOutRef.current = false
    startTimer()
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true }),
    )

    return () => {
      clearTimer()
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      )
    }
  }, [enabled, timeoutMs])
}
