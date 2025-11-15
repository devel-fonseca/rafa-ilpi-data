import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed Plans
  const plans = [
    {
      name: 'Free',
      type: 'FREE' as const,
      maxResidents: 5,
      maxUsers: 2,
      priceMonthly: 0,
      features: {
        residentes: true,
        avds: true,
        vitaisBasicos: true,
        medicacao: false,
        relatorios: false,
        api: false,
        suportePrioritario: false,
      },
    },
    {
      name: 'Básico',
      type: 'BASICO' as const,
      maxResidents: 20,
      maxUsers: 5,
      priceMonthly: 299,
      features: {
        residentes: true,
        avds: true,
        vitaisBasicos: true,
        medicacao: true,
        relatorios: false,
        api: false,
        suportePrioritario: false,
      },
    },
    {
      name: 'Profissional',
      type: 'PROFISSIONAL' as const,
      maxResidents: 100,
      maxUsers: 15,
      priceMonthly: 499,
      features: {
        residentes: true,
        avds: true,
        vitaisBasicos: true,
        medicacao: true,
        relatorios: true,
        relatoriosAnvisa: true,
        api: true,
        suportePrioritario: false,
      },
    },
    {
      name: 'Enterprise',
      type: 'ENTERPRISE' as const,
      maxResidents: -1, // ilimitado
      maxUsers: -1, // ilimitado
      priceMonthly: 0, // custom pricing
      features: {
        residentes: true,
        avds: true,
        vitaisBasicos: true,
        medicacao: true,
        relatorios: true,
        relatoriosAnvisa: true,
        relatoriosEsocial: true,
        api: true,
        apiKeys: true,
        webhooks: true,
        customizacao: true,
        suportePrioritario: true,
        suporteDedicado: true,
        sla: true,
      },
    },
  ];

  for (const planData of plans) {
    const plan = await prisma.plan.upsert({
      where: { name: planData.name },
      update: planData,
      create: planData,
    });
    console.log(`✓ Plan created/updated: ${plan.name}`);
  }

  console.log('✅ Plans seeded!');

  // Seed Demo Tenant
  await seedDemoTenant();

  console.log('✅ Seeding completed!');
}

async function seedDemoTenant() {
  console.log('🌱 Criando tenant de exemplo...');

  // Verificar se o tenant já existe
  const existingTenant = await prisma.tenant.findFirst({
    where: {
      slug: 'sao-rafael'
    }
  });

  if (existingTenant) {
    console.log('✓ Tenant de exemplo já existe');
    return;
  }

  // Buscar o plano Free
  const freePlan = await prisma.plan.findUnique({
    where: { name: 'Free' }
  });

  if (!freePlan) {
    console.error('❌ Plano FREE não encontrado');
    return;
  }

  // Criar tenant de exemplo
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Casa de Repouso São Rafael',
      slug: 'sao-rafael',
      cnpj: '12.345.678/0001-90',
      schemaName: 'tenant_sao_rafael',
      email: 'contato@saorafael.com.br',
      phone: '(11) 98765-4321',
      addressNumber: '123',
      addressComplement: '',
      addressDistrict: 'Centro',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '01234-567',
      status: 'ACTIVE',
      subscriptions: {
        create: {
          planId: freePlan.id,
          status: 'trialing',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
      }
    }
  });

  // Criar usuário admin (senha: senha123)
  const hashedPassword = await bcrypt.hash('senha123', 10);

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Administrador',
      email: 'admin@teste.com.br',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    }
  });

  // Criar schema do tenant no PostgreSQL
  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "tenant_sao_rafael"`);
    console.log('✓ Schema do tenant criado');
  } catch (error) {
    console.error('❌ Erro ao criar schema do tenant:', error);
  }

  console.log('✅ Tenant de exemplo criado!');
  console.log('   Nome: Casa de Repouso São Rafael');
  console.log('   Email: admin@teste.com.br');
  console.log('   Senha: senha123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
