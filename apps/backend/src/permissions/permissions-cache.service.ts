import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionType, PositionCode } from '@prisma/client';
import { getPositionPermissions } from './position-profiles.config';

/**
 * Interface para dados de usuário cacheados (para permissões)
 */
export interface CachedUserPermissions {
  userId: string;
  tenantId: string | null;
  role: string;
  profile?: {
    id: string;
    positionCode: string | null;
    customPermissions: Array<{
      permission: PermissionType;
      isGranted: boolean;
    }>;
  } | null;
}

/**
 * Serviço de cache de Permissões
 *
 * Cacheia dados de usuário (role, profile, customPermissions) para reduzir queries no banco.
 * Usado principalmente pelo PermissionsService que verifica permissões em ~60% das requests.
 *
 * **TTL:** 300s (5 minutos) - Menor que tenant pois permissões mudam com mais frequência
 * **Padrão de chave:** `user-permissions:{userId}`
 *
 * **Invalidação:**
 * - Ao atualizar permissões customizadas (grantPermission, revokePermission)
 * - Ao atualizar positionCode do usuário (updateUserPosition)
 * - Ao atualizar role do usuário
 * - Manualmente via `invalidate(userId)`
 *
 * @example
 * ```typescript
 * // Buscar dados de permissões (usa cache se disponível)
 * const userPermData = await permissionsCacheService.get(userId);
 *
 * // Invalidar cache ao atualizar permissões
 * await permissionsCacheService.invalidate(userId);
 * ```
 */
@Injectable()
export class PermissionsCacheService {
  private readonly logger = new Logger(PermissionsCacheService.name);
  private readonly CACHE_PREFIX = 'user-permissions:';
  private readonly CACHE_TTL = 300; // 5 minutos (menor que tenant pois permissões mudam mais)

  constructor(
    private cacheService: CacheService,
    private prisma: PrismaService,
  ) {}

