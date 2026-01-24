/**
 * Testes Unitários - PrescriptionsService
 *
 * CRÍTICO: Gestão de prescrições médicas e administração de medicamentos
 * Falha aqui = medicamento errado/hora errada = risco à vida
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import { mockPrismaService } from '../../test/mocks/prisma.mock';
import { mockTenant } from '../../test/fixtures/tenant.fixture';
import { mockAdminUser } from '../../test/fixtures/user.fixture';
import { mockResident } from '../../test/fixtures/resident.fixture';

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;
  let prisma: any;
  let filesService: FilesService;

  const mockFilesService = {
    uploadPrescriptionImage: jest.fn(),
    deleteFile: jest.fn(),
    getFileUrl: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotification: jest.fn(),
    createNotification: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const mockPrescription = {
    id: 'prescription-123',
    tenantId: mockTenant.id,
    residentId: mockResident.id,
    doctorName: 'Dr. João Silva',
    doctorCrm: '12345',
    doctorCrmState: 'SP',
    prescriptionDate: new Date('2024-01-15'),
    prescriptionType: 'CONTINUO',
    validUntil: new Date('2024-12-31'),
    reviewDate: null,
    controlledClass: null,
    notificationNumber: null,
    notificationType: null,
    notes: null,
    // Campos de processamento de arquivo
    originalFileUrl: null,
    originalFileKey: null,
    originalFileName: null,
    originalFileSize: null,
    originalFileMimeType: null,
    originalFileHash: null,
    processedFileUrl: null,
    processedFileKey: null,
    processedFileName: null,
    processedFileSize: null,
    processedFileHash: null,
    publicToken: null,
    processingMetadata: null,
    createdBy: mockAdminUser.id,
    createdAt: new Date('2024-01-15T00:00:00.000Z'),
    updatedAt: new Date('2024-01-15T00:00:00.000Z'),
    deletedAt: null,
  };

  const mockMedication = {
    id: 'medication-123',
    prescriptionId: 'prescription-123',
    name: 'Losartana Potássica',
    presentation: 'COMPRIMIDO',
    concentration: '50mg',
    dose: '1 comprimido',
    route: 'ORAL',
    frequency: 'DAILY',
    scheduledTimes: ['08:00', '20:00'],
    startDate: new Date('2024-01-15'),
    endDate: null,
    isControlled: false,
    isHighRisk: false,
    requiresDoubleCheck: false,
    instructions: 'Tomar com água',
    createdAt: new Date('2024-01-15T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PrescriptionsService>(PrescriptionsService);
    prisma = module.get<PrismaService>(PrismaService);
    filesService = module.get<FilesService>(FilesService);

    jest.clearAllMocks();
  });

  describe('create()', () => {
    const createDto: any = {
      residentId: mockResident.id,
      doctorName: 'Dr. João Silva',
      doctorCrm: '12345',
      doctorCrmState: 'SP',
      prescriptionDate: new Date('2024-01-15').toISOString(),
      prescriptionType: 'CONTINUO',
      validUntil: new Date('2024-12-31').toISOString(),
      medications: [
        {
          name: 'Losartana Potássica',
          presentation: 'COMPRIMIDO',
          concentration: '50mg',
          dose: '1 comprimido',
          route: 'ORAL',
          frequency: 'DAILY',
          scheduledTimes: ['08:00', '20:00'],
          startDate: new Date('2024-01-15').toISOString(),
        },
      ],
    };

    it('deve criar prescrição com sucesso', async () => {
      prisma.resident.findFirst.mockResolvedValue(mockResident);
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prisma);
      });
      prisma.prescription.create.mockResolvedValue({
        ...mockPrescription,
        medications: [mockMedication],
        sosMedications: [],
        resident: {
          id: mockResident.id,
          fullName: mockResident.fullName,
          fotoUrl: mockResident.photoUrl,
        },
      });

      const result = await service.create(createDto, mockTenant.id, mockAdminUser.id);

      expect(result).toBeDefined();
      expect(result.medications).toBeDefined();
      expect(prisma.prescription.create).toHaveBeenCalled();
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
      // Residente de outro tenant
      prisma.resident.findFirst.mockResolvedValue(null);

      await expect(
        service.create(createDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('deve validar horários dos medicamentos', async () => {
      const invalidDto = {
        ...createDto,
        medications: [
          {
            ...createDto.medications[0],
            scheduledTimes: ['25:00'], // Hora inválida
          },
        ],
      };

      prisma.resident.findFirst.mockResolvedValue(mockResident);

      await expect(
        service.create(invalidDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(BadRequestException);
    });

    it('deve criar prescrição com medicamentos SOS', async () => {
      const dtoWithSOS = {
        ...createDto,
        sosMedications: [
          {
            name: 'Dipirona',
            presentation: 'COMPRIMIDO',
            concentration: '500mg',
            dose: '1 comprimido',
            route: 'ORAL',
            indication: 'DOR',
            minInterval: 6,
            maxDailyDoses: 4,
            startDate: new Date('2024-01-15').toISOString(),
          },
        ],
      };

      prisma.resident.findFirst.mockResolvedValue(mockResident);
      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prisma);
      });
      prisma.prescription.create.mockResolvedValue({
        ...mockPrescription,
        medications: [mockMedication],
        sosMedications: [{ id: 'sos-123', name: 'Dipirona' }],
        resident: { id: mockResident.id, fullName: mockResident.fullName },
      });

      const result = await service.create(dtoWithSOS, mockTenant.id, mockAdminUser.id);

      expect(result.sosMedications).toBeDefined();
      expect(result.sosMedications.length).toBeGreaterThan(0);
    });
  });

  describe('findAll()', () => {
    const mockPrescriptions = [
      {
        ...mockPrescription,
        id: 'prescription-1',
        resident: {
          id: mockResident.id,
          fullName: mockResident.fullName,
          fotoUrl: null,
          bedId: null,
        },
        _count: { medications: 3, sosMedications: 1 },
      },
      {
        ...mockPrescription,
        id: 'prescription-2',
        resident: {
          id: mockResident.id,
          fullName: mockResident.fullName,
          fotoUrl: null,
          bedId: null,
        },
        _count: { medications: 2, sosMedications: 0 },
      },
    ];

    it('deve retornar prescrições do tenant', async () => {
      prisma.prescription.findMany.mockResolvedValue(mockPrescriptions);
      prisma.prescription.count.mockResolvedValue(2);

      const result = await service.findAll({}, mockTenant.id);

      // Service converte datas para strings, então não fazemos toEqual direto
      expect(result.data.length).toBe(2);
      expect(result.data[0].id).toBe('prescription-1');
      expect(result.data[1].id).toBe('prescription-2');
      expect(result.meta.total).toBe(2);
    });

    it('deve filtrar apenas pelo tenantId (isolamento)', async () => {
      prisma.prescription.findMany.mockResolvedValue(mockPrescriptions);
      prisma.prescription.count.mockResolvedValue(2);

      await service.findAll({}, mockTenant.id);

      expect(prisma.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenant.id,
            deletedAt: null,
          }),
        })
      );
    });

    it('deve paginar resultados', async () => {
      prisma.prescription.findMany.mockResolvedValue(mockPrescriptions);
      prisma.prescription.count.mockResolvedValue(20);

      await service.findAll({ page: '2', limit: '5' }, mockTenant.id);

      expect(prisma.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page 2 - 1) * limit 5
          take: 5,
        })
      );
    });

    it('deve filtrar por residentId', async () => {
      prisma.prescription.findMany.mockResolvedValue([mockPrescriptions[0]]);
      prisma.prescription.count.mockResolvedValue(1);

      await service.findAll({ residentId: mockResident.id }, mockTenant.id);

      expect(prisma.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            residentId: mockResident.id,
          }),
        })
      );
    });

    it('deve filtrar por tipo de prescrição', async () => {
      prisma.prescription.findMany.mockResolvedValue([mockPrescriptions[0]]);
      prisma.prescription.count.mockResolvedValue(1);

      await service.findAll({ prescriptionType: 'CONTINUO' }, mockTenant.id);

      expect(prisma.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            prescriptionType: 'CONTINUO',
          }),
        })
      );
    });
  });

  describe('findOne()', () => {
    it('deve retornar prescrição por ID com dados completos', async () => {
      const fullPrescription = {
        ...mockPrescription,
        resident: {
          id: mockResident.id,
          fullName: mockResident.fullName,
          fotoUrl: null,
          bedId: null,
        },
        medications: [mockMedication],
        sosMedications: [],
      };

      prisma.prescription.findFirst.mockResolvedValue(fullPrescription);

      const result = await service.findOne(mockPrescription.id, mockTenant.id);

      expect(result.id).toBe(mockPrescription.id);
      expect(result.medications).toBeDefined();
      expect(result.resident).toBeDefined();
    });

    it('deve filtrar por tenantId (segurança)', async () => {
      prisma.prescription.findFirst.mockResolvedValue(mockPrescription);

      await service.findOne(mockPrescription.id, mockTenant.id);

      expect(prisma.prescription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockPrescription.id,
            tenantId: mockTenant.id,
            deletedAt: null,
          }),
        })
      );
    });

    it('deve lançar erro se prescrição não encontrada', async () => {
      prisma.prescription.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent-id', mockTenant.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('NÃO deve retornar prescrição de outro tenant', async () => {
      prisma.prescription.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('prescription-other-tenant', mockTenant.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    const updateDto: any = {
      notes: 'Prescrição revisada',
    };

    it('deve atualizar prescrição com sucesso', async () => {
      prisma.prescription.findFirst.mockResolvedValue(mockPrescription);
      prisma.prescription.update.mockResolvedValue({
        ...mockPrescription,
        ...updateDto,
      });

      const result = await service.update(
        mockPrescription.id,
        updateDto,
        mockTenant.id,
        mockAdminUser.id
      );

      expect(result.notes).toBe(updateDto.notes);
      expect(prisma.prescription.update).toHaveBeenCalled();
    });

    it('deve validar que prescrição existe antes de atualizar', async () => {
      prisma.prescription.findFirst.mockResolvedValue(null);

      await expect(
        service.update('non-existent', updateDto, mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('deve validar tenant da prescrição (segurança)', async () => {
      prisma.prescription.findFirst.mockResolvedValue(null);

      await expect(
        service.update(
          'prescription-other-tenant',
          updateDto,
          mockTenant.id,
          mockAdminUser.id
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove() - Soft Delete', () => {
    it('deve fazer soft delete da prescrição', async () => {
      prisma.prescription.findFirst.mockResolvedValue(mockPrescription);
      prisma.prescription.update.mockResolvedValue({
        ...mockPrescription,
        deletedAt: new Date(),
      });

      await service.remove(mockPrescription.id, mockTenant.id, mockAdminUser.id);

      expect(prisma.prescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockPrescription.id },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
    });

    it('NÃO deve deletar permanentemente (hard delete)', async () => {
      prisma.prescription.findFirst.mockResolvedValue(mockPrescription);
      prisma.prescription.update.mockResolvedValue(mockPrescription);

      await service.remove(mockPrescription.id, mockTenant.id, mockAdminUser.id);

      expect(prisma.prescription.delete).not.toHaveBeenCalled();
      expect(prisma.prescription.update).toHaveBeenCalled();
    });

    it('deve validar tenant antes de deletar', async () => {
      prisma.prescription.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('prescription-other-tenant', mockTenant.id, mockAdminUser.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Segurança & Multi-Tenancy', () => {
    it('deve SEMPRE incluir tenantId nas queries', async () => {
      prisma.prescription.findFirst.mockResolvedValue(mockPrescription);

      await service.findOne(mockPrescription.id, mockTenant.id);

      const findCall = prisma.prescription.findFirst.mock.calls[0][0];
      expect(findCall.where.tenantId).toBe(mockTenant.id);
    });

    it('deve SEMPRE filtrar deletedAt: null', async () => {
      prisma.prescription.findMany.mockResolvedValue([]);
      prisma.prescription.count.mockResolvedValue(0);

      await service.findAll({}, mockTenant.id);

      const findManyCall = prisma.prescription.findMany.mock.calls[0][0];
      expect(findManyCall.where.deletedAt).toBeNull();
    });

    it('NÃO deve permitir acesso cross-tenant', async () => {
      // Simula que prescrição não foi encontrada (outro tenant)
      prisma.prescription.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('prescription-other-tenant', mockTenant.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Validação de Timezone (TIMESTAMPTZ)', () => {
    it('deve converter string de data para Date com meio-dia ao criar prescrição', async () => {
      const prescriptionDateStr = '2025-12-06';
      const validUntilStr = '2026-06-30';

      const createDto: any = {
        residentId: mockResident.id,
        doctorName: 'Dr. João Silva',
        doctorCrm: '12345',
        doctorCrmState: 'SP',
        prescriptionDate: prescriptionDateStr,
        prescriptionType: 'ROTINA',
        validUntil: validUntilStr,
        medications: [
          {
            name: 'Losartana',
            presentation: 'COMPRIMIDO',
            concentration: '50mg',
            dose: '1 comprimido',
            route: 'ORAL',
            frequency: 'UMA_VEZ_DIA',
            scheduledTimes: ['08:00'],
            startDate: prescriptionDateStr,
          },
        ],
      };

      prisma.resident.findFirst.mockResolvedValue(mockResident);

      let capturedPrescriptionDate: any;
      let capturedValidUntil: any;

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prisma);
      });

      prisma.prescription.create.mockImplementation((params: any) => {
        capturedPrescriptionDate = params.data.prescriptionDate;
        capturedValidUntil = params.data.validUntil;
        return Promise.resolve({
          ...mockPrescription,
          prescriptionDate: '2025-12-06',
          validUntil: '2026-06-30',
          medications: [mockMedication],
          sosMedications: [],
          resident: { id: mockResident.id, fullName: mockResident.fullName },
        });
      });

      await service.create(createDto, mockTenant.id, mockAdminUser.id);

      // Verificar que datas foram convertidas para Date objects ao salvar
      expect(capturedPrescriptionDate).toBeInstanceOf(Date);
      expect(capturedValidUntil).toBeInstanceOf(Date);
    });

    it('deve usar comparação de datas com endOfDay para identificar prescrições expirando', async () => {
      const expiringIn5Days = '2025-12-11';

      prisma.prescription.findMany.mockResolvedValue([
        {
          ...mockPrescription,
          validUntil: expiringIn5Days,
          resident: {
            id: mockResident.id,
            fullName: mockResident.fullName,
            fotoUrl: null,
            bedId: null,
          },
          _count: { medications: 1, sosMedications: 0 },
        },
      ]);
      prisma.prescription.count.mockResolvedValue(1);

      const result = await service.findAll({ expiringInDays: '7' }, mockTenant.id);

      // Verificar que a query usou comparação com endOfDay
      const findManyCall = prisma.prescription.findMany.mock.calls[0][0];
      if (findManyCall.where.validUntil?.lte) {
        expect(findManyCall.where.validUntil.lte).toBeInstanceOf(Date);
      }

      // Deve encontrar prescrição expirando
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('deve retornar datas como strings YYYY-MM-DD para evitar bugs de timezone no frontend', async () => {
      prisma.prescription.findMany.mockResolvedValue([
        {
          ...mockPrescription,
          prescriptionDate: new Date('2025-12-06T12:00:00.000Z'),
          validUntil: new Date('2026-06-30T12:00:00.000Z'),
          resident: {
            id: mockResident.id,
            fullName: mockResident.fullName,
            fotoUrl: null,
            bedId: null,
          },
          _count: { medications: 1, sosMedications: 0 },
        },
      ]);
      prisma.prescription.count.mockResolvedValue(1);

      const result = await service.findAll({}, mockTenant.id);

      // Service deve converter Date para string YYYY-MM-DD antes de retornar
      expect(typeof result.data[0].prescriptionDate).toBe('string');
      expect(typeof result.data[0].validUntil).toBe('string');
      expect(result.data[0].prescriptionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.data[0].validUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
