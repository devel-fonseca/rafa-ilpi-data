import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { DailyRecordsService } from './daily-records.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../prisma/tenant-context.service';
import { VitalSignsService } from '../vital-signs/vital-signs.service';
import { ResidentHealthService } from '../resident-health/resident-health.service';
import { IncidentInterceptorService } from './incident-interceptor.service';
import { NotificationsService } from '../notifications/notifications.service';
import { mockTenant } from '../../test/fixtures/tenant.fixture';
import { mockAdminUser } from '../../test/fixtures/user.fixture';
import { mockResident } from '../../test/fixtures/resident.fixture';

const createCrudModel = () => ({
  create: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
});

describe('DailyRecordsService', () => {
  let service: DailyRecordsService;
  let prisma: any;
  let tenantContext: { tenantId: string; client: any };
  let vitalSignsService: { create: jest.Mock; update: jest.Mock; remove: jest.Mock };
  let residentHealthService: { createAnthropometry: jest.Mock };
  let incidentInterceptorService: { analyzeAndCreateIncidents: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let notificationsService: {
    getIncidentNotificationRecipients: jest.Mock;
    createDirectedNotification: jest.Mock;
  };

  const baseResident = {
    ...mockResident,
    bedId: null,
    fotoUrl: null,
  } as any;

  const baseRecord = {
    id: 'record-123',
    tenantId: mockTenant.id,
    residentId: baseResident.id,
    userId: mockAdminUser.id,
    type: 'HIGIENE',
    date: new Date('2024-01-15T12:00:00.000Z'),
    time: '08:00',
    data: { observacao: 'ok' },
    recordedBy: 'Enfermeira Maria',
    notes: 'Paciente estável',
    createdAt: new Date('2024-01-15T08:00:00.000Z'),
    updatedAt: new Date('2024-01-15T08:00:00.000Z'),
    deletedAt: null,
  } as any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      tenant: createCrudModel(),
      resident: createCrudModel(),
      dailyRecord: createCrudModel(),
      dailyRecordHistory: createCrudModel(),
      vitalSign: createCrudModel(),
    };

    prisma.$transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback(prisma));
    prisma.tenant.findUnique.mockResolvedValue({ id: mockTenant.id, timezone: 'America/Sao_Paulo' });
    prisma.dailyRecordHistory.findFirst.mockResolvedValue(null);
    prisma.dailyRecordHistory.create.mockResolvedValue({ id: 'history-1' });
    prisma.vitalSign.findFirst.mockResolvedValue(null);

    tenantContext = {
      tenantId: mockTenant.id,
      client: prisma,
    };

    vitalSignsService = {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    residentHealthService = {
      createAnthropometry: jest.fn(),
    };

    incidentInterceptorService = {
      analyzeAndCreateIncidents: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    notificationsService = {
      getIncidentNotificationRecipients: jest.fn().mockResolvedValue([]),
      createDirectedNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyRecordsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenantContext },
        { provide: VitalSignsService, useValue: vitalSignsService },
        { provide: ResidentHealthService, useValue: residentHealthService },
        { provide: IncidentInterceptorService, useValue: incidentInterceptorService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: NotificationsService, useValue: notificationsService },
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

    service = module.get<DailyRecordsService>(DailyRecordsService);
  });

  describe('create()', () => {
    const createDto = {
      residentId: baseResident.id,
      type: 'HIGIENE',
      date: '2024-01-15',
      time: '08:00',
      data: { banho: 'chuveiro' },
      recordedBy: 'Enfermeira Maria',
      notes: 'Paciente estável',
    } as any;

    it('cria registro diário e emite evento assíncrono', async () => {
      prisma.resident.findFirst.mockResolvedValue(baseResident);
      prisma.dailyRecord.create.mockResolvedValue({
        ...baseRecord,
        resident: {
          id: baseResident.id,
          fullName: baseResident.fullName,
          fotoUrl: null,
        },
      });

      const result = await service.create(createDto, mockAdminUser.id);

      expect(result.id).toBe(baseRecord.id);
      expect(prisma.dailyRecord.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'daily-record.created',
        expect.objectContaining({
          tenantId: mockTenant.id,
          userId: mockAdminUser.id,
        }),
      );
    });

    it('valida que o residente existe', async () => {
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto, mockAdminUser.id)).rejects.toThrow(
        new NotFoundException('Residente não encontrado'),
      );
    });

    it('valida formato HH:mm para hora', async () => {
      prisma.resident.findFirst.mockResolvedValue(baseResident);

      await expect(
        service.create({ ...createDto, time: '25:00' }, mockAdminUser.id),
      ).rejects.toThrow(new BadRequestException('Formato de hora inválido. Use HH:mm'));
    });

    it('aciona criação automática de sinais vitais para MONITORAMENTO', async () => {
      prisma.resident.findFirst.mockResolvedValue(baseResident);
      prisma.dailyRecord.create.mockResolvedValue({
        ...baseRecord,
        type: 'MONITORAMENTO',
        data: {
          pressaoArterial: '120/80',
          temperatura: '36.5',
          frequenciaCardiaca: '72',
          saturacaoO2: '98',
        },
        resident: {
          id: baseResident.id,
          fullName: baseResident.fullName,
          fotoUrl: null,
        },
      });

      await service.create(
        {
          ...createDto,
          type: 'MONITORAMENTO',
          data: {
            pressaoArterial: '120/80',
            temperatura: '36.5',
            frequenciaCardiaca: '72',
            saturacaoO2: '98',
          },
        },
        mockAdminUser.id,
      );

      expect(vitalSignsService.create).toHaveBeenCalled();
    });
  });

  describe('findAll()', () => {
    it('retorna registros paginados com filtros atuais', async () => {
      prisma.dailyRecord.findMany.mockResolvedValue([
        {
          ...baseRecord,
          resident: {
            id: baseResident.id,
            fullName: baseResident.fullName,
            fotoUrl: null,
          },
        },
      ]);
      prisma.dailyRecord.count.mockResolvedValue(1);

      const result = await service.findAll({
        residentId: baseResident.id,
        type: 'HIGIENE',
        date: '2025-12-06',
      } as any);

      expect(result.meta.total).toBe(1);
      expect(prisma.dailyRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          residentId: baseResident.id,
          type: 'HIGIENE',
          deletedAt: null,
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }));
      expect(prisma.dailyRecord.findMany.mock.calls[0][0].where).not.toHaveProperty('tenantId');
    });
  });

  describe('findOne()', () => {
    it('retorna um registro pelo ID sem exigir tenantId explícito', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue({
        ...baseRecord,
        resident: {
          id: baseResident.id,
          fullName: baseResident.fullName,
          fotoUrl: null,
        },
      });

      const result = await service.findOne(baseRecord.id);

      expect(result.id).toBe(baseRecord.id);
      expect(prisma.dailyRecord.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          id: baseRecord.id,
          deletedAt: null,
        },
      }));
    });

    it('lança erro se registro não for encontrado', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(null);

      await expect(service.findOne('record-missing')).rejects.toThrow(
        new NotFoundException('Registro não encontrado'),
      );
    });
  });

  describe('update()', () => {
    it('atualiza registro com versionamento', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(baseRecord);
      prisma.dailyRecordHistory.findFirst.mockResolvedValue({ versionNumber: 1 });
      prisma.dailyRecord.update.mockResolvedValue({
        ...baseRecord,
        notes: 'Paciente apresentou melhora',
        resident: {
          id: baseResident.id,
          fullName: baseResident.fullName,
          fotoUrl: null,
        },
      });

      const result = await service.update(
        baseRecord.id,
        {
          notes: 'Paciente apresentou melhora',
          editReason: 'Correção de evolução em teste',
        } as any,
        mockAdminUser.id,
        mockAdminUser.name,
      );

      expect(result.notes).toBe('Paciente apresentou melhora');
      expect(prisma.dailyRecordHistory.create).toHaveBeenCalled();
      expect(prisma.dailyRecord.update).toHaveBeenCalled();
    });

    it('valida formato de hora no update', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(baseRecord);

      await expect(
        service.update(
          baseRecord.id,
          { time: '25:00', editReason: 'Correção de hora em teste' } as any,
          mockAdminUser.id,
          mockAdminUser.name,
        ),
      ).rejects.toThrow(new BadRequestException('Formato de hora inválido. Use HH:mm'));
    });
  });

  describe('remove()', () => {
    it('executa soft delete com histórico', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(baseRecord);
      prisma.dailyRecordHistory.findFirst.mockResolvedValue({ versionNumber: 1 });
      prisma.dailyRecord.update.mockResolvedValue({
        ...baseRecord,
        deletedAt: new Date(),
      });

      const result = await service.remove(
        baseRecord.id,
        { deleteReason: 'Registro incorreto para teste' },
        mockAdminUser.id,
        mockAdminUser.name,
      );

      expect(result).toEqual({ message: 'Registro removido com sucesso' });
      expect(prisma.dailyRecordHistory.create).toHaveBeenCalled();
      expect(prisma.dailyRecord.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: baseRecord.id },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      }));
    });

    it('lança erro se registro não existir', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(
          'record-missing',
          { deleteReason: 'Motivo suficientemente claro' },
          mockAdminUser.id,
          mockAdminUser.name,
        ),
      ).rejects.toThrow(new NotFoundException('Registro não encontrado'));
    });
  });

  describe('findDatesWithRecordsByResident()', () => {
    it('retorna datas únicas do mês no formato YYYY-MM-DD', async () => {
      prisma.resident.findFirst.mockResolvedValue(baseResident);
      prisma.dailyRecord.findMany.mockResolvedValue([
        { date: new Date('2025-12-01T12:00:00.000Z') },
        { date: new Date('2025-12-15T12:00:00.000Z') },
      ]);

      const result = await service.findDatesWithRecordsByResident(baseResident.id, 2025, 12);

      expect(result).toEqual(['2025-12-01', '2025-12-15']);
      expect(prisma.dailyRecord.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          residentId: baseResident.id,
          deletedAt: null,
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }));
    });
  });
});
