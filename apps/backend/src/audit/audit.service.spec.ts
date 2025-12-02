/**
 * Testes Unitários - AuditService
 *
 * CRÍTICO: Sistema de auditoria para conformidade LGPD
 * Todo acesso a dados sensíveis DEVE ser rastreável
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditService, AuditLogInput } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService } from '../../test/mocks/prisma.mock';
import { mockAdminUser } from '../../test/fixtures/user.fixture';
import { mockTenant } from '../../test/fixtures/tenant.fixture';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('log()', () => {
    const mockAuditInput: AuditLogInput = {
      entityType: 'Resident',
      entityId: 'resident-123',
      action: 'CREATE',
      userId: mockAdminUser.id,
      userName: mockAdminUser.name,
      tenantId: mockTenant.id,
      details: { method: 'POST', path: '/residents' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('deve criar log de auditoria com sucesso', async () => {
      prisma.auditLog.create.mockResolvedValue({
        id: 'audit-log-123',
        ...mockAuditInput,
        createdAt: new Date(),
      });

      await service.log(mockAuditInput);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockAuditInput.tenantId,
          entityType: mockAuditInput.entityType,
          entityId: mockAuditInput.entityId,
          action: mockAuditInput.action,
          userId: mockAuditInput.userId,
          userName: mockAuditInput.userName,
          details: mockAuditInput.details,
          ipAddress: mockAuditInput.ipAddress,
          userAgent: mockAuditInput.userAgent,
        },
      });
    });

    it('deve registrar tenantId (CRÍTICO para multi-tenancy)', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await service.log(mockAuditInput);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenant.id,
          }),
        })
      );
    });

    it('deve registrar userId e userName (quem fez a ação)', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await service.log(mockAuditInput);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockAdminUser.id,
            userName: mockAdminUser.name,
          }),
        })
      );
    });

    it('deve registrar IP e User-Agent', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await service.log(mockAuditInput);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          }),
        })
      );
    });

    it('deve permitir entityId e details opcionais', async () => {
      const minimalInput: AuditLogInput = {
        entityType: 'User',
        action: 'LOGIN',
        userId: mockAdminUser.id,
        userName: mockAdminUser.name,
        tenantId: mockTenant.id,
      };

      prisma.auditLog.create.mockResolvedValue({ id: 'audit-123' });

      await service.log(minimalInput);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityId: null,
            details: {},
            ipAddress: null,
            userAgent: null,
          }),
        })
      );
    });

    it('NÃO deve lançar erro se falhar (não interromper operação)', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('Database error'));

      // NÃO deve lançar erro
      await expect(service.log(mockAuditInput)).resolves.not.toThrow();
    });

    it('deve logar erro se falhar', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      prisma.auditLog.create.mockRejectedValue(new Error('DB error'));

      await service.log(mockAuditInput);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to create audit log:',
        expect.any(Error)
      );

      loggerSpy.mockRestore();
    });
  });

  describe('getAuditLogs()', () => {
    const mockLogs = [
      {
        id: 'log-1',
        tenantId: mockTenant.id,
        entityType: 'Resident',
        action: 'CREATE',
        userId: mockAdminUser.id,
        userName: mockAdminUser.name,
        createdAt: new Date('2024-01-15'),
      },
      {
        id: 'log-2',
        tenantId: mockTenant.id,
        entityType: 'Prescription',
        action: 'UPDATE',
        userId: mockAdminUser.id,
        userName: mockAdminUser.name,
        createdAt: new Date('2024-01-14'),
      },
    ];

    it('deve retornar logs do tenant especificado', async () => {
      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs(mockTenant.id);

      expect(result).toEqual(mockLogs);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenant.id,
          }),
        })
      );
    });

    it('deve filtrar por tipo de entidade', async () => {
      prisma.auditLog.findMany.mockResolvedValue([mockLogs[0]]);

      await service.getAuditLogs(mockTenant.id, {
        entityType: 'Resident',
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'Resident',
          }),
        })
      );
    });

    it('deve filtrar por ação', async () => {
      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      await service.getAuditLogs(mockTenant.id, {
        action: 'CREATE',
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'CREATE',
          }),
        })
      );
    });

    it('deve filtrar por userId', async () => {
      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      await service.getAuditLogs(mockTenant.id, {
        userId: mockAdminUser.id,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockAdminUser.id,
          }),
        })
      );
    });

    it('deve filtrar por range de datas', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      await service.getAuditLogs(mockTenant.id, {
        startDate,
        endDate,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it('deve paginar resultados (page e limit)', async () => {
      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      await service.getAuditLogs(mockTenant.id, {
        page: 2,
        limit: 10,
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 10, // (page 2 - 1) * limit 10
        })
      );
    });

    it('deve ordenar por data decrescente (mais recente primeiro)', async () => {
      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      await service.getAuditLogs(mockTenant.id);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('deve usar defaults (page=1, limit=50) se não especificado', async () => {
      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      await service.getAuditLogs(mockTenant.id);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      );
    });
  });

  describe('getAuditLogStats()', () => {
    it('deve retornar estatísticas por tipo de entidade', async () => {
      const mockEntityStats = [
        { entityType: 'Resident', _count: { id: 150 } },
        { entityType: 'Prescription', _count: { id: 80 } },
      ];

      prisma.auditLog.groupBy.mockResolvedValueOnce(mockEntityStats);
      prisma.auditLog.groupBy.mockResolvedValueOnce([]);
      prisma.auditLog.groupBy.mockResolvedValueOnce([]);
      prisma.auditLog.count.mockResolvedValue(230);

      const result = await service.getAuditLogStats(mockTenant.id);

      expect(result.byEntity).toEqual([
        { entity_type: 'Resident', count: 150 },
        { entity_type: 'Prescription', count: 80 },
      ]);
    });

    it('deve retornar estatísticas por ação', async () => {
      const mockActionStats = [
        { action: 'CREATE', _count: { id: 100 } },
        { action: 'UPDATE', _count: { id: 75 } },
        { action: 'DELETE', _count: { id: 25 } },
      ];

      prisma.auditLog.groupBy.mockResolvedValueOnce([]);
      prisma.auditLog.groupBy.mockResolvedValueOnce(mockActionStats);
      prisma.auditLog.groupBy.mockResolvedValueOnce([]);
      prisma.auditLog.count.mockResolvedValue(200);

      const result = await service.getAuditLogStats(mockTenant.id);

      expect(result.byAction).toEqual([
        { action: 'CREATE', count: 100 },
        { action: 'UPDATE', count: 75 },
        { action: 'DELETE', count: 25 },
      ]);
    });

    it('deve retornar top 10 usuários mais ativos', async () => {
      const mockUserStats = [
        { userName: 'Admin User', _count: { id: 500 } },
        { userName: 'Regular User', _count: { id: 300 } },
      ];

      prisma.auditLog.groupBy.mockResolvedValueOnce([]);
      prisma.auditLog.groupBy.mockResolvedValueOnce([]);
      prisma.auditLog.groupBy.mockResolvedValueOnce(mockUserStats);
      prisma.auditLog.count.mockResolvedValue(800);

      const result = await service.getAuditLogStats(mockTenant.id);

      expect(result.topUsers).toEqual([
        { user_name: 'Admin User', count: 500 },
        { user_name: 'Regular User', count: 300 },
      ]);
    });

    it('deve retornar total de logs', async () => {
      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(1234);

      const result = await service.getAuditLogStats(mockTenant.id);

      expect(result.total).toBe(1234);
    });

    it('deve filtrar por range de datas nas estatísticas', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      prisma.auditLog.groupBy.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.getAuditLogStats(mockTenant.id, startDate, endDate);

      // Verifica que TODAS as chamadas groupBy receberam o filtro de data
      expect(prisma.auditLog.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });
  });

  describe('Segurança & Compliance', () => {
    it('deve SEMPRE incluir tenantId em logs (isolamento)', async () => {
      const input: AuditLogInput = {
        entityType: 'Test',
        action: 'TEST',
        userId: 'user-1',
        userName: 'Test User',
        tenantId: mockTenant.id,
      };

      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.log(input);

      const createCall = prisma.auditLog.create.mock.calls[0][0];
      expect(createCall.data.tenantId).toBe(mockTenant.id);
      expect(createCall.data.tenantId).toBeDefined();
    });

    it('deve SEMPRE filtrar por tenantId ao buscar logs', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.getAuditLogs(mockTenant.id);

      const findManyCall = prisma.auditLog.findMany.mock.calls[0][0];
      expect(findManyCall.where.tenantId).toBe(mockTenant.id);
    });

    it('deve registrar informações de rastreabilidade (LGPD)', async () => {
      const input: AuditLogInput = {
        entityType: 'Resident',
        entityId: 'resident-123',
        action: 'VIEW',
        userId: mockAdminUser.id,
        userName: mockAdminUser.name,
        tenantId: mockTenant.id,
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/90.0',
      };

      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.log(input);

      // LGPD: Quem, O quê, Quando, De onde
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: expect.any(String), // Quem
            action: expect.any(String), // O quê
            ipAddress: expect.any(String), // De onde
            // Quando = createdAt automático
          }),
        })
      );
    });
  });
});
