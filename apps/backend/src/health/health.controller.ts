import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantSchemasHealth } from './tenant-schemas.health';
import { SuperAdminGuard } from '../superadmin/guards/superadmin.guard';

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
    } catch (_error) {
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
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('tenant-schemas')
  async checkTenantSchemas() {
    return this.tenantSchemasHealth.check();
  }
}
