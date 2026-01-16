/**
 * Decorator para exigir permissões específicas em rotas
 *
 * Uso:
 * @RequirePermissions(PermissionType.CREATE_RESIDENTS, PermissionType.UPDATE_RESIDENTS)
 */

import { SetMetadata } from '@nestjs/common';
import { PermissionType } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';
export const REQUIRE_ALL_KEY = 'require_all_permissions';

/**
 * Decorator para exigir uma ou mais permissões
 * Por padrão, exige que o usuário tenha TODAS as permissões listadas
 *
 * @param permissions - Lista de permissões necessárias
 */
export const RequirePermissions = (...permissions: PermissionType[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator para exigir QUALQUER uma das permissões listadas
 * Útil quando há múltiplas formas de acessar um recurso
 *
 * @param permissions - Lista de permissões (usuário precisa ter pelo menos uma)
 */
export const RequireAnyPermission = (...permissions: PermissionType[]) => {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, propertyKey, descriptor);
    SetMetadata(REQUIRE_ALL_KEY, false)(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * Decorator para exigir TODAS as permissões listadas
 * Comportamento padrão, mas pode ser usado explicitamente para clareza
 *
 * @param permissions - Lista de permissões (usuário precisa ter todas)
 */
export const RequireAllPermissions = (...permissions: PermissionType[]) => {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(target, propertyKey, descriptor);
    SetMetadata(REQUIRE_ALL_KEY, true)(target, propertyKey, descriptor);
    return descriptor;
  };
};
