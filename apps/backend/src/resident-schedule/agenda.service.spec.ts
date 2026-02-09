import { AgendaService } from './agenda.service';

describe('AgendaService - createdAt boundaries', () => {
  const createService = () => {
    const prisma = {
      tenant: {
        findUnique: jest.fn(),
      },
    } as any;

    const tenantContext = {
      tenantId: 'tenant-1',
      client: {
        prescription: {
          findMany: jest.fn(),
        },
        medicationAdministration: {
          findMany: jest.fn(),
        },
        residentScheduleConfig: {
          findMany: jest.fn(),
        },
        dailyRecord: {
          findMany: jest.fn(),
        },
        residentScheduledEvent: {
          findMany: jest.fn(),
        },
      },
    } as any;

    return {
      service: new AgendaService(prisma, tenantContext),
      prisma,
      tenantContext,
    };
  };

  it('não gera itens de medicação para datas anteriores ao createdAt da medicação', async () => {
    const { service, tenantContext } = createService();

    tenantContext.client.prescription.findMany.mockResolvedValue([
      {
        id: 'presc-1',
        residentId: 'res-1',
        resident: { id: 'res-1', fullName: 'Residente 1' },
        medications: [
          {
            id: 'med-1',
            name: 'Losartana',
            concentration: '50mg',
            dose: '1 cp',
            route: 'VO',
            instructions: null,
            presentation: 'COMPRIMIDO',
            frequency: 'PERSONALIZADO',
            isControlled: false,
            isHighRisk: false,
            requiresDoubleCheck: false,
            startDate: new Date('2026-02-01T12:00:00.000Z'),
            endDate: null,
            createdAt: new Date('2026-02-02T10:00:00.000Z'),
            scheduledTimes: ['08:00'],
          },
        ],
      },
    ]);
    tenantContext.client.medicationAdministration.findMany.mockResolvedValue([]);

    const items = await (service as any).getMedicationItems(
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-03T23:59:59.999Z'),
    );

    const dayKeys = items.map((item: any) => {
      const date = item.scheduledDate as Date;
      return date.toISOString().split('T')[0];
    });

    expect(dayKeys).toEqual(['2026-02-02', '2026-02-03']);
  });

  it('não gera registros recorrentes para datas anteriores ao createdAt da configuração', async () => {
    const { service, tenantContext } = createService();

    tenantContext.client.residentScheduleConfig.findMany.mockResolvedValue([
      {
        id: 'cfg-1',
        residentId: 'res-1',
        resident: { id: 'res-1', fullName: 'Residente 1' },
        recordType: 'HIDRATACAO',
        frequency: 'DAILY',
        dayOfWeek: null,
        dayOfMonth: null,
        suggestedTimes: ['09:00'],
        metadata: null,
        notes: null,
        createdAt: new Date('2026-02-03T09:30:00.000Z'),
      },
    ]);
    tenantContext.client.dailyRecord.findMany.mockResolvedValue([]);

    const items = await (service as any).generateRecurringRecordItemsForRange(
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-04T23:59:59.999Z'),
    );

    const dayKeys = items.map((item: any) => {
      const date = item.scheduledDate as Date;
      return date.toISOString().split('T')[0];
    });

    expect(dayKeys).toEqual(['2026-02-03', '2026-02-04']);
  });

  it('não conta medicação em dias anteriores ao createdAt no sumário mensal', async () => {
    const { service, tenantContext } = createService();

    tenantContext.client.prescription.findMany.mockResolvedValue([
      {
        id: 'presc-1',
        residentId: 'res-1',
        medications: [
          {
            id: 'med-1',
            startDate: new Date('2026-02-01T12:00:00.000Z'),
            endDate: null,
            createdAt: new Date('2026-02-03T08:00:00.000Z'),
            scheduledTimes: ['08:00', '20:00'],
          },
        ],
      },
    ]);
    tenantContext.client.medicationAdministration.findMany.mockResolvedValue([]);

    const counts = await (service as any).getMedicationsCountByDay(
      new Date('2026-02-01T00:00:00.000Z'),
      new Date('2026-02-04T23:59:59.999Z'),
    );

    expect(Object.keys(counts)).toEqual(['2026-02-03', '2026-02-04']);
    expect(counts['2026-02-03'].total).toBe(2);
    expect(counts['2026-02-04'].total).toBe(2);
  });
});
