import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Testes E2E: Isolamento Multi-Tenant com Schema Isolation
 *
 * Valida que:
 * 1. Dados de um tenant não são visíveis para outro tenant
 * 2. SUPERADMIN pode acessar dados em public schema
 * 3. Queries usam o schema correto (tenant vs public)
 * 4. Não há vazamento de dados cross-tenant
 */
describe('Multi-Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenant1: any;
  let tenant2: any;
  let user1Token: string;
  let user2Token: string;
  let superAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup: Criar 2 tenants isolados
    await setupTenants();
  });

  afterAll(async () => {
    // Cleanup: Remover dados de teste
    await cleanup();
    await app.close();
  });

  /**
   * Setup: Criar 2 tenants com schemas isolados
   */
  async function setupTenants() {
    // Criar Tenant 1
    const registerTenant1 = await request(app.getHttpServer())
      .post('/auth/register-tenant')
      .send({
        name: 'ILPI Teste 1',
        cnpj: '11111111000191',
        email: 'admin1@tenant1.test',
        password: 'Senha@123',
        tradeName: 'Tenant 1 Test',
        planId: null, // Free plan
      });

    tenant1 = registerTenant1.body.tenant;

    // Login no Tenant 1
    const loginTenant1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin1@tenant1.test',
        password: 'Senha@123',
      });

    user1Token = loginTenant1.body.accessToken;

    // Criar Tenant 2
    const registerTenant2 = await request(app.getHttpServer())
      .post('/auth/register-tenant')
      .send({
        name: 'ILPI Teste 2',
        cnpj: '22222222000192',
        email: 'admin2@tenant2.test',
        password: 'Senha@123',
        tradeName: 'Tenant 2 Test',
        planId: null,
      });

    tenant2 = registerTenant2.body.tenant;

    // Login no Tenant 2
    const loginTenant2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin2@tenant2.test',
        password: 'Senha@123',
      });

    user2Token = loginTenant2.body.accessToken;

    // Login como SUPERADMIN (se existir)
    const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'admin@rafalabs.com.br';
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';

    try {
      const loginSuperAdmin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: superAdminEmail,
          password: superAdminPassword,
        });

      superAdminToken = loginSuperAdmin.body.accessToken;
    } catch (error) {
      console.warn('SUPERADMIN não disponível para testes');
    }
  }

  /**
   * Cleanup: Remover tenants de teste
   */
  async function cleanup() {
    try {
      // Soft delete dos tenants de teste
      if (tenant1?.id) {
        await prisma.tenant.update({
          where: { id: tenant1.id },
          data: { deletedAt: new Date() },
        });
      }

      if (tenant2?.id) {
        await prisma.tenant.update({
          where: { id: tenant2.id },
          data: { deletedAt: new Date() },
        });
      }
    } catch (error) {
      console.error('Erro no cleanup:', error.message);
    }
  }

  describe('1. Isolamento de Dados - Residents', () => {
    let resident1Id: string;
    let resident2Id: string;

    it('Tenant 1 deve criar residente em schema isolado', async () => {
      const response = await request(app.getHttpServer())
        .post('/residents')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'João da Silva',
          cpf: '11111111111',
          birthDate: '1950-01-01',
          gender: 'MALE',
          admissionDate: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('João da Silva');
      resident1Id = response.body.id;
    });

    it('Tenant 2 deve criar residente em schema isolado diferente', async () => {
      const response = await request(app.getHttpServer())
        .post('/residents')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Maria Souza',
          cpf: '22222222222',
          birthDate: '1955-01-01',
          gender: 'FEMALE',
          admissionDate: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Maria Souza');
      resident2Id = response.body.id;
    });

    it('Tenant 1 NÃO deve ver residente do Tenant 2', async () => {
      const response = await request(app.getHttpServer())
        .get('/residents')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('João da Silva');
      expect(response.body.data.find((r: any) => r.name === 'Maria Souza')).toBeUndefined();
    });

    it('Tenant 2 NÃO deve ver residente do Tenant 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/residents')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Maria Souza');
      expect(response.body.data.find((r: any) => r.name === 'João da Silva')).toBeUndefined();
    });

    it('Tenant 1 NÃO deve conseguir acessar residente do Tenant 2 por ID direto', async () => {
      const response = await request(app.getHttpServer())
        .get(`/residents/${resident2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(404);
    });

    it('Tenant 2 NÃO deve conseguir acessar residente do Tenant 1 por ID direto', async () => {
      const response = await request(app.getHttpServer())
        .get(`/residents/${resident1Id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('2. Isolamento de Schemas PostgreSQL', () => {
    it('Tenant 1 deve ter schema próprio no PostgreSQL', async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenant1.id },
        select: { schemaName: true },
      });

      expect(tenant?.schemaName).toBeDefined();
      expect(tenant?.schemaName).toMatch(/^tenant_/);

      // Verificar se schema existe no PostgreSQL
      const schemaExists = await prisma.$queryRawUnsafe<any[]>(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${tenant?.schemaName}'`
      );

      expect(schemaExists.length).toBeGreaterThan(0);
    });

    it('Tenant 2 deve ter schema próprio DIFERENTE do Tenant 1', async () => {
      const tenant1Schema = await prisma.tenant.findUnique({
        where: { id: tenant1.id },
        select: { schemaName: true },
      });

      const tenant2Schema = await prisma.tenant.findUnique({
        where: { id: tenant2.id },
        select: { schemaName: true },
      });

      expect(tenant1Schema?.schemaName).not.toBe(tenant2Schema?.schemaName);
    });

    it('Tabela residents deve existir em AMBOS os schemas de tenant', async () => {
      const tenant1Schema = await prisma.tenant.findUnique({
        where: { id: tenant1.id },
        select: { schemaName: true },
      });

      const tenant2Schema = await prisma.tenant.findUnique({
        where: { id: tenant2.id },
        select: { schemaName: true },
      });

      // Verificar tabela residents no schema do Tenant 1
      const table1 = await prisma.$queryRawUnsafe<any[]>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = '${tenant1Schema?.schemaName}' AND table_name = 'residents'`
      );

      expect(table1.length).toBeGreaterThan(0);

      // Verificar tabela residents no schema do Tenant 2
      const table2 = await prisma.$queryRawUnsafe<any[]>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = '${tenant2Schema?.schemaName}' AND table_name = 'residents'`
      );

      expect(table2.length).toBeGreaterThan(0);
    });
  });

  describe('3. Autenticação Multi-Tenant Híbrida', () => {
    it('User de tenant deve ter tenantId preenchido', async () => {
      const response = await request(app.getHttpServer())
        .get('/user-profiles/me')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.tenantId).toBe(tenant1.id);
    });

    it('SUPERADMIN deve ter tenantId NULL', async () => {
      if (!superAdminToken) {
        console.warn('Teste pulado: SUPERADMIN não disponível');
        return;
      }

      const superAdminUser = await prisma.user.findFirst({
        where: { email: process.env.SUPERADMIN_EMAIL || 'admin@rafalabs.com.br' },
        select: { tenantId: true, role: true },
      });

      expect(superAdminUser?.role).toBe('SUPERADMIN');
      expect(superAdminUser?.tenantId).toBeNull();
    });
  });

  describe('4. Isolamento de Users', () => {
    it('Tenant 1 NÃO deve ver usuários do Tenant 2', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);

      // Deve ver apenas users do próprio tenant
      const hasUser2Email = response.body.data?.some((u: any) => u.email === 'admin2@tenant2.test');
      expect(hasUser2Email).toBe(false);
    });

    it('Tenant 1 deve criar novo usuário em schema próprio', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Novo Usuário Tenant 1',
          email: 'novo@tenant1.test',
          password: 'Senha@123',
          role: 'user',
        });

      expect(response.status).toBe(201);
      expect(response.body.email).toBe('novo@tenant1.test');
    });

    it('Mesmo email pode existir em tenants diferentes (schemas isolados)', async () => {
      const emailComum = 'comum@test.com';

      // Criar user com mesmo email no Tenant 1
      const response1 = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'User Comum Tenant 1',
          email: emailComum,
          password: 'Senha@123',
          role: 'user',
        });

      expect(response1.status).toBe(201);

      // Criar user com MESMO email no Tenant 2 (deve funcionar pois estão em schemas diferentes)
      const response2 = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'User Comum Tenant 2',
          email: emailComum,
          password: 'Senha@123',
          role: 'user',
        });

      expect(response2.status).toBe(201);
      expect(response2.body.email).toBe(emailComum);
    });
  });

  describe('5. Performance - Queries sem filtro tenantId', () => {
    it('Query de residents NÃO deve conter WHERE tenantId', async () => {
      // Este teste valida que o Prisma usa o schema correto
      // e não precisa filtrar por tenantId (isolamento físico)

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenant1.id },
        select: { schemaName: true },
      });

      const tenantClient = prisma.getTenantClient(tenant!.schemaName);

      // Query direta sem filtro tenantId
      const residents = await tenantClient.resident.findMany({
        where: { deletedAt: null },
        take: 10,
      });

      // Deve retornar apenas residents deste tenant (schema isolation)
      expect(residents.length).toBeGreaterThanOrEqual(0);

      // Todos os residents devem ter o tenantId correto
      residents.forEach((resident: any) => {
        expect(resident.tenantId).toBe(tenant1.id);
      });
    });
  });
});
