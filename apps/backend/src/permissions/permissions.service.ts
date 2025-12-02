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
import { PermissionType, PositionCode } from '@prisma/client';
import { getPositionPermissions } from './position-profiles.config';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica se um usuário tem uma permissão específica
   *
   * Ordem de verificação:
   * 1. Se é ADMIN → tem todas as permissões
   * 2. Permissões customizadas revogadas → bloqueia
   * 3. Permissões customizadas concedidas → permite
   * 4. Permissões do cargo (PositionCode) → permite se no perfil
   * 5. Caso contrário → nega
   */
  async hasPermission(
    userId: string,
    tenantId: string,
    permission: PermissionType,
  ): Promise<boolean> {
    try {
      // Buscar usuário com profile e permissões customizadas
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            include: {
              customPermissions: true,
            },
          },
        },
      });

      if (!user || user.tenantId !== tenantId) {
        this.logger.warn(
          `Usuário ${userId} não encontrado ou tenant incorreto`,
        );
        return false;
      }

      // 1. ADMIN tem todas as permissões
      if (user.role === 'admin') {
        this.logger.debug(
          `Usuário ${user.email} é ADMIN - permissão ${permission} concedida`,
        );
        return true;
      }

      // 2. Verificar permissões customizadas REVOGADAS
      const revokedPermission = user.profile?.customPermissions?.find(
        (p) => p.permission === permission && p.isGranted === false,
      );

      if (revokedPermission) {
        this.logger.debug(
          `Permissão ${permission} REVOGADA para usuário ${user.email}`,
        );
        return false;
      }

      // 3. Verificar permissões customizadas CONCEDIDAS
      const grantedPermission = user.profile?.customPermissions?.find(
        (p) => p.permission === permission && p.isGranted === true,
      );

      if (grantedPermission) {
        this.logger.debug(
          `Permissão ${permission} CONCEDIDA customizada para usuário ${user.email}`,
        );
        return true;
      }

      // 4. Verificar permissões do CARGO (PositionCode)
      if (user.profile?.positionCode) {
        const positionPermissions = getPositionPermissions(
          user.profile.positionCode,
        );

        if (positionPermissions.includes(permission)) {
          this.logger.debug(
            `Usuário ${user.email} tem permissão ${permission} via cargo ${user.profile.positionCode}`,
          );
          return true;
        }
      }

      // 5. Permissão negada
      this.logger.debug(
        `Usuário ${user.email} NÃO tem permissão ${permission}`,
      );
      return false;
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
    tenantId: string,
    permissions: PermissionType[],
  ): Promise<boolean> {
    const results = await Promise.all(
      permissions.map((perm) => this.hasPermission(userId, tenantId, perm)),
    );
    return results.every((result) => result === true);
  }

  /**
   * Verifica se um usuário tem QUALQUER uma das permissões especificadas
   */
  async hasAnyPermission(
    userId: string,
    tenantId: string,
    permissions: PermissionType[],
  ): Promise<boolean> {
    const results = await Promise.all(
      permissions.map((perm) => this.hasPermission(userId, tenantId, perm)),
    );
    return results.some((result) => result === true);
  }

  /**
   * Retorna todas as permissões efetivas de um usuário
   */
  async getUserEffectivePermissions(
    userId: string,
    tenantId: string,
  ): Promise<PermissionType[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            include: {
              customPermissions: true,
            },
          },
        },
      });

      if (!user || user.tenantId !== tenantId) {
        return [];
      }

      // Se é ADMIN, retorna TODAS as permissões
      if (user.role === 'admin') {
        return Object.values(PermissionType);
      }

      // Começar com permissões do cargo
      let effectivePermissions: PermissionType[] = [];

      if (user.profile?.positionCode) {
        effectivePermissions = getPositionPermissions(
          user.profile.positionCode,
        );
      }

      // Aplicar permissões customizadas
      if (user.profile?.customPermissions) {
        for (const customPerm of user.profile.customPermissions) {
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
    tenantId: string,
    permission: PermissionType,
    grantedBy: string,
  ): Promise<void> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!userProfile || userProfile.tenantId !== tenantId) {
      throw new Error('Perfil de usuário não encontrado');
    }

    await this.prisma.userPermission.upsert({
      where: {
        userProfileId_permission: {
          userProfileId: userProfile.id,
          permission,
        },
      },
      create: {
        userProfileId: userProfile.id,
        tenantId,
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

    this.logger.log(
      `Permissão ${permission} CONCEDIDA para usuário ${userId} por ${grantedBy}`,
    );
  }

  /**
   * Revoga uma permissão customizada de um usuário
   */
  async revokePermission(
    userId: string,
    tenantId: string,
    permission: PermissionType,
    revokedBy: string,
  ): Promise<void> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!userProfile || userProfile.tenantId !== tenantId) {
      throw new Error('Perfil de usuário não encontrado');
    }

    await this.prisma.userPermission.upsert({
      where: {
        userProfileId_permission: {
          userProfileId: userProfile.id,
          permission,
        },
      },
      create: {
        userProfileId: userProfile.id,
        tenantId,
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

    this.logger.log(
      `Permissão ${permission} REVOGADA de usuário ${userId} por ${revokedBy}`,
    );
  }

  /**
   * Remove uma permissão customizada (volta ao padrão do cargo)
   */
  async removeCustomPermission(
    userId: string,
    tenantId: string,
    permission: PermissionType,
  ): Promise<void> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!userProfile || userProfile.tenantId !== tenantId) {
      throw new Error('Perfil de usuário não encontrado');
    }

    await this.prisma.userPermission.deleteMany({
      where: {
        userProfileId: userProfile.id,
        permission,
      },
    });

    this.logger.log(
      `Permissão customizada ${permission} REMOVIDA de usuário ${userId} (volta ao padrão do cargo)`,
    );
  }

  /**
   * Atualiza o cargo de um usuário
   */
  async updateUserPosition(
    userId: string,
    tenantId: string,
    positionCode: PositionCode,
    registrationType?: string,
    registrationNumber?: string,
    registrationState?: string,
    updatedBy?: string,
  ): Promise<void> {
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!userProfile || userProfile.tenantId !== tenantId) {
      throw new Error('Perfil de usuário não encontrado');
    }

    await this.prisma.userProfile.update({
      where: { id: userProfile.id },
      data: {
        positionCode,
        registrationType: registrationType as any,
        registrationNumber,
        registrationState,
        updatedBy,
      },
    });

    this.logger.log(
      `Cargo do usuário ${userId} atualizado para ${positionCode}`,
    );
  }
}
