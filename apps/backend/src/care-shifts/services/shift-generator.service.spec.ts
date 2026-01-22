import { Test, TestingModule } from '@nestjs/testing';
import { ShiftGeneratorService } from './shift-generator.service';
import { TenantContextService } from '../../prisma/tenant-context.service';

describe('ShiftGeneratorService - calculateWeekNumber', () => {
  let service: ShiftGeneratorService;
  let tenantContextService: TenantContextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftGeneratorService,
        {
          provide: TenantContextService,
          useValue: {
            tenantId: 'test-tenant-id',
            client: {},
          },
        },
      ],
    }).compile();

    // Use resolve() for REQUEST-scoped providers
    service = await module.resolve<ShiftGeneratorService>(
      ShiftGeneratorService,
    );
    tenantContextService = module.get<TenantContextService>(
      TenantContextService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateWeekNumber - 1 week cycle (semanal)', () => {
    it('should always return 0 for 1-week pattern', () => {
      const startDate = new Date('2026-01-19'); // Domingo

      // Primeira semana
      expect(service['calculateWeekNumber'](new Date('2026-01-19'), startDate, 1)).toBe(0);
      expect(service['calculateWeekNumber'](new Date('2026-01-25'), startDate, 1)).toBe(0);

      // Segunda semana (deve resetar para 0)
      expect(service['calculateWeekNumber'](new Date('2026-01-26'), startDate, 1)).toBe(0);

      // Terceira semana
      expect(service['calculateWeekNumber'](new Date('2026-02-02'), startDate, 1)).toBe(0);
    });
  });

  describe('calculateWeekNumber - 2 weeks cycle (quinzenal)', () => {
    it('should return 0 for first week', () => {
      const startDate = new Date('2026-01-19'); // Domingo
      const date = new Date('2026-01-19'); // Mesmo dia
      const result = service['calculateWeekNumber'](date, startDate, 2);
      expect(result).toBe(0);
    });

    it('should return 0 for dates within first week', () => {
      const startDate = new Date('2026-01-19'); // Domingo

      expect(service['calculateWeekNumber'](new Date('2026-01-20'), startDate, 2)).toBe(0); // Segunda
      expect(service['calculateWeekNumber'](new Date('2026-01-25'), startDate, 2)).toBe(0); // Sábado
    });

    it('should return 1 for second week in 2-week cycle', () => {
      const startDate = new Date('2026-01-19');
      const date = new Date('2026-01-26'); // 7 dias depois
      const result = service['calculateWeekNumber'](date, startDate, 2);
      expect(result).toBe(1);
    });

    it('should cycle back to 0 after 2 weeks', () => {
      const startDate = new Date('2026-01-19');
      const date = new Date('2026-02-02'); // 14 dias depois
      const result = service['calculateWeekNumber'](date, startDate, 2);
      expect(result).toBe(0);
    });

    it('should continue cycling correctly', () => {
      const startDate = new Date('2026-01-19');

      // Ciclo 1: Semana 0 e 1
      expect(service['calculateWeekNumber'](new Date('2026-01-19'), startDate, 2)).toBe(0);
      expect(service['calculateWeekNumber'](new Date('2026-01-26'), startDate, 2)).toBe(1);

      // Ciclo 2: Semana 0 e 1
      expect(service['calculateWeekNumber'](new Date('2026-02-02'), startDate, 2)).toBe(0);
      expect(service['calculateWeekNumber'](new Date('2026-02-09'), startDate, 2)).toBe(1);

      // Ciclo 3: Semana 0 e 1
      expect(service['calculateWeekNumber'](new Date('2026-02-16'), startDate, 2)).toBe(0);
      expect(service['calculateWeekNumber'](new Date('2026-02-23'), startDate, 2)).toBe(1);
    });
  });

  describe('calculateWeekNumber - 3 weeks cycle (tri-semanal)', () => {
    it('should cycle through weeks 0, 1, 2 correctly', () => {
      const startDate = new Date('2026-01-19');

      // Ciclo 1
      expect(service['calculateWeekNumber'](new Date('2026-01-19'), startDate, 3)).toBe(0); // Week 0
      expect(service['calculateWeekNumber'](new Date('2026-01-26'), startDate, 3)).toBe(1); // Week 1
      expect(service['calculateWeekNumber'](new Date('2026-02-02'), startDate, 3)).toBe(2); // Week 2

      // Ciclo 2 (reinicia)
      expect(service['calculateWeekNumber'](new Date('2026-02-09'), startDate, 3)).toBe(0); // Back to 0
      expect(service['calculateWeekNumber'](new Date('2026-02-16'), startDate, 3)).toBe(1);
      expect(service['calculateWeekNumber'](new Date('2026-02-23'), startDate, 3)).toBe(2);
    });
  });

  describe('calculateWeekNumber - 4 weeks cycle (mensal)', () => {
    it('should cycle through weeks 0, 1, 2, 3 correctly', () => {
      const startDate = new Date('2026-01-19');

      // Ciclo 1
      expect(service['calculateWeekNumber'](new Date('2026-01-19'), startDate, 4)).toBe(0); // Week 0
      expect(service['calculateWeekNumber'](new Date('2026-01-26'), startDate, 4)).toBe(1); // Week 1
      expect(service['calculateWeekNumber'](new Date('2026-02-02'), startDate, 4)).toBe(2); // Week 2
      expect(service['calculateWeekNumber'](new Date('2026-02-09'), startDate, 4)).toBe(3); // Week 3

      // Ciclo 2 (reinicia)
      expect(service['calculateWeekNumber'](new Date('2026-02-16'), startDate, 4)).toBe(0); // Back to 0
      expect(service['calculateWeekNumber'](new Date('2026-02-23'), startDate, 4)).toBe(1);
      expect(service['calculateWeekNumber'](new Date('2026-03-02'), startDate, 4)).toBe(2);
      expect(service['calculateWeekNumber'](new Date('2026-03-09'), startDate, 4)).toBe(3);
    });
  });

  describe('calculateWeekNumber - edge cases', () => {
    it('should handle same day as start date', () => {
      const startDate = new Date('2026-01-19');
      expect(service['calculateWeekNumber'](startDate, startDate, 2)).toBe(0);
    });

    it('should handle date exactly 1 week after start', () => {
      const startDate = new Date('2026-01-19');
      const oneWeekLater = new Date('2026-01-26');
      expect(service['calculateWeekNumber'](oneWeekLater, startDate, 2)).toBe(1);
    });

    it('should handle different start days of week', () => {
      // Começando na Quarta (2026-01-21)
      const startDate = new Date('2026-01-21');

      expect(service['calculateWeekNumber'](new Date('2026-01-21'), startDate, 2)).toBe(0); // Quarta semana 0
      expect(service['calculateWeekNumber'](new Date('2026-01-28'), startDate, 2)).toBe(1); // Quarta semana 1
      expect(service['calculateWeekNumber'](new Date('2026-02-04'), startDate, 2)).toBe(0); // Quarta semana 0 novamente
    });

    it('should handle dates far in the future', () => {
      const startDate = new Date('2026-01-19');

      // 100 semanas depois (50 ciclos de 2 semanas) - deve ser 0
      const hundredWeeksLater = new Date('2027-12-06');
      expect(service['calculateWeekNumber'](hundredWeeksLater, startDate, 2)).toBe(0);
    });
  });
});
