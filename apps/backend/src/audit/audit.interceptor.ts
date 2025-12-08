import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Reflector } from '@nestjs/core';

export const AUDIT_ACTION_KEY = 'audit:action';
export const AUDIT_ENTITY_KEY = 'audit:entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Obter metadados de auditoria
    const auditAction = this.reflector.get<string>(
      AUDIT_ACTION_KEY,
      handler,
    );
    const auditEntity = this.reflector.get<string>(
      AUDIT_ENTITY_KEY,
      controller,
    );

    // Se não tiver metadados de auditoria, não registrar
    if (!auditAction || !auditEntity) {
      return next.handle();
    }

    // Obter informações do usuário e tenant
    const user = request.user;
    if (!user || !user.tenant) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const executionTime = Date.now() - startTime;

          // Extrair ID da entidade se houver
          let entityId = null;
          if (request.params?.id) {
            entityId = request.params.id;
          } else if (response?.id) {
            entityId = response.id;
          }

          // Preparar detalhes da ação
          const details: any = {
            method: request.method,
            path: request.url,
            executionTime: `${executionTime}ms`,
          };

          // Adicionar corpo da requisição para ações de criação/atualização
          if (['CREATE', 'UPDATE'].includes(auditAction) && request.body) {
            // Remover campos sensíveis
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...safeBody } = request.body;
            details.requestBody = safeBody;
          }

          // Se for uma ação de exclusão, registrar o estado anterior se disponível
          if (auditAction === 'DELETE' && response) {
            details.deletedData = response;
          }

          // Registrar no log de auditoria
          await this.auditService.log({
            entityType: auditEntity,
            entityId,
            action: auditAction,
            userId: user.id,
            userName: user.name,
            tenantId: user.tenantId,
            details,
            ipAddress: request.ip || request.connection?.remoteAddress,
            userAgent: request.headers['user-agent'],
          });
        } catch (error) {
          // Log error mas não interromper a operação
          console.error('Failed to create audit log:', error);
        }
      }),
    );
  }
}