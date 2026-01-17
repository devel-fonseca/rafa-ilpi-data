import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { TenantContextService } from '../../prisma/tenant-context.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private tenantContext: TenantContextService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar se a rota é pública
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Executar validação JWT do Passport
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    // Após validação bem-sucedida, inicializar contexto do tenant
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.tenantId) {
      try {
        await this.tenantContext.initialize(user.tenantId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `[JwtAuthGuard] Erro ao inicializar contexto do tenant ${user.tenantId}:`,
          errorMessage,
        );
        // Não bloqueia a request - deixa services tratarem erro se necessário
      }
    }

    return true;
  }
}
