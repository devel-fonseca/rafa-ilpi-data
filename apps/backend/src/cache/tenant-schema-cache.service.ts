import { Injectable, Logger } from '@nestjs/common'
import { CacheService } from './cache.service'
import { PrismaService } from '../prisma/prisma.service'
import { ConfigService } from '@nestjs/config'

/**
 * Service para cachear a resolução de tenantId → schemaName
 *
 * Elimina a query repetitiva `SELECT schemaName FROM public.tenants WHERE id = ?`
 * que ocorre em TODA request autenticada.
 *
 * Cache: Redis com TTL de 30 minutos (com jitter)
 * Invalidação: Manual via invalidate() quando tenant for modificado
 *
 * Melhorias de produção:
 * - Namespace por ambiente (evita colisão staging/prod)
 * - Proteção contra thundering herd (in-flight promises)
 * - TTL com jitter (evita expiração em massa)
 * - Métricas de observabilidade (hit/miss/error)
 * - Modo degradado (fallback se Redis cair)
 */
@Injectable()
export class TenantSchemaCacheService {
  private readonly logger = new Logger(TenantSchemaCacheService.name)
  private readonly CACHE_PREFIX: string
  private readonly CACHE_TTL = 30 * 60 // 30 minutos em segundos (base)
  private readonly CACHE_TTL_JITTER = 0.1 // ±10% de variação

  // In-flight promises para evitar thundering herd
  private readonly inFlightPromises = new Map<string, Promise<string>>()

