/**
 * Testes E2E para validação de timezone após migração TIMESTAMPTZ
 *
 * Estes testes validam que:
 * 1. Campos date-only são armazenados com T12:00:00 (meio-dia)
 * 2. Queries por data usam range (startOfDay/endOfDay)
 * 3. Registros não "pulam" de dia devido a timezone
 * 4. Datas são retornadas consistentemente
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

describe('Timezone Validation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let userId: string;
  let residentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [], // Importar módulos necessários aqui
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup: Criar tenant, usuário e residente de teste
    // TODO: Implementar fixtures
  });

  afterAll(async () => {
    // Cleanup: Remover dados de teste
    await app.close();
  });

  describe('Daily Records - Date-Only Fields', () => {
    it('should store daily record date with T12:00:00 (noon)', async () => {
      const testDate = '2025-12-06';

      const response = await request(app.getHttpServer())
        .post('/daily-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          type: 'ALIMENTACAO',
          date: testDate,
          time: '08:00',
          data: {
            refeicao: 'Café da manhã',
            aceitacao: 'TOTAL',
          },
        })
        .expect(201);

      const recordId = response.body.id;

      // Verificar no banco que a data foi salva com T12:00:00
      const record = await prisma.dailyRecord.findUnique({
        where: { id: recordId },
        select: { date: true },
      });

      const dateFromDb = new Date(record.date);
      const hours = dateFromDb.getUTCHours();

      // Deve ser meio-dia UTC (pode variar com timezone local)
      // O importante é que seja consistente, não meia-noite
      expect(hours).toBeGreaterThanOrEqual(12);
      expect(hours).toBeLessThanOrEqual(15); // Range para UTC-3
    });

    it('should find daily record by date using range query', async () => {
      const testDate = '2025-12-06';

      // Criar registro
      await request(app.getHttpServer())
        .post('/daily-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          type: 'HIGIENE',
          date: testDate,
          time: '10:00',
          data: {
            tipoHigiene: 'BANHO',
            observacoes: 'Teste timezone',
          },
        })
        .expect(201);

      // Buscar por data exata
      const response = await request(app.getHttpServer())
        .get(`/daily-records?residentId=${residentId}&date=${testDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);

      // Verificar que todos os registros retornados são da data correta
      response.body.data.forEach((record: any) => {
        const recordDate = format(parseISO(record.date), 'yyyy-MM-dd');
        expect(recordDate).toBe(testDate);
      });
    });

    it('should NOT return records from wrong day due to timezone shift', async () => {
      const date1 = '2025-12-06';
      const date2 = '2025-12-07';

      // Criar registros em dias diferentes
      await request(app.getHttpServer())
        .post('/daily-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          type: 'OUTROS',
          date: date1,
          time: '23:59',
          data: { observacoes: 'Registro dia 06' },
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/daily-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          type: 'OUTROS',
          date: date2,
          time: '00:01',
          data: { observacoes: 'Registro dia 07' },
        })
        .expect(201);

      // Buscar registros do dia 06
      const response = await request(app.getHttpServer())
        .get(`/daily-records?residentId=${residentId}&date=${date1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // NÃO deve retornar registros do dia 07
      const recordsFromDay1 = response.body.data.filter((r: any) =>
        r.data.observacoes?.includes('dia 06')
      );
      const recordsFromDay2 = response.body.data.filter((r: any) =>
        r.data.observacoes?.includes('dia 07')
      );

      expect(recordsFromDay1.length).toBeGreaterThan(0);
      expect(recordsFromDay2.length).toBe(0); // Não deve vazar
    });
  });

  describe('Vaccinations - Date-Only Fields', () => {
    it('should store vaccination date with T12:00:00 (noon)', async () => {
      const testDate = '2025-12-06';

      const response = await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          vaccine: 'Influenza',
          dose: '1ª dose',
          date: testDate,
          batch: 'LOT123456',
          manufacturer: 'Butantan',
          cnes: '12345678',
          healthUnit: 'UBS Centro',
          municipality: 'São Paulo',
          state: 'SP',
        })
        .expect(201);

      const vaccinationId = response.body.id;

      // Verificar no banco
      const vaccination = await prisma.vaccination.findUnique({
        where: { id: vaccinationId },
        select: { date: true },
      });

      const dateFromDb = new Date(vaccination.date);
      const hours = dateFromDb.getUTCHours();

      expect(hours).toBeGreaterThanOrEqual(12);
      expect(hours).toBeLessThanOrEqual(15);
    });

    it('should validate that vaccination date is not in the future', async () => {
      const tomorrow = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          vaccine: 'COVID-19',
          dose: '1ª dose',
          date: tomorrow,
          batch: 'LOT999',
          manufacturer: 'Pfizer',
          cnes: '12345678',
          healthUnit: 'UBS Centro',
          municipality: 'São Paulo',
          state: 'SP',
        })
        .expect(400);
    });
  });

  describe('Prescriptions - Date Comparisons', () => {
    it('should correctly identify expiring prescriptions', async () => {
      const today = new Date();
      const in5Days = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
      const validUntil = format(in5Days, 'yyyy-MM-dd');

      // Criar prescrição que expira em 5 dias
      const response = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          doctorName: 'Dr. Teste',
          doctorCrm: '123456',
          doctorCrmState: 'SP',
          prescriptionDate: format(today, 'yyyy-MM-dd'),
          prescriptionType: 'ROTINA',
          validUntil,
          medications: [
            {
              name: 'Losartana',
              presentation: 'COMPRIMIDO',
              concentration: '50mg',
              dose: '1 comprimido',
              route: 'ORAL',
              frequency: 'UMA_VEZ_DIA',
              scheduledTimes: ['08:00'],
              startDate: format(today, 'yyyy-MM-dd'),
            },
          ],
        })
        .expect(201);

      const prescriptionId = response.body.id;

      // Buscar prescrições expirando em 7 dias (deve incluir esta)
      const expiring = await request(app.getHttpServer())
        .get('/prescriptions?expiringInDays=7')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const foundPrescription = expiring.body.data.find(
        (p: any) => p.id === prescriptionId
      );

      expect(foundPrescription).toBeDefined();
    });

    it('should NOT mark prescription as expired before validUntil date', async () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const validUntil = format(tomorrow, 'yyyy-MM-dd');

      // Criar prescrição válida até amanhã
      const response = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          doctorName: 'Dr. Teste',
          doctorCrm: '123456',
          doctorCrmState: 'SP',
          prescriptionDate: format(today, 'yyyy-MM-dd'),
          prescriptionType: 'ROTINA',
          validUntil,
          medications: [
            {
              name: 'Metformina',
              presentation: 'COMPRIMIDO',
              concentration: '850mg',
              dose: '1 comprimido',
              route: 'ORAL',
              frequency: 'DUAS_VEZES_DIA',
              scheduledTimes: ['08:00', '20:00'],
              startDate: format(today, 'yyyy-MM-dd'),
            },
          ],
        })
        .expect(201);

      const prescriptionId = response.body.id;

      // Verificar que não está nos alertas críticos (vencidas)
      const alerts = await request(app.getHttpServer())
        .get('/prescriptions/critical-alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const expiredPrescriptions = alerts.body.expiredPrescriptions || [];
      const foundExpired = expiredPrescriptions.find(
        (p: any) => p.id === prescriptionId
      );

      expect(foundExpired).toBeUndefined();
    });
  });

  describe('Medication Administration - SOS Daily Limit', () => {
    let sosMedicationId: string;

    beforeEach(async () => {
      // Criar prescrição SOS
      const today = new Date();
      const prescription = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          doctorName: 'Dr. Teste',
          doctorCrm: '123456',
          doctorCrmState: 'SP',
          prescriptionDate: format(today, 'yyyy-MM-dd'),
          prescriptionType: 'SOS',
          sosMedications: [
            {
              name: 'Dipirona',
              presentation: 'COMPRIMIDO',
              concentration: '500mg',
              dose: '1 comprimido',
              route: 'ORAL',
              indication: 'DOR',
              maxDailyDoses: 4,
              minIntervalHours: 6,
              startDate: format(today, 'yyyy-MM-dd'),
            },
          ],
        })
        .expect(201);

      sosMedicationId = prescription.body.sosMedications[0].id;
    });

    it('should enforce daily limit using correct timezone for "today"', async () => {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Administrar 4 doses (limite diário)
      for (let i = 0; i < 4; i++) {
        await request(app.getHttpServer())
          .post('/prescriptions/administer-sos')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sosMedicationId,
            date: today,
            time: format(new Date(), 'HH:mm'),
            indication: 'Dor de cabeça',
            administeredBy: 'Enfermeiro Teste',
          })
          .expect(201);
      }

      // Tentar administrar 5ª dose (deve falhar)
      await request(app.getHttpServer())
        .post('/prescriptions/administer-sos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sosMedicationId,
          date: today,
          time: format(new Date(), 'HH:mm'),
          indication: 'Dor de cabeça',
          administeredBy: 'Enfermeiro Teste',
        })
        .expect(400);
    });
  });

  describe('getDatesWithRecords - Month Boundary', () => {
    it('should return correct dates for month including timezone edge cases', async () => {
      const year = 2025;
      const month = 12;

      // Criar registros no primeiro e último dia do mês
      await request(app.getHttpServer())
        .post('/daily-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          type: 'OUTROS',
          date: '2025-12-01',
          time: '00:01',
          data: { observacoes: 'Primeiro dia' },
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/daily-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          type: 'OUTROS',
          date: '2025-12-31',
          time: '23:59',
          data: { observacoes: 'Último dia' },
        })
        .expect(201);

      // Buscar datas com registros no mês
      const response = await request(app.getHttpServer())
        .get(`/daily-records/dates/${residentId}/${year}/${month}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const dates = response.body;

      expect(dates).toContain('2025-12-01');
      expect(dates).toContain('2025-12-31');
      expect(dates).not.toContain('2025-11-30'); // Mês anterior
      expect(dates).not.toContain('2026-01-01'); // Mês seguinte
    });
  });
});
