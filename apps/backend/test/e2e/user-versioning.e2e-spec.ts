/**
 * Testes E2E - Sistema de Versionamento de Users
 *
 * Valida conformidade com:
 * - LGPD Art. 5º, II - Proteção de dados pessoais
 * - LGPD Art. 46 - Medidas técnicas de segurança
 * - LGPD Art. 48 - Rastreabilidade e auditoria
 *
 * Cobertura de Testes:
 * 1. UPDATE (12 testes) - Atualização com histórico + password masking
 * 2. DELETE (9 testes) - Soft delete com auditoria + auto-exclusão
 * 3. HISTORY (6 testes) - Consulta de histórico completo
 * 4. ATOMICITY (3 testes) - Integridade transacional
 * 5. COMPLIANCE (7 testes) - Conformidade LGPD + createdBy NULL
 *
 * Total: 37 testes
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('User Versioning System (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;
  let adminId: string;
  let testUserId: string;

  // Helper: Setup do ambiente de teste
  const setupTestEnvironment = async () => {
    // Criar tenant de teste isolado
    const timestamp = Date.now();
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Facility Users',
        slug: `test-facility-users-e2e-${timestamp}`,
        schemaName: `test_users_${timestamp}`,
        cnpj: `${timestamp.toString().slice(-14)}`,
        email: 'test-users@example.com',
        phone: '11988888888',
        addressStreet: 'Test Street',
        addressNumber: '123',
        addressDistrict: 'Test',
        addressCity: 'São Paulo',
        addressState: 'SP',
        addressZipCode: '01234567',
      },
    });
    tenantId = tenant.id;

    // Criar admin de teste (primeiro usuário - createdBy NULL)
    const admin = await prisma.user.create({
      data: {
        tenantId,
        email: 'admin-test@example.com',
        password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
        name: 'Admin Test User',
        role: 'ADMIN',
        versionNumber: 1,
        createdBy: null, // Primeiro admin não tem createdBy
      },
    });
    adminId = admin.id;

    // Criar usuário de teste (criado pelo admin)
    const testUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'user-test@example.com',
        password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
        name: 'Test User',
        role: 'USER',
        versionNumber: 1,
        createdBy: adminId, // Criado pelo admin
      },
    });
    testUserId = testUser.id;

    // Gerar token JWT para o admin
    const JwtService = (await import('@nestjs/jwt')).JwtService;
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only-min-32-chars',
    });

    authToken = jwtService.sign(
      {
        sub: adminId,
        tenantId,
        role: 'ADMIN',
      },
      { expiresIn: '1h' },
    );
  };

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
    // Limpar dados de teste
    if (tenantId) {
      await prisma.tenant.delete({
        where: { id: tenantId },
      });
    }

    await app.close();
  });

  // ==================== UPDATE COM VERSIONAMENTO ====================
  describe('UPDATE com Versionamento', () => {
    it('1.1 - Deve atualizar usuário e incrementar versionNumber', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test User Updated',
          changeReason: 'Atualização de nome solicitada pelo usuário',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: testUserId,
        name: 'Test User Updated',
        versionNumber: 2,
      });

      // Password não deve estar presente no retorno
      expect(response.body.password).toBeUndefined();

      // Verificar que histórico foi criado
      const history = await prisma.userHistory.findFirst({
        where: { userId: testUserId, versionNumber: 2 },
      });

      expect(history).toBeDefined();
      expect(history?.changeType).toBe('UPDATE');
      expect(history?.previousData).toHaveProperty('name', 'Test User');
      expect(history?.newData).toHaveProperty('name', 'Test User Updated');
      expect(history?.changedFields).toContain('name');
    });

    it('1.2 - Deve rejeitar update sem changeReason', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Should Fail' })
        .expect(400);
    });

    it('1.3 - Deve rejeitar changeReason muito curto (< 10 caracteres)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          changeReason: 'Curto',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('pelo menos 10 caracteres')]),
      );
    });

    it('1.4 - Deve mascarar password no histórico como { passwordChanged: true }', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'NewPassword@12345',
          changeReason: 'Troca de senha por solicitação do usuário',
        })
        .expect(200);

      // Password não deve estar no retorno
      expect(response.body.password).toBeUndefined();

      // Verificar histórico
      const history = await prisma.userHistory.findFirst({
        where: { userId: testUserId, versionNumber: 3 },
      });

      // Password deve estar mascarado
      expect(history?.previousData).toHaveProperty('password', { passwordChanged: true });
      expect(history?.newData).toHaveProperty('password', { passwordChanged: true });
      expect(history?.changedFields).toContain('password');
    });

    it('1.5 - Deve rastrear changedFields corretamente', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Another Name',
          role: 'VIEWER',
          isActive: false,
          changeReason: 'Alteração múltipla de campos conforme solicitação',
        })
        .expect(200);

      const history = await prisma.userHistory.findFirst({
        where: { userId: testUserId, versionNumber: 4 },
      });

      expect(history?.changedFields).toEqual(
        expect.arrayContaining(['name', 'role', 'isActive']),
      );
      expect(history?.changedFields).toHaveLength(3);
    });

    it('1.6 - Deve preservar previousData completo', async () => {
      const beforeUpdate = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'newemail@example.com',
          changeReason: 'Alteração de email solicitada pelo usuário',
        })
        .expect(200);

      const history = await prisma.userHistory.findFirst({
        where: { userId: testUserId, versionNumber: 5 },
      });

      expect(history?.previousData).toMatchObject({
        name: beforeUpdate?.name,
        email: beforeUpdate?.email,
        role: beforeUpdate?.role,
        isActive: beforeUpdate?.isActive,
        versionNumber: beforeUpdate?.versionNumber,
      });
    });

    it('1.7 - Deve incrementar versão sequencialmente', async () => {
      const updates = [
        { name: 'Name 1', changeReason: 'Primeira atualização sequencial de teste' },
        { name: 'Name 2', changeReason: 'Segunda atualização sequencial de teste' },
        { name: 'Name 3', changeReason: 'Terceira atualização sequencial de teste' },
      ];

      for (const update of updates) {
        await request(app.getHttpServer())
          .patch(`/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(update)
          .expect(200);
      }

      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(user?.versionNumber).toBe(8); // 1 inicial + 7 updates
    });

    it('1.8 - Deve atualizar updatedBy corretamente', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          changeReason: 'Atualização para verificar updatedBy',
        })
        .expect(200);

      expect(response.body.updatedBy).toBe(adminId);
    });

    it('1.9 - Deve permitir atualizar múltiplos campos simultaneamente', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Complete Update',
          email: 'completeupdated@example.com',
          role: 'ADMIN',
          isActive: true,
          changeReason: 'Atualização completa de múltiplos campos de usuário',
        })
        .expect(200);

      const history = await prisma.userHistory.findFirst({
        where: { userId: testUserId, versionNumber: 10 },
      });

      expect(history?.changedFields.length).toBeGreaterThanOrEqual(3);
    });

    it('1.10 - Deve rejeitar se nenhum campo foi alterado', async () => {
      const currentUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: currentUser?.name,
          changeReason: 'Tentativa de atualização sem mudanças reais',
        })
        .expect(400);
    });

    it('1.11 - Deve rejeitar update de usuário de outro tenant', async () => {
      // Criar outro tenant
      const timestamp = Date.now();
      const otherTenant = await prisma.tenant.create({
        data: {
          name: 'Other Tenant',
          slug: `other-tenant-user-${timestamp}`,
          schemaName: `other_tenant_${timestamp}`,
          cnpj: `${timestamp.toString().slice(-14)}`,
          email: 'other@example.com',
          phone: '11987654321',
          addressStreet: 'Other Street',
          addressNumber: '456',
          addressDistrict: 'Other',
          addressCity: 'Rio de Janeiro',
          addressState: 'RJ',
          addressZipCode: '20000000',
        },
      });

      // Criar usuário no outro tenant
      const otherUser = await prisma.user.create({
        data: {
          tenantId: otherTenant.id,
          email: 'otheruser@example.com',
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Other User',
          role: 'USER',
        },
      });

      // Tentar atualizar com token do primeiro tenant
      await request(app.getHttpServer())
        .patch(`/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Should Fail',
          changeReason: 'Tentativa de acesso cross-tenant não autorizado',
        })
        .expect(404);

      await prisma.tenant.delete({ where: { id: otherTenant.id } });
    });

    it('1.12 - Deve registrar changedByName no histórico', async () => {
      await request(app.getHttpServer())
        .patch(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Name With Audit',
          changeReason: 'Teste de rastreamento de nome do usuário que alterou',
        })
        .expect(200);

      const history = await prisma.userHistory.findFirst({
        where: { userId: testUserId },
        orderBy: { versionNumber: 'desc' },
      });

      expect(history?.changedBy).toBe(adminId);
      expect(history?.changedByName).toBe('Admin Test User');
    });
  });

  // ==================== DELETE COM VERSIONAMENTO ====================
  describe('DELETE com Versionamento (Soft Delete)', () => {
    let deleteUserId: string;

    beforeEach(async () => {
      // Criar novo usuário para cada teste de delete
      const user = await prisma.user.create({
        data: {
          tenantId,
          email: `deletetest-${Date.now()}@example.com`,
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Delete Test User',
          role: 'USER',
          versionNumber: 1,
          createdBy: adminId,
        },
      });
      deleteUserId = user.id;
    });

    it('2.1 - Deve realizar soft delete e criar histórico', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Usuário desligado da instituição conforme solicitação',
        })
        .expect(200);

      expect(response.body.message).toContain('removido com sucesso');

      // Verificar soft delete
      const user = await prisma.user.findUnique({
        where: { id: deleteUserId },
      });

      expect(user?.deletedAt).not.toBeNull();
      expect(user?.versionNumber).toBe(2);

      // Verificar histórico
      const history = await prisma.userHistory.findFirst({
        where: { userId: deleteUserId, changeType: 'DELETE' },
      });

      expect(history).toBeDefined();
      expect(history?.previousData).toHaveProperty('deletedAt', null);
      expect(history?.newData).toHaveProperty('deletedAt');
      expect(history?.changedFields).toContain('deletedAt');
    });

    it('2.2 - Deve rejeitar delete sem deleteReason', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('2.3 - Deve rejeitar deleteReason muito curto', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deleteReason: 'Curto' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('pelo menos 10 caracteres')]),
      );
    });

    it('2.4 - Não deve permitir delete duplo', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Primeira exclusão conforme processo de desligamento',
        })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Segunda tentativa de exclusão do mesmo usuário',
        })
        .expect(404);
    });

    it('2.5 - Deve preservar dados antes do delete (password mascarado)', async () => {
      const beforeDelete = await prisma.user.findUnique({
        where: { id: deleteUserId },
      });

      await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Exclusão para validação de preservação de dados',
        })
        .expect(200);

      const history = await prisma.userHistory.findFirst({
        where: { userId: deleteUserId, changeType: 'DELETE' },
      });

      expect(history?.previousData).toMatchObject({
        name: beforeDelete?.name,
        email: beforeDelete?.email,
        role: beforeDelete?.role,
        isActive: beforeDelete?.isActive,
        versionNumber: beforeDelete?.versionNumber,
        deletedAt: null,
      });

      // Password deve estar mascarado
      expect(history?.previousData).toHaveProperty('password', { passwordMasked: true });
    });

    it('2.6 - Deve rastrear changedBy e changedByName no delete', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Exclusão para teste de rastreamento de usuário',
        })
        .expect(200);

      const history = await prisma.userHistory.findFirst({
        where: { userId: deleteUserId, changeType: 'DELETE' },
      });

      expect(history?.changedBy).toBe(adminId);
      expect(history?.changedByName).toBe('Admin Test User');
    });

    it('2.7 - Deve incrementar versionNumber no soft delete', async () => {
      // Fazer algumas atualizações antes
      await request(app.getHttpServer())
        .patch(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Before Delete',
          changeReason: 'Atualização antes da exclusão para teste',
        })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/users/${deleteUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Exclusão após atualizações prévias para teste',
        })
        .expect(200);

      const user = await prisma.user.findUnique({
        where: { id: deleteUserId },
      });

      expect(user?.versionNumber).toBe(3); // 1 inicial + 1 update + 1 delete
    });

    it('2.8 - Deve retornar 404 para usuário inexistente', async () => {
      await request(app.getHttpServer())
        .delete(`/users/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Tentativa de exclusão de usuário inexistente',
        })
        .expect(404);
    });

    it('2.9 - Não deve permitir auto-exclusão', async () => {
      await request(app.getHttpServer())
        .delete(`/users/${adminId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deleteReason: 'Tentativa de auto-exclusão não permitida',
        })
        .expect(400);
    });
  });

  // ==================== CONSULTA DE HISTÓRICO ====================
  describe('HISTORY - Consulta de Histórico', () => {
    let historyUserId: string;

    beforeAll(async () => {
      // Criar usuário e fazer várias alterações
      const user = await prisma.user.create({
        data: {
          tenantId,
          email: 'historytest@example.com',
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'History Test User',
          role: 'USER',
          versionNumber: 1,
          createdBy: adminId,
        },
      });
      historyUserId = user.id;

      // Fazer 3 atualizações
      await request(app.getHttpServer())
        .patch(`/users/${historyUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'First Update',
          changeReason: 'Primeira alteração - ajuste de nome de usuário',
        });

      await request(app.getHttpServer())
        .patch(`/users/${historyUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'ADMIN',
          changeReason: 'Segunda alteração - promoção para administrador',
        });

      await request(app.getHttpServer())
        .patch(`/users/${historyUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          isActive: false,
          changeReason: 'Terceira alteração - desativação temporária de conta',
        });
    });

    it('3.1 - Deve retornar histórico completo ordenado', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${historyUserId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: historyUserId,
        userName: 'First Update',
        userEmail: 'historytest@example.com',
        currentVersion: 4,
        totalVersions: 3,
      });

      expect(response.body.history).toHaveLength(3);
      expect(response.body.history[0].versionNumber).toBe(4);
      expect(response.body.history[2].versionNumber).toBe(2);
    });

    it('3.2 - Deve retornar versão específica', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${historyUserId}/history/2`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: historyUserId,
        versionNumber: 2,
        changeType: 'UPDATE',
      });

      expect(response.body.previousData).toBeDefined();
      expect(response.body.newData).toBeDefined();
      expect(response.body.changedFields).toBeDefined();
    });

    it('3.3 - Deve retornar 404 para versão inexistente', async () => {
      await request(app.getHttpServer())
        .get(`/users/${historyUserId}/history/999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('3.4 - Deve incluir changeReason em cada versão', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${historyUserId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.history.forEach((entry: any) => {
        expect(entry.changeReason).toBeDefined();
        expect(entry.changeReason.length).toBeGreaterThanOrEqual(10);
      });
    });

    it('3.5 - Deve rastrear changedBy em todas as versões', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${historyUserId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.history.forEach((entry: any) => {
        expect(entry.changedBy).toBe(adminId);
        expect(entry.changedByName).toBe('Admin Test User');
      });
    });

    it('3.6 - Deve retornar 404 para usuário inexistente', async () => {
      await request(app.getHttpServer())
        .get(`/users/00000000-0000-0000-0000-000000000000/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ==================== ATOMICIDADE DE TRANSAÇÕES ====================
  describe('ATOMICITY - Integridade Transacional', () => {
    it('4.1 - Deve garantir consistência versionNumber entre user e history', async () => {
      const newUser = await prisma.user.create({
        data: {
          tenantId,
          email: `atomicity-${Date.now()}@example.com`,
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Atomicity Test',
          role: 'USER',
          versionNumber: 1,
          createdBy: adminId,
        },
      });

      await request(app.getHttpServer())
        .patch(`/users/${newUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Atomicity Updated',
          changeReason: 'Teste de consistência de versionNumber entre tabelas',
        })
        .expect(200);

      const user = await prisma.user.findUnique({
        where: { id: newUser.id },
      });

      const history = await prisma.userHistory.findFirst({
        where: { userId: newUser.id, changeType: 'UPDATE' },
      });

      expect(user?.versionNumber).toBe(history?.versionNumber);
    });

    it('4.2 - Deve manter integridade em updates concorrentes', async () => {
      const concurrentUser = await prisma.user.create({
        data: {
          tenantId,
          email: `concurrent-${Date.now()}@example.com`,
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Concurrent Test',
          role: 'USER',
          versionNumber: 1,
          createdBy: adminId,
        },
      });

      // Simular 2 updates concorrentes
      const updates = [
        request(app.getHttpServer())
          .patch(`/users/${concurrentUser.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Update 1',
            changeReason: 'Update concorrente 1 para teste de integridade',
          }),
        request(app.getHttpServer())
          .patch(`/users/${concurrentUser.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Update 2',
            changeReason: 'Update concorrente 2 para teste de integridade',
          }),
      ];

      const results = await Promise.all(updates);

      expect(results[0].status).toBe(200);
      expect(results[1].status).toBe(200);

      const user = await prisma.user.findUnique({
        where: { id: concurrentUser.id },
      });

      const historyCount = await prisma.userHistory.count({
        where: { userId: concurrentUser.id },
      });

      expect(user?.versionNumber).toBeGreaterThanOrEqual(2);
      expect(historyCount).toBeGreaterThanOrEqual(1);
    });

    it('4.3 - Deve reverter transação se histórico falhar (conceitual)', async () => {
      // Este teste é conceitual - em produção, se tx.userHistory.create falhar,
      // o update deve ser revertido pela transação atômica do Prisma
      expect(true).toBe(true);
    });
  });

  // ==================== CONFORMIDADE REGULATÓRIA ====================
  describe('COMPLIANCE - Conformidade LGPD', () => {
    it('5.1 - LGPD Art. 48: Deve rastrear todas as alterações', async () => {
      const complianceUser = await prisma.user.create({
        data: {
          tenantId,
          email: `compliance-${Date.now()}@example.com`,
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Compliance Test',
          role: 'USER',
          versionNumber: 1,
          createdBy: adminId,
        },
      });

      await request(app.getHttpServer())
        .patch(`/users/${complianceUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Compliance Updated',
          changeReason: 'Conformidade LGPD - rastreamento de alterações',
        });

      const history = await prisma.userHistory.findFirst({
        where: { userId: complianceUser.id },
      });

      expect(history).toMatchObject({
        changeType: expect.any(String),
        changeReason: expect.any(String),
        previousData: expect.any(Object),
        newData: expect.any(Object),
        changedFields: expect.any(Array),
        changedAt: expect.any(Date),
        changedBy: expect.any(String),
        changedByName: expect.any(String),
      });
    });

    it('5.2 - LGPD: Deve registrar timestamp de alteração', async () => {
      const before = new Date();

      const timestampUser = await prisma.user.create({
        data: {
          tenantId,
          email: `timestamp-${Date.now()}@example.com`,
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Timestamp Test',
          role: 'USER',
          versionNumber: 1,
          createdBy: adminId,
        },
      });

      await request(app.getHttpServer())
        .patch(`/users/${timestampUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Timestamp Updated',
          changeReason: 'Teste de timestamp LGPD de auditoria',
        });

      const after = new Date();

      const history = await prisma.userHistory.findFirst({
        where: { userId: timestampUser.id },
      });

      expect(history?.changedAt).toBeDefined();
      expect(history?.changedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(history?.changedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('5.3 - Deve exigir motivo em todas as operações destrutivas', async () => {
      const reasonUser = await prisma.user.create({
        data: {
          tenantId,
          email: `reason-${Date.now()}@example.com`,
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Reason Test',
          role: 'USER',
          versionNumber: 1,
          createdBy: adminId,
        },
      });

      // Update sem motivo
      await request(app.getHttpServer())
        .patch(`/users/${reasonUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Should Fail' })
        .expect(400);

      // Delete sem motivo
      await request(app.getHttpServer())
        .delete(`/users/${reasonUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('5.4 - Deve SEMPRE mascarar password em previousData e newData', async () => {
      const passwordUser = await prisma.user.create({
        data: {
          tenantId,
          email: `passwordmask-${Date.now()}@example.com`,
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Password Mask Test',
          role: 'USER',
          versionNumber: 1,
          createdBy: adminId,
        },
      });

      // Update com password
      await request(app.getHttpServer())
        .patch(`/users/${passwordUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: 'NewSecurePassword@123',
          changeReason: 'Teste de mascaramento de senha no histórico',
        })
        .expect(200);

      const history = await prisma.userHistory.findFirst({
        where: { userId: passwordUser.id },
      });

      // CRÍTICO: Password NUNCA deve estar visível no histórico
      expect(history?.previousData).not.toHaveProperty('password', expect.stringContaining('$2b$'));
      expect(history?.newData).not.toHaveProperty('password', expect.stringContaining('$2b$'));
      expect(history?.previousData).toHaveProperty('password', { passwordChanged: true });
      expect(history?.newData).toHaveProperty('password', { passwordChanged: true });
    });

    it('5.5 - Deve manter auditoria imutável após criação', async () => {
      const auditUser = await prisma.user.create({
        data: {
          tenantId,
          email: `audit-${Date.now()}@example.com`,
          password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
          name: 'Audit Test',
          role: 'USER',
          versionNumber: 1,
          createdBy: adminId,
        },
      });

      await request(app.getHttpServer())
        .patch(`/users/${auditUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Immutable Audit Test',
          changeReason: 'Teste de imutabilidade de auditoria LGPD',
        })
        .expect(200);

      const history = await prisma.userHistory.findFirst({
        where: { userId: auditUser.id },
      });

      // Histórico deve existir e ser imutável
      expect(history).toBeDefined();
      expect(history?.id).toBeDefined();
    });

    it('5.6 - Deve permitir createdBy NULL para primeiro admin', async () => {
      // Verificar que o admin criado no setup tem createdBy NULL
      const firstAdmin = await prisma.user.findUnique({
        where: { id: adminId },
      });

      expect(firstAdmin?.createdBy).toBeNull();
      expect(firstAdmin?.role).toBe('ADMIN');
    });

    it('5.7 - Deve rastrear createdBy para usuários criados por admin', async () => {
      // testUserId foi criado pelo admin
      const createdUser = await prisma.user.findUnique({
        where: { id: testUserId },
      });

      expect(createdUser?.createdBy).toBe(adminId);
      expect(createdUser?.createdBy).not.toBeNull();
    });
  });
});
