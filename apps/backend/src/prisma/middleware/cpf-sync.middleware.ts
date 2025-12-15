import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Middleware de Sincronização de CPF
 *
 * NOTA: Este middleware foi desabilitado temporariamente.
 * A sincronização de CPF entre User e UserProfile agora é feita
 * explicitamente nos serviços (UsersService e UserProfileService).
 *
 * Motivo: Prisma middleware tem limitações com operações aninhadas
 * e pode causar loops infinitos de sincronização.
 *
 * Mantido aqui apenas para referência histórica.
 */
export function createCpfSyncMiddleware(prismaClient?: PrismaClient): Prisma.Middleware {
  return async (params, next) => {
    // Middleware desabilitado - sincronização feita em nível de serviço
    return next(params);
  };
}
