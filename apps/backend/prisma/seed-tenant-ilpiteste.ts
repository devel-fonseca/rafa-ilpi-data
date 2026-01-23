import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed 1/3: Criar Tenant ILPI Teste
 *
 * Cria:
 * - Tenant: TELE ENGENHARIA LTDA
 * - Subscription: Plano Profissional
 * - Tenant Profile: Casa de Repouso Santa Teresinha
 */
async function main() {
  console.log('🌱 [1/3] Seeding Tenant ILPI Teste...\n');

  // 1. Buscar plano "profissional"
  const profissionalPlan = await prisma.plan.findUnique({
    where: { name: 'profissional' },
  });

  if (!profissionalPlan) {
    throw new Error('❌ Plano "profissional" não encontrado. Execute "npm run prisma:seed" primeiro.');
  }

  // 2. Criar Tenant
  const tenant = await prisma.tenant.upsert({
    where: { cnpj: '51.482.599/0001-88' },
    update: {},
    create: {
      name: 'TELE ENGENHARIA LTDA',
      slug: 'tele-engenharia-ltda',
      cnpj: '51.482.599/0001-88',
      email: 'contato@ilpiteste.com.br',
      phone: '(19) 98152-4849',
      schemaName: 'tenant_tele_engenharia_ltda_9db61a',
      status: 'TRIAL',
      timezone: 'America/Sao_Paulo',
      // Endereço completo
      addressStreet: 'Rua Antônio Cesarino',
      addressNumber: '123',
      addressComplement: '21',
      addressDistrict: 'Centro',
      addressCity: 'Campinas',
      addressState: 'SP',
      addressZipCode: '13015-905',
    },
  });
  console.log(`✓ Tenant: ${tenant.name}`);
  console.log(`  CNPJ: ${tenant.cnpj}`);
  console.log(`  Schema: ${tenant.schemaName}\n`);

  // 3. Criar Subscription
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      tenantId: tenant.id,
      planId: profissionalPlan.id,
    },
  });

  if (!existingSubscription) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: profissionalPlan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`✓ Subscription: Plano Profissional (30 dias)\n`);
  } else {
    console.log(`⚠ Subscription já existe\n`);
  }

  // 4. Aguardar criação do schema (hook automático)
  console.log(`⏳ Aguardando criação automática do schema...`);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 5. Criar Tenant Profile usando Prisma Client
  try {
    // Criar novo client conectado ao schema do tenant
    const tenantUrl = `${process.env.DATABASE_URL}?schema=${tenant.schemaName}`;
    const tenantPrisma = new PrismaClient({
      datasources: {
        db: {
          url: tenantUrl,
        },
      },
    });

    await tenantPrisma.tenantProfile.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        legalNature: 'EMPRESA_PRIVADA',
        tradeName: 'Casa de Repouso Santa Teresinha',
        cnesCode: '1234567',
        capacityDeclared: 20,
        capacityLicensed: 20,
        contactPhone: '(19) 98152-4849',
        contactEmail: 'contato@ilpiteste.com.br',
        foundedAt: new Date('1988-04-22'),
      },
      update: {},
    });

    await tenantPrisma.$disconnect();

    console.log(`✓ Tenant Profile: Casa de Repouso Santa Teresinha`);
    console.log(`  CNES: 1234567`);
    console.log(`  Capacidade: 20 leitos`);
    console.log(`  Fundação: 22/04/1988\n`);
  } catch (error) {
    console.error(`❌ Erro ao criar Tenant Profile:`, error);
    throw error;
  }

  console.log('✅ Tenant ILPI Teste criado com sucesso!\n');
  console.log('📋 Próximo passo:');
  console.log('   npm run prisma:seed:users-ilpiteste\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
