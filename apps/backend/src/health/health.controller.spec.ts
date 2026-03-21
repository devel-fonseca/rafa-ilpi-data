import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { TenantSchemasHealth } from './tenant-schemas.health';
import { TenantContextService } from '../prisma/tenant-context.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: { $queryRaw: jest.Mock };
  let cacheService: { ping: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
    };

    cacheService = {
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
        {
          provide: TenantSchemasHealth,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            initialize: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('should report liveness without checking dependencies', () => {
    const result = controller.checkLiveness();

    expect(result.status).toBe('ok');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('uptimeSeconds');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(cacheService.ping).not.toHaveBeenCalled();
  });

  it('should report readiness when database and redis are available', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    cacheService.ping.mockResolvedValue(true);

    const result = await controller.checkReadiness();

    expect(result).toEqual({
      status: 'ok',
      checks: {
        database: 'connected',
        redis: 'connected',
      },
      timestamp: expect.any(String),
    });
  });

  it('should fail readiness when redis is unavailable', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    cacheService.ping.mockResolvedValue(false);

    await expect(controller.check()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.check()).rejects.toMatchObject({
      response: {
        status: 'error',
        checks: {
          database: 'connected',
          redis: 'disconnected',
        },
      },
    });
  });
});
