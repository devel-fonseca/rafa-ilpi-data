/**
 * Testes Unitários - ResidentsService
 *
 * CRÍTICO: Core business - gestão de residentes
 * Falha aqui = dados incorretos de idosos = problemas graves
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ResidentsService } from './residents.service';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { mockPrismaService } from '../../test/mocks/prisma.mock';
import { mockTenant, mockTenantFree } from '../../test/fixtures/tenant.fixture';
import { mockAdminUser } from '../../test/fixtures/user.fixture';
import { mockResident, mockResidentOtherTenant } from '../../test/fixtures/resident.fixture';

describe('ResidentsService', () => {
  let service: ResidentsService;
  let prisma: any;
  let filesService: FilesService;

  const mockFilesService = {
    uploadResidentPhoto: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResidentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ResidentsService>(ResidentsService);
    prisma = module.get<PrismaService>(PrismaService);
    filesService = module.get<FilesService>(FilesService);

    jest.clearAllMocks();

    // Mock default para hierarquia de acomodação (usado em findAll e findOne)
    prisma.bed.findMany.mockResolvedValue([]);
    prisma.bed.findFirst.mockResolvedValue(null);
    prisma.room.findMany.mockResolvedValue([]);
    prisma.room.findFirst.mockResolvedValue(null);
    prisma.floor.findMany.mockResolvedValue([]);
    prisma.building.findMany.mockResolvedValue([]);
  });

  describe('create()', () => {
    const createDto: any = {
      tenantId: mockTenant.id,
      fullName: 'Maria Silva Santos',
      cpf: '12345678901',
      birthDate: new Date('1950-05-15').toISOString(),
      gender: 'FEMININO' as const,
      admissionDate: new Date('2024-01-10').toISOString(),
    };

    it('deve criar residente com sucesso', async () => {
      const mockTenantWithPlan = {
        ...mockTenant,
        subscriptions: [{ plan: { maxResidents: 100 } }],
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantWithPlan);
      prisma.resident.count.mockResolvedValue(5); // 5 residentes existentes
      prisma.resident.findFirst.mockResolvedValue(null); // CPF não existe
      prisma.resident.create.mockResolvedValue({
        id: 'resident-new-123',
        ...createDto,
        tenantId: mockTenant.id,
      });

      const result = await service.create(createDto, mockTenant.id, mockAdminUser.id);

      expect(result).toBeDefined();
      expect(prisma.resident.create).toHaveBeenCalled();
    });

    it('deve respeitar limite de residentes do plano', async () => {
      const mockTenantWithPlan = {
        ...mockTenant,
        subscriptions: [{ plan: { maxResidents: 10 } }],
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantWithPlan);
      prisma.resident.count.mockResolvedValue(10); // JÁ TEM 10 residentes

      await expect(
        service.create(createDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow('Limite de 10 residentes atingido');
    });

    it('deve permitir residentes ilimitados se maxResidents = -1', async () => {
      const mockTenantWithPlan = {
        ...mockTenant,
        subscriptions: [{ plan: { maxResidents: -1 } }], // ILIMITADO
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantWithPlan);
      prisma.resident.count.mockResolvedValue(1000); // 1000 residentes
      prisma.resident.findFirst.mockResolvedValue(null);
      prisma.resident.create.mockResolvedValue({
        id: 'resident-new',
        ...createDto,
        tenantId: mockTenant.id,
      });

      await expect(
        service.create(createDto, mockTenant.id, mockAdminUser.id)
      ).resolves.not.toThrow();
    });

    it('deve validar CPF único no tenant', async () => {
      const mockTenantWithPlan = {
        ...mockTenant,
        subscriptions: [{ plan: { maxResidents: 100 } }],
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenantWithPlan);
      prisma.resident.count.mockResolvedValue(5);
      prisma.resident.findFirst.mockResolvedValue(mockResident); // CPF JÁ EXISTE

      await expect(
        service.create(createDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(createDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow('CPF já cadastrado');
    });

    it('deve lançar erro se tenant não encontrado', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll()', () => {
    const mockResidents = [
      { ...mockResident, id: 'res-1' },
      { ...mockResident, id: 'res-2' },
    ];

    it('deve retornar residentes do tenant', async () => {
      prisma.resident.findMany.mockResolvedValue(mockResidents);
      prisma.resident.count.mockResolvedValue(2);

      const result = await service.findAll({}, mockTenant.id);

      expect(result.data).toBeDefined();
      expect(result.meta.total).toBe(2);
    });

    it('deve filtrar apenas pelo tenantId (isolamento)', async () => {
      prisma.resident.findMany.mockResolvedValue(mockResidents);
      prisma.resident.count.mockResolvedValue(2);

      await service.findAll({}, mockTenant.id);

      expect(prisma.resident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenant.id,
            deletedAt: null,
          }),
        })
      );
    });

    it('deve paginar resultados', async () => {
      prisma.resident.findMany.mockResolvedValue(mockResidents);
      prisma.resident.count.mockResolvedValue(20);

      await service.findAll({ page: '2', limit: '5' }, mockTenant.id);

      expect(prisma.resident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page 2 - 1) * limit 5
          take: 5,
        })
      );
    });

    it('deve filtrar por status', async () => {
      prisma.resident.findMany.mockResolvedValue([mockResidents[0]]);
      prisma.resident.count.mockResolvedValue(1);

      await service.findAll({ status: 'ATIVO' }, mockTenant.id);

      expect(prisma.resident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ATIVO',
          }),
        })
      );
    });

    it('deve buscar por nome (case insensitive)', async () => {
      prisma.resident.findMany.mockResolvedValue([mockResidents[0]]);
      prisma.resident.count.mockResolvedValue(1);

      await service.findAll({ search: 'maria' }, mockTenant.id);

      // O código usa OR para buscar por fullName OU cpf
      expect(prisma.resident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { fullName: { contains: 'maria', mode: 'insensitive' } },
              { cpf: 'maria' },
            ],
          }),
        })
      );
    });
  });

  describe('findOne()', () => {
    it('deve retornar residente por ID', async () => {
      prisma.resident.findFirst.mockResolvedValue(mockResident);

      const result = await service.findOne(mockResident.id, mockTenant.id);

      // findOne retorna dados enriquecidos (bed, room, floor, building, healthPlans)
      expect(result.id).toBe(mockResident.id);
      expect(result.fullName).toBe(mockResident.fullName);
      expect(result.healthPlans).toBeDefined(); // Array de convênios
    });

    it('deve filtrar por tenantId (segurança)', async () => {
      prisma.resident.findFirst.mockResolvedValue(mockResident);

      await service.findOne(mockResident.id, mockTenant.id);

      expect(prisma.resident.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockResident.id,
            tenantId: mockTenant.id,
            deletedAt: null,
          }),
        })
      );
    });

    it('deve lançar erro se residente não encontrado', async () => {
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent-id', mockTenant.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('NÃO deve retornar residente de outro tenant', async () => {
      prisma.resident.findFirst.mockResolvedValue(null); // Não encontra porque é outro tenant

      await expect(
        service.findOne(mockResidentOtherTenant.id, mockTenant.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    const updateDto = {
      fullName: 'Maria Silva Santos Atualizada',
    };

    it('deve atualizar residente com sucesso', async () => {
      prisma.resident.findFirst.mockResolvedValue(mockResident);
      prisma.resident.update.mockResolvedValue({
        ...mockResident,
        ...updateDto,
      });

      const result = await service.update(
        mockResident.id,
        updateDto,
        mockTenant.id,
        mockAdminUser.id
      );

      expect(result.fullName).toBe(updateDto.fullName);
      expect(prisma.resident.update).toHaveBeenCalled();
    });

    it('deve validar que residente existe antes de atualizar', async () => {
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('deve validar tenant do residente (segurança)', async () => {
      prisma.resident.findFirst.mockResolvedValue(null); // Não encontra porque é outro tenant

      await expect(
        service.update(
          mockResidentOtherTenant.id,
          updateDto,
          mockTenant.id,
          mockAdminUser.id
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove() - Soft Delete', () => {
    it('deve fazer soft delete do residente', async () => {
      prisma.resident.findFirst.mockResolvedValue(mockResident);
      prisma.resident.update.mockResolvedValue({
        ...mockResident,
        deletedAt: new Date(),
      });

      await service.remove(mockResident.id, mockTenant.id, mockAdminUser.id);

      expect(prisma.resident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockResident.id },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
    });

    it('NÃO deve deletar permanentemente (hard delete)', async () => {
      prisma.resident.findFirst.mockResolvedValue(mockResident);
      prisma.resident.update.mockResolvedValue(mockResident);

      await service.remove(mockResident.id, mockTenant.id, mockAdminUser.id);

      // NÃO deve chamar delete, apenas update com deletedAt
      expect(prisma.resident.delete).not.toHaveBeenCalled();
      expect(prisma.resident.update).toHaveBeenCalled();
    });

    it('deve validar tenant antes de deletar', async () => {
      prisma.resident.findFirst.mockResolvedValue(null); // Outro tenant

      await expect(
        service.remove(mockResidentOtherTenant.id, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Segurança & Multi-Tenancy', () => {
    it('deve SEMPRE incluir tenantId nas queries', async () => {
      prisma.resident.findFirst.mockResolvedValue(mockResident);

      await service.findOne(mockResident.id, mockTenant.id);

      const findCall = prisma.resident.findFirst.mock.calls[0][0];
      expect(findCall.where.tenantId).toBe(mockTenant.id);
    });

    it('deve SEMPRE filtrar deletedAt: null', async () => {
      prisma.resident.findMany.mockResolvedValue([]);
      prisma.resident.count.mockResolvedValue(0);

      await service.findAll({}, mockTenant.id);

      const findManyCall = prisma.resident.findMany.mock.calls[0][0];
      expect(findManyCall.where.deletedAt).toBeNull();
    });

    it('NÃO deve permitir acesso cross-tenant', async () => {
      // Tentando acessar residente de outro tenant
      prisma.resident.findFirst.mockImplementation((args: any) => {
        // Simula que o Prisma filtra por tenantId
        if (args.where.tenantId !== mockResidentOtherTenant.tenantId) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockResidentOtherTenant);
      });

      await expect(
        service.findOne(mockResidentOtherTenant.id, mockTenant.id)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
