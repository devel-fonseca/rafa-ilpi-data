import { PrismaClient, Gender, CivilStatus, PositionCode, RegistrationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding example data (Casa de Repouso São Rafael - Campinas)...');

  // 1. Buscar plano "profissional" (criado pelo seed principal)
  const profissionalPlan = await prisma.plan.findUnique({
    where: { name: 'profissional' },
  });

  if (!profissionalPlan) {
    throw new Error('Plano "profissional" não encontrado. Execute "npm run prisma:seed" primeiro.');
  }

  // 2. Criar Tenant - Casa de Repouso São Rafael
  const tenant = await prisma.tenant.upsert({
    where: { cnpj: '23.456.789/0001-01' },
    update: {},
    create: {
      name: 'Casa de Repouso São Rafael',
      slug: 'casa-sao-rafael-campinas',
      cnpj: '23.456.789/0001-01',
      email: 'contato@casasaorafael.com.br',
      phone: '(19) 3521-8900',
      schemaName: 'casa_sao_rafael',
      status: 'ACTIVE',
      // Endereço detalhado (estrutura real do schema)
      addressStreet: 'Rua Dr. Quirino',
      addressNumber: '1850',
      addressDistrict: 'Centro',
      addressCity: 'Campinas',
      addressState: 'SP',
      addressZipCode: '13015-082',
    },
  });
  console.log(`✓ Tenant created: ${tenant.name}`);

  // 3. Criar Subscription para o tenant (se não existir)
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
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dias
      },
    });
    console.log(`✓ Subscription created for tenant`);
  } else {
    console.log(`✓ Subscription already exists for tenant`);
  }

  // 4. Criar Usuários - Estrutura Real de ILPI
  // Senha padrão: Senha@123
  const hashedPassword = await bcrypt.hash('Senha@123', 10);

  const users = [
    // Proprietário/Sócio (ADMIN) - SEM positionCode
    {
      tenantId: tenant.id,
      name: 'Rafael Augusto Camargo',
      email: 'admin@teste.com.br',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
    // Médico (USER) - DOCTOR
    {
      tenantId: tenant.id,
      name: 'Dr. Roberto Fernandes Lopes',
      email: 'medico@teste.com.br',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
    },
    // RT Enfermeiro (USER) - NURSE + isTechnicalManager
    {
      tenantId: tenant.id,
      name: 'Fernanda Almeida Santos',
      email: 'rt@teste.com.br',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
    },
    // Administrativo (USER) - ADMINISTRATIVE_ASSISTANT
    {
      tenantId: tenant.id,
      name: 'Juliana Costa Martins',
      email: 'administrativo@teste.com.br',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
    },
    // Cuidadores - Escala 12x36h (2 diurnos + 2 noturnos) - CAREGIVER
    {
      tenantId: tenant.id,
      name: 'Carlos Mendes Silva',
      email: 'cuidador.dia1@teste.com.br',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
    },
    {
      tenantId: tenant.id,
      name: 'Simone Oliveira Cardoso',
      email: 'cuidador.dia2@teste.com.br',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
    },
    {
      tenantId: tenant.id,
      name: 'Marcelo Ribeiro Costa',
      email: 'cuidador.noite1@teste.com.br',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
    },
    {
      tenantId: tenant.id,
      name: 'Patricia Santos Lima',
      email: 'cuidador.noite2@teste.com.br',
      password: hashedPassword,
      role: 'USER',
      isActive: true,
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: userData.email,
        },
      },
      update: {},
      create: userData,
    });
    createdUsers.push(user);
    console.log(`✓ User created: ${user.name} (${user.email})`);
  }

  // 4.1. Criar UserProfiles com positionCodes
  const adminUser = createdUsers.find((u) => u.email === 'admin@teste.com.br')!;
  const medicoUser = createdUsers.find((u) => u.email === 'medico@teste.com.br')!;
  const rtUser = createdUsers.find((u) => u.email === 'rt@teste.com.br')!;
  const adminstrativoUser = createdUsers.find((u) => u.email === 'administrativo@teste.com.br')!;
  const cuidadorDia1User = createdUsers.find((u) => u.email === 'cuidador.dia1@teste.com.br')!;
  const cuidadorDia2User = createdUsers.find((u) => u.email === 'cuidador.dia2@teste.com.br')!;
  const cuidadorNoite1User = createdUsers.find((u) => u.email === 'cuidador.noite1@teste.com.br')!;
  const cuidadorNoite2User = createdUsers.find((u) => u.email === 'cuidador.noite2@teste.com.br')!;

  // Admin: ADMINISTRATOR
  await prisma.userProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      tenantId: tenant.id,
      positionCode: PositionCode.ADMINISTRATOR,
      createdBy: adminUser.id,
    },
  });
  console.log(`✓ UserProfile created for Admin (ADMINISTRATOR)`);

  // Médico: DOCTOR + CRM/SP 98765
  await prisma.userProfile.upsert({
    where: { userId: medicoUser.id },
    update: {},
    create: {
      userId: medicoUser.id,
      tenantId: tenant.id,
      positionCode: PositionCode.DOCTOR,
      registrationType: RegistrationType.CRM,
      registrationNumber: '98765',
      registrationState: 'SP',
      createdBy: adminUser.id,
    },
  });
  console.log(`✓ UserProfile created for Médico (DOCTOR - CRM/SP 98765)`);

  // RT Enfermeiro: NURSE + COREN/SP 198765 + isTechnicalManager
  await prisma.userProfile.upsert({
    where: { userId: rtUser.id },
    update: {},
    create: {
      userId: rtUser.id,
      tenantId: tenant.id,
      positionCode: PositionCode.NURSE,
      registrationType: RegistrationType.COREN,
      registrationNumber: '198765',
      registrationState: 'SP',
      isTechnicalManager: true,
      createdBy: adminUser.id,
    },
  });
  console.log(`✓ UserProfile created for RT Enfermeiro (NURSE - COREN/SP 198765 - RT)`);

  // Administrativo: ADMINISTRATIVE_ASSISTANT
  await prisma.userProfile.upsert({
    where: { userId: adminstrativoUser.id },
    update: {},
    create: {
      userId: adminstrativoUser.id,
      tenantId: tenant.id,
      positionCode: PositionCode.ADMINISTRATIVE_ASSISTANT,
      createdBy: adminUser.id,
    },
  });
  console.log(`✓ UserProfile created for Administrativo (ADMINISTRATIVE_ASSISTANT)`);

  // Cuidador Dia 1: CAREGIVER
  await prisma.userProfile.upsert({
    where: { userId: cuidadorDia1User.id },
    update: {},
    create: {
      userId: cuidadorDia1User.id,
      tenantId: tenant.id,
      positionCode: PositionCode.CAREGIVER,
      createdBy: adminUser.id,
    },
  });
  console.log(`✓ UserProfile created for Cuidador Dia 1 (CAREGIVER)`);

  // Cuidador Dia 2: CAREGIVER
  await prisma.userProfile.upsert({
    where: { userId: cuidadorDia2User.id },
    update: {},
    create: {
      userId: cuidadorDia2User.id,
      tenantId: tenant.id,
      positionCode: PositionCode.CAREGIVER,
      createdBy: adminUser.id,
    },
  });
  console.log(`✓ UserProfile created for Cuidador Dia 2 (CAREGIVER)`);

  // Cuidador Noite 1: CAREGIVER
  await prisma.userProfile.upsert({
    where: { userId: cuidadorNoite1User.id },
    update: {},
    create: {
      userId: cuidadorNoite1User.id,
      tenantId: tenant.id,
      positionCode: PositionCode.CAREGIVER,
      createdBy: adminUser.id,
    },
  });
  console.log(`✓ UserProfile created for Cuidador Noite 1 (CAREGIVER)`);

  // Cuidador Noite 2: CAREGIVER
  await prisma.userProfile.upsert({
    where: { userId: cuidadorNoite2User.id },
    update: {},
    create: {
      userId: cuidadorNoite2User.id,
      tenantId: tenant.id,
      positionCode: PositionCode.CAREGIVER,
      createdBy: adminUser.id,
    },
  });
  console.log(`✓ UserProfile created for Cuidador Noite 2 (CAREGIVER)`);


  // 5. Criar Estrutura de Acomodações
  // 1 prédio "Casa Principal", 1 andar Térreo, 8 quartos (20 leitos total)
  // Padrão: CT-XXX-Y (Casa Térrea-NumeroQuarto-Leito)

  let building = await prisma.building.findFirst({
    where: {
      tenantId: tenant.id,
      code: 'C',
    },
  });

  if (!building) {
    building = await prisma.building.create({
      data: {
        tenantId: tenant.id,
        name: 'Casa Principal',
        code: 'C',
        description: 'Edifício residencial principal',
        isActive: true,
      },
    });
    console.log(`✓ Building created: ${building.name}`);
  } else {
    console.log(`✓ Building exists: ${building.name}`);
  }

  let floor = await prisma.floor.findFirst({
    where: {
      buildingId: building.id,
      code: 'T',
    },
  });

  if (!floor) {
    floor = await prisma.floor.create({
      data: {
        tenantId: tenant.id,
        buildingId: building.id,
        name: 'Térreo',
        code: 'T',
        orderIndex: 0,
        description: 'Andar térreo',
        isActive: true,
      },
    });
    console.log(`✓ Floor created: ${floor.name}`);
  } else {
    console.log(`✓ Floor exists: ${floor.name}`);
  }

  // 8 quartos: 4 individuais (1 leito) + 4 coletivos (4 leitos) = 20 leitos
  const roomsData = [
    { name: 'Quarto 1', code: '001', capacity: 1 },
    { name: 'Quarto 2', code: '002', capacity: 1 },
    { name: 'Quarto 3', code: '003', capacity: 1 },
    { name: 'Quarto 4', code: '004', capacity: 1 },
    { name: 'Quarto 5', code: '005', capacity: 4 },
    { name: 'Quarto 6', code: '006', capacity: 4 },
    { name: 'Quarto 7', code: '007', capacity: 4 },
    { name: 'Quarto 8', code: '008', capacity: 4 },
  ];

  const allBeds = [];

  for (const roomData of roomsData) {
    let room = await prisma.room.findFirst({
      where: {
        floorId: floor.id,
        code: roomData.code,
      },
    });

    if (!room) {
      room = await prisma.room.create({
        data: {
          tenantId: tenant.id,
          floorId: floor.id,
          name: roomData.name,
          code: roomData.code,
          roomNumber: roomData.code, // "001", "002", etc
          roomType: roomData.capacity === 1 ? 'Individual' : 'Coletivo',
          capacity: roomData.capacity,
          isActive: true,
        },
      });
      console.log(`✓ Room created: ${room.name}`);
    } else {
      console.log(`✓ Room exists: ${room.name}`);
    }

    // Criar leitos no padrão CT-XXX-Y
    for (let bedNum = 1; bedNum <= roomData.capacity; bedNum++) {
      const bedLetter = String.fromCharCode(64 + bedNum); // A, B, C, D
      const bedCode = `CT-${roomData.code}-${bedLetter}`;

      const bed = await prisma.bed.upsert({
        where: {
          tenantId_code: {
            tenantId: tenant.id,
            code: bedCode,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          roomId: room.id,
          code: bedCode,
          status: 'Disponível',
        },
      });
      allBeds.push(bed);
      console.log(`✓ Bed: ${bed.code}`);
    }
  }

  // 6. Criar Residentes (8 residentes - ocupação ~40%)
  const residentsData = [
    {
      fullName: 'José da Silva Santos',
      socialName: null,
      cpf: '123.456.789-01',
      rg: '12.345.678-9',
      cns: '123 4567 8901 0001',
      birthDate: new Date('1940-03-15'),
      gender: Gender.MASCULINO,
      civilStatus: CivilStatus.VIUVO,
      currentPhone: '(19) 98101-2001',
      admissionDate: new Date('2023-06-15'),
      status: 'Ativo',
      dependencyLevel: 'I1',
      education: 'Ensino Fundamental Incompleto',
      bedId: allBeds[0]?.id, // 101-A
      legalGuardianName: 'Maria Silva Santos',
      legalGuardianPhone: '(19) 99301-4001',
      legalGuardianCpf: '234.567.890-12',
      tenantId: tenant.id,
      createdBy: adminUser.id,
    },
    {
      fullName: 'Ana Costa Oliveira',
      socialName: 'Dona Ana',
      cpf: '234.567.890-23',
      rg: '23.456.789-0',
      cns: '234 5678 9012 0002',
      birthDate: new Date('1938-11-22'),
      gender: Gender.FEMININO,
      civilStatus: CivilStatus.CASADO,
      currentPhone: '(19) 98102-3002',
      admissionDate: new Date('2023-08-20'),
      status: 'Ativo',
      dependencyLevel: 'I2',
      education: 'Ensino Fundamental Completo',
      bedId: allBeds[1]?.id, // 102-A
      legalGuardianName: 'Pedro Costa Oliveira',
      legalGuardianPhone: '(19) 99234-5002',
      legalGuardianCpf: '345.678.901-34',
      tenantId: tenant.id,
      createdBy: adminUser.id,
    },
    {
      fullName: 'Pedro Henrique Souza',
      socialName: null,
      cpf: '345.678.901-45',
      rg: '34.567.890-1',
      cns: '345 6789 0123 0003',
      birthDate: new Date('1944-07-08'),
      gender: Gender.MASCULINO,
      civilStatus: CivilStatus.SOLTEIRO,
      admissionDate: new Date('2024-01-10'),
      status: 'Ativo',
      dependencyLevel: 'I3',
      education: 'Ensino Médio Completo',
      bedId: allBeds[2]?.id, // 103-A
      legalGuardianName: 'Defensoria Pública do Estado de São Paulo',
      legalGuardianPhone: '(19) 3333-4444',
      legalGuardianCpf: null,
      tenantId: tenant.id,
      createdBy: adminUser.id,
    },
    {
      fullName: 'Mariana Fernandes Lima',
      socialName: 'Dona Mariana',
      cpf: '456.789.012-56',
      rg: '45.678.901-2',
      cns: '456 7890 1234 0004',
      birthDate: new Date('1942-05-30'),
      gender: Gender.FEMININO,
      civilStatus: CivilStatus.VIUVO,
      currentPhone: '(19) 98130-3003',
      admissionDate: new Date('2023-09-05'),
      status: 'Ativo',
      dependencyLevel: 'I1',
      education: 'Ensino Superior Completo',
      bedId: allBeds[3]?.id, // 104-A
      legalGuardianName: 'Roberto Fernandes Lima',
      legalGuardianPhone: '(19) 99345-6003',
      legalGuardianCpf: '567.890.123-67',
      tenantId: tenant.id,
      createdBy: adminUser.id,
    },
    {
      fullName: 'Francisco Carlos Almeida',
      socialName: 'Seu Chico',
      cpf: '567.890.123-78',
      rg: '56.789.012-3',
      cns: '567 8901 2345 0005',
      birthDate: new Date('1943-09-12'),
      gender: Gender.MASCULINO,
      civilStatus: CivilStatus.DIVORCIADO,
      currentPhone: '(19) 98140-4004',
      admissionDate: new Date('2024-02-14'),
      status: 'Ativo',
      dependencyLevel: 'I2',
      education: 'Ensino Médio Incompleto',
      bedId: allBeds[4]?.id, // 104-B
      legalGuardianName: 'Carla Almeida Santos',
      legalGuardianPhone: '(19) 99456-7004',
      legalGuardianCpf: '678.901.234-89',
      tenantId: tenant.id,
      createdBy: adminUser.id,
    },
    {
      fullName: 'Rosa Maria Pereira',
      socialName: 'Dona Rosa',
      cpf: '678.901.234-90',
      rg: '67.890.123-4',
      cns: '678 9012 3456 0006',
      birthDate: new Date('1936-12-03'),
      gender: Gender.FEMININO,
      civilStatus: CivilStatus.VIUVO,
      admissionDate: new Date('2023-11-18'),
      status: 'Ativo',
      dependencyLevel: 'I3',
      education: 'Não Alfabetizado',
      bedId: allBeds[7]?.id, // 105-A
      legalGuardianName: 'João Pereira Neto',
      legalGuardianPhone: '(19) 99567-8005',
      legalGuardianCpf: '789.012.345-01',
      tenantId: tenant.id,
      createdBy: adminUser.id,
    },
    {
      fullName: 'Antonio Carlos Ribeiro',
      socialName: 'Toninho',
      cpf: '789.012.345-12',
      rg: '78.901.234-5',
      cns: '789 0123 4567 0007',
      birthDate: new Date('1939-04-17'),
      gender: Gender.MASCULINO,
      civilStatus: CivilStatus.CASADO,
      currentPhone: '(19) 98150-5005',
      admissionDate: new Date('2024-03-22'),
      status: 'Ativo',
      dependencyLevel: 'I2',
      education: 'Ensino Médio Completo',
      bedId: allBeds[8]?.id, // 105-B
      legalGuardianName: 'Helena Ribeiro Costa',
      legalGuardianPhone: '(19) 99678-9006',
      legalGuardianCpf: '890.123.456-23',
      tenantId: tenant.id,
      createdBy: adminUser.id,
    },
    {
      fullName: 'Cecília Aparecida Rodrigues',
      socialName: null,
      cpf: '890.123.456-34',
      rg: '89.012.345-6',
      cns: '890 1234 5678 0008',
      birthDate: new Date('1941-08-25'),
      gender: Gender.FEMININO,
      civilStatus: CivilStatus.SOLTEIRO,
      admissionDate: new Date('2023-07-30'),
      status: 'Ativo',
      dependencyLevel: 'I1',
      education: 'Ensino Fundamental Incompleto',
      bedId: allBeds[11]?.id, // 106-A
      legalGuardianName: 'Marcos Rodrigues Silva',
      legalGuardianPhone: '(19) 99789-0107',
      legalGuardianCpf: '901.234.567-45',
      tenantId: tenant.id,
      createdBy: adminUser.id,
    },
  ];

  const createdResidents = [];
  for (const residentData of residentsData) {
    const resident = await prisma.resident.upsert({
      where: {
        tenantId_cpf: {
          tenantId: tenant.id,
          cpf: residentData.cpf,
        },
      },
      update: {},
      create: residentData,
    });
    createdResidents.push(resident);
    console.log(`✓ Resident created: ${resident.fullName}`);
  }

  console.log('\n📊 RESUMO DO SEED:');
  console.log(`   ✓ 1 Tenant: ${tenant.name}`);
  console.log(`   ✓ ${createdUsers.length} Usuários com UserProfiles:`);
  console.log(`      - 1 ADMIN (ADMINISTRATOR)`);
  console.log(`      - 1 DOCTOR (CRM/SP 98765)`);
  console.log(`      - 1 NURSE/RT (COREN/SP 198765 + isTechnicalManager)`);
  console.log(`      - 1 ADMINISTRATIVE_ASSISTANT`);
  console.log(`      - 4 CAREGIVER (escala 12x36h)`);
  console.log(`   ✓ 1 Prédio, 1 Andar, ${roomsData.length} Quartos`);
  console.log(`   ✓ ${allBeds.length} Leitos (capacidade total)`);
  console.log(`   ✓ ${createdResidents.length} Residentes (~40% ocupação)`);

  // ========================================
  // 10. ATUALIZAR STATUS DOS LEITOS OCUPADOS
  // ========================================
  console.log('\n🔄 Atualizando status dos leitos ocupados...');
  let bedsUpdated = 0;
  for (const resident of createdResidents) {
    if (resident.bedId) {
      await prisma.bed.update({
        where: { id: resident.bedId },
        data: {
          status: 'Ocupado',
        },
      });
      bedsUpdated++;
    }
  }
  console.log(`   ✓ ${bedsUpdated} Leitos atualizados para status 'Ocupado'`);

  console.log('\n✅ Seed de exemplo concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
