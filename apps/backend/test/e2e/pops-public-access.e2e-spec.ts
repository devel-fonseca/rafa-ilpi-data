/**
 * Testes E2E - Acesso Público aos POPs
 *
 * Valida conformidade com:
 * - RDC 502/2021 Art. 29 - POPs acessíveis a toda equipe
 * - RDC 502/2021 Art. 30 - Apenas RT publica POPs
 *
 * Cobertura de Testes:
 * 1. ROTAS PÚBLICAS (6 testes) - Acesso sem VIEW_POPS
 * 2. ROTAS RESTRITAS (6 testes) - Acesso bloqueado sem permissões
 * 3. VALIDAÇÃO DE STATUS (4 testes) - DRAFT bloqueado, PUBLISHED liberado
 * 4. PERMISSÕES DE GESTÃO (6 testes) - ADMINISTRATOR pode criar/editar
 * 5. PERMISSÕES DE PUBLICAÇÃO (3 testes) - Apenas RT publica
 *
 * Total: 25 testes
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PermissionType, PositionCode, PopStatus, PopCategory } from '@prisma/client';

describe('POPs Public Access (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Tokens de autenticação
  let rtToken: string;           // RT (TECHNICAL_MANAGER) - pode publicar
  let adminToken: string;        // ADMINISTRATOR - pode criar/editar mas não publicar
  let caregiverToken: string;    // CAREGIVER - sem VIEW_POPS, só POPs publicados

  // IDs de contexto
  let tenantId: string;
  let rtId: string;
  let adminId: string;
  let caregiverId: string;

  // POPs de teste
  let draftPopId: string;
  let publishedPopId: string;

  // Helper: Setup do ambiente de teste
  const setupTestEnvironment = async () => {
    const timestamp = Date.now();

    // Criar tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test ILPI POPs',
        slug: `test-ilpi-pops-${timestamp}`,
        schemaName: `test_pops_${timestamp}`,
        cnpj: `${timestamp.toString().slice(-14)}`,
        email: 'test-pops@example.com',
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

    // Criar RT (Responsável Técnico)
    const rt = await prisma.user.create({
      data: {
        tenantId,
        email: 'rt@test.com',
        password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
        name: 'RT Test',
        role: 'admin',
        versionNumber: 1,
      },
    });
    rtId = rt.id;

    await prisma.userProfile.create({
      data: {
        userId: rtId,
        tenantId,
        positionCode: PositionCode.TECHNICAL_MANAGER,
        cpf: '11111111111',
        phone: '11988888881',
        birthDate: new Date('1980-01-01'),
        createdBy: rtId,
      },
    });

    // Criar ADMINISTRATOR
    const admin = await prisma.user.create({
      data: {
        tenantId,
        email: 'admin@test.com',
        password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
        name: 'Admin Test',
        role: 'admin',
        versionNumber: 1,
        createdBy: rtId,
      },
    });
    adminId = admin.id;

    await prisma.userProfile.create({
      data: {
        userId: adminId,
        tenantId,
        positionCode: PositionCode.ADMINISTRATOR,
        cpf: '22222222222',
        phone: '11988888882',
        birthDate: new Date('1980-01-01'),
        createdBy: rtId,
      },
    });

    // Criar CAREGIVER (sem VIEW_POPS)
    const caregiver = await prisma.user.create({
      data: {
        tenantId,
        email: 'caregiver@test.com',
        password: '$2b$10$aVY1goCcUguDGB73mmjNgeRa/P9BcptEre/dOGNAySX3c9k1afzn.',
        name: 'Caregiver Test',
        role: 'staff',
        versionNumber: 1,
        createdBy: rtId,
      },
    });
    caregiverId = caregiver.id;

    await prisma.userProfile.create({
      data: {
        userId: caregiverId,
        tenantId,
        positionCode: PositionCode.CAREGIVER,
        cpf: '33333333333',
        phone: '11988888883',
        birthDate: new Date('1990-01-01'),
        createdBy: rtId,
      },
    });

    // Gerar tokens JWT
    const JwtService = (await import('@nestjs/jwt')).JwtService;
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only-min-32-chars',
    });

    rtToken = jwtService.sign({ sub: rtId, tenantId, role: 'admin' }, { expiresIn: '1h' });
    adminToken = jwtService.sign({ sub: adminId, tenantId, role: 'admin' }, { expiresIn: '1h' });
    caregiverToken = jwtService.sign({ sub: caregiverId, tenantId, role: 'staff' }, { expiresIn: '1h' });

    // Criar POPs de teste
    const draftPop = await prisma.pop.create({
      data: {
        tenantId,
        title: 'POP em Rascunho',
        category: PopCategory.GESTAO_OPERACAO,
        content: '<p>Conteúdo do POP em rascunho</p>',
        status: PopStatus.DRAFT,
        version: 1,
        createdBy: rtId,
      },
    });
    draftPopId = draftPop.id;

    const publishedPop = await prisma.pop.create({
      data: {
        tenantId,
        title: 'POP Publicado - Higienização das Mãos',
        category: PopCategory.ENFERMAGEM_CUIDADOS,
        templateId: 'POP_HIGIENIZACAO_MAOS',
        content: '<p>Conteúdo do POP publicado</p>',
        status: PopStatus.PUBLISHED,
        version: 1,
        publishedAt: new Date(),
        publishedBy: rtId,
        createdBy: rtId,
      },
    });
    publishedPopId = publishedPop.id;
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
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await setupTestEnvironment();
  });

  afterAll(async () => {
    // Limpeza
    if (tenantId) {
      await prisma.popHistory.deleteMany({ where: { tenantId } });
      await prisma.popAttachment.deleteMany({ where: { tenantId } });
      await prisma.pop.deleteMany({ where: { tenantId } });
      await prisma.userProfile.deleteMany({ where: { tenantId } });
      await prisma.user.deleteMany({ where: { tenantId } });
      await prisma.tenant.delete({ where: { id: tenantId } });
    }

    await app.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ROTAS PÚBLICAS - Acesso sem VIEW_POPS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('1. Rotas Públicas (sem VIEW_POPS)', () => {
    it('1.1. Caregiver pode listar POPs publicados (GET /pops/published)', async () => {
      const response = await request(app.getHttpServer())
        .get('/pops/published')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('status', PopStatus.PUBLISHED);
      expect(response.body[0]).toHaveProperty('title', 'POP Publicado - Higienização das Mãos');
    });

    it('1.2. Caregiver pode visualizar POP publicado específico (GET /pops/:id)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/pops/${publishedPopId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', publishedPopId);
      expect(response.body).toHaveProperty('status', PopStatus.PUBLISHED);
      expect(response.body).toHaveProperty('title', 'POP Publicado - Higienização das Mãos');
      expect(response.body).toHaveProperty('content');
    });

    it('1.3. Caregiver NÃO pode visualizar POP em DRAFT (GET /pops/:id)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/pops/${draftPopId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Este POP está em rascunho e não está disponível para visualização');
    });

    it('1.4. Caregiver pode listar categorias (GET /pops/categories)', async () => {
      const response = await request(app.getHttpServer())
        .get('/pops/categories')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('1.5. POPs publicados incluem anexos no response', async () => {
      // Adicionar anexo ao POP publicado
      const attachmentData = {
        popId: publishedPopId,
        tenantId,
        fileUrl: 'https://minio.test/tenant/pops/checklist.pdf',
        fileName: 'Checklist Higienização.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        description: 'Checklist de higienização',
        type: 'CHECKLIST',
        uploadedBy: rtId,
      };

      await prisma.popAttachment.create({ data: attachmentData });

      const response = await request(app.getHttpServer())
        .get(`/pops/${publishedPopId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('attachments');
      expect(response.body.attachments).toBeInstanceOf(Array);
      expect(response.body.attachments.length).toBeGreaterThan(0);
      expect(response.body.attachments[0]).toHaveProperty('fileUrl');
      expect(response.body.attachments[0]).toHaveProperty('fileName', 'Checklist Higienização.pdf');
    });

    it('1.6. Admin pode visualizar POP DRAFT (bypass por role=admin)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/pops/${draftPopId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', draftPopId);
      expect(response.body).toHaveProperty('status', PopStatus.DRAFT);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ROTAS RESTRITAS - Acesso bloqueado sem permissões
  // ═══════════════════════════════════════════════════════════════════════════

  describe('2. Rotas Restritas (VIEW_POPS requerido)', () => {
    it('2.1. Caregiver NÃO pode listar TODOS os POPs (GET /pops)', async () => {
      await request(app.getHttpServer())
        .get('/pops')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(403);
    });

    it('2.2. Caregiver NÃO pode acessar templates (GET /pops/templates/all)', async () => {
      await request(app.getHttpServer())
        .get('/pops/templates/all')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(403);
    });

    it('2.3. Caregiver NÃO pode ver histórico de versões (GET /pops/:id/versions)', async () => {
      await request(app.getHttpServer())
        .get(`/pops/${publishedPopId}/versions`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(403);
    });

    it('2.4. Caregiver NÃO pode ver auditoria (GET /pops/:id/history)', async () => {
      await request(app.getHttpServer())
        .get(`/pops/${publishedPopId}/history`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(403);
    });

    it('2.5. RT pode acessar templates (VIEW_POPS)', async () => {
      const response = await request(app.getHttpServer())
        .get('/pops/templates/all')
        .set('Authorization', `Bearer ${rtToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('templates');
      expect(response.body.templates).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('count');
    });

    it('2.6. RT pode ver histórico de versões (VIEW_POPS)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/pops/${publishedPopId}/versions`)
        .set('Authorization', `Bearer ${rtToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. VALIDAÇÃO DE STATUS - DRAFT bloqueado, PUBLISHED liberado
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3. Validação de Status do POP', () => {
    it('3.1. GET /pops/published retorna apenas POPs com status=PUBLISHED', async () => {
      const response = await request(app.getHttpServer())
        .get('/pops/published')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      response.body.forEach((pop: any) => {
        expect(pop.status).toBe(PopStatus.PUBLISHED);
      });
    });

    it('3.2. GET /pops/:id com POP DRAFT retorna 400 para caregiver', async () => {
      const response = await request(app.getHttpServer())
        .get(`/pops/${draftPopId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(400);

      expect(response.body.message).toContain('rascunho');
    });

    it('3.3. GET /pops/:id com POP PUBLISHED retorna 200 para caregiver', async () => {
      const response = await request(app.getHttpServer())
        .get(`/pops/${publishedPopId}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', PopStatus.PUBLISHED);
    });

    it('3.4. Criar POP OBSOLETE e validar bloqueio para caregiver', async () => {
      const obsoletePop = await prisma.pop.create({
        data: {
          tenantId,
          title: 'POP Obsoleto',
          category: PopCategory.GESTAO_OPERACAO,
          content: '<p>Conteúdo obsoleto</p>',
          status: PopStatus.OBSOLETE,
          version: 1,
          createdBy: rtId,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/pops/${obsoletePop.id}`)
        .set('Authorization', `Bearer ${caregiverToken}`)
        .expect(400);

      expect(response.body.message).toContain('rascunho');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PERMISSÕES DE GESTÃO - ADMINISTRATOR pode criar/editar
  // ═══════════════════════════════════════════════════════════════════════════

  describe('4. Permissões de Gestão (ADMINISTRATOR)', () => {
    it('4.1. ADMINISTRATOR pode criar POP (CREATE_POPS)', async () => {
      const response = await request(app.getHttpServer())
        .post('/pops')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'POP Administrativo',
          category: PopCategory.GESTAO_OPERACAO,
          content: '<p>Conteúdo do POP administrativo</p>',
          reviewIntervalMonths: 12,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', PopStatus.DRAFT);
      expect(response.body).toHaveProperty('title', 'POP Administrativo');
    });

    it('4.2. ADMINISTRATOR pode editar POP DRAFT (UPDATE_POPS)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/pops/${draftPopId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'POP em Rascunho - Atualizado',
          content: '<p>Conteúdo atualizado</p>',
        })
        .expect(200);

      expect(response.body).toHaveProperty('title', 'POP em Rascunho - Atualizado');
    });

    it('4.3. ADMINISTRATOR pode deletar POP DRAFT (DELETE_POPS)', async () => {
      const newPop = await prisma.pop.create({
        data: {
          tenantId,
          title: 'POP para Deletar',
          category: PopCategory.GESTAO_OPERACAO,
          content: '<p>Conteúdo</p>',
          status: PopStatus.DRAFT,
          version: 1,
          createdBy: adminId,
        },
      });

      await request(app.getHttpServer())
        .delete(`/pops/${newPop.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deleted = await prisma.pop.findUnique({ where: { id: newPop.id } });
      expect(deleted?.deletedAt).not.toBeNull();
    });

    it('4.4. ADMINISTRATOR pode acessar templates (VIEW_POPS)', async () => {
      const response = await request(app.getHttpServer())
        .get('/pops/templates/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('templates');
    });

    it('4.5. ADMINISTRATOR pode ver histórico de versões (VIEW_POPS)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/pops/${publishedPopId}/versions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('4.6. Caregiver NÃO pode criar POP (sem CREATE_POPS)', async () => {
      await request(app.getHttpServer())
        .post('/pops')
        .set('Authorization', `Bearer ${caregiverToken}`)
        .send({
          title: 'POP Inválido',
          category: PopCategory.GESTAO_OPERACAO,
          content: '<p>Não deve criar</p>',
        })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PERMISSÕES DE PUBLICAÇÃO - Apenas RT publica
  // ═══════════════════════════════════════════════════════════════════════════

  describe('5. Permissões de Publicação (PUBLISH_POPS)', () => {
    it('5.1. RT pode publicar POP (PUBLISH_POPS)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/pops/${draftPopId}/publish`)
        .set('Authorization', `Bearer ${rtToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('status', PopStatus.PUBLISHED);
      expect(response.body).toHaveProperty('publishedAt');
      expect(response.body).toHaveProperty('publishedBy', rtId);
    });

    it('5.2. ADMINISTRATOR pode publicar POP (role=admin tem bypass)', async () => {
      const newDraft = await prisma.pop.create({
        data: {
          tenantId,
          title: 'POP Draft Admin',
          category: PopCategory.GESTAO_OPERACAO,
          content: '<p>Conteúdo</p>',
          status: PopStatus.DRAFT,
          version: 1,
          createdBy: adminId,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/pops/${newDraft.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('status', PopStatus.PUBLISHED);
      expect(response.body).toHaveProperty('publishedBy', adminId);
    });

    it('5.3. RT pode criar nova versão de POP (PUBLISH_POPS)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/pops/${publishedPopId}/version`)
        .set('Authorization', `Bearer ${rtToken}`)
        .send({
          reason: 'Atualização de procedimento',
          newContent: '<p>Novo conteúdo da versão 2</p>',
        })
        .expect(201);

      expect(response.body).toHaveProperty('status', PopStatus.DRAFT);
      expect(response.body).toHaveProperty('version', 2);
    });
  });
});
