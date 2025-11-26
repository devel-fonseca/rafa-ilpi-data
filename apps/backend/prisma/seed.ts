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

  let tenant = existingTenant;

  if (existingTenant) {
    console.log('✓ Tenant de exemplo já existe');
  } else {

    // Buscar o plano Free
    const freePlan = await prisma.plan.findUnique({
      where: { name: 'free' }
    });

    if (!freePlan) {
      console.error('❌ Plano FREE não encontrado');
      return;
    }

    // Criar tenant de exemplo
    tenant = await prisma.tenant.create({
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

  // Seed Gestão de Leitos
  await seedBedsManagement(tenant.id);
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
      fullName: 'Adriana Ferreira',
      cpf: '229.849.488-66',
      rg: '34.946.542-3',
      rgIssuer: 'SSP-SP',
      birthDate: new Date('1949-02-17'),
      gender: 'FEMININO' as const,
      civilStatus: 'VIUVO' as const,
      bloodType: 'O_NEGATIVO' as const,
      currentPhone: '(19) 32321-122',
      currentCep: '13054-020',
      currentState: 'SP',
      currentCity: 'Campinas',
      currentStreet: 'Rua Alaor Corrêa Telles',
      currentNumber: '491',
      currentDistrict: 'Jardim Cristina',
      motherName: 'Mariana Ferreira',
      fatherName: 'José Arlindo Ferreira',
      nationality: 'Brasileira',
      birthCity: 'Campinas',
      birthState: 'SP',
      education: 'Superior',
      profession: 'Aposentada',
      religion: 'Católica',
      cns: '234476256650003',
      height: '1.55',
      weight: '66',
      dependencyLevel: 'Grau I - Independente',
      healthStatus: 'Idosa de 76 anos, com HTA controlada, deambula com ritmo lento e sem apoio. Mantém boa orientação, mas requer rotina assistida e controle regular da PA.',
      specialNeeds: 'Apoio leve no banho, controle regular da pressão e acompanhamento nutricional.',
      functionalAspects: 'Independente na rotina, porém com lentificação e menor resistência física.',
      medicationsOnAdmission: 'Losartana, Hidroclorotiazida, AAS, Vitamina D',
      allergies: 'Dipirona, Amoxicilina, AINEs',
      chronicConditions: 'HTA, Dislipidemia, Osteoartrite leve de joelhos',
      dietaryRestrictions: 'Alimentação controlada para HTA, evitando industrializados e excesso de sal.',
      admissionDate: new Date('2025-06-11'),
      admissionType: 'Voluntária',
      admissionReason: 'Necessidade de rotina supervisionada para monitoramento da hipertensão e apoio leve nas atividades de autocuidado.',
      admissionConditions: 'Chega orientada e colaborativa, PA controlada, ambulando sem auxílio. Traz plano medicamentoso atual e contatos de referência.',
      emergencyContacts: [
        { name: 'Cris Ferreira', phone: '(19) 99911-2233', relationship: 'Filha' },
        { name: 'Sandro A. Ferreira', phone: '(19) 99922-3344', relationship: 'Filho' }
      ]
    },
    {
      fullName: 'Camila dos Santos',
      cpf: '469.124.921-42',
      rg: '25.044.919-3',
      rgIssuer: 'SSP-SP',
      birthDate: new Date('1954-06-14'),
      gender: 'FEMININO' as const,
      civilStatus: 'VIUVO' as const,
      bloodType: 'A_POSITIVO' as const,
      currentPhone: '(19) 32367-788',
      currentCep: '13081-110',
      currentState: 'SP',
      currentCity: 'Campinas',
      currentStreet: 'Rua dos Iguás',
      currentNumber: '122',
      currentDistrict: 'Vila Costa e Silva',
      motherName: 'Ana Maria Pinheiro',
      fatherName: 'Marcos Ribeiro dos Santos',
      nationality: 'Brasileira',
      birthCity: 'São Vicente',
      birthState: 'SP',
      education: 'Superior',
      profession: 'Aposentada',
      religion: 'Sem religião',
      height: '1.58',
      weight: '64',
      dependencyLevel: 'Grau I - Independente',
      specialNeeds: 'Monitoramento diário de glicemia e organização medicamentosa.',
      functionalAspects: 'Deambula com segurança; realiza ABVDs com supervisão leve.',
      dietaryRestrictions: 'Dieta para DM2, controle de carboidratos e redução de açúcar e sódio.',
      admissionDate: new Date('2025-06-20'),
      admissionType: 'Voluntária',
      admissionReason: 'Busca de rotina estruturada de cuidados, monitoramento glicêmico e suporte nas atividades diárias',
      admissionConditions: 'Chega orientada, sem lesões cutâneas, com medicamentos e receitas atualizadas. Acompanha documentos médicos básicos e exames recentes.',
      legalGuardianName: 'Fabiana Toledo dos Santos',
      legalGuardianPhone: '(19) 99922-3344',
      legalGuardianType: 'Responsável Familiar (Convencional)',
      legalGuardianCep: '13081-110',
      legalGuardianState: 'SP',
      legalGuardianCity: 'Campinas',
      legalGuardianStreet: 'Rua dos Iguás',
      legalGuardianNumber: '122',
      legalGuardianDistrict: 'Vila Costa e Silva',
      emergencyContacts: [
        { name: 'Fabiana Toledo', phone: '(19) 99922-3344', relationship: 'Sobrinha' }
      ]
    },
    {
      fullName: 'Tereza Heloisa Assunção',
      cpf: '232.303.288-76',
      rg: '15.785.295-7',
      rgIssuer: 'SSP-SP',
      birthDate: new Date('1953-04-04'),
      gender: 'FEMININO' as const,
      civilStatus: 'VIUVO' as const,
      bloodType: 'A_POSITIVO' as const,
      currentPhone: '(19) 99983-2460',
      currentCep: '13059-605',
      currentState: 'SP',
      currentCity: 'Campinas',
      currentStreet: 'Rua Professor Mário Scolari',
      currentNumber: '18',
      currentDistrict: 'Cidade Satélite Íris',
      motherName: 'Fernanda Assunção',
      fatherName: 'Não declarado',
      nationality: 'Brasileira',
      birthCity: 'Campinas',
      birthState: 'SP',
      education: 'Superior',
      profession: 'Aposentada',
      religion: 'Sem religião',
      height: '1.72',
      weight: '70',
      dependencyLevel: 'Grau II - Parcialmente Dependente',
      admissionDate: new Date('2025-06-19'),
      admissionType: 'Voluntária',
      emergencyContacts: [
        { name: 'Barbara Santos', phone: '(19) 99944-3322', relationship: 'Irmã' }
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
