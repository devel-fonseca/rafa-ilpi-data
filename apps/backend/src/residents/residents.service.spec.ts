import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ResidentsService } from './residents.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { FilesService } from '../files/files.service';
import { EventsGateway } from '../events/events.gateway';
import { mockTenant } from '../../test/fixtures/tenant.fixture';
import { mockAdminUser } from '../../test/fixtures/user.fixture';
import { mockResident } from '../../test/fixtures/resident.fixture';
import { Gender } from '@prisma/client';

const createCrudModel = () => ({
  create: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

describe('ResidentsService', () => {
  let service: ResidentsService;
  let prisma: any;
  let tenantContext: { tenantId: string; client: any };
  let filesService: { getFileUrl: jest.Mock };
  let eventsGateway: { emitDashboardOverviewUpdated: jest.Mock };

  const baseResident = {
    ...mockResident,
    versionNumber: 1,
    roomId: null,
    bedId: null,
    fotoUrl: null,
    healthPlans: [],
    emergencyContacts: [],
    cns: null,
    legalGuardianName: null,
    legalGuardianPhone: null,
  } as any;

  const createDto = {
    fullName: 'Maria Silva Santos',
    cpf: '12345678901',
    birthDate: '1950-05-15',
    gender: Gender.FEMININO,
    admissionDate: '2024-01-10',
  } as any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      tenant: createCrudModel(),
      resident: createCrudModel(),
      residentHistory: createCrudModel(),
      residentDependencyAssessment: createCrudModel(),
      residentAnthropometry: createCrudModel(),
      residentBloodType: createCrudModel(),
      allergy: createCrudModel(),
      dietaryRestriction: createCrudModel(),
      condition: createCrudModel(),
      medication: createCrudModel(),
      bed: createCrudModel(),
      room: createCrudModel(),
      floor: createCrudModel(),
      building: createCrudModel(),
      clinicalProfile: createCrudModel(),
      bedStatusHistory: createCrudModel(),
      bedTransferHistory: createCrudModel(),
    };

    prisma.$transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback(prisma));
    prisma.tenant.findUnique.mockResolvedValue({
      ...mockTenant,
      customMaxResidents: null,
      subscriptions: [{ plan: { maxResidents: 100 } }],
    });
    prisma.resident.count.mockResolvedValue(0);
    prisma.resident.findMany.mockResolvedValue([]);
    prisma.residentHistory.create.mockResolvedValue({ id: 'history-1' });
    prisma.residentDependencyAssessment.findMany.mockResolvedValue([]);
    prisma.residentAnthropometry.findMany.mockResolvedValue([]);
    prisma.residentAnthropometry.findFirst.mockResolvedValue(null);
    prisma.residentBloodType.findFirst.mockResolvedValue(null);
    prisma.allergy.findMany.mockResolvedValue([]);
    prisma.dietaryRestriction.findMany.mockResolvedValue([]);
    prisma.condition.findMany.mockResolvedValue([]);
    prisma.medication.findFirst.mockResolvedValue(null);
    prisma.bed.findMany.mockResolvedValue([]);
    prisma.bed.findFirst.mockResolvedValue(null);
    prisma.room.findMany.mockResolvedValue([]);
    prisma.room.findFirst.mockResolvedValue(null);
    prisma.floor.findMany.mockResolvedValue([]);
    prisma.building.findMany.mockResolvedValue([]);

    tenantContext = {
      tenantId: mockTenant.id,
      client: prisma,
    };

    filesService = {
      getFileUrl: jest.fn().mockImplementation(async (path: string) => `signed:${path}`),
    } as any;

    eventsGateway = {
      emitDashboardOverviewUpdated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResidentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenantContext },
        { provide: FilesService, useValue: filesService },
        { provide: EventsGateway, useValue: eventsGateway },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ResidentsService>(ResidentsService);
  });

  describe('create()', () => {
    it('cria residente com histórico e evento', async () => {
      prisma.resident.findFirst.mockResolvedValue(null);
      prisma.resident.create.mockImplementation(async ({ data }: any) => ({
        ...baseResident,
        id: 'resident-new-123',
        ...data,
      }));

      const result = await service.create(createDto, mockAdminUser.id);

      expect(result.fullName).toBe(createDto.fullName);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: mockTenant.id },
      }));
      expect(prisma.resident.create).toHaveBeenCalled();
      expect(prisma.residentHistory.create).toHaveBeenCalled();
      expect(eventsGateway.emitDashboardOverviewUpdated).toHaveBeenCalledWith({
        tenantId: mockTenant.id,
        source: 'resident.created',
      });
    });

    it('respeita limite de residentes do plano', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        ...mockTenant,
        customMaxResidents: null,
        subscriptions: [{ plan: { maxResidents: 10 } }],
      });
      prisma.resident.count.mockResolvedValue(10);

      await expect(service.create(createDto, mockAdminUser.id)).rejects.toThrow(
        new BadRequestException('Limite de 10 residentes atingido para o plano atual'),
      );
    });

    it('valida CPF único no tenant', async () => {
      prisma.resident.count.mockResolvedValue(5);
      prisma.resident.findFirst.mockResolvedValue({ id: 'resident-existing' });

      await expect(service.create(createDto, mockAdminUser.id)).rejects.toThrow(
        new BadRequestException('CPF já cadastrado'),
      );
    });
  });

  describe('findAll()', () => {
    it('retorna residentes paginados com filtros atuais', async () => {
      prisma.resident.findMany.mockResolvedValue([baseResident]);
      prisma.resident.count.mockResolvedValue(1);
      prisma.residentDependencyAssessment.findMany.mockResolvedValue([
        {
          residentId: baseResident.id,
          mobilityAid: true,
          dependencyLevel: 'GRAU_II',
        },
      ]);
      prisma.residentAnthropometry.findMany.mockResolvedValue([
        {
          residentId: baseResident.id,
          measurementDate: new Date('2025-01-15T00:00:00.000Z'),
          createdAt: new Date('2025-01-15T10:00:00.000Z'),
        },
      ]);

      const result = await service.findAll({
        page: '1',
        limit: '10',
        search: 'Maria',
        status: 'Ativo',
      } as any);

      expect(result.meta.total).toBe(1);
      expect(result.data[0].dependencyLevel).toBe('GRAU_II');
      expect(prisma.resident.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          status: 'Ativo',
          OR: [
            { fullName: { contains: 'Maria', mode: 'insensitive' } },
            { cpf: 'Maria' },
          ],
        }),
      }));
      expect(prisma.resident.findMany.mock.calls[0][0].where).not.toHaveProperty('tenantId');
    });
  });

  describe('findOne()', () => {
    it('retorna residente sem exigir tenantId explícito nas queries tenant-scoped', async () => {
      prisma.resident.findFirst.mockResolvedValue(baseResident);

      const result = await service.findOne(baseResident.id);

      expect(result.id).toBe(baseResident.id);
      expect(result.allergies).toEqual([]);
      expect(result.dietaryRestrictions).toEqual([]);
      expect(prisma.resident.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          id: baseResident.id,
          deletedAt: null,
        },
      }));
    });

    it('lança erro se residente não for encontrado', async () => {
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(service.findOne('resident-missing')).rejects.toThrow(
        new NotFoundException('Residente não encontrado'),
      );
    });
  });

  describe('update()', () => {
    it('atualiza residente com histórico e evento', async () => {
      prisma.resident.findFirst.mockResolvedValue(baseResident);
      prisma.resident.update.mockImplementation(async ({ data }: any) => ({
        ...baseResident,
        ...data,
      }));

      const result = await service.update(
        baseResident.id,
        {
          fullName: 'Maria Silva Santos Atualizada',
          changeReason: 'Atualização manual de teste',
        } as any,
        mockAdminUser.id,
      );

      expect(result.fullName).toBe('Maria Silva Santos Atualizada');
      expect(prisma.resident.update).toHaveBeenCalled();
      expect(prisma.residentHistory.create).toHaveBeenCalled();
      expect(eventsGateway.emitDashboardOverviewUpdated).toHaveBeenCalledWith({
        tenantId: mockTenant.id,
        source: 'resident.updated',
      });
    });

    it('exige changeReason com no mínimo 10 caracteres', async () => {
      await expect(
        service.update(
          baseResident.id,
          { fullName: 'Nome curto', changeReason: 'curta' } as any,
          mockAdminUser.id,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove()', () => {
    it('executa soft delete com histórico e evento', async () => {
      prisma.resident.findFirst.mockResolvedValue(baseResident);
      prisma.resident.update.mockResolvedValue({
        ...baseResident,
        deletedAt: new Date(),
        versionNumber: 2,
      });

      const result = await service.remove(
        baseResident.id,
        mockAdminUser.id,
        'Exclusão lógica para teste automatizado',
      );

      expect(result).toEqual({ message: 'Residente removido com sucesso' });
      expect(prisma.resident.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: baseResident.id },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          updatedBy: mockAdminUser.id,
        }),
      }));
      expect(prisma.residentHistory.create).toHaveBeenCalled();
      expect(eventsGateway.emitDashboardOverviewUpdated).toHaveBeenCalledWith({
        tenantId: mockTenant.id,
        source: 'resident.deleted',
      });
    });

    it('lança erro se residente não existir', async () => {
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('resident-missing', mockAdminUser.id, 'Motivo suficientemente longo'),
      ).rejects.toThrow(new NotFoundException('Residente não encontrado'));
    });
  });
});
