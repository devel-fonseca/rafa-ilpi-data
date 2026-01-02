import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Módulo global de cache
 *
 * Fornece CacheService para toda a aplicação sem necessidade de import explícito.
 * O Redis é configurado automaticamente via variáveis de ambiente.
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
