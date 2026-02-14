import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { tenantKey } from '@/lib/query-keys'

const DASHBOARD_OVERVIEW_KEY = tenantKey('admin-dashboard-overview')
const INVALIDATION_COOLDOWN_MS = 1500
const DASHBOARD_REALTIME_DEBUG =
  import.meta.env.VITE_DEBUG_DASHBOARD_REALTIME === 'true'
const DASHBOARD_REALTIME_DEBUG_SOURCES = (
  import.meta.env.VITE_DEBUG_DASHBOARD_REALTIME_SOURCES || ''
)
  .split(',')
  .map((item: string) => item.trim())
  .filter(Boolean)

type DashboardOverviewUpdatedPayload = {
  source?: string
  timestamp?: string
}

/**
 * Invalida o overview do dashboard admin quando chegam eventos
 * que impactam pendências e histórico recente.
 */
export function useAdminDashboardRealtime() {
  const { socket } = useWebSocketContext()
  const queryClient = useQueryClient()
  const lastInvalidationRef = useRef(0)

  useEffect(() => {
    if (!socket) return

    const shouldDebugSource = (source?: string) => {
      if (!DASHBOARD_REALTIME_DEBUG) return false
      if (DASHBOARD_REALTIME_DEBUG_SOURCES.length === 0) return true
      return !!source && DASHBOARD_REALTIME_DEBUG_SOURCES.includes(source)
    }

    const invalidateOverview = (eventName: string, payload?: unknown) => {
      const source = (payload as DashboardOverviewUpdatedPayload | undefined)
        ?.source
      const now = Date.now()
      if (now - lastInvalidationRef.current < INVALIDATION_COOLDOWN_MS) {
        if (shouldDebugSource(source)) {
          console.debug('[AdminDashboardRealtime] skipped by cooldown', {
            eventName,
            source,
            payload,
          })
        }
        return
      }

      lastInvalidationRef.current = now
      if (shouldDebugSource(source)) {
        console.debug('[AdminDashboardRealtime] invalidating overview', {
          eventName,
          source,
          payload,
        })
      }
      queryClient.invalidateQueries({ queryKey: DASHBOARD_OVERVIEW_KEY })
    }

    const realtimeEvents = [
      'connection:success',
      'daily-record:created',
      'alert:new',
      'dashboard:overview-updated',
    ] as const

    const handlers = {
      'connection:success': (payload?: unknown) =>
        invalidateOverview('connection:success', payload),
      'daily-record:created': (payload?: unknown) =>
        invalidateOverview('daily-record:created', payload),
      'alert:new': (payload?: unknown) =>
        invalidateOverview('alert:new', payload),
      'dashboard:overview-updated': (payload?: unknown) =>
        invalidateOverview('dashboard:overview-updated', payload),
    } as const

    realtimeEvents.forEach((eventName) => {
      socket.on(eventName, handlers[eventName])
    })

    return () => {
      realtimeEvents.forEach((eventName) => {
        socket.off(eventName, handlers[eventName])
      })
    }
  }, [socket, queryClient])
}
