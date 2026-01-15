/**
 * PermissionsService
 *
 * Serviço central para validação de permissões no sistema híbrido.
 * Combina:
 * 1. Permissões baseadas em Role (admin, manager, staff, viewer)
 * 2. Permissões baseadas em PositionCode (cargo ILPI)
 * 3. Permissões customizadas (UserPermission)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { PermissionType, PositionCode } from '@prisma/client';
import { getPositionPermissions } from './position-profiles.config';
import { PermissionsCacheService } from './permissions-cache.service';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly prisma: PrismaService, // Para tabelas SHARED (public schema)
    private readonly tenantContext: TenantContextService, // Para tabelas TENANT (schema isolado)
    private readonly permissionsCacheService: PermissionsCacheService,
  ) {}

  /**
   * Verifica se um usuário tem uma permissão específica
   *
   * Ordem de verificação:
   * 1. Se é ADMIN → tem todas as permissões
   * 2. Permissões customizadas revogadas → bloqueia
   * 3. Permissões customizadas concedidas → permite
   * 4. Permissões do cargo (PositionCode) → permite se no perfil
   * 5. Caso contrário → nega
   *
   * OTIMIZAÇÃO: Usa cache para evitar query ao banco em ~60% das requests
   */
  async hasPermission(
    userId: string,
    permission: PermissionType,
  ): Promise<boolean> {
    try {
      // Buscar do cache (otimização)
      const hasPermCached =
        await this.permissionsCacheService.hasPermission(
          userId,
          this.tenantContext.tenantId,
          permission,
        );
      return hasPermCached;
    } catch (error) {
      this.logger.error(
        `Erro ao verificar permissão ${permission} para usuário ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Verifica se um usuário tem TODAS as permissões especificadas
   */
  async hasAllPermissions(
    userId: string,
    permissions: PermissionType[],
  ): Promise<boolean> {
    const results = await Promise.all(
      permissions.map((perm) => this.hasPermission(userId, perm)),
    );
    return results.every((result) => result === true);
  }

  /**
   * Verifica se um usuário tem QUALQUER uma das permissões especificadas
   */
  async hasAnyPermission(
    userId: string,
    permissions: PermissionType[],
  ): Promise<boolean> {
    const results = await Promise.all(
      permissions.map((perm) => this.hasPermission(userId, perm)),
    );
    return results.some((result) => result === true);
  }

  /**
   * Retorna todas as permissões efetivas de um usuário
   *
   * OTIMIZAÇÃO: Usa cache para evitar query ao banco
   */
  async getUserEffectivePermissions(
    userId: string,
  ): Promise<PermissionType[]> {
    try {
      const userPermData = await this.permissionsCacheService.get(userId);

      if (!userPermData || userPermData.tenantId !== this.tenantContext.tenantId) {
        return [];
      }

      return this.permissionsCacheService.calculateEffectivePermissions(
        userPermData,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao buscar permissões efetivas do usuário ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Concede uma permissão customizada para um usuário
   */
  async grantPermission(
    userId: string,
    permission: PermissionType,
    grantedBy: string,
  ): Promise<void> {
    try {
      const userProfile = await this.tenantContext.client.userProfile.findUnique({
        where: { userId },
      });

      if (!userProfile) {
        this.logger.error(`UserProfile não encontrado para userId: ${userId}`);
        throw new Error('Perfil de usuário não encontrado');
      }

      await this.tenantContext.client.userPermission.upsert({
        where: {
          userProfileId_permission: {
            userProfileId: userProfile.id,
            permission,
          },
        },
        create: {
          userProfileId: userProfile.id,
          tenantId: this.tenantContext.tenantId,
          permission,
          isGranted: true,
          grantedBy,
        },
        update: {
          isGranted: true,
          grantedBy,
          grantedAt: new Date(),
        },
      });

      // Invalidar cache
      await this.permissionsCacheService.invalidate(userId);

      this.logger.log(
        `Permissão ${permission} CONCEDIDA para usuário ${userId} por ${grantedBy}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao conceder permissão ${permission} para userId ${userId}:`,
        {
          userId,
          tenantId: this.tenantContext.tenantId,
          permission,
          grantedBy,
          error: error.message,
          stack: error.stack,
        },
      );
      throw error;
    }
  }

  /**
   * Revoga uma permissão customizada de um usuário
   */
  async revokePermission(
    userId: string,
    permission: PermissionType,
    revokedBy: string,
  ): Promise<void> {
    const userProfile = await this.tenantContext.client.userProfile.findUnique({
      where: { userId },
    });

    if (!userProfile) {
      throw new Error('Perfil de usuário não encontrado');
    }

    await this.tenantContext.client.userPermission.upsert({
      where: {
        userProfileId_permission: {
          userProfileId: userProfile.id,
          permission,
        },
      },
      create: {
        userProfileId: userProfile.id,
        tenantId: this.tenantContext.tenantId,
        permission,
        isGranted: false,
        grantedBy: revokedBy,
      },
      update: {
        isGranted: false,
        grantedBy: revokedBy,
        grantedAt: new Date(),
      },
    });

    // Invalidar cache
    await this.permissionsCacheService.invalidate(userId);

    this.logger.log(
      `Permissão ${permission} REVOGADA de usuário ${userId} por ${revokedBy}`,
    );
  }

  /**
   * Remove uma permissão customizada (volta ao padrão do cargo)
   */
  async removeCustomPermission(
    userId: string,
    permission: PermissionType,
  ): Promise<void> {
    const userProfile = await this.tenantContext.client.userProfile.findUnique({
      where: { userId },
    });

    if (!userProfile) {
      throw new Error('Perfil de usuário não encontrado');
    }

    await this.tenantContext.client.userPermission.deleteMany({
      where: {
        userProfileId: userProfile.id,
        permission,
      },
    });

    // Invalidar cache
    await this.permissionsCacheService.invalidate(userId);

    this.logger.log(
      `Permissão customizada ${permission} REMOVIDA de usuário ${userId} (volta ao padrão do cargo)`,
    );
  }

  /**
   * Atualiza o cargo de um usuário
   */
  async updateUserPosition(
    userId: string,
    positionCode: PositionCode,
    registrationType?: string,
    registrationNumber?: string,
    registrationState?: string,
    updatedBy?: string,
  ): Promise<void> {
    const userProfile = await this.tenantContext.client.userProfile.findUnique({
      where: { userId },
    });

    if (!userProfile) {
      throw new Error('Perfil de usuário não encontrado');
    }

    await this.tenantContext.client.userProfile.update({
      where: { id: userProfile.id },
      data: {
        positionCode,
        registrationType: registrationType as any,
        registrationNumber,
        registrationState,
        updatedBy,
      },
    });

    // Invalidar cache (positionCode mudou = permissões mudam)
    await this.permissionsCacheService.invalidate(userId);

    this.logger.log(
      `Cargo do usuário ${userId} atualizado para ${positionCode}`,
    );
  }

  /**
   * Retorna permissões separadas: herdadas do cargo, customizadas e todas
   *
   * OTIMIZAÇÃO: Usa cache para evitar query ao banco
   */
  async getUserAllPermissions(
    userId: string,
  ): Promise<{
    inherited: PermissionType[];
    custom: PermissionType[];
    all: PermissionType[];
  }> {
    try {
      const userPermData = await this.permissionsCacheService.get(userId);

      if (!userPermData || userPermData.tenantId !== this.tenantContext.tenantId) {
        return { inherited: [], custom: [], all: [] };
      }

      // Se é ADMIN, retorna TODAS as permissões como herdadas (case-insensitive)
      if (userPermData.role?.toLowerCase() === 'admin') {
        const allPermissions = Object.values(PermissionType);
        return {
          inherited: allPermissions,
          custom: [],
          all: allPermissions,
        };
      }

      // Permissões herdadas do cargo (PositionCode)
      let inherited: PermissionType[] = [];
      if (userPermData.profile?.positionCode) {
        inherited = getPositionPermissions(
          userPermData.profile.positionCode as PositionCode,
        );
      }

      // Permissões customizadas (concedidas)
      const customGranted: PermissionType[] = [];
      const customRevoked: PermissionType[] = [];

      if (userPermData.profile?.customPermissions) {
        for (const customPerm of userPermData.profile.customPermissions) {
          if (customPerm.isGranted) {
            customGranted.push(customPerm.permission);
          } else {
            customRevoked.push(customPerm.permission);
          }
        }
      }

      // Calcular permissões efetivas (all)
      let all = [...inherited];

      // Adicionar permissões customizadas concedidas
      for (const perm of customGranted) {
        if (!all.includes(perm)) {
          all.push(perm);
        }
      }

      // Remover permissões customizadas revogadas
      all = all.filter((perm) => !customRevoked.includes(perm));

      return {
        inherited,
        custom: customGranted,
        all,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar permissões do usuário ${userId}:`,
        error,
      );
      return { inherited: [], custom: [], all: [] };
    }
  }

  /**
   * Alias para grantPermission (mantido para compatibilidade)
   */
  async grantCustomPermission(
    userId: string,
    permission: PermissionType,
    grantedBy: string,
  ): Promise<void> {
    return this.grantPermission(userId, permission, grantedBy);
  }
}
