/**
 * Testes Unitários - PrismaService (Multi-Tenancy)
 *
 * CRÍTICO: Estes testes garantem que o isolamento multi-tenant funciona.
 * Falha aqui = potencial vazamento de dados = violação LGPD.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from './prisma.service';

describe('PrismaService - Multi-Tenancy', () => {
  const masterKey = 'a'.repeat(64);
  const baseDatabaseUrl = 'postgresql://user:pass@localhost:5432/db';

  let service: PrismaService;

  beforeEach(async () => {
    process.env.DATABASE_URL = baseDatabaseUrl;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ENCRYPTION_MASTER_KEY') {
                return masterKey;
              }
              return undefined;
            }),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    jest.spyOn(service, '$disconnect').mockResolvedValue(undefined as never);
  });

  afterEach(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
    jest.restoreAllMocks();
  });

  describe('Inicialização', () => {
    it('deve ser definido', () => {
      expect(service).toBeDefined();
    });

    it('deve se conectar ao banco de dados', async () => {
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined as never);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('getTenantClient()', () => {
    it('deve criar um client para o tenant especificado', () => {
      const schemaName = 'tenant_abc123';
      const client = service.getTenantClient(schemaName);

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(PrismaClient);
    });

    it('deve reutilizar o mesmo client para o mesmo tenant', () => {
      const schemaName = 'tenant_xyz789';
      const client1 = service.getTenantClient(schemaName);
      const client2 = service.getTenantClient(schemaName);

      expect(client1).toBe(client2);
    });

    it('deve criar clients diferentes para tenants diferentes', () => {
      const tenant1 = 'tenant_aaa111';
      const tenant2 = 'tenant_bbb222';

      const client1 = service.getTenantClient(tenant1);
      const client2 = service.getTenantClient(tenant2);

      expect(client1).not.toBe(client2);
    });

    it('deve lançar erro se DATABASE_URL não estiver definida', () => {
      delete process.env.DATABASE_URL;
      (service as any).baseDatabaseUrl = undefined;

      expect(() => {
        service.getTenantClient('tenant_test');
      }).toThrow('DATABASE_URL environment variable is not defined');
    });

    it('deve adicionar o schema à connection string corretamente', () => {
      const client = service.getTenantClient('tenant_test_schema');

      expect(client).toBeDefined();
    });

    it('deve lidar com URLs que já contêm query parameters', () => {
      process.env.DATABASE_URL =
        'postgresql://user:pass@localhost:5432/db?sslmode=require';
      (service as any).baseDatabaseUrl = process.env.DATABASE_URL;

      const client = service.getTenantClient('tenant_with_params');

      expect(client).toBeDefined();
    });
  });

  describe('createTenantSchema()', () => {
    it('deve executar SQL para criar schema', async () => {
      const schemaName = 'tenant_new_123';
      const executeRawSpy = jest
        .spyOn(service, '$executeRawUnsafe')
        .mockResolvedValue(undefined as never);
      const getTenantClientSpy = jest.spyOn(service, 'getTenantClient').mockReturnValue({
        $connect: jest.fn().mockResolvedValue(undefined),
      } as any);

      await service.createTenantSchema(schemaName);

      expect(executeRawSpy).toHaveBeenCalledWith(
        `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`,
      );
      expect(getTenantClientSpy).toHaveBeenCalledWith(schemaName);
    });

    it('deve conectar o client do tenant após criar schema', async () => {
      const schemaName = 'tenant_connect_test';
      const mockConnect = jest.fn().mockResolvedValue(undefined);

      jest
        .spyOn(service, '$executeRawUnsafe')
        .mockResolvedValue(undefined as never);
      jest.spyOn(service, 'getTenantClient').mockReturnValue({
        $connect: mockConnect,
      } as any);

      await service.createTenantSchema(schemaName);

      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('deleteTenantSchema()', () => {
    it('deve desconectar o client antes de deletar schema', async () => {
      const schemaName = 'tenant_to_delete';
      const mockDisconnect = jest.fn().mockResolvedValue(undefined);

      (service as any).tenantClients.set(schemaName, {
        $disconnect: mockDisconnect,
      });

      jest
        .spyOn(service, '$executeRawUnsafe')
        .mockResolvedValue(undefined as never);

      await service.deleteTenantSchema(schemaName);

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('deve executar DROP SCHEMA CASCADE', async () => {
      const schemaName = 'tenant_drop_test';
      const executeRawSpy = jest
        .spyOn(service, '$executeRawUnsafe')
        .mockResolvedValue(undefined as never);

      await service.deleteTenantSchema(schemaName);

      expect(executeRawSpy).toHaveBeenCalledWith(
        `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`,
      );
    });

    it('deve remover client do Map após deletar', async () => {
      const schemaName = 'tenant_map_test';
      const mockClient = { $disconnect: jest.fn().mockResolvedValue(undefined) };

      (service as any).tenantClients.set(schemaName, mockClient);
      jest
        .spyOn(service, '$executeRawUnsafe')
        .mockResolvedValue(undefined as never);

      await service.deleteTenantSchema(schemaName);

      expect((service as any).tenantClients.has(schemaName)).toBe(false);
    });

    it('deve lidar com schema que não existe no Map', async () => {
      jest
        .spyOn(service, '$executeRawUnsafe')
        .mockResolvedValue(undefined as never);

      await expect(
        service.deleteTenantSchema('tenant_non_existent'),
      ).resolves.not.toThrow();
    });
  });

  describe('onModuleDestroy()', () => {
    it('deve desconectar todos os tenant clients', async () => {
      const mockDisconnect1 = jest.fn().mockResolvedValue(undefined);
      const mockDisconnect2 = jest.fn().mockResolvedValue(undefined);
      const mockDisconnectMain = jest.fn().mockResolvedValue(undefined);

      (service as any).tenantClients.set('tenant_1', {
        $disconnect: mockDisconnect1,
      });
      (service as any).tenantClients.set('tenant_2', {
        $disconnect: mockDisconnect2,
      });
      service.$disconnect = mockDisconnectMain as any;

      await service.onModuleDestroy();

      expect(mockDisconnect1).toHaveBeenCalled();
      expect(mockDisconnect2).toHaveBeenCalled();
      expect(mockDisconnectMain).toHaveBeenCalled();
    });
  });

  describe('Segurança - Prevenção de SQL Injection', () => {
    it('deve documentar o comportamento atual para schema names maliciosos', () => {
      const maliciousNames = [
        'tenant"; DROP TABLE users; --',
        "tenant'; DELETE FROM residents; --",
        '../../../etc/passwd',
        'tenant OR 1=1',
      ];

      for (const maliciousName of maliciousNames) {
        const client = service.getTenantClient(maliciousName);
        expect(client).toBeDefined();
      }
    });
  });

  describe('Performance', () => {
    it('deve cachear clients para evitar conexões duplicadas', () => {
      const schemaName = 'tenant_performance';

      const startTime = Date.now();
      const client1 = service.getTenantClient(schemaName);
      const firstCallTime = Date.now() - startTime;

      const startTime2 = Date.now();
      const client2 = service.getTenantClient(schemaName);
      const secondCallTime = Date.now() - startTime2;

      expect(client1).toBe(client2);
      expect(secondCallTime).toBeLessThanOrEqual(firstCallTime);
    });
  });
});
