import { Injectable } from '@nestjs/common'
import { subMinutes } from 'date-fns'

type RequestMetricEvent = {
  ts: number
  tenantId: string
  endpoint: string
  statusCode: number
  durationMs: number
}

type Quantiles = {
  p50: number
  p95: number
  p99: number
}

type AggregateStats = Quantiles & {
  count: number
  avgMs: number
  minMs: number
  maxMs: number
  errors4xx: number
  errors5xx: number
  errorRate4xx: number
  errorRate5xx: number
}

@Injectable()
export class RequestPerformanceMetricsService {
  private readonly maxEvents = this.getNumberEnv('REQUEST_METRICS_MAX_EVENTS', 50000)
  private readonly defaultWindowMinutes = this.getNumberEnv(
    'REQUEST_METRICS_DEFAULT_WINDOW_MINUTES',
    15,
  )
  private readonly p95AlertThresholdMs = this.getNumberEnv(
    'REQUEST_METRICS_ALERT_P95_MS',
    800,
  )
  private readonly error5xxAlertThresholdPercent = this.getNumberEnv(
    'REQUEST_METRICS_ALERT_5XX_RATE_PERCENT',
    0.5,
  )

  private events: RequestMetricEvent[] = []

  recordRequest(input: {
    tenantId?: string
    endpoint: string
    statusCode: number
    durationMs: number
  }): void {
    const event: RequestMetricEvent = {
      ts: Date.now(),
      tenantId: input.tenantId || 'unknown',
      endpoint: input.endpoint,
      statusCode: input.statusCode,
      durationMs: Math.max(0, Math.round(input.durationMs)),
    }

    if (this.events.length >= this.maxEvents) {
      // Remove em lote para evitar custo de shift() por evento.
      const pruneCount = Math.max(1, Math.floor(this.maxEvents * 0.1))
      this.events.splice(0, pruneCount)
    }

    this.events.push(event)
  }

  getSummary(input?: {
    windowMinutes?: number
    top?: number
    tenantId?: string
    endpointContains?: string
  }) {
    const windowMinutes = Math.max(
      1,
      Math.min(input?.windowMinutes ?? this.defaultWindowMinutes, 24 * 60),
    )
    const top = Math.max(1, Math.min(input?.top ?? 20, 100))
    const cutoffTimestamp = subMinutes(new Date(), windowMinutes).getTime()
    const tenantFilter = input?.tenantId?.trim()
    const endpointFilter = input?.endpointContains?.trim().toLowerCase()
    const filtered = this.events.filter((event) => {
      if (event.ts < cutoffTimestamp) return false
      if (tenantFilter && event.tenantId !== tenantFilter) return false
      if (endpointFilter && !event.endpoint.toLowerCase().includes(endpointFilter))
        return false
      return true
    })

    const endpointMap = new Map<string, RequestMetricEvent[]>()
    const tenantMap = new Map<string, RequestMetricEvent[]>()

    for (const event of filtered) {
      const endpointList = endpointMap.get(event.endpoint) || []
      endpointList.push(event)
      endpointMap.set(event.endpoint, endpointList)

      const tenantList = tenantMap.get(event.tenantId) || []
      tenantList.push(event)
      tenantMap.set(event.tenantId, tenantList)
    }

    const byEndpoint = [...endpointMap.entries()]
      .map(([endpoint, events]) => ({
        endpoint,
        ...this.buildAggregate(events),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, top)

    const byTenant = [...tenantMap.entries()]
      .map(([tenantId, events]) => ({
        tenantId,
        ...this.buildAggregate(events),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, top)

    const totals = this.buildAggregate(filtered)
    const p95Breaches = byEndpoint.filter(
      (item) => item.p95 >= this.p95AlertThresholdMs,
    )
    const errorBreaches = byTenant.filter(
      (item) => item.errorRate5xx >= this.error5xxAlertThresholdPercent,
    )

    return {
      generatedAt: new Date().toISOString(),
      windowMinutes,
      filters: {
        tenantId: tenantFilter || null,
        endpointContains: endpointFilter || null,
      },
      retainedEvents: this.events.length,
      analyzedEvents: filtered.length,
      totals,
      byEndpoint,
      byTenant,
      alerts: {
        thresholds: {
          p95Ms: this.p95AlertThresholdMs,
          error5xxRatePercent: this.error5xxAlertThresholdPercent,
        },
        hasAny:
          p95Breaches.length > 0 ||
          errorBreaches.length > 0 ||
          totals.errorRate5xx >= this.error5xxAlertThresholdPercent,
        endpointP95Breaches: p95Breaches.map((item) => ({
          endpoint: item.endpoint,
          p95: item.p95,
          count: item.count,
        })),
        tenant5xxBreaches: errorBreaches.map((item) => ({
          tenantId: item.tenantId,
          errorRate5xx: item.errorRate5xx,
          count: item.count,
        })),
      },
    }
  }

  private buildAggregate(events: RequestMetricEvent[]): AggregateStats {
    if (events.length === 0) {
      return {
        count: 0,
        avgMs: 0,
        minMs: 0,
        maxMs: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errors4xx: 0,
        errors5xx: 0,
        errorRate4xx: 0,
        errorRate5xx: 0,
      }
    }

    const durations = events.map((event) => event.durationMs).sort((a, b) => a - b)
    const count = events.length
    const totalDuration = durations.reduce((acc, value) => acc + value, 0)
    const errors4xx = events.filter((event) => event.statusCode >= 400 && event.statusCode < 500).length
    const errors5xx = events.filter((event) => event.statusCode >= 500).length

    return {
      count,
      avgMs: Number((totalDuration / count).toFixed(2)),
      minMs: durations[0],
      maxMs: durations[durations.length - 1],
      ...this.getQuantiles(durations),
      errors4xx,
      errors5xx,
      errorRate4xx: Number(((errors4xx / count) * 100).toFixed(2)),
      errorRate5xx: Number(((errors5xx / count) * 100).toFixed(2)),
    }
  }

  private getQuantiles(sortedDurations: number[]): Quantiles {
    return {
      p50: this.getPercentile(sortedDurations, 0.5),
      p95: this.getPercentile(sortedDurations, 0.95),
      p99: this.getPercentile(sortedDurations, 0.99),
    }
  }

  private getPercentile(sortedDurations: number[], percentile: number): number {
    if (sortedDurations.length === 0) return 0
    if (sortedDurations.length === 1) return sortedDurations[0]

    const index = percentile * (sortedDurations.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)

    if (lower === upper) return sortedDurations[lower]

    const weight = index - lower
    return Number(
      (
        sortedDurations[lower] * (1 - weight) + sortedDurations[upper] * weight
      ).toFixed(2),
    )
  }

  private getNumberEnv(key: string, defaultValue: number): number {
    const raw = process.env[key]
    if (!raw) return defaultValue
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue
  }
}
