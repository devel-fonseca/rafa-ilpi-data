import { PrismaClient, PositionCode, RegistrationType, LegalNature, ShiftTemplateType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ILPI Teste data (Tele Engenharia LTDA - Casa de Repouso Santa Teresinha)...');

  // 1. Buscar plano "profissional" (criado pelo seed principal)
  const profissionalPlan = await prisma.plan.findUnique({
    where: { name: 'profissional' },
  });

  if (!profissionalPlan) {
    throw new Error('Plano "profissional" não encontrado. Execute "npm run prisma:seed" primeiro.');
  }

  // 2. Criar Tenant - TELE ENGENHARIA LTDA
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
  console.log(`✓ Tenant created: ${tenant.name}`);

  // 3. Criar Subscription para o tenant
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

  // 4. Aguardar criação do schema do tenant (hook automático)
  // O schema será criado automaticamente pelo hook de tenant creation
  console.log(`⏳ Waiting for tenant schema creation...`);
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Aguardar 2 segundos

  // 5. Criar Tenant Profile
  await prisma.$executeRawUnsafe(`
    INSERT INTO ${tenant.schemaName}.tenant_profiles (
      id, "tenantId", "legalNature", "tradeName", "cnesCode",
      "capacityDeclared", "capacityLicensed", "contactPhone", "contactEmail",
      "foundedAt", "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      '${tenant.id}',
      'EMPRESA_PRIVADA',
      'Casa de Repouso Santa Teresinha',
      '1234567',
      20,
      20,
      '(19) 98152-4849',
      'contato@ilpiteste.com.br',
      '1988-04-22',
      NOW(),
      NOW()
    )
    ON CONFLICT ("tenantId") DO NOTHING
  `);
  console.log(`✓ Tenant Profile created`);

  // 5. Criar Usuários
  const hashedPassword = await bcrypt.hash('Senha@123', 10);

  const usersData = [
    {
      name: 'John Galt',
      email: 'admin@ilpiteste.com.br',
      role: 'ADMIN',
      cpf: '527.388.090-49',
      department: 'Administração',
      positionCode: 'ADMINISTRATOR' as PositionCode,
    },
    {
      name: 'Dagny Taggart',
      email: 'rt@ilpiteste.com.br',
      role: 'ADMIN',
      cpf: '53277135390',
      positionCode: 'TECHNICAL_MANAGER' as PositionCode,
      registrationNumber: '123456',
      registrationState: 'SP',
      registrationType: 'COREN' as RegistrationType,
    },
    {
      name: 'Eddie Willers',
      email: 'cuidador.dia1@ilpiteste.com.br',
      role: 'USER',
      cpf: '02371168394',
      positionCode: 'CAREGIVER' as PositionCode,
    },
    {
      name: 'Nathaniel Branden',
      email: 'tecnico@ilpiteste.com.br',
      role: 'USER',
      cpf: '75375579006',
      positionCode: 'NURSING_TECHNICIAN' as PositionCode,
      registrationNumber: '223456',
      registrationState: 'SP',
      registrationType: 'COREN' as RegistrationType,
    },
    {
      name: 'Wesley Mouch',
      email: 'cuidador.noite1@ilpiteste.com.br',
      role: 'USER',
      cpf: '36835070390',
      positionCode: 'CAREGIVER' as PositionCode,
    },
    {
      name: 'Hugh Askton',
      email: 'cuidador.dia2@ilpiteste.com.br',
      role: 'USER',
      cpf: '39208334309',
      positionCode: 'CAREGIVER' as PositionCode,
    },
    {
      name: 'Floyd Ferris',
      email: 'cuidador.noite2@ilpiteste.com.br',
      role: 'USER',
      cpf: '01822728509',
      positionCode: 'CAREGIVER' as PositionCode,
    },
  ];

  const createdUsers: Array<{ id: string; name: string; email: string }> = [];

  for (const userData of usersData) {
    const userId = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      INSERT INTO ${tenant.schemaName}.users (
        id, "tenantId", email, name, password, role, "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        '${tenant.id}',
        '${userData.email}',
        '${userData.name}',
        '${hashedPassword}',
        '${userData.role}',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    );

    const userIdValue = userId[0].id;
    createdUsers.push({ id: userIdValue, name: userData.name, email: userData.email });

    // Criar User Profile
    await prisma.$executeRawUnsafe(`
      INSERT INTO ${tenant.schemaName}.user_profiles (
        id, "userId", "tenantId", cpf, department, "positionCode",
        "registrationNumber", "registrationState", "registrationType",
        "isNursingCoordinator", "isTechnicalManager",
        "createdBy", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        '${userIdValue}',
        '${tenant.id}',
        ${userData.cpf ? `'${userData.cpf}'` : 'NULL'},
        ${userData.department ? `'${userData.department}'` : 'NULL'},
        ${userData.positionCode ? `'${userData.positionCode}'` : 'NULL'},
        ${userData.registrationNumber ? `'${userData.registrationNumber}'` : 'NULL'},
        ${userData.registrationState ? `'${userData.registrationState}'` : 'NULL'},
        ${userData.registrationType ? `'${userData.registrationType}'` : 'NULL'},
        false,
        false,
        '${userIdValue}',
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId") DO NOTHING
    `);

    console.log(`✓ User created: ${userData.name} (${userData.email})`);
  }

  // Mapear usuários por email para usar nas equipes
  const userMap = createdUsers.reduce(
    (acc, user) => {
      acc[user.email] = user.id;
      return acc;
    },
    {} as Record<string, string>,
  );

  // 6. Criar Equipes de Cuidadores
  const adminUserId = userMap['admin@ilpiteste.com.br'];

  const teamsData = [
    {
      name: 'Equipe A Dia',
      color: '#3B82F6',
      members: [
        { email: 'cuidador.dia1@ilpiteste.com.br', role: null },
        { email: 'tecnico@ilpiteste.com.br', role: 'Líder' },
      ],
    },
    {
      name: 'Equipe A Noite',
      color: '#3B82F6',
      members: [{ email: 'cuidador.noite1@ilpiteste.com.br', role: null }],
    },
    {
      name: 'Equipe B Dia',
      color: '#3B82F6',
      members: [{ email: 'cuidador.dia2@ilpiteste.com.br', role: null }],
    },
    {
      name: 'Equipe B Noite',
      color: '#3B82F6',
      members: [{ email: 'cuidador.noite2@ilpiteste.com.br', role: null }],
    },
  ];

  const createdTeams: Array<{ id: string; name: string }> = [];

  for (const teamData of teamsData) {
    const teamId = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      INSERT INTO ${tenant.schemaName}.teams (
        id, "tenantId", name, "isActive", color, "createdBy", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        '${tenant.id}',
        '${teamData.name}',
        true,
        '${teamData.color}',
        '${adminUserId}',
        NOW(),
        NOW()
      )
      RETURNING id
    `,
    );

    const teamIdValue = teamId[0].id;
    createdTeams.push({ id: teamIdValue, name: teamData.name });

    // Adicionar membros à equipe
    for (const member of teamData.members) {
      const userId = userMap[member.email];
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${tenant.schemaName}.team_members (
          id, "tenantId", "teamId", "userId", role, "addedBy", "addedAt"
        )
        VALUES (
          gen_random_uuid(),
          '${tenant.id}',
          '${teamIdValue}',
          '${userId}',
          ${member.role ? `'${member.role}'` : 'NULL'},
          '${adminUserId}',
          NOW()
        )
      `);
    }

    console.log(`✓ Team created: ${teamData.name} with ${teamData.members.length} members`);
  }

  // Mapear equipes por nome
  const teamMap = createdTeams.reduce(
    (acc, team) => {
      acc[team.name] = team.id;
      return acc;
    },
    {} as Record<string, string>,
  );

  // 7. Buscar Shift Templates (DAY_12H e NIGHT_12H)
  const dayShiftTemplate = await prisma.shiftTemplate.findUnique({
    where: { type: 'DAY_12H' },
  });

  const nightShiftTemplate = await prisma.shiftTemplate.findUnique({
    where: { type: 'NIGHT_12H' },
  });

  if (!dayShiftTemplate || !nightShiftTemplate) {
    throw new Error('Shift templates DAY_12H ou NIGHT_12H não encontrados');
  }

  // 8. Criar Padrão Semanal Quinzenal
  const patternId = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
    INSERT INTO ${tenant.schemaName}.weekly_schedule_patterns (
      id, "tenantId", name, description, "isActive", "startDate", "numberOfWeeks",
      "createdBy", "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      '${tenant.id}',
      'Padrão Quinzenal',
      'Padrão recorrente de 2 semana(s)',
      true,
      '2026-01-19',
      2,
      '${adminUserId}',
      NOW(),
      NOW()
    )
    RETURNING id
  `,
  );

  const patternIdValue = patternId[0].id;
  console.log(`✓ Weekly Pattern created: Padrão Quinzenal (2 weeks)`);

  // 9. Criar Pattern Assignments (28 assignments: 2 turnos × 7 dias × 2 semanas)
  const patternAssignments = [
    // Semana 0 (Domingo a Sábado) - Equipe A
    { weekNumber: 0, dayOfWeek: 0, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe A Dia' },
    { weekNumber: 0, dayOfWeek: 0, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe A Noite' },
    { weekNumber: 0, dayOfWeek: 1, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe B Dia' },
    { weekNumber: 0, dayOfWeek: 1, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe B Noite' },
    { weekNumber: 0, dayOfWeek: 2, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe A Dia' },
    { weekNumber: 0, dayOfWeek: 2, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe A Noite' },
    { weekNumber: 0, dayOfWeek: 3, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe B Dia' },
    { weekNumber: 0, dayOfWeek: 3, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe B Noite' },
    { weekNumber: 0, dayOfWeek: 4, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe A Dia' },
    { weekNumber: 0, dayOfWeek: 4, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe A Noite' },
    { weekNumber: 0, dayOfWeek: 5, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe B Dia' },
    { weekNumber: 0, dayOfWeek: 5, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe B Noite' },
    { weekNumber: 0, dayOfWeek: 6, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe A Dia' },
    { weekNumber: 0, dayOfWeek: 6, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe A Noite' },

    // Semana 1 (Domingo a Sábado) - Equipe B
    { weekNumber: 1, dayOfWeek: 0, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe B Dia' },
    { weekNumber: 1, dayOfWeek: 0, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe B Noite' },
    { weekNumber: 1, dayOfWeek: 1, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe A Dia' },
    { weekNumber: 1, dayOfWeek: 1, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe A Noite' },
    { weekNumber: 1, dayOfWeek: 2, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe B Dia' },
    { weekNumber: 1, dayOfWeek: 2, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe B Noite' },
    { weekNumber: 1, dayOfWeek: 3, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe A Dia' },
    { weekNumber: 1, dayOfWeek: 3, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe A Noite' },
    { weekNumber: 1, dayOfWeek: 4, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe B Dia' },
    { weekNumber: 1, dayOfWeek: 4, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe B Noite' },
    { weekNumber: 1, dayOfWeek: 5, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe A Dia' },
    { weekNumber: 1, dayOfWeek: 5, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe A Noite' },
    { weekNumber: 1, dayOfWeek: 6, shiftType: 'DAY_12H' as ShiftTemplateType, teamName: 'Equipe B Dia' },
    { weekNumber: 1, dayOfWeek: 6, shiftType: 'NIGHT_12H' as ShiftTemplateType, teamName: 'Equipe B Noite' },
  ];

  for (const assignment of patternAssignments) {
    const shiftTemplateId = assignment.shiftType === 'DAY_12H' ? dayShiftTemplate.id : nightShiftTemplate.id;
    const teamId = teamMap[assignment.teamName];

    await prisma.$executeRawUnsafe(`
      INSERT INTO ${tenant.schemaName}.weekly_schedule_pattern_assignments (
        id, "tenantId", "patternId", "weekNumber", "dayOfWeek", "shiftTemplateId", "teamId",
        "createdBy", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        '${tenant.id}',
        '${patternIdValue}',
        ${assignment.weekNumber},
        ${assignment.dayOfWeek},
        '${shiftTemplateId}',
        '${teamId}',
        '${adminUserId}',
        NOW(),
        NOW()
      )
    `);
  }

  console.log(`✓ Pattern Assignments created: 28 assignments (2 weeks × 7 days × 2 shifts)`);

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Tenant: ${tenant.name}`);
  console.log(`   - Users: ${createdUsers.length}`);
  console.log(`   - Teams: ${createdTeams.length}`);
  console.log(`   - Weekly Pattern: Padrão Quinzenal (2 weeks)`);
  console.log(`   - Pattern Assignments: 28`);
  console.log('\n🔑 Login credentials:');
  console.log(`   Email: admin@ilpiteste.com.br`);
  console.log(`   Password: Senha@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