  // Métricas de observabilidade
  private metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
    dbFallbacks: 0,
  }

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Namespace por ambiente (prod/staging/dev)
    const env = this.configService.get('NODE_ENV') || 'development'
    this.CACHE_PREFIX = `${env}:tenant:schema:`
    this.logger.log(`Cache prefix: ${this.CACHE_PREFIX}`)
  }

  /**
   * Resolve tenantId → schemaName com cache Redis
   *
   * Flow:
   * 1. Tenta buscar do Redis
   * 2. Se não encontrar (cache miss), busca do banco (com proteção thundering herd)
   * 3. Salva no Redis com TTL variável (jitter)
   *
   * Melhorias de produção:
   * - Proteção thundering herd: apenas 1 query por tenantId mesmo com múltiplos misses simultâneos
   * - TTL com jitter: evita expiração em massa
   * - Modo degradado: fallback para DB se Redis falhar
   * - Métricas: registra hit/miss/error para observabilidade
   *
   * @param tenantId - UUID do tenant
   * @returns schemaName do tenant
   * @throws Error se tenant não existir
   */
  async getSchemaName(tenantId: string): Promise<string> {
    const cacheKey = `${this.CACHE_PREFIX}${tenantId}`

    try {
      // Tentar buscar do cache
      const cached = await this.cacheService.get<string>(cacheKey)

      if (cached) {
        this.metrics.hits++
        this.logger.debug(`✅ Cache HIT: ${cacheKey} → ${cached}`)
        return cached
      }
    } catch (error) {
      // Redis falhou - logar erro mas continuar (modo degradado)
      this.metrics.errors++
      this.logger.warn(
        `⚠️ Redis error ao buscar ${cacheKey}: ${error.message} - fallback para DB`,
      )
      return this.fetchFromDatabase(tenantId) // Fallback direto
    }

    // Cache miss - usar in-flight promise para evitar thundering herd
    this.metrics.misses++
    this.logger.debug(`❌ Cache MISS: ${cacheKey} - buscando do banco`)

    // Verificar se já existe promise em andamento para este tenantId
    const existingPromise = this.inFlightPromises.get(tenantId)
    if (existingPromise) {
      this.logger.debug(
        `🔒 Thundering herd protection: aguardando promise existente para ${tenantId}`,
      )
      return existingPromise
    }

    // Criar nova promise e registrar
    const promise = this.fetchAndCache(tenantId, cacheKey)
    this.inFlightPromises.set(tenantId, promise)

    // Limpar promise quando terminar (sucesso ou erro)
    promise.finally(() => {
      this.inFlightPromises.delete(tenantId)
    })

    return promise
  }

  /**
   * Busca schemaName do banco de dados
   * Usado como fallback quando Redis falha
   */
  private async fetchFromDatabase(tenantId: string): Promise<string> {
    this.metrics.dbFallbacks++

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    })

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} não encontrado`)
    }

    return tenant.schemaName
  }

  /**
   * Busca do banco e salva no cache com TTL variável (jitter)
   */
  private async fetchAndCache(
    tenantId: string,
    cacheKey: string,
  ): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    })

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} não encontrado`)
    }

    // TTL com jitter: 30min ± 10% → 27-33 min
    const jitteredTTL = this.getTTLWithJitter()

    try {
      // Salvar no cache (pode falhar silenciosamente se Redis cair)
      await this.cacheService.set(cacheKey, tenant.schemaName, jitteredTTL)
      this.logger.debug(
        `💾 Cache SET: ${cacheKey} → ${tenant.schemaName} (TTL: ${jitteredTTL}s)`,
      )
    } catch (error) {
      this.metrics.errors++
      this.logger.warn(
        `⚠️ Redis error ao salvar ${cacheKey}: ${error.message} - continuando sem cache`,
      )
      // Não propagar erro - dados já foram buscados do DB
    }

    return tenant.schemaName
  }

  /**
   * Gera TTL com jitter para evitar expiração em massa
   * Base: 30min ± 10% → 27-33 min
   */
  private getTTLWithJitter(): number {
    const jitter = 1 + (Math.random() * 2 - 1) * this.CACHE_TTL_JITTER // ±10%
    return Math.floor(this.CACHE_TTL * jitter)
  }

  /**
   * Invalida o cache de um tenant específico
   *
   * Use quando:
   * - schemaName do tenant for modificado (raro)
   * - Tenant for removido/desativado
   * - Migração de tenant acontecer
   *
   * @param tenantId - UUID do tenant
   * @param reason - Motivo da invalidação (para audit log)
   */
  async invalidate(tenantId: string, reason?: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${tenantId}`

    try {
      await this.cacheService.del(cacheKey)

      // Audit log: registrar invalidação para rastreabilidade
      this.logger.log(`🗑️  Cache invalidado: ${cacheKey}`, {
        tenantId,
        reason: reason || 'Manual invalidation',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      this.logger.error(
        `❌ Erro ao invalidar cache ${cacheKey}: ${error.message}`,
      )
      // Não propagar erro - invalidação é best-effort
    }
  }

  /**
   * Limpa todo o cache de schemas de tenants
   *
   * Use com cuidado - força todas as próximas requests a buscar do banco
   *
   * @param reason - Motivo da limpeza (para audit log)
   */
  async clear(reason?: string): Promise<void> {
    try {
      const deletedCount = await this.cacheService.clear(
        `${this.CACHE_PREFIX}*`,
      )

      // Audit log
      this.logger.warn(`🗑️  Cache limpo: ${deletedCount} tenant(s) removido(s)`, {
        reason: reason || 'Manual clear',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      this.logger.error(`❌ Erro ao limpar cache: ${error.message}`)
    }
  }

  /**
   * Pre-aquece o cache para um tenant específico
   *
   * Útil após login ou deploy para evitar cache miss na primeira request
   *
   * @param tenantId - UUID do tenant
   */
  async warmUp(tenantId: string): Promise<void> {
    await this.getSchemaName(tenantId)
    this.logger.log(`🔥 Cache aquecido para tenant ${tenantId}`)
  }

  /**
   * Pre-aquece o cache para todos os tenants ativos
   *
   * Útil após deploy ou restart do Redis
   */
  async warmUpAll(): Promise<void> {
    this.logger.log('🔥 Iniciando warm-up de todos os tenants...')

    try {
      const tenants = await this.prisma.tenant.findMany({
        select: { id: true, schemaName: true },
      })

      let successCount = 0
      let errorCount = 0

      for (const tenant of tenants) {
        const cacheKey = `${this.CACHE_PREFIX}${tenant.id}`
        const jitteredTTL = this.getTTLWithJitter()

        try {
          await this.cacheService.set(cacheKey, tenant.schemaName, jitteredTTL)
          successCount++
        } catch (error) {
          errorCount++
          this.logger.warn(
            `⚠️ Erro ao aquecer cache para tenant ${tenant.id}: ${error.message}`,
          )
        }
      }

      this.logger.log(
        `🔥 Cache aquecido: ${successCount} sucesso, ${errorCount} erros (total: ${tenants.length})`,
      )
    } catch (error) {
      this.logger.error(
        `❌ Erro ao buscar tenants para warm-up: ${error.message}`,
      )
    }
  }

  /**
   * Retorna métricas de observabilidade do cache
   *
   * Use para monitoring/alerting:
   * - hit_rate = hits / (hits + misses)
   * - error_rate = errors / total_operations
   * - db_fallback_rate = dbFallbacks / total_operations
   */
  getMetrics() {
    const totalOperations = this.metrics.hits + this.metrics.misses
    const hitRate =
      totalOperations > 0 ? this.metrics.hits / totalOperations : 0

    return {
      ...this.metrics,
      hitRate: (hitRate * 100).toFixed(2) + '%',
      totalOperations,
    }
  }

  /**
   * Reseta métricas (útil para testes ou após coleta periódica)
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      dbFallbacks: 0,
    }
    this.logger.debug('📊 Métricas resetadas')
  }

  /**
   * Log periódico de métricas (chamado pelo health check ou cron)
   */
  logMetrics(): void {
    const metrics = this.getMetrics()
    this.logger.log('📊 Cache metrics:', metrics)
  }
}
