import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { seedShiftTemplates } from "./seeds/shift-templates.seed";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Seed Plans
  // Configuração de features por plano conforme estratégia de pricing
  const freeFeaturesOnly = {
    pops: true,
    usuarios: true,
    medicacoes: true,
    prontuario: true,
    residentes: true,
    conformidade: true,
    notificacoes: true,
    registros_diarios: true,
  };

  const basicoFeatures = {
    pops: true,
    agenda: true,
    quartos: true,
    usuarios: true,
    medicacoes: true,
    prontuario: true,
    residentes: true,
    mapa_leitos: true,
    conformidade: true,
    notificacoes: true,
    gestao_leitos: true,
    sinais_vitais: true,
    escalas_plantoes: true,
    registros_diarios: true,
    documentos_institucionais: true,
  };

  const profissionalFeatures = {
    pops: true,
    agenda: true,
    quartos: true,
    usuarios: true,
    contratos: true,
    mensagens: true,
    medicacoes: true,
    prontuario: true,
    residentes: true,
    mapa_leitos: true,
    conformidade: true,
    notificacoes: true,
    gestao_leitos: true,
    sinais_vitais: true,
    escalas_plantoes: true,
    eventos_sentinela: true,
    registros_diarios: true,
    evolucoes_clinicas: true,
    autodiagnostico_rdc: true,
    indicadores_mensais: true,
    documentos_institucionais: true,
  };

  const coreFeaturesOnly = {
    residentes: true,
    usuarios: true,
    prontuario: true,
    conformidade: true,
    notificacoes: true,
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
      features: freeFeaturesOnly,
    },
    {
      name: "basico",
      displayName: "Plano Básico",
      type: "BASICO" as const,
      maxResidents: 20,
      maxUsers: 8,
      price: 299,
      trialDays: 7,
      isPopular: true,
      features: basicoFeatures,
    },
    {
      name: "profissional",
      displayName: "Plano Profissional",
      type: "PROFISSIONAL" as const,
      maxResidents: 150,
      maxUsers: 16,
      price: 499,
      trialDays: 7,
      isPopular: false,
      features: profissionalFeatures,
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

  // Seed ShiftTemplates (public schema - shared reference data)
  await seedShiftTemplates(prisma);

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
