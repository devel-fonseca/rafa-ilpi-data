import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestTenant() {
  console.log('🏥 Criando tenant de teste...');

  // Buscar o plano Free
  const freePlan = await prisma.plan.findUnique({
    where: { type: 'FREE' },
  });

  if (!freePlan) {
    throw new Error('Plano Free não encontrado. Execute o seed primeiro.');
  }

  // Criar ou atualizar o tenant de teste
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'teste' },
    update: {},
    create: {
      slug: 'teste',
      name: 'ILPI Teste',
      cnpj: '00.000.000/0000-00',
      email: 'contato@ilpiteste.com.br',
      phone: '(11) 98765-4321',
      schemaName: 'tenant_teste',
      address: 'Rua Teste, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
    },
  });

  console.log(`✓ Tenant criado: ${tenant.name} (${tenant.id})`);

  // Criar subscrição para o plano Free
  const subscription = await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      planId: freePlan.id,
      status: 'ACTIVE',
      startDate: new Date(),
    },
  });

  console.log(`✓ Subscrição criada: ${subscription.status}`);
  console.log(`\n📋 Informações do Tenant:`);
  console.log(`   ID: ${tenant.id}`);
  console.log(`   Nome: ${tenant.name}`);
  console.log(`   Slug: ${tenant.slug}`);
  console.log(`   Plano: ${freePlan.name}`);
  console.log(`   Limites: ${freePlan.maxUsers} usuários, ${freePlan.maxResidents} residentes`);

  await prisma.$disconnect();
}

createTestTenant()
  .catch((e) => {
    console.error('❌ Erro ao criar tenant:', e);
    process.exit(1);
  });
