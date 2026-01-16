import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { TenantContextService } from '../../prisma/tenant-context.service'

/**
 * Interceptor global que inicializa automaticamente o TenantContextService
 * para cada request autenticada.
 *
 * Este interceptor:
 * 1. Extrai o `tenantId` do usuário autenticado (JWT payload)
 * 2. Chama `tenantContext.initialize(tenantId)` antes de executar o handler
 * 3. Garante que todos os services tenham acesso ao schema correto do tenant
 *
 * @remarks
 * - Para requests não autenticadas (login, registro), o interceptor é ignorado
 * - O interceptor é executado DEPOIS dos guards de autenticação
 * - Não bloqueia requests públicas que não precisam de tenant context
 *
 * @example
 * Registrar no AppModule:
 * ```typescript
 * @Module({
 *   providers: [
 *     TenantContextService,
 *     {
 *       provide: APP_INTERCEPTOR,
 *       useClass: TenantContextInterceptor,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    // Inicializar contexto do tenant se usuário estiver autenticado
    if (user?.tenantId) {
      try {
        await this.tenantContext.initialize(user.tenantId)
      } catch (error) {
        // Log do erro mas não bloqueia a request
        // Se o tenant não existir, as queries falharão naturalmente
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(
          `[TenantContextInterceptor] Erro ao inicializar contexto do tenant ${user.tenantId}:`,
          errorMessage,
        )
      }
    }

    return next.handle()
  }
}
