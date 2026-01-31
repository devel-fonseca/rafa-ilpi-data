import { Injectable, Logger } from '@nestjs/common'
import { CacheService } from './cache.service'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Service para cachear a resolução de tenantId → schemaName
 *
 * Elimina a query repetitiva `SELECT schemaName FROM public.tenants WHERE id = ?`
 * que ocorre em TODA request autenticada.
 *
 * Cache: Redis com TTL de 30 minutos
 * Invalidação: Manual via invalidate() quando tenant for modificado
 */
@Injectable()
export class TenantSchemaCacheService {
  private readonly logger = new Logger(TenantSchemaCacheService.name)
  private readonly CACHE_PREFIX = 'tenant:schema:'
  private readonly CACHE_TTL = 30 * 60 // 30 minutos em segundos

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resolve tenantId → schemaName com cache Redis
   *
   * Flow:
   * 1. Tenta buscar do Redis
   * 2. Se não encontrar (cache miss), busca do banco
   * 3. Salva no Redis para próximas requests
   *
   * @param tenantId - UUID do tenant
   * @returns schemaName do tenant
   * @throws Error se tenant não existir
   */
  async getSchemaName(tenantId: string): Promise<string> {
    const cacheKey = `${this.CACHE_PREFIX}${tenantId}`

    // Tentar buscar do cache
    const cached = await this.cacheService.get<string>(cacheKey)

    if (cached) {
      this.logger.debug(`✅ Cache HIT: ${cacheKey} → ${cached}`)
      return cached
    }

    // Cache miss - buscar do banco
    this.logger.debug(`❌ Cache MISS: ${cacheKey} - buscando do banco`)

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    })

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} não encontrado`)
    }

    // Salvar no cache
    await this.cacheService.set(cacheKey, tenant.schemaName, this.CACHE_TTL)

    this.logger.debug(`💾 Cache SET: ${cacheKey} → ${tenant.schemaName}`)

    return tenant.schemaName
  }

  /**
   * Invalida o cache de um tenant específico
   *
   * Use quando o schemaName do tenant for modificado (raro, mas possível)
   *
   * @param tenantId - UUID do tenant
   */
  async invalidate(tenantId: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${tenantId}`
    await this.cacheService.del(cacheKey)
    this.logger.log(`🗑️  Cache invalidado: ${cacheKey}`)
  }

  /**
   * Limpa todo o cache de schemas de tenants
   *
   * Use com cuidado - força todas as próximas requests a buscar do banco
   */
  async clear(): Promise<void> {
    const deletedCount = await this.cacheService.clear(`${this.CACHE_PREFIX}*`)
    this.logger.warn(`🗑️  Cache limpo: ${deletedCount} tenant(s) removido(s)`)
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

    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, schemaName: true },
    })

    for (const tenant of tenants) {
      const cacheKey = `${this.CACHE_PREFIX}${tenant.id}`
      await this.cacheService.set(cacheKey, tenant.schemaName, this.CACHE_TTL)
    }

    this.logger.log(`🔥 Cache aquecido para ${tenants.length} tenants`)
  }
}
