/**
 * Testes E2E - Sistema de Versionamento de Prescriptions
 *
 * Valida conformidade com:
 * - RDC 502/2021 Art. 39 (ANVISA) - Versionamento de prontuários
 * - LGPD Art. 5º, II - Proteção de dados sensíveis de saúde
 * - LGPD Art. 46 - Medidas técnicas de segurança
 * - LGPD Art. 48 - Rastreabilidade e auditoria
 *
 * Cobertura de Testes:
 * 1. CREATE (5 testes) - Versão inicial + tipos específicos
 * 2. UPDATE (10 testes) - Atualização com histórico
 * 3. DELETE (8 testes) - Soft delete com auditoria
 * 4. HISTORY (6 testes) - Consulta de histórico completo
 * 5. ATOMICITY (3 testes) - Integridade transacional
 * 6. COMPLIANCE (4 testes) - Conformidade regulatória
 * 7. TIPOS DE PRESCRIÇÕES (10 testes) - Validação por tipo
 *
 * Total: 46 testes
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Prescription Versioning System (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let userId: string;
  let residentId: string;

  // Helper: Setup do ambiente de teste
  const setupTestEnvironment = async () => {
    // Criar tenant de teste isolado com timestamp para garantir unicidade
    const timestamp = Date.now();
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Facility Prescriptions',
        slug: `test-facility-prescriptions-e2e-${timestamp}`,
        schemaName: `test_prescriptions_${timestamp}`,
        cnpj: `${timestamp.toString().padStart(14, '0')}`,
        email: `test-prescriptions-${timestamp}@example.com`,
        phone: '11999999999',
        addressStreet: 'Test Street',
        addressNumber: '123',
        addressDistrict: 'Test',
        addressCity: 'São Paulo',
        addressState: 'SP',
        addressZipCode: '01234567',
      },
    });
    tenantId = tenant.id;

    // Criar usuário de teste
    const testEmail = `prescription-test-${timestamp}@example.com`;
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: testEmail,
        password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
        name: 'Prescription Test User',
        role: 'ADMIN',
      },
    });
    userId = user.id;

    // Criar perfil de usuário com permissões completas
    const userProfile = await prisma.userProfile.create({
      data: {
        userId,
        tenantId,
        createdBy: userId,
      },
    });

    // Conceder todas as permissões de prescrições
    await prisma.userPermission.createMany({
      data: [
        { userProfileId: userProfile.id, tenantId, permission: 'VIEW_PRESCRIPTIONS', grantedBy: userId },
        { userProfileId: userProfile.id, tenantId, permission: 'CREATE_PRESCRIPTIONS', grantedBy: userId },
        { userProfileId: userProfile.id, tenantId, permission: 'UPDATE_PRESCRIPTIONS', grantedBy: userId },
        { userProfileId: userProfile.id, tenantId, permission: 'DELETE_PRESCRIPTIONS', grantedBy: userId },
        { userProfileId: userProfile.id, tenantId, permission: 'VIEW_RESIDENTS', grantedBy: userId },
      ],
    });

    // Criar residente de teste
    const resident = await prisma.resident.create({
      data: {
        tenantId,
        fullName: 'Test Resident Prescription',
        cpf: '98765432100',
        rg: '123456789',
        birthDate: new Date('1950-01-15'),
        gender: 'MASCULINO',
        civilStatus: 'SOLTEIRO',
        bloodType: 'A_POSITIVO',
        status: 'Ativo',
        admissionDate: new Date('2024-01-01'),
        bedId: null,
        createdBy: userId,
      },
    });
    residentId = resident.id;

    // Debug: Verificar usuário criado
    const createdUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: testEmail,
        },
      },
    });
    console.log('✓ User created:', {
      id: createdUser?.id,
      email: createdUser?.email,
      isActive: createdUser?.isActive,
      hasPassword: !!createdUser?.password,
    });

    // Autenticar e obter token JWT
    const authResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: 'test123',
      });

    console.log('✓ Auth response:', {
      status: authResponse.status,
      hasAccessToken: !!authResponse.body?.accessToken,
      hasAccessTokenUnderscore: !!authResponse.body?.access_token,
      requiresTenantSelection: authResponse.body?.requiresTenantSelection,
      error: authResponse.body?.message,
    });

    if (authResponse.status !== 200) {
      throw new Error(`Authentication failed with status ${authResponse.status}: ${JSON.stringify(authResponse.body)}`);
    }

    // O campo é accessToken (camelCase), não access_token
    authToken = authResponse.body.accessToken;
  };

  // Helper: Cleanup do ambiente de teste
  const cleanupTestEnvironment = async () => {
    if (tenantId) {
      // Deletar medications primeiro (por causa da FK createdBy)
      await prisma.medication.deleteMany({
        where: {
          prescription: {
            tenantId,
          },
        },
      });

      // Cascade delete irá remover os demais registros relacionados
      await prisma.tenant.delete({
        where: { id: tenantId },
      });
    }
  };

  // Helper: Criar prescrição de teste
  const createTestPrescription = async (overrides = {}) => {
    return request(app.getHttpServer())
      .post('/prescriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        residentId,
        doctorName: 'Dr. João Silva',
        doctorCrm: '123456',
        doctorCrmState: 'SP',
        prescriptionDate: '2025-01-01',
        prescriptionType: 'ROTINA',
        validUntil: '2025-06-01',
        medications: [
          {
            name: 'Dipirona',
            presentation: 'COMPRIMIDO',
            concentration: '500mg',
            dose: '1 cp',
            route: 'VO',
            frequency: 'OITO_OITO_H',
            scheduledTimes: ['08:00', '16:00', '00:00'],
            startDate: '2025-01-01',
          },
        ],
        sosMedications: [],
        ...overrides,
      });
  };

  // =============================================================================
  // SETUP & TEARDOWN
  // =============================================================================

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
    await app.close();
  });

  // =============================================================================
  // 1. CREATE - Versão Inicial (5 testes)
  // =============================================================================

  describe('1. CREATE - Versão Inicial', () => {
    it('1.1 Deve criar prescrição com versionNumber=1', async () => {
      const response = await createTestPrescription();

      // Debug: Log do erro se não for 201
      if (response.status !== 201) {
        console.log('❌ CREATE failed:', {
          status: response.status,
          body: response.body,
          error: response.body?.message,
        });
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.versionNumber).toBe(1);
      expect(response.body.createdBy).toBe(userId);
      expect(response.body.updatedBy).toBeNull();
    });

    it('1.2 Deve criar entrada de histórico com changeType=CREATE', async () => {
      const prescription = await createTestPrescription();

      const history = await prisma.prescriptionHistory.findFirst({
        where: {
          prescriptionId: prescription.body.id,
          versionNumber: 1,
        },
      });

      expect(history).toBeDefined();
      expect(history?.changeType).toBe('CREATE');
      expect(history?.changeReason).toBe('Criação inicial da prescrição médica');
      expect(history?.previousData).toBeNull();
      expect(history?.newData).toBeDefined();
    });

    it('1.3 Deve criar prescrição do tipo ANTIBIOTICO', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'ANTIBIOTICO',
      });

      expect(response.status).toBe(201);
      expect(response.body.prescriptionType).toBe('ANTIBIOTICO');
    });

    it('1.4 Deve criar prescrição do tipo CONTROLADO com classe', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'CONTROLADO',
        controlledClass: 'BZD',
        notificationNumber: 'A12345678',
        notificationType: 'AMARELA',
        prescriptionImageUrl: 'https://example.com/prescription-bzd.jpg',
      });

      expect(response.status).toBe(201);
      expect(response.body.prescriptionType).toBe('CONTROLADO');
      expect(response.body.controlledClass).toBe('BZD');
    });

    it('1.5 Deve criar prescrição do tipo ALTO_RISCO', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'ALTO_RISCO',
      });

      expect(response.status).toBe(201);
      expect(response.body.prescriptionType).toBe('ALTO_RISCO');
    });
  });

  // =============================================================================
  // 2. UPDATE - Atualização com Histórico (10 testes)
  // =============================================================================

  describe('2. UPDATE - Atualização com Histórico', () => {
    let prescriptionId: string;

    beforeEach(async () => {
      const response = await createTestPrescription();
      prescriptionId = response.body.id;
    });

    it('2.1 Deve rejeitar update sem changeReason', async () => {
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          validUntil: '2025-12-31',
        })
        .expect(400);
    });

    it('2.2 Deve rejeitar changeReason com menos de 10 caracteres', async () => {
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'curto',
          validUntil: '2025-12-31',
        })
        .expect(400);
    });

    it('2.3 Deve atualizar prescrição e incrementar versionNumber', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Atualização de data de validade conforme nova receita',
          validUntil: '2025-12-31',
        })
        .expect(200);

      expect(response.body.versionNumber).toBe(2);
      expect(response.body.validUntil).toBe('2025-12-31');
      expect(response.body.updatedBy).toBe(userId);
    });

    it('2.4 Deve criar entrada de histórico com changeType=UPDATE', async () => {
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Correção de data de revisão médica agendada',
          reviewDate: '2025-03-15',
        })
        .expect(200);

      const history = await prisma.prescriptionHistory.findFirst({
        where: {
          prescriptionId,
          versionNumber: 2,
        },
      });

      expect(history).toBeDefined();
      expect(history?.changeType).toBe('UPDATE');
      expect(history?.changeReason).toContain('Correção de data');
      expect(history?.previousData).toBeDefined();
      expect(history?.newData).toBeDefined();
    });

    it('2.5 Deve registrar campos alterados (changedFields)', async () => {
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Atualização de observações médicas importantes',
          notes: 'Paciente apresenta alergia a dipirona',
        })
        .expect(200);

      const history = await prisma.prescriptionHistory.findFirst({
        where: {
          prescriptionId,
          versionNumber: 2,
        },
      });

      expect(history?.changedFields).toContain('notes');
    });

    it('2.6 Deve suportar múltiplas atualizações sequenciais', async () => {
      // Update 1
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Primeira atualização de dados cadastrais',
          notes: 'Nota 1',
        })
        .expect(200);

      // Update 2
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Segunda atualização de dados cadastrais',
          notes: 'Nota 2',
        })
        .expect(200);

      // Update 3
      const response = await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Terceira atualização de dados cadastrais',
          notes: 'Nota 3',
        })
        .expect(200);

      expect(response.body.versionNumber).toBe(4); // 1 (CREATE) + 3 (UPDATEs)
    });

    it('2.7 Deve atualizar isActive para false', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Desativação de prescrição vencida ou substituída',
          isActive: false,
        })
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });

    it('2.8 Deve preservar previousData e newData completos', async () => {
      const beforeUpdate = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
      });

      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Atualização para validação de snapshots',
          validUntil: '2026-01-01',
        })
        .expect(200);

      const history = await prisma.prescriptionHistory.findFirst({
        where: {
          prescriptionId,
          versionNumber: 2,
        },
      });

      // previousData e newData são JSON, então datas são serializadas como strings ISO
      expect(history?.previousData).toMatchObject({
        validUntil: beforeUpdate?.validUntil?.toISOString(),
      });
      expect(history?.newData).toMatchObject({
        validUntil: '2026-01-01T00:00:00.000Z',
      });
    });

    it('2.9 Deve registrar IP e User Agent se fornecidos', async () => {
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Update com metadados de auditoria completos',
          notes: 'Teste de auditoria',
        })
        .expect(200);

      const history = await prisma.prescriptionHistory.findFirst({
        where: {
          prescriptionId,
          versionNumber: 2,
        },
      });

      // IP e User Agent podem ser null, mas campos devem existir
      expect(history).toHaveProperty('ipAddress');
      expect(history).toHaveProperty('userAgent');
    });

    it('2.10 Deve validar isolamento multi-tenant no update', async () => {
      // Criar plan básico para testes
      const testPlan = await prisma.plan.create({
        data: {
          name: `test-plan-${Date.now()}`,
          displayName: 'Test Plan',
          type: 'BASICO',
          maxResidents: 100,
          maxUsers: 10,
          features: {},
        },
      });

      // Criar outro tenant e usuário
      const tenant2 = await prisma.tenant.create({
        data: {
          name: 'Other Tenant',
          slug: `other-tenant-e2e-${Date.now()}`,
          schemaName: `other_tenant_${Date.now()}`,
          cnpj: `99${Date.now().toString().slice(-12)}`,
          email: 'other@example.com',
          phone: '11888888888',
          addressStreet: 'Other Street',
          addressNumber: '456',
          addressDistrict: 'Other',
          addressCity: 'Rio de Janeiro',
          addressState: 'RJ',
          addressZipCode: '98765432',
        },
      });

      // Criar subscription ativa para o tenant2
      await prisma.subscription.create({
        data: {
          tenantId: tenant2.id,
          planId: testPlan.id,
          status: 'active',
          startDate: new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        },
      });

      const user2 = await prisma.user.create({
        data: {
          tenantId: tenant2.id,
          email: 'other-user@example.com',
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Other User',
          role: 'ADMIN',
        },
      });

      const userProfile2 = await prisma.userProfile.create({
        data: { userId: user2.id, tenantId: tenant2.id, createdBy: user2.id },
      });

      await prisma.userPermission.createMany({
        data: [
          { userProfileId: userProfile2.id, tenantId: tenant2.id, permission: 'VIEW_PRESCRIPTIONS', grantedBy: user2.id },
          { userProfileId: userProfile2.id, tenantId: tenant2.id, permission: 'CREATE_PRESCRIPTIONS', grantedBy: user2.id },
          { userProfileId: userProfile2.id, tenantId: tenant2.id, permission: 'UPDATE_PRESCRIPTIONS', grantedBy: user2.id },
        ],
      });

      const authResponse2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'other-user@example.com',
          password: 'test123',
        })
        .expect(200);

      // Se requer seleção de tenant, fazer o segundo request
      let token2: string;
      if (authResponse2.body.requiresTenantSelection) {
        const selectTenantResponse = await request(app.getHttpServer())
          .post('/auth/select-tenant')
          .send({
            email: 'other-user@example.com',
            password: 'test123',
            tenantId: tenant2.id,
          })
          .expect(200);

        token2 = selectTenantResponse.body.accessToken;
      } else {
        token2 = authResponse2.body.accessToken;
      }

      // Tentar atualizar prescrição de outro tenant
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({
          changeReason: 'Tentativa de atualização cross-tenant',
          notes: 'Isso não deveria funcionar',
        })
        .expect(404); // Prescrição não encontrada para este tenant

      // Cleanup
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    });
  });

  // =============================================================================
  // 3. DELETE - Soft Delete com Auditoria (8 testes)
  // =============================================================================

  describe('3. DELETE - Soft Delete com Auditoria', () => {
    let prescriptionId: string;

    beforeEach(async () => {
      const response = await createTestPrescription();
      prescriptionId = response.body.id;
    });

    it('3.1 Deve rejeitar delete sem deleteReason', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('3.2 Deve rejeitar deleteReason com menos de 10 caracteres', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'curto',
        })
        .expect(400);
    });

    it('3.3 Deve realizar soft delete com deletedAt', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Prescrição duplicada acidentalmente no sistema',
        })
        .expect(200);

      const deleted = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
      });

      expect(deleted).toBeDefined();
      expect(deleted?.deletedAt).toBeDefined();
      expect(deleted?.deletedAt).toBeInstanceOf(Date);
    });

    it('3.4 Deve incrementar versionNumber no delete', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Exclusão para teste de versionamento automático',
        })
        .expect(200);

      const deleted = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
      });

      expect(deleted?.versionNumber).toBe(2); // 1 (CREATE) + 1 (DELETE)
    });

    it('3.5 Deve criar entrada de histórico com changeType=DELETE', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Teste de registro de auditoria de exclusão',
        })
        .expect(200);

      const history = await prisma.prescriptionHistory.findFirst({
        where: {
          prescriptionId,
          changeType: 'DELETE',
        },
      });

      expect(history).toBeDefined();
      expect(history?.changeReason).toContain('Teste de registro');
      expect(history?.changedFields).toContain('deletedAt');
    });

    it('3.6 Não deve retornar prescrição deletada no findAll', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Teste de exclusão lógica de registros',
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/prescriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const found = response.body.data.find((p: any) => p.id === prescriptionId);
      expect(found).toBeUndefined();
    });

    it('3.7 Não deve retornar prescrição deletada no findOne', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Teste de visibilidade de registros excluídos',
        })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('3.8 Deve permitir acesso ao histórico mesmo após delete', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Teste de preservação de histórico após exclusão',
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.history).toHaveLength(2); // CREATE + DELETE
      expect(response.body.totalVersions).toBe(2);
    });
  });

  // =============================================================================
  // 4. HISTORY - Consulta de Histórico (6 testes)
  // =============================================================================

  describe('4. HISTORY - Consulta de Histórico', () => {
    let prescriptionId: string;

    beforeEach(async () => {
      const response = await createTestPrescription();
      prescriptionId = response.body.id;
    });

    it('4.1 Deve retornar histórico completo', async () => {
      const response = await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('prescription');
      expect(response.body).toHaveProperty('history');
      expect(response.body).toHaveProperty('totalVersions');
      expect(response.body.history).toHaveLength(1); // CREATE
    });

    it('4.2 Deve ordenar histórico por versionNumber DESC', async () => {
      // Criar 3 updates
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .patch(`/prescriptions/${prescriptionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            changeReason: `Update número ${i} para teste de ordenação`,
            notes: `Nota ${i}`,
          })
          .expect(200);
      }

      const response = await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.history).toHaveLength(4); // 1 CREATE + 3 UPDATEs
      expect(response.body.history[0].versionNumber).toBe(4);
      expect(response.body.history[1].versionNumber).toBe(3);
      expect(response.body.history[2].versionNumber).toBe(2);
      expect(response.body.history[3].versionNumber).toBe(1);
    });

    it('4.3 Deve incluir dados do usuário (changedBy)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.history[0].changedBy).toHaveProperty('id');
      expect(response.body.history[0].changedBy).toHaveProperty('name');
      expect(response.body.history[0].changedBy).toHaveProperty('email');
    });

    it('4.4 Deve retornar versão específica do histórico', async () => {
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Update para teste de consulta de versão específica',
          notes: 'Nota de teste',
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/history/2`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.versionNumber).toBe(2);
      expect(response.body.changeType).toBe('UPDATE');
      expect(response.body).toHaveProperty('previousData');
      expect(response.body).toHaveProperty('newData');
    });

    it('4.5 Deve retornar 404 para versão inexistente', async () => {
      await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/history/999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('4.6 Deve validar isolamento multi-tenant no histórico', async () => {
      // Criar plan básico para testes
      const testPlan = await prisma.plan.create({
        data: {
          name: `test-plan-history-${Date.now()}`,
          displayName: 'Test Plan History',
          type: 'BASICO',
          maxResidents: 100,
          maxUsers: 10,
          features: {},
        },
      });

      // Criar outro tenant e usuário
      const tenant2 = await prisma.tenant.create({
        data: {
          name: 'Other Tenant History',
          slug: `other-tenant-history-e2e-${Date.now()}`,
          schemaName: `other_history_${Date.now()}`,
          cnpj: `88${Date.now().toString().slice(-12)}`,
          email: 'other-history@example.com',
          phone: '11777777777',
          addressStreet: 'Other Street',
          addressNumber: '789',
          addressDistrict: 'Other',
          addressCity: 'Brasília',
          addressState: 'DF',
          addressZipCode: '87654321',
        },
      });

      // Criar subscription ativa para o tenant2
      await prisma.subscription.create({
        data: {
          tenantId: tenant2.id,
          planId: testPlan.id,
          status: 'active',
          startDate: new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
        },
      });

      const user2 = await prisma.user.create({
        data: {
          tenantId: tenant2.id,
          email: 'other-history-user@example.com',
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Other History User',
          role: 'ADMIN',
        },
      });

      const userProfile2 = await prisma.userProfile.create({
        data: { userId: user2.id, tenantId: tenant2.id, createdBy: user2.id },
      });

      await prisma.userPermission.createMany({
        data: [
          { userProfileId: userProfile2.id, tenantId: tenant2.id, permission: 'VIEW_PRESCRIPTIONS', grantedBy: user2.id },
          { userProfileId: userProfile2.id, tenantId: tenant2.id, permission: 'CREATE_PRESCRIPTIONS', grantedBy: user2.id },
        ],
      });

      const authResponse2 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'other-history-user@example.com',
          password: 'test123',
        })
        .expect(200);

      // Se requer seleção de tenant, fazer o segundo request
      let token2: string;
      if (authResponse2.body.requiresTenantSelection) {
        const selectTenantResponse = await request(app.getHttpServer())
          .post('/auth/select-tenant')
          .send({
            email: 'other-history-user@example.com',
            password: 'test123',
            tenantId: tenant2.id,
          })
          .expect(200);

        token2 = selectTenantResponse.body.accessToken;
      } else {
        token2 = authResponse2.body.accessToken;
      }

      // Tentar acessar histórico de outro tenant
      await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/history`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404);

      // Cleanup
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    });
  });

  // =============================================================================
  // 5. ATOMICITY - Integridade Transacional (3 testes)
  // =============================================================================

  describe('5. ATOMICITY - Integridade Transacional', () => {
    it('5.1 Deve garantir atomicidade em CREATE (prescrição + histórico)', async () => {
      const before = await prisma.prescription.count({
        where: { tenantId },
      });
      const beforeHistory = await prisma.prescriptionHistory.count({
        where: { tenantId },
      });

      await createTestPrescription();

      const after = await prisma.prescription.count({
        where: { tenantId },
      });
      const afterHistory = await prisma.prescriptionHistory.count({
        where: { tenantId },
      });

      expect(after - before).toBe(1);
      expect(afterHistory - beforeHistory).toBe(1);
    });

    it('5.2 Deve garantir atomicidade em UPDATE (prescrição + histórico)', async () => {
      const prescription = await createTestPrescription();
      const prescriptionId = prescription.body.id;

      const beforeHistory = await prisma.prescriptionHistory.count({
        where: { prescriptionId },
      });

      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Teste de atomicidade transacional em update',
          notes: 'Nota de teste',
        })
        .expect(200);

      const afterHistory = await prisma.prescriptionHistory.count({
        where: { prescriptionId },
      });

      expect(afterHistory - beforeHistory).toBe(1);
    });

    it('5.3 Deve garantir atomicidade em DELETE (prescrição + histórico)', async () => {
      const prescription = await createTestPrescription();
      const prescriptionId = prescription.body.id;

      const beforeHistory = await prisma.prescriptionHistory.count({
        where: { prescriptionId },
      });

      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Teste de atomicidade transacional em delete',
        })
        .expect(200);

      const afterHistory = await prisma.prescriptionHistory.count({
        where: { prescriptionId },
      });

      expect(afterHistory - beforeHistory).toBe(1);
    });
  });

  // =============================================================================
  // 6. COMPLIANCE - Conformidade Regulatória (4 testes)
  // =============================================================================

  describe('6. COMPLIANCE - Conformidade Regulatória', () => {
    it('6.1 RDC 502/2021: Deve registrar todas alterações no histórico', async () => {
      const prescription = await createTestPrescription();
      const prescriptionId = prescription.body.id;

      // Realizar várias operações
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Primeira alteração para conformidade regulatória',
          notes: 'Nota 1',
        })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Segunda alteração para conformidade regulatória',
          notes: 'Nota 2',
        })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Exclusão para teste de conformidade regulatória',
        })
        .expect(200);

      const history = await prisma.prescriptionHistory.findMany({
        where: { prescriptionId },
        orderBy: { versionNumber: 'asc' },
      });

      expect(history).toHaveLength(4); // CREATE + 2 UPDATEs + DELETE
      expect(history[0].changeType).toBe('CREATE');
      expect(history[1].changeType).toBe('UPDATE');
      expect(history[2].changeType).toBe('UPDATE');
      expect(history[3].changeType).toBe('DELETE');
    });

    it('6.2 LGPD Art. 48: Deve garantir rastreabilidade completa', async () => {
      const prescription = await createTestPrescription();
      const prescriptionId = prescription.body.id;

      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Update para validação de rastreabilidade LGPD',
          notes: 'Teste LGPD',
        })
        .expect(200);

      const history = await prisma.prescriptionHistory.findMany({
        where: { prescriptionId },
        include: { user: true },
      });

      // Validar campos obrigatórios de rastreabilidade
      history.forEach((entry) => {
        expect(entry.changedAt).toBeInstanceOf(Date);
        expect(entry.changedBy).toBeDefined();
        expect(entry.user).toBeDefined();
        expect(entry.changeReason).toBeDefined();
        expect(entry.changeType).toBeDefined();
      });
    });

    it('6.3 Deve preservar dados imutáveis no histórico', async () => {
      const prescription = await createTestPrescription();
      const prescriptionId = prescription.body.id;

      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Update para teste de imutabilidade de histórico',
          notes: 'Nota original',
        })
        .expect(200);

      const historyBefore = await prisma.prescriptionHistory.findFirst({
        where: {
          prescriptionId,
          versionNumber: 2,
        },
      });

      // Tentar "modificar" prescrição novamente
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: 'Segunda alteração após primeira atualização',
          notes: 'Nota nova',
        })
        .expect(200);

      const historyAfter = await prisma.prescriptionHistory.findFirst({
        where: {
          prescriptionId,
          versionNumber: 2,
        },
      });

      // Histórico anterior deve permanecer inalterado
      expect(historyBefore).toEqual(historyAfter);
    });

    it('6.4 Deve validar changeReason mínimo de 10 caracteres', async () => {
      const prescription = await createTestPrescription();
      const prescriptionId = prescription.body.id;

      // Tentar com 9 caracteres
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: '123456789', // 9 chars
          notes: 'Teste',
        })
        .expect(400);

      // Aceitar com 10 caracteres
      await request(app.getHttpServer())
        .patch(`/prescriptions/${prescriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          changeReason: '1234567890', // 10 chars
          notes: 'Teste',
        })
        .expect(200);
    });
  });

  // =============================================================================
  // 7. TIPOS DE PRESCRIÇÕES - Validação por Tipo (10 testes)
  // =============================================================================

  describe('7. TIPOS DE PRESCRIÇÕES - Validação por Tipo', () => {
    it('7.1 ROTINA: Deve criar e versionar prescrição de rotina', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'ROTINA',
      });

      expect(response.status).toBe(201);
      expect(response.body.prescriptionType).toBe('ROTINA');
      expect(response.body.versionNumber).toBe(1);
    });

    it('7.2 ALTERACAO_PONTUAL: Deve criar prescrição pontual', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'ALTERACAO_PONTUAL',
      });

      expect(response.status).toBe(201);
      expect(response.body.prescriptionType).toBe('ALTERACAO_PONTUAL');
    });

    it('7.3 ANTIBIOTICO: Deve criar prescrição de antibiótico', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'ANTIBIOTICO',
      });

      expect(response.status).toBe(201);
      expect(response.body.prescriptionType).toBe('ANTIBIOTICO');
    });

    it('7.4 ALTO_RISCO: Deve criar prescrição de alto risco', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'ALTO_RISCO',
      });

      expect(response.status).toBe(201);
      expect(response.body.prescriptionType).toBe('ALTO_RISCO');
    });

    it('7.5 CONTROLADO: Deve criar prescrição de medicamento controlado', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'CONTROLADO',
        controlledClass: 'BZD',
        notificationNumber: 'A12345678',
        notificationType: 'AMARELA',
        prescriptionImageUrl: 'https://example.com/prescription-controlado.jpg',
      });

      expect(response.status).toBe(201);
      expect(response.body.prescriptionType).toBe('CONTROLADO');
      expect(response.body.controlledClass).toBe('BZD');
    });

    it('7.6 CONTROLADO: Deve exigir classe para controlados', async () => {
      const response = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          residentId,
          doctorName: 'Dr. João Silva',
          doctorCrm: '123456',
          doctorCrmState: 'SP',
          prescriptionDate: '2025-01-01',
          prescriptionType: 'CONTROLADO',
          // Falta controlledClass
          medications: [],
        });

      expect(response.status).toBe(400);
    });

    it('7.7 CONTROLADO: BZD - Benzodiazepínicos', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'CONTROLADO',
        controlledClass: 'BZD',
        notificationNumber: 'A98765432',
        notificationType: 'AMARELA',
        prescriptionImageUrl: 'https://example.com/prescription-bzd-2.jpg',
      });

      expect(response.body.controlledClass).toBe('BZD');
    });

    it('7.8 CONTROLADO: PSICOFARMACO - Psicofármacos', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'CONTROLADO',
        controlledClass: 'PSICOFARMACO',
        notificationNumber: 'A11111111',
        notificationType: 'AMARELA',
        prescriptionImageUrl: 'https://example.com/prescription-psico.jpg',
      });

      expect(response.body.controlledClass).toBe('PSICOFARMACO');
    });

    it('7.9 CONTROLADO: OPIOIDE - Opioides', async () => {
      const response = await createTestPrescription({
        prescriptionType: 'CONTROLADO',
        controlledClass: 'OPIOIDE',
        notificationNumber: 'A22222222',
        notificationType: 'AMARELA',
        prescriptionImageUrl: 'https://example.com/prescription-opioide.jpg',
      });

      expect(response.body.controlledClass).toBe('OPIOIDE');
    });

    it('7.10 Deve versionar todos os tipos de prescrição', async () => {
      const types = ['ROTINA', 'ANTIBIOTICO', 'ALTO_RISCO', 'CONTROLADO'];

      for (const type of types) {
        const extra = type === 'CONTROLADO'
          ? {
              controlledClass: 'BZD',
              notificationNumber: 'A33333333',
              notificationType: 'AMARELA',
              prescriptionImageUrl: 'https://example.com/prescription-controlado-v.jpg',
            }
          : {};

        const response = await createTestPrescription({
          prescriptionType: type,
          ...extra,
        });

        expect(response.status).toBe(201);
        expect(response.body.versionNumber).toBe(1);

        // Update e verificar versionamento
        await request(app.getHttpServer())
          .patch(`/prescriptions/${response.body.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            changeReason: `Update de prescrição do tipo ${type}`,
            notes: 'Teste de versionamento por tipo',
          })
          .expect(200);

        const updated = await prisma.prescription.findUnique({
          where: { id: response.body.id },
        });

        expect(updated?.versionNumber).toBe(2);
      }
    });
  });
});
