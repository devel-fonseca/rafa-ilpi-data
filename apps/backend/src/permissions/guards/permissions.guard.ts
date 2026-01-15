/**
 * PermissionsGuard
 *
 * Guard para validar permissões de usuários em rotas protegidas.
 * Trabalha em conjunto com o decorator @RequirePermissions
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionType } from '@prisma/client';
import { PermissionsService } from '../permissions.service';
import {
  PERMISSIONS_KEY,
  REQUIRE_ALL_KEY,
} from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obter permissões requeridas do decorator
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionType[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // Se não há permissões requeridas, permitir acesso
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Verificar se exige TODAS ou QUALQUER uma
    const requireAll = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_ALL_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requireAllPermissions = requireAll !== false; // Default: true

    // Obter usuário do request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('Guard de permissões chamado sem usuário autenticado');
      throw new ForbiddenException('Usuário não autenticado');
    }

    const userId = user.id;
    // Validar permissões
    try {
      let hasPermission: boolean;

      if (requireAllPermissions) {
        // Exige TODAS as permissões
        hasPermission = await this.permissionsService.hasAllPermissions(
          userId,
          requiredPermissions,
        );
      } else {
        // Exige QUALQUER uma das permissões
        hasPermission = await this.permissionsService.hasAnyPermission(
          userId,
          requiredPermissions,
        );
      }

      if (!hasPermission) {
        this.logger.warn(
          `Usuário ${user.email} não tem permissão ${requireAllPermissions ? 'TODAS' : 'QUALQUER'} de: ${requiredPermissions.join(', ')}`,
        );
        throw new ForbiddenException(
          `Você não tem permissão para realizar esta ação. Permissões necessárias: ${requiredPermissions.join(', ')}`,
        );
      }

      this.logger.debug(
        `Usuário ${user.email} autorizado com permissões: ${requiredPermissions.join(', ')}`,
      );
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(
        `Erro ao verificar permissões para usuário ${userId}:`,
        error,
      );
      throw new ForbiddenException('Erro ao verificar permissões');
    }
  }
}