  /**
   * Busca dados de permissões do cache ou banco
   *
   * Fluxo:
   * 1. Tenta buscar do cache
   * 2. Se não encontrar (cache miss), busca do banco
   * 3. Salva no cache para próximas requests
   *
   * @param userId - ID do usuário
   * @returns Dados de permissões ou null se não encontrado
   */
  async get(userId: string): Promise<CachedUserPermissions | null> {
    const cacheKey = this.getCacheKey(userId);

    // 1. Tentar buscar do cache
    const cached = await this.cacheService.get<CachedUserPermissions>(cacheKey);
    if (cached) {
      this.logger.debug(`✅ Cache HIT: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`❌ Cache MISS: ${cacheKey} - Buscando do banco...`);

    // 2. Buscar do banco
    const userPermData = await this.fetchFromDatabase(userId);
    if (!userPermData) {
      this.logger.warn(`Usuário não encontrado para permissões: ${userId}`);
      return null;
    }

    // 3. Salvar no cache
    await this.cacheService.set(cacheKey, userPermData, this.CACHE_TTL);
    this.logger.log(`💾 Permissões cacheadas: ${userId} (TTL: ${this.CACHE_TTL}s)`);

    return userPermData;
  }

  /**
   * Busca dados de permissões do banco
   *
   * Mesma query usada em PermissionsService.hasPermission, getUserEffectivePermissions, etc
   *
   * ARQUITETURA MULTI-TENANT:
   * Este é um serviço singleton que precisa acessar User (TENANT table) tendo apenas userId.
   * Solução: Query SQL raw otimizada que busca em UNION de todos os tenant schemas.
   */
  private async fetchFromDatabase(
    userId: string,
  ): Promise<CachedUserPermissions | null> {
    // STEP 1: Buscar tenantId do user via query raw (User tem tenantId mesmo em schema de tenant)
    // Query otimizada: buscar em todos os schemas via UNION ALL
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { schemaName: true },
    });

    if (tenants.length === 0) {
      this.logger.warn('Nenhum tenant ativo encontrado');
      return null;
    }

    // Construir UNION ALL de todos os schemas
    const unionQuery = tenants
      .map(
        (t) =>
          `SELECT id, tenant_id as "tenantId", role FROM "${t.schemaName}".users WHERE id = $1 AND deleted_at IS NULL`,
      )
      .join(' UNION ALL ');

    type UserBasicInfo = {
      id: string;
      tenantId: string;
      role: string;
    };

    const results = await this.prisma.$queryRawUnsafe<UserBasicInfo[]>(
      unionQuery,
      userId,
    );

    if (results.length === 0) {
      this.logger.debug(`User ${userId} não encontrado em nenhum tenant schema`);
      return null;
    }

    const basicInfo = results[0]; // Pegar primeiro resultado (user deve existir em apenas 1 schema)

    // STEP 2: Buscar tenant para obter schemaName
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: basicInfo.tenantId },
      select: { schemaName: true },
    });

    if (!tenant) {
      this.logger.error(
        `Tenant ${basicInfo.tenantId} não encontrado para user ${userId}`,
      );
      return null;
    }

    // STEP 3: Usar tenant client para buscar dados completos (profile + customPermissions)
    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);

    const user = await tenantClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
        profile: {
          select: {
            id: true,
            positionCode: true,
            customPermissions: {
              select: {
                permission: true,
                isGranted: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      // Improvável acontecer (já verificamos que existe), mas tratar
      this.logger.error(
        `User ${userId} não encontrado no schema ${tenant.schemaName} na segunda query`,
      );
      return null;
    }

    return {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      profile: user.profile,
    };
  }

  /**
   * Calcula permissões efetivas a partir dos dados cacheados
   *
   * Lógica extraída de PermissionsService.getUserEffectivePermissions
   * Permite calcular permissões sem query ao banco
   *
   * @param userPermData - Dados de permissões do usuário (do cache ou banco)
   * @returns Lista de permissões efetivas
   */
  calculateEffectivePermissions(
    userPermData: CachedUserPermissions,
  ): PermissionType[] {
    // Se é ADMIN, retorna TODAS as permissões (case-insensitive)
    if (userPermData.role?.toLowerCase() === 'admin') {
      return Object.values(PermissionType);
    }

    // Começar com permissões do cargo
    let effectivePermissions: PermissionType[] = [];

    if (userPermData.profile?.positionCode) {
      effectivePermissions = getPositionPermissions(
        userPermData.profile.positionCode as PositionCode,
      );
    }

    // Aplicar permissões customizadas
    if (userPermData.profile?.customPermissions) {
      for (const customPerm of userPermData.profile.customPermissions) {
        if (customPerm.isGranted) {
          // Adicionar permissão concedida
          if (!effectivePermissions.includes(customPerm.permission)) {
            effectivePermissions.push(customPerm.permission);
          }
        } else {
          // Remover permissão revogada
          effectivePermissions = effectivePermissions.filter(
            (p) => p !== customPerm.permission,
          );
        }
      }
    }

    return effectivePermissions;
  }

  /**
   * Verifica se um usuário tem uma permissão específica (usando cache)
   *
   * Wrapper otimizado para PermissionsService.hasPermission
   *
   * @param userId - ID do usuário
   * @param tenantId - ID do tenant
   * @param permission - Permissão a verificar
   * @returns true se usuário tem a permissão
   */
  async hasPermission(
    userId: string,
    tenantId: string,
    permission: PermissionType,
  ): Promise<boolean> {
    const userPermData = await this.get(userId);

    if (!userPermData || userPermData.tenantId !== tenantId) {
      return false;
    }

    // 1. ADMIN tem todas as permissões (case-insensitive)
    if (userPermData.role?.toLowerCase() === 'admin') {
      return true;
    }

    // 2. Verificar permissões customizadas REVOGADAS
    const revokedPermission = userPermData.profile?.customPermissions?.find(
      (p) => p.permission === permission && p.isGranted === false,
    );

    if (revokedPermission) {
      return false;
    }

    // 3. Verificar permissões customizadas CONCEDIDAS
    const grantedPermission = userPermData.profile?.customPermissions?.find(
      (p) => p.permission === permission && p.isGranted === true,
    );

    if (grantedPermission) {
      return true;
    }

    // 4. Verificar permissões do CARGO (PositionCode)
    if (userPermData.profile?.positionCode) {
      const positionPermissions = getPositionPermissions(
        userPermData.profile.positionCode as PositionCode,
      );

      if (positionPermissions.includes(permission)) {
        return true;
      }
    }

    // 5. Permissão negada
    return false;
  }

  /**
   * Invalida o cache de permissões de um usuário
   *
   * Deve ser chamado ao:
   * - Conceder/revogar permissão customizada
   * - Atualizar positionCode do usuário
   * - Atualizar role do usuário
   *
   * @param userId - ID do usuário
   */
  async invalidate(userId: string): Promise<void> {
    const cacheKey = this.getCacheKey(userId);
    const deleted = await this.cacheService.del(cacheKey);

    if (deleted > 0) {
      this.logger.log(`🗑️  Cache de permissões invalidado: ${cacheKey}`);
    } else {
      this.logger.debug(
        `Cache de permissões não encontrado para invalidar: ${cacheKey}`,
      );
    }
  }

  /**
   * Invalida cache de múltiplos usuários
   *
   * @param userIds - Array de IDs
   */
  async invalidateMany(userIds: string[]): Promise<void> {
    await Promise.all(userIds.map((id) => this.invalidate(id)));
    this.logger.log(
      `🗑️  Cache de permissões invalidado em massa: ${userIds.length} usuário(s)`,
    );
  }

  /**
   * Limpa TODOS os caches de permissões
   *
   * ⚠️ Use com cuidado! Apenas em casos de emergência.
   */
  async clearAll(): Promise<void> {
    const deleted = await this.cacheService.clear(`${this.CACHE_PREFIX}*`);
    this.logger.warn(
      `⚠️  TODOS os caches de permissões foram limpos: ${deleted} chave(s)`,
    );
  }

  /**
   * Pré-aquece o cache com usuários mais acessados
   *
   * Útil após deploy ou limpeza de cache
   *
   * @param userIds - IDs dos usuários para pré-aquecer
   */
  async warmup(userIds: string[]): Promise<void> {
    this.logger.log(
      `🔥 Pré-aquecendo cache de permissões de ${userIds.length} usuário(s)...`,
    );

    const results = await Promise.allSettled(
      userIds.map(async (id) => {
        const userPermData = await this.fetchFromDatabase(id);
        if (userPermData) {
          await this.cacheService.set(
            this.getCacheKey(id),
            userPermData,
            this.CACHE_TTL,
          );
        }
      }),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    this.logger.log(
      `✅ Cache de permissões pré-aquecido: ${succeeded}/${userIds.length} usuário(s)`,
    );
  }

  /**
   * Gera chave de cache para um usuário
   */
  private getCacheKey(userId: string): string {
    return `${this.CACHE_PREFIX}${userId}`;
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
