import { PrismaClient } from '@prisma/client';

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
      where: { type: planData.type },
      update: planData,
      create: planData,
    });
    console.log(`✓ Plan created/updated: ${plan.name}`);
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
