import {
  Controller,
  Get,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantSchemasHealth } from './tenant-schemas.health';
import { SuperAdminGuard } from '../superadmin/guards/superadmin.guard';
import { CacheService } from '../cache/cache.service';

type DependencyStatus = 'connected' | 'disconnected';
type ReadinessPayload = {
  status: 'ok' | 'error';
  checks: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
  timestamp: string;
};

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private readonly cacheService: CacheService,
    private tenantSchemasHealth: TenantSchemasHealth,
  ) {}

  private async runReadinessCheck(): Promise<ReadinessPayload> {
    const [databaseStatus, redisHealthy] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`
        .then(() => 'connected' as const)
        .catch(() => 'disconnected' as const),
      this.cacheService.ping(),
    ]);

    const payload: ReadinessPayload = {
      status:
        databaseStatus === 'connected' && redisHealthy ? 'ok' : 'error',
      checks: {
        database: databaseStatus,
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
      timestamp: new Date().toISOString(),
    };

    if (payload.status === 'error') {
      throw new ServiceUnavailableException(payload);
    }

    return payload;
  }

  @Public()
  @SkipThrottle()
  @Get('live')
  checkLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  @Public()
  @SkipThrottle()
  @Get()
  async check() {
    return this.runReadinessCheck();
  }

  @Public()
  @SkipThrottle()
  @Get('ready')
  async checkReadiness() {
    return this.runReadinessCheck();
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
