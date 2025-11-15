import { SetMetadata, applyDecorators } from '@nestjs/common';
import { AUDIT_ACTION_KEY, AUDIT_ENTITY_KEY } from './audit.interceptor';

/**
 * Decorador para marcar um controller para auditoria
 * @param entity Nome da entidade sendo auditada
 */
export function AuditEntity(entity: string) {
  return SetMetadata(AUDIT_ENTITY_KEY, entity);
}

/**
 * Decorador para marcar uma ação para auditoria
 * @param action Ação sendo realizada (CREATE, READ, UPDATE, DELETE, etc.)
 */
export function AuditAction(action: string) {
  return SetMetadata(AUDIT_ACTION_KEY, action);
}

/**
 * Decorador combinado para aplicar entidade e ação de uma vez
 * @param entity Nome da entidade
 * @param action Ação sendo realizada
 */
export function Audit(entity: string, action: string) {
  return applyDecorators(
    AuditEntity(entity),
    AuditAction(action)
  );
}