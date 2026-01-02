import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { Tenant } from '@prisma/client';

/**
 * Interface para Tenant cacheado (com subscriptions e plan)
 */
export interface CachedTenant extends Tenant {
  subscriptions?: Array<{
    id: string;
    status: string;
    plan: {
      id: string;
      name: string;
      maxResidents: number;
      maxUsers: number;
    };
  }>;
  profile?: {
    tradeName: string | null;
  } | null;
}

/**
 * Serviço de cache de Tenant
 *
 * Cacheia dados de tenant para reduzir queries no banco.
 * Usado principalmente no JwtStrategy que busca tenant em TODA request autenticada.
 *
 * **TTL:** 900s (15 minutos)
 * **Padrão de chave:** `tenant:{tenantId}`
 *
 * **Invalidação:**
 * - Ao atualizar tenant (via TenantsService)
 * - Ao atualizar subscription
 * - Manualmente via `invalidate(tenantId)`
 *
 * @example
 * ```typescript
 * // Buscar tenant (usa cache se disponível)
 * const tenant = await tenantCacheService.get(tenantId);
 *
 * // Invalidar cache ao atualizar
 * await tenantCacheService.invalidate(tenantId);
 * ```
 */
@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);
  private readonly CACHE_PREFIX = 'tenant:';
  private readonly CACHE_TTL = 900; // 15 minutos

  constructor(
    private cacheService: CacheService,
    private prisma: PrismaService,
  ) {}

  /**
   * Busca tenant do cache ou banco
   *
   * Fluxo:
   * 1. Tenta buscar do cache
   * 2. Se não encontrar (cache miss), busca do banco
   * 3. Salva no cache para próximas requests
   *
   * @param tenantId - ID do tenant
   * @returns Tenant completo ou null se não encontrado
   */
  async get(tenantId: string): Promise<CachedTenant | null> {
    const cacheKey = this.getCacheKey(tenantId);

    // 1. Tentar buscar do cache
    const cached = await this.cacheService.get<CachedTenant>(cacheKey);
    if (cached) {
      this.logger.debug(`✅ Cache HIT: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`❌ Cache MISS: ${cacheKey} - Buscando do banco...`);

    // 2. Buscar do banco
    const tenant = await this.fetchFromDatabase(tenantId);
    if (!tenant) {
      this.logger.warn(`Tenant não encontrado: ${tenantId}`);
      return null;
    }

    // 3. Salvar no cache
    await this.cacheService.set(cacheKey, tenant, this.CACHE_TTL);
    this.logger.log(`💾 Tenant cacheado: ${tenantId} (TTL: ${this.CACHE_TTL}s)`);

    return tenant;
  }

  /**
   * Busca tenant do banco com subscriptions e plan
   *
   * Mesma query usada em JwtStrategy e AuthService
   */
  private async fetchFromDatabase(tenantId: string): Promise<CachedTenant | null> {
    return await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: {
            status: { in: ['trialing', 'active', 'TRIAL', 'ACTIVE'] },
          },
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                maxResidents: true,
                maxUsers: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1, // Apenas a subscription mais recente
        },
        profile: {
          select: {
            tradeName: true,
          },
        },
      },
    }) as CachedTenant | null;
  }

  /**
   * Invalida o cache de um tenant
   *
   * Deve ser chamado ao:
   * - Atualizar dados do tenant
   * - Atualizar subscription
   * - Atualizar plan
   *
   * @param tenantId - ID do tenant
   */
  async invalidate(tenantId: string): Promise<void> {
    const cacheKey = this.getCacheKey(tenantId);
    const deleted = await this.cacheService.del(cacheKey);

    if (deleted > 0) {
      this.logger.log(`🗑️  Cache invalidado: ${cacheKey}`);
    } else {
      this.logger.debug(`Cache não encontrado para invalidar: ${cacheKey}`);
    }
  }

  /**
   * Invalida cache de múltiplos tenants
   *
   * @param tenantIds - Array de IDs
   */
  async invalidateMany(tenantIds: string[]): Promise<void> {
    await Promise.all(tenantIds.map((id) => this.invalidate(id)));
    this.logger.log(`🗑️  Cache invalidado em massa: ${tenantIds.length} tenant(s)`);
  }

  /**
   * Limpa TODOS os caches de tenant
   *
   * ⚠️ Use com cuidado! Apenas em casos de emergência.
   */
  async clearAll(): Promise<void> {
    const deleted = await this.cacheService.clear(`${this.CACHE_PREFIX}*`);
    this.logger.warn(`⚠️  TODOS os caches de tenant foram limpos: ${deleted} chave(s)`);
  }

  /**
   * Pré-aquece o cache com tenants mais acessados
   *
   * Útil após deploy ou limpeza de cache
   *
   * @param tenantIds - IDs dos tenants para pré-aquecer
   */
  async warmup(tenantIds: string[]): Promise<void> {
    this.logger.log(`🔥 Pré-aquecendo cache de ${tenantIds.length} tenant(s)...`);

    const results = await Promise.allSettled(
      tenantIds.map(async (id) => {
        const tenant = await this.fetchFromDatabase(id);
        if (tenant) {
          await this.cacheService.set(this.getCacheKey(id), tenant, this.CACHE_TTL);
        }
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(`✅ Cache pré-aquecido: ${succeeded}/${tenantIds.length} tenant(s)`);
  }

  /**
   * Gera chave de cache para um tenant
   */
  private getCacheKey(tenantId: string): string {
    return `${this.CACHE_PREFIX}${tenantId}`;
  }

  /**
   * Retorna estatísticas de cache (útil para debugging)
   */
  async getStats(): Promise<{
    totalCached: number;
    cachePattern: string;
  }> {
    // Nota: KEYS é custoso em produção, use apenas para debugging
    const keys = await this.cacheService.clear(`${this.CACHE_PREFIX}*`);
    return {
      totalCached: keys,
      cachePattern: `${this.CACHE_PREFIX}*`,
    };
  }
}
