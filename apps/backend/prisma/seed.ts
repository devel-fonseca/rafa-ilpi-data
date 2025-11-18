import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed Plans
  const plans = [
    {
      name: 'free',
      displayName: 'Plano Free',
      type: 'FREE' as const,
      maxResidents: 5,
      maxUsers: 2,
      price: 0,
      trialDays: 0,
      isPopular: false,
      features: {
        residentes: true,
        registrosDiarios: true,
        medicacoes: true,
        contratos: false,
        escalas: false,
        financeiro: false,
        relatoriosAnvisa: false,
        rh: false,
        suporte24h: false,
      },
    },
    {
      name: 'basico',
      displayName: 'Plano Básico',
      type: 'BASICO' as const,
      maxResidents: 20,
      maxUsers: 5,
      price: 299,
      trialDays: 7,
      isPopular: true,
      features: {
        residentes: true,
        registrosDiarios: true,
        medicacoes: true,
        contratos: true,
        escalas: true,
        financeiro: false,
        relatoriosAnvisa: false,
        rh: false,
        suporte24h: false,
      },
    },
    {
      name: 'profissional',
      displayName: 'Plano Profissional',
      type: 'PROFISSIONAL' as const,
      maxResidents: 100,
      maxUsers: 15,
      price: 499,
      trialDays: 14,
      isPopular: false,
      features: {
        residentes: true,
        registrosDiarios: true,
        medicacoes: true,
        contratos: true,
        escalas: true,
        financeiro: true,
        relatoriosAnvisa: true,
        rh: false,
        suporte24h: false,
      },
    },
    {
      name: 'enterprise',
      displayName: 'Plano Enterprise',
      type: 'ENTERPRISE' as const,
      maxResidents: -1,
      maxUsers: -1,
      price: null,
      trialDays: 0,
      isPopular: false,
      features: {
        residentes: true,
        registrosDiarios: true,
        medicacoes: true,
        contratos: true,
        escalas: true,
        financeiro: true,
        relatoriosAnvisa: true,
        rh: true,
        suporte24h: true,
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
    where: { name: 'free' }
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
