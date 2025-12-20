import { Logger } from '@nestjs/common'

/**
 * Decorator para retry automático com backoff exponencial
 * Útil para chamadas à API externa que podem falhar temporariamente (rate limiting, timeouts, etc)
 *
 * @param maxRetries - Número máximo de tentativas (padrão: 3)
 * @param baseDelay - Delay inicial em ms (padrão: 1000ms = 1s)
 * @param retryOnStatuses - Códigos HTTP que devem ser retentados (padrão: [429, 500, 502, 503, 504])
 */
export function RetryWithBackoff(
  maxRetries: number = 3,
  baseDelay: number = 1000,
  retryOnStatuses: number[] = [429, 500, 502, 503, 504],
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value
    const logger = new Logger(target.constructor.name)

    descriptor.value = async function (...args: any[]) {
      let lastError: any

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await originalMethod.apply(this, args)
        } catch (error: any) {
          lastError = error

          // Verificar se é um erro de axios com status code
          const statusCode = error?.response?.status
          const shouldRetry =
            statusCode && retryOnStatuses.includes(statusCode)

          // Não retentar se não for um status code esperado OU se for a última tentativa
          if (!shouldRetry || attempt === maxRetries) {
            throw error
          }

          // Calcular delay com backoff exponencial: baseDelay * 2^attempt
          // Ex: 1s, 2s, 4s, 8s...
          const delay = baseDelay * Math.pow(2, attempt)

          logger.warn(
            `[${propertyKey}] Attempt ${attempt + 1}/${maxRetries} failed with status ${statusCode}. Retrying in ${delay}ms...`,
          )

          // Aguardar antes de retentar
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }

      // Se chegou aqui, todas as tentativas falharam
      throw lastError
    }

    return descriptor
  }
}
