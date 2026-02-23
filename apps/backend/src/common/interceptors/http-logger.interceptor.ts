/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-restricted-syntax */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Scope,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { Logger } from 'winston'
import { requestContext } from '../context/request-context'
import { RequestPerformanceMetricsService } from '../../observability/request-performance-metrics.service'

/**
 * Interceptor global que registra todas as requisições HTTP
 * com informações estruturadas de contexto (requestId, tenantId, userId)
 * e métricas de performance (durationMs).
 *
 * Também popula o AsyncLocalStorage store com tenantId/userId para que
 * queries do Prisma possam logar com o mesmo contexto.
 */
@Injectable({ scope: Scope.REQUEST })
export class HttpLoggerInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly requestMetrics: RequestPerformanceMetricsService,
  ) {}

  private resolveEndpointLabel(request: {
    method?: string
    url?: string
    baseUrl?: string
    route?: { path?: string }
  }): string {
    const method = request.method || 'UNKNOWN'
    const routePath = request.route?.path

    if (routePath) {
      const baseUrl = request.baseUrl || ''
      return `${method} ${baseUrl}${routePath}`
    }

    const cleanUrl = (request.url || 'unknown').split('?')[0]
    return `${method} ${cleanUrl}`
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    const { method, url, ip, user } = request
    const requestId = (request as any).requestId
    const tenantId = user?.tenantId
    const userId = user?.id
    const endpoint = this.resolveEndpointLabel(request)

    // Completar o store do AsyncLocalStorage com tenantId e userId
    const store = requestContext.getStore()
    if (store) {
      store.tenantId = tenantId?.toString()
      store.userId = userId?.toString()
    }

    const startTime = Date.now()

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime
          const statusCode = response.statusCode

          this.requestMetrics.recordRequest({
            tenantId,
            endpoint,
            statusCode,
            durationMs,
          })

          // Log estruturado sem duplicar metadata
          this.logger.info('http_request', {
            context: 'HTTP',
            requestId,
            tenantId,
            userId,
            method,
            url,
            statusCode,
            durationMs,
            ip,
          })
        },
        error: (error: Error) => {
          const durationMs = Date.now() - startTime
          const statusCode = response.statusCode || 500

          this.requestMetrics.recordRequest({
            tenantId,
            endpoint,
            statusCode,
            durationMs,
          })

          // Log de erro estruturado
          this.logger.error('http_request_error', {
            context: 'HTTP',
            requestId,
            tenantId,
            userId,
            method,
            url,
            statusCode,
            durationMs,
            ip,
            error: error.message,
            stack: error.stack,
          })
        },
      }),
    )
  }
}
