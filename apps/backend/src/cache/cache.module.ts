import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { TenantSchemaCacheService } from './tenant-schema-cache.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Módulo global de cache
 *
 * Fornece CacheService e TenantSchemaCacheService para toda a aplicação
 * sem necessidade de import explícito.
 * O Redis é configurado automaticamente via variáveis de ambiente.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [CacheService, TenantSchemaCacheService],
  exports: [CacheService, TenantSchemaCacheService],
})
export class CacheModule {}
