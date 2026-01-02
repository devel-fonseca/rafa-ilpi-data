import { Prisma } from '@prisma/client'
import { Logger } from '@nestjs/common'

/**
 * Middleware para logging de queries lentas do Prisma
 *
 * Registra automaticamente queries que excedem o threshold de performance,
 * permitindo identificar gargalos em produção.
 *
 * Threshold padrão: 100ms
 *
 * @example
 * ```typescript
 * // No PrismaService
 * this.$use(queryLoggerMiddleware)
 * ```
 */
export const queryLoggerMiddleware: Prisma.Middleware = async (
  params: Prisma.MiddlewareParams,
  next: (params: Prisma.MiddlewareParams) => Promise<any>,
) => {
  const logger = new Logger('PrismaQueryLogger')
  const threshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '100', 10)

  const before = Date.now()

  // Executar query
  const result = await next(params)

  const after = Date.now()
  const duration = after - before

  // Log apenas queries lentas (> threshold)
  if (duration > threshold) {
    const logData = {
      model: params.model,
      action: params.action,
      duration: `${duration}ms`,
      threshold: `${threshold}ms`,
    }

    // Log como warning se > threshold, error se > 1000ms
    if (duration > 1000) {
      logger.error(`🔴 Critical slow query detected`, logData)
    } else {
      logger.warn(`🐌 Slow query detected`, logData)
    }

    // Em desenvolvimento, logar também os args para debug
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Query args:', {
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
