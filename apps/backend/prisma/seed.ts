import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Seed Plans
  // ⚠️ IMPORTANTE: Planos vêm apenas com features CORE
  // Features opcionais devem ser adicionadas via SuperAdmin Portal
  const coreFeaturesOnly = {
    residentes: true,
    usuarios: true,
    prontuario: true,
  };

  const plans = [
    {
      name: "free",
      displayName: "Plano Free",
      type: "FREE" as const,
      maxResidents: 5,
      maxUsers: 2,
      price: 0,
      trialDays: 0,
      isPopular: false,
      features: coreFeaturesOnly,
    },
    {
      name: "basico",
      displayName: "Plano Básico",
      type: "BASICO" as const,
      maxResidents: 20,
      maxUsers: 5,
      price: 299,
      trialDays: 7,
      isPopular: true,
      features: coreFeaturesOnly,
    },
    {
      name: "profissional",
      displayName: "Plano Profissional",
      type: "PROFISSIONAL" as const,
      maxResidents: 100,
      maxUsers: 15,
      price: 499,
      trialDays: 14,
      isPopular: false,
      features: coreFeaturesOnly,
    },
    {
      name: "enterprise",
      displayName: "Plano Enterprise",
      type: "ENTERPRISE" as const,
      maxResidents: -1,
      maxUsers: -1,
      price: null,
      trialDays: 0,
      isPopular: false,
      features: coreFeaturesOnly,
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

  console.log("✅ Plans seeded!");

  // Seed SuperAdmin User
  const superAdminEmail = "admin@rafalabs.com.br";
  const superAdminPassword = "SuperAdmin@2025";
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  // Verificar se SuperAdmin já existe
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      email: superAdminEmail,
      tenantId: null,
    },
  });

  let superAdmin;
  if (existingSuperAdmin) {
    // Atualizar senha se já existe
    superAdmin = await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: {
        password: hashedPassword,
        name: "Super Administrador",
        role: "SUPERADMIN",
        isActive: true,
      },
    });
    console.log(`✓ SuperAdmin updated: ${superAdmin.email}`);
  } else {
    // Criar novo SuperAdmin
    superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: "Super Administrador",
        role: "SUPERADMIN",
        isActive: true,
        tenantId: null,
      },
    });
    console.log(`✓ SuperAdmin created: ${superAdmin.email}`);
  }

  console.log("✅ SuperAdmin seeded!");

  console.log("✅ Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
