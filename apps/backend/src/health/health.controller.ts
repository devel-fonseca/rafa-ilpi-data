import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { TenantSchemasHealth } from './tenant-schemas.health';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private tenantSchemasHealth: TenantSchemasHealth,
  ) {}

  @Public()
  @Get()
  async check() {
    try {
      // Verificar conexão com o banco de dados
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
      };
    }
  }

  /**
   * Health check específico para tenant schemas
   *
   * Valida:
   * - Existência de schemas PostgreSQL
   * - Presença de tabelas críticas
   * - Consistência entre public.tenants e schemas reais
   *
   * GET /health/tenant-schemas
   */
  @Public()
  @Get('tenant-schemas')
  async checkTenantSchemas() {
    return this.tenantSchemasHealth.check();
  }
}
