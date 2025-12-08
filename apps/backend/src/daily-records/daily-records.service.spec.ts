/**
 * Testes Unitários - DailyRecordsService
 *
 * CRÍTICO: Registros diários de monitoramento e cuidados dos residentes
 * Falha aqui = perda de rastreabilidade de cuidados = problemas de compliance
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { DailyRecordsService } from './daily-records.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService } from '../../test/mocks/prisma.mock';
import { mockTenant } from '../../test/fixtures/tenant.fixture';
import { mockAdminUser } from '../../test/fixtures/user.fixture';
import { mockResident } from '../../test/fixtures/resident.fixture';

// Mock do vitalSignsService
jest.mock('../services/vitalSigns.service', () => ({
  createVitalSign: jest.fn(),
  updateVitalSignByTimestamp: jest.fn(),
  deleteVitalSignByTimestamp: jest.fn(),
}));

describe('DailyRecordsService', () => {
  let service: DailyRecordsService;
  let prisma: any;

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockDailyRecord = {
    id: 'record-123',
    tenantId: mockTenant.id,
    residentId: mockResident.id,
    userId: mockAdminUser.id,
    type: 'MONITORAMENTO',
    date: new Date('2024-01-15'),
    time: '08:00',
    data: {
      pressaoArterial: '120/80',
      temperatura: '36.5',
      frequenciaCardiaca: '72',
      saturacaoO2: '98',
    },
    recordedBy: 'Enfermeira Maria',
    notes: 'Paciente estável',
    createdAt: new Date('2024-01-15T08:00:00.000Z'),
    updatedAt: new Date('2024-01-15T08:00:00.000Z'),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyRecordsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<DailyRecordsService>(DailyRecordsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();

    // Mock default para dailyRecordHistory (usado em update e remove para versionamento)
    prisma.dailyRecordHistory.findFirst.mockResolvedValue(null);
    prisma.dailyRecordHistory.create.mockResolvedValue({
      id: 'history-123',
      recordId: 'record-123',
      versionNumber: 1,
      changeType: 'UPDATE',
      changedBy: mockAdminUser.id,
      changedByName: mockAdminUser.name,
      changedAt: new Date(),
      changes: {},
    });
  });

  describe('create()', () => {
    const createDto: any = {
      residentId: mockResident.id,
      type: 'MONITORAMENTO',
      date: new Date('2024-01-15').toISOString(),
      time: '08:00',
      data: {
        pressaoArterial: '120/80',
        temperatura: '36.5',
        frequenciaCardiaca: '72',
        saturacaoO2: '98',
      },
      recordedBy: 'Enfermeira Maria',
      notes: 'Paciente estável',
    };

    it('deve criar registro diário com sucesso', async () => {
      prisma.resident.findFirst.mockResolvedValue(mockResident);
      prisma.dailyRecord.create.mockResolvedValue({
        ...mockDailyRecord,
        resident: {
          id: mockResident.id,
          fullName: mockResident.fullName,
          fotoUrl: mockResident.photoUrl,
        },
      });

      const result = await service.create(createDto, mockTenant.id, mockAdminUser.id);

      expect(result).toBeDefined();
      expect(result.type).toBe('MONITORAMENTO');
      expect(prisma.dailyRecord.create).toHaveBeenCalled();
    });

    it('deve validar que residente existe', async () => {
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create(createDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow('Residente não encontrado');
    });

    it('deve validar tenant do residente (segurança)', async () => {
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('deve validar formato de hora (HH:mm)', async () => {
      const invalidDto = {
        ...createDto,
        time: '25:00', // Hora inválida
      };

      prisma.resident.findFirst.mockResolvedValue(mockResident);

      await expect(
        service.create(invalidDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(invalidDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow('Formato de hora inválido');
    });

    it('deve criar diferentes tipos de registros', async () => {
      const types = ['MONITORAMENTO', 'HIGIENE', 'ALIMENTACAO', 'MEDICACAO', 'ATIVIDADE'];

      prisma.resident.findFirst.mockResolvedValue(mockResident);

      for (const type of types) {
        const dto = { ...createDto, type };
        prisma.dailyRecord.create.mockResolvedValue({
          ...mockDailyRecord,
          type,
          resident: { id: mockResident.id, fullName: mockResident.fullName },
        });

        const result = await service.create(dto, mockTenant.id, mockAdminUser.id);
        expect(result.type).toBe(type);
      }
    });
  });

  describe('findAll()', () => {
    const mockRecords = [
      {
        ...mockDailyRecord,
        id: 'record-1',
        resident: {
          id: mockResident.id,
          fullName: mockResident.fullName,
          fotoUrl: null,
        },
      },
      {
        ...mockDailyRecord,
        id: 'record-2',
        type: 'HIGIENE',
        resident: {
          id: mockResident.id,
          fullName: mockResident.fullName,
          fotoUrl: null,
        },
      },
    ];

    it('deve retornar registros do tenant', async () => {
      prisma.dailyRecord.findMany.mockResolvedValue(mockRecords);
      prisma.dailyRecord.count.mockResolvedValue(2);

      const result = await service.findAll({}, mockTenant.id);

      expect(result.data).toEqual(mockRecords);
      expect(result.meta.total).toBe(2);
    });

    it('deve filtrar apenas pelo tenantId (isolamento)', async () => {
      prisma.dailyRecord.findMany.mockResolvedValue(mockRecords);
      prisma.dailyRecord.count.mockResolvedValue(2);

      await service.findAll({}, mockTenant.id);

      expect(prisma.dailyRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenant.id,
            deletedAt: null,
          }),
        })
      );
    });

    it('deve paginar resultados', async () => {
      prisma.dailyRecord.findMany.mockResolvedValue(mockRecords);
      prisma.dailyRecord.count.mockResolvedValue(20);

      await service.findAll({ page: '2', limit: '5' }, mockTenant.id);

      expect(prisma.dailyRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page 2 - 1) * limit 5
          take: 5,
        })
      );
    });

    it('deve filtrar por residentId', async () => {
      prisma.dailyRecord.findMany.mockResolvedValue([mockRecords[0]]);
      prisma.dailyRecord.count.mockResolvedValue(1);

      await service.findAll({ residentId: mockResident.id }, mockTenant.id);

      expect(prisma.dailyRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            residentId: mockResident.id,
          }),
        })
      );
    });

    it('deve filtrar por tipo de registro', async () => {
      prisma.dailyRecord.findMany.mockResolvedValue([mockRecords[0]]);
      prisma.dailyRecord.count.mockResolvedValue(1);

      await service.findAll({ type: 'MONITORAMENTO' }, mockTenant.id);

      expect(prisma.dailyRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'MONITORAMENTO',
          }),
        })
      );
    });

    it('deve filtrar por range de datas', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-01-31').toISOString();

      prisma.dailyRecord.findMany.mockResolvedValue(mockRecords);
      prisma.dailyRecord.count.mockResolvedValue(2);

      await service.findAll({ startDate, endDate }, mockTenant.id);

      expect(prisma.dailyRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });
  });

  describe('findOne()', () => {
    it('deve retornar registro por ID', async () => {
      const fullRecord = {
        ...mockDailyRecord,
        resident: {
          id: mockResident.id,
          fullName: mockResident.fullName,
          fotoUrl: null,
        },
      };

      prisma.dailyRecord.findFirst.mockResolvedValue(fullRecord);

      const result = await service.findOne(mockDailyRecord.id, mockTenant.id);

      expect(result.id).toBe(mockDailyRecord.id);
      expect(result.resident).toBeDefined();
    });

    it('deve filtrar por tenantId (segurança)', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(mockDailyRecord);

      await service.findOne(mockDailyRecord.id, mockTenant.id);

      expect(prisma.dailyRecord.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockDailyRecord.id,
            tenantId: mockTenant.id,
            deletedAt: null,
          }),
        })
      );
    });

    it('deve lançar erro se registro não encontrado', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent-id', mockTenant.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('NÃO deve retornar registro de outro tenant', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('record-other-tenant', mockTenant.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    const updateDto: any = {
      notes: 'Paciente apresentou melhora',
      data: {
        pressaoArterial: '118/78',
        temperatura: '36.3',
      },
    };

    it('deve atualizar registro com sucesso', async () => {
      const updatedRecord = {
        ...mockDailyRecord,
        ...updateDto,
        resident: {
          id: mockResident.id,
          fullName: mockResident.fullName,
          fotoUrl: null,
        },
      };

      prisma.dailyRecord.findFirst.mockResolvedValue(mockDailyRecord);
      prisma.dailyRecord.update.mockResolvedValue(updatedRecord);

      // Mock da transação - retorna o resultado do callback
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prisma);
      });

      const result = await service.update(
        mockDailyRecord.id,
        updateDto,
        mockTenant.id,
        mockAdminUser.id,
        mockAdminUser.name
      );

      expect(result.notes).toBe(updateDto.notes);
      expect(prisma.dailyRecord.update).toHaveBeenCalled();
      expect(prisma.dailyRecordHistory.create).toHaveBeenCalled();
    });

    it('deve validar que registro existe antes de atualizar', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, mockTenant.id, mockAdminUser.id, mockAdminUser.name)
      ).rejects.toThrow(NotFoundException);
    });

    it('deve validar tenant do registro (segurança)', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          'record-other-tenant',
          updateDto,
          mockTenant.id,
          mockAdminUser.id,
          mockAdminUser.name
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove() - Soft Delete', () => {
    it('deve fazer soft delete do registro', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(mockDailyRecord);
      prisma.dailyRecord.update.mockResolvedValue({
        ...mockDailyRecord,
        deletedAt: new Date(),
      });

      // Mock da transação - retorna o resultado do callback
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prisma);
      });

      await service.remove(
        mockDailyRecord.id,
        { deleteReason: 'Registro incorreto' },
        mockTenant.id,
        mockAdminUser.id,
        mockAdminUser.name
      );

      expect(prisma.dailyRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockDailyRecord.id },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
      expect(prisma.dailyRecordHistory.create).toHaveBeenCalled();
    });

    it('NÃO deve deletar permanentemente (hard delete)', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(mockDailyRecord);
      prisma.dailyRecord.update.mockResolvedValue(mockDailyRecord);

      // Mock da transação - retorna o resultado do callback
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prisma);
      });

      await service.remove(
        mockDailyRecord.id,
        { deleteReason: 'Registro incorreto' },
        mockTenant.id,
        mockAdminUser.id,
        mockAdminUser.name
      );

      expect(prisma.dailyRecord.delete).not.toHaveBeenCalled();
      expect(prisma.dailyRecord.update).toHaveBeenCalled();
    });

    it('deve validar tenant antes de deletar', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(
          'record-other-tenant',
          { deleteReason: 'Test' },
          mockTenant.id,
          mockAdminUser.id,
          mockAdminUser.name
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Segurança & Multi-Tenancy', () => {
    it('deve SEMPRE incluir tenantId nas queries', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(mockDailyRecord);

      await service.findOne(mockDailyRecord.id, mockTenant.id);

      const findCall = prisma.dailyRecord.findFirst.mock.calls[0][0];
      expect(findCall.where.tenantId).toBe(mockTenant.id);
    });

    it('deve SEMPRE filtrar deletedAt: null', async () => {
      prisma.dailyRecord.findMany.mockResolvedValue([]);
      prisma.dailyRecord.count.mockResolvedValue(0);

      await service.findAll({}, mockTenant.id);

      const findManyCall = prisma.dailyRecord.findMany.mock.calls[0][0];
      expect(findManyCall.where.deletedAt).toBeNull();
    });

    it('NÃO deve permitir acesso cross-tenant', async () => {
      prisma.dailyRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('record-other-tenant', mockTenant.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Validações de Negócio', () => {
    it('deve validar formato HH:mm para hora', async () => {
      const validTimes = ['00:00', '08:30', '12:00', '23:59'];
      const invalidTimes = ['24:00', '25:00', '08:60', '8:00', '08:0'];

      prisma.resident.findFirst.mockResolvedValue(mockResident);
      prisma.dailyRecord.create.mockResolvedValue(mockDailyRecord);

      for (const time of validTimes) {
        const dto = {
          residentId: mockResident.id,
          type: 'MONITORAMENTO',
          date: new Date().toISOString(),
          time,
          data: {},
          recordedBy: 'Test',
        };

        await expect(
          service.create(dto, mockTenant.id, mockAdminUser.id)
        ).resolves.not.toThrow();
      }

      for (const time of invalidTimes) {
        const dto = {
          residentId: mockResident.id,
          type: 'MONITORAMENTO',
          date: new Date().toISOString(),
          time,
          data: {},
          recordedBy: 'Test',
        };

        await expect(
          service.create(dto, mockTenant.id, mockAdminUser.id)
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('deve aceitar data como ISO string', async () => {
      const dto = {
        residentId: mockResident.id,
        type: 'MONITORAMENTO',
        date: '2024-01-15T00:00:00.000Z',
        time: '08:00',
        data: {},
        recordedBy: 'Test',
      };

      prisma.resident.findFirst.mockResolvedValue(mockResident);
      prisma.dailyRecord.create.mockResolvedValue(mockDailyRecord);

      await expect(
        service.create(dto, mockTenant.id, mockAdminUser.id)
      ).resolves.not.toThrow();
    });
  });

  describe('Validação de Timezone (TIMESTAMPTZ)', () => {
    it('deve converter campos date-only para Date com T12:00:00 (meio-dia)', async () => {
      const dateStr = '2025-12-06';
      const dto = {
        residentId: mockResident.id,
        type: 'ALIMENTACAO',
        date: dateStr,
        time: '08:00',
        data: { refeicao: 'Café da manhã' },
        recordedBy: 'Test',
      };

      prisma.resident.findFirst.mockResolvedValue(mockResident);

      let capturedDate: Date | undefined;
      prisma.dailyRecord.create.mockImplementation((params: any) => {
        capturedDate = params.data.date;
        return Promise.resolve({
          ...mockDailyRecord,
          date: capturedDate,
          resident: { id: mockResident.id, fullName: mockResident.fullName },
        });
      });

      await service.create(dto, mockTenant.id, mockAdminUser.id);

      expect(capturedDate).toBeDefined();
      expect(capturedDate!.getUTCHours()).toBeGreaterThanOrEqual(12);
      expect(capturedDate!.getUTCHours()).toBeLessThanOrEqual(15); // UTC-3 = 15:00 UTC
    });

    it('deve usar range de datas (startOfDay/endOfDay) em queries por data', async () => {
      const testDate = '2025-12-06';

      prisma.dailyRecord.findMany.mockResolvedValue([mockDailyRecord]);
      prisma.dailyRecord.count.mockResolvedValue(1);

      await service.findAll({ date: testDate }, mockTenant.id);

      const findManyCall = prisma.dailyRecord.findMany.mock.calls[0][0];
      expect(findManyCall.where.date).toBeDefined();
      expect(findManyCall.where.date.gte).toBeInstanceOf(Date);
      expect(findManyCall.where.date.lte).toBeInstanceOf(Date);

      // Verificar que gte e lte formam um range de 1 dia completo
      const gte = findManyCall.where.date.gte as Date;
      const lte = findManyCall.where.date.lte as Date;

      // startOfDay e endOfDay usam timezone local (UTC-3)
      // startOfDay(2025-12-06) em UTC-3 = 2025-12-06T03:00:00.000Z
      // endOfDay(2025-12-06) em UTC-3 = 2025-12-07T02:59:59.999Z
      const diffMs = lte.getTime() - gte.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Deve cobrir aproximadamente 24 horas
      expect(diffHours).toBeGreaterThan(23);
      expect(diffHours).toBeLessThan(25);
    });

    it('NÃO deve permitir registros "pularem" de dia devido a timezone', async () => {
      const date1 = '2025-12-06';
      const date2 = '2025-12-07';

      prisma.dailyRecord.findMany.mockResolvedValue([
        { ...mockDailyRecord, id: '1', date: new Date('2025-12-06T12:00:00.000Z') },
      ]);
      prisma.dailyRecord.count.mockResolvedValue(1);

      await service.findAll({ date: date1 }, mockTenant.id);

      const findManyCall = prisma.dailyRecord.findMany.mock.calls[0][0];
      const gte = findManyCall.where.date.gte as Date;
      const lte = findManyCall.where.date.lte as Date;

      // Verificar que o range de data está dentro do mesmo dia
      // O range deve começar em 2025-12-06 e terminar antes de 2025-12-08
      const currentDayStart = new Date('2025-12-06T00:00:00.000Z');
      const nextNextDayStart = new Date('2025-12-08T00:00:00.000Z');

      expect(gte.getTime()).toBeGreaterThanOrEqual(currentDayStart.getTime());
      expect(lte.getTime()).toBeLessThan(nextNextDayStart.getTime());
    });

    it('deve usar startOfMonth/endOfMonth para findDatesWithRecordsByResident', async () => {
      const year = 2025;
      const month = 12;

      prisma.resident.findFirst.mockResolvedValue(mockResident);
      prisma.dailyRecord.findMany.mockResolvedValue([
        { date: new Date('2025-12-01T12:00:00.000Z') },
        { date: new Date('2025-12-15T12:00:00.000Z') },
        { date: new Date('2025-12-31T12:00:00.000Z') },
      ]);

      await service.findDatesWithRecordsByResident(mockResident.id, mockTenant.id, year, month);

      const findManyCall = prisma.dailyRecord.findMany.mock.calls[0][0];
      expect(findManyCall.where.date).toBeDefined();
      expect(findManyCall.where.date.gte).toBeInstanceOf(Date);
      expect(findManyCall.where.date.lte).toBeInstanceOf(Date);

      const gte = findManyCall.where.date.gte as Date;
      const lte = findManyCall.where.date.lte as Date;

      // Verificar que cobre todo o mês (startOfMonth e endOfMonth em UTC-3)
      // startOfMonth(2025, 12) = 2025-12-01T03:00:00.000Z (UTC-3)
      // endOfMonth(2025, 12) = 2026-01-01T02:59:59.999Z (fim do dia 31 em UTC-3)
      const monthStart = new Date('2025-12-01T00:00:00.000Z');
      const monthEnd = new Date('2026-01-01T00:00:00.000Z');

      expect(gte.getTime()).toBeGreaterThanOrEqual(monthStart.getTime());
      expect(lte.getTime()).toBeGreaterThanOrEqual(monthStart.getTime());
      expect(lte.getTime()).toBeLessThan(monthEnd.getTime() + 24 * 60 * 60 * 1000);
    });
  });
});
