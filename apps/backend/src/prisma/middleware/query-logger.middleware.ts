import { Prisma } from '@prisma/client'
import { Logger } from '@nestjs/common'
import { Logger as WinstonLogger } from 'winston'
import { getCtx } from '../../common/context/request-context'

/**
 * Middleware para logging de queries do Prisma com contexto de request
 *
 * Registra todas as queries em modo DEBUG com contexto completo (requestId, tenantId, userId)
 * para amarrar cada query ao endpoint HTTP que a disparou.
 *
 * Também registra queries lentas (> threshold) como WARNING/ERROR.
 *
 * @example
 * ```typescript
 * // No PrismaService
 * this.$use(queryLoggerMiddleware)
 * ```
 */
export const createQueryLoggerMiddleware = (
  winstonLogger: WinstonLogger,
): Prisma.Middleware => {
  const nestLogger = new Logger('PrismaQueryLogger')
  const threshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '100', 10)

  return async (
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
  ) => {
    const start = Date.now()

    // Executar query
    const result = await next(params)

    const durationMs = Date.now() - start

    // Obter contexto do AsyncLocalStorage
    const { requestId, tenantId, userId } = getCtx()

    // Log estruturado de TODAS as queries em modo DEBUG
    winstonLogger.debug('db_query', {
      context: 'DB',
      requestId,
      tenantId,
      userId,
      model: params.model,
      action: params.action,
      durationMs,
    })

    // Log adicional para queries lentas (> threshold)
    if (durationMs > threshold) {
      const logData = {
        context: 'DB',
        requestId,
        tenantId,
        userId,
        model: params.model,
        action: params.action,
        durationMs,
        threshold: `${threshold}ms`,
      }

      // Log como warning se > threshold, error se > 1000ms
      if (durationMs > 1000) {
        winstonLogger.error('db_slow_query_critical', logData)
      } else {
        winstonLogger.warn('db_slow_query', logData)
      }

      // Em desenvolvimento, logar também os args para debug
      if (process.env.NODE_ENV === 'development') {
        nestLogger.debug('Query args:', {
          where: params.args?.where,
          select: params.args?.select,
          include: params.args?.include,
          orderBy: params.args?.orderBy,
          skip: params.args?.skip,
          take: params.args?.take,
        })
      }
    }

    return result
  }
}

// Backward compatibility: manter export antigo mas com funcionalidade reduzida
export const queryLoggerMiddleware: Prisma.Middleware = async (
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
) => {
  const logger = new Logger('PrismaQueryLogger')
  const threshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '100', 10)

  const before = Date.now()
  const result = await next(params)
  const duration = before - Date.now()

  if (duration > threshold) {
    const logData = {
      model: params.model,
      action: params.action,
      duration: `${duration}ms`,
      threshold: `${threshold}ms`,
    }

    if (duration > 1000) {
      logger.error(`🔴 Critical slow query detected`, logData)
    } else {
      logger.warn(`🐌 Slow query detected`, logData)
    }
  }

  return result
}
