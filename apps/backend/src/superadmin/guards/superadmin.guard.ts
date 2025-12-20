import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'

/**
 * SuperAdminGuard
 *
 * Guard que protege rotas exclusivas do Super Administrador.
 *
 * Validações:
 * 1. User deve ter role = 'SUPERADMIN'
 * 2. User NÃO pode ter tenantId (SuperAdmin não pertence a nenhum tenant)
 *
 * Uso:
 * @UseGuards(JwtAuthGuard, SuperAdminGuard)
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    // Validação 1: User deve existir e ter role SUPERADMIN
    if (!user || user.role !== 'SUPERADMIN') {
      throw new ForbiddenException(
        'Acesso negado: permissão de Super Administrador necessária',
      )
    }

    // Validação 2: CRÍTICO - SuperAdmin não pode ter tenantId
    // Isso previne que usuários de tenants acessem funcionalidades de superadmin
    if (user.tenantId) {
      throw new ForbiddenException(
        'Acesso negado: Super Administrador não pode estar associado a um tenant',
      )
    }

    return true
  }
}
