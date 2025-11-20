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

  // Seed Gestão de Leitos
  await seedBedsManagement(tenant.id);

  console.log('✅ Tenant de exemplo criado!');
  console.log('   Nome: Casa de Repouso São Rafael');
  console.log('   Email: admin@teste.com.br');
  console.log('   Senha: senha123');
}

async function seedBedsManagement(tenantId: string) {
  console.log('🌱 Criando estrutura de gestão de leitos...');

  // Verificar se já existe um prédio
  const existingBuilding = await prisma.building.findFirst({
    where: { tenantId }
  });

  if (existingBuilding) {
    console.log('✓ Estrutura de leitos já existe');
    return;
  }

  // Criar Prédio Principal
  const building = await prisma.building.create({
    data: {
      tenantId,
      name: 'Prédio Principal',
      code: 'PRED-001',
      description: 'Prédio principal da Casa de Repouso São Rafael',
      isActive: true,
    }
  });
  console.log(`✓ Prédio criado: ${building.name}`);

  // Criar Andares
  const floor1 = await prisma.floor.create({
    data: {
      tenantId,
      buildingId: building.id,
      name: 'Térreo',
      code: 'PISO-0',
      description: 'Andar Térreo',
      orderIndex: 1,
      isActive: true,
    }
  });
  console.log(`✓ Andar Térreo criado`);

  const floor2 = await prisma.floor.create({
    data: {
      tenantId,
      buildingId: building.id,
      name: '1º Andar',
      code: 'PISO-1',
      description: 'Primeiro Andar',
      orderIndex: 2,
      isActive: true,
    }
  });
  console.log(`✓ Andar 1º Andar criado`);

  // Criar Quartos no Andar 1
  const roomData1 = [
    { name: '101', code: 'Q-101', roomType: 'Individual', hasBathroom: true, beds: 1 },
    { name: '102', code: 'Q-102', roomType: 'Duplo', hasBathroom: false, beds: 2 },
    { name: '103', code: 'Q-103', roomType: 'Triplo', hasBathroom: true, beds: 3 },
    { name: '104', code: 'Q-104', roomType: 'Coletivo', hasBathroom: true, beds: 4 },
  ];

  for (const roomInfo of roomData1) {
    const room = await prisma.room.create({
      data: {
        tenantId,
        floorId: floor1.id,
        name: roomInfo.name,
        code: roomInfo.code,
        roomNumber: roomInfo.name,
        capacity: roomInfo.beds,
        roomType: roomInfo.roomType,
        hasBathroom: roomInfo.hasBathroom,
        isActive: true,
      }
    });
    console.log(`✓ Quarto ${room.name} (${roomInfo.roomType}) criado`);

    // Criar Leitos para o quarto
    for (let i = 1; i <= roomInfo.beds; i++) {
      const bed = await prisma.bed.create({
        data: {
          tenantId,
          roomId: room.id,
          code: `${room.name}.${i}`,
          status: 'Disponível', // Todos disponíveis por enquanto
          isActive: true,
        }
      });
      console.log(`  ✓ Leito ${bed.code} criado (${bed.status})`);
    }
  }

  // Criar Quartos no Andar 2
  const roomData2 = [
    { name: '201', code: 'Q-201', roomType: 'Individual', hasBathroom: true, beds: 1 },
    { name: '202', code: 'Q-202', roomType: 'Individual', hasBathroom: false, beds: 1 },
    { name: '203', code: 'Q-203', roomType: 'Duplo', hasBathroom: true, beds: 2 },
    { name: '204', code: 'Q-204', roomType: 'Duplo', hasBathroom: true, beds: 2 },
    { name: '205', code: 'Q-205', roomType: 'Triplo', hasBathroom: true, beds: 3 },
  ];

  for (const roomInfo of roomData2) {
    const room = await prisma.room.create({
      data: {
        tenantId,
        floorId: floor2.id,
        name: roomInfo.name,
        code: roomInfo.code,
        roomNumber: roomInfo.name,
        capacity: roomInfo.beds,
        roomType: roomInfo.roomType,
        hasBathroom: roomInfo.hasBathroom,
        isActive: true,
      }
    });
    console.log(`✓ Quarto ${room.name} (${roomInfo.roomType}) criado`);

    // Criar Leitos para o quarto
    for (let i = 1; i <= roomInfo.beds; i++) {
      const bed = await prisma.bed.create({
        data: {
          tenantId,
          roomId: room.id,
          code: `${room.name}.${i}`,
          status: 'Disponível', // Todos disponíveis por enquanto
          isActive: true,
        }
      });
      console.log(`  ✓ Leito ${bed.code} criado (${bed.status})`);
    }
  }

  // ==================== CRIAR RESIDENTES ====================
  console.log('🌱 Criando residentes...');

  const residentes = [
    {
      fullName: 'Enzo Carlos Eduardo da Cruz',
      cpf: '77564832860',
      rg: '281560985',
      birthDate: new Date('1953-01-20'),
      gender: 'MASCULINO' as const,
      bloodType: 'B_NEGATIVO' as const,
      currentPhone: '11993706080',
      height: '1.87',
      weight: '110',
      emergencyContacts: [
        { name: 'Luzia Mirella Alana Bernardes', phone: '11986682521', relationship: 'Filha' },
        { name: 'Benedita Teresinha Heloisa Assunção', phone: '11983919157', relationship: 'Sobrina' }
      ]
    },
    {
      fullName: 'Pietro Guilherme Márcio da Mota',
      cpf: '31912830809',
      rg: '254920391',
      birthDate: new Date('1953-05-11'),
      gender: 'MASCULINO' as const,
      bloodType: 'O_NEGATIVO' as const,
      currentPhone: '15986506547',
      height: '1.78',
      weight: '69',
      emergencyContacts: [
        { name: 'Juan Alexandre Mateus Figueiredo', phone: '19985928215', relationship: 'Filho' },
        { name: 'Severino Bento da Cunha', phone: '16988961403', relationship: 'Amigo' }
      ]
    },
    {
      fullName: 'Benedita Teresinha Heloisa Assunção',
      cpf: '23230328876',
      rg: '157852957',
      birthDate: new Date('1953-04-06'),
      gender: 'FEMININO' as const,
      bloodType: 'B_NEGATIVO' as const,
      currentPhone: '11983919157',
      height: '1.83',
      weight: '79',
      emergencyContacts: [
        { name: 'Enzo Carlos Eduardo da Cruz', phone: '11993706080', relationship: 'Tio' },
        { name: 'Luzia Mirella Alana Bernardes', phone: '11986682521', relationship: 'Amiga' }
      ]
    }
  ];

  // Buscar os 3 primeiros beds para ocupação
  const allBeds = await prisma.bed.findMany({
    where: { tenantId, deletedAt: null },
    take: 3,
  });

  // Criar residentes e associar aos beds
  for (let i = 0; i < residentes.length; i++) {
    const residentData = residentes[i];
    const bed = allBeds[i];

    const resident = await prisma.resident.create({
      data: {
        tenantId,
        fullName: residentData.fullName,
        cpf: residentData.cpf,
        rg: residentData.rg,
        birthDate: residentData.birthDate,
        gender: residentData.gender,
        bloodType: residentData.bloodType,
        currentPhone: residentData.currentPhone,
        height: residentData.height,
        weight: residentData.weight,
        status: 'Ativo',
        bedId: bed?.id,
        emergencyContacts: residentData.emergencyContacts as any,
        admissionDate: new Date(),
      }
    });

    // Marcar o bed como ocupado
    if (bed) {
      await prisma.bed.update({
        where: { id: bed.id },
        data: { status: 'Ocupado' }
      });
    }

    console.log(`✓ Residente ${resident.fullName} criado (Leito: ${bed?.code || 'N/A'})`);
  }

  console.log('✅ Estrutura de gestão de leitos criada!');
  console.log(`   Prédios: 1`);
  console.log(`   Andares: 2`);
  console.log(`   Quartos: 9`);
  console.log(`   Leitos: 19`);
  console.log(`   Residentes: 3 (ocupando 3 leitos)`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
