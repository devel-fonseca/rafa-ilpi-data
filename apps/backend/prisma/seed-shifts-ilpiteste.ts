import { PrismaClient, ShiftTemplateType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed 3/3: Criar Equipes e Padrão Semanal ILPI Teste
 *
 * Cria:
 * - 4 Teams (Equipe A Dia, Equipe A Noite, Equipe B Dia, Equipe B Noite)
 * - 5 Team Members (2 na Equipe A Dia, 1 em cada outra equipe)
 * - 1 Weekly Schedule Pattern (Padrão Quinzenal - 2 semanas)
 * - 28 Pattern Assignments (2 turnos × 7 dias × 2 semanas)
 */
async function main() {
  console.log('🌱 [3/3] Seeding Care Shifts ILPI Teste...\n');

  // 1. Buscar Tenant
  const tenant = await prisma.tenant.findUnique({
    where: { cnpj: '51.482.599/0001-88' },
  });

  if (!tenant) {
    throw new Error('❌ Tenant não encontrado. Execute "npm run prisma:seed:tenant-ilpiteste" primeiro.');
  }

  console.log(`✓ Tenant encontrado: ${tenant.name}\n`);

  // 2. Buscar usuários
  const users = await prisma.$queryRawUnsafe<Array<{ id: string; email: string; name: string }>>(
    `SELECT id, email, name FROM ${tenant.schemaName}.users WHERE "deletedAt" IS NULL ORDER BY name`,
  );

  if (users.length === 0) {
    throw new Error('❌ Nenhum usuário encontrado. Execute "npm run prisma:seed:users-ilpiteste" primeiro.');
  }

  const userMap = users.reduce(
    (acc, user) => {
      acc[user.email] = { id: user.id, name: user.name };
      return acc;
    },
    {} as Record<string, { id: string; name: string }>,
  );

  console.log(`✓ ${users.length} usuários encontrados\n`);

  const adminUserId = userMap['admin@ilpiteste.com.br']?.id;
  if (!adminUserId) {
    throw new Error('❌ Usuário admin não encontrado');
  }

  // 3. Criar Equipes
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
    try {
      // Verificar se equipe já existe
      const existingTeam = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM ${tenant.schemaName}.teams WHERE name = '${teamData.name}' AND "deletedAt" IS NULL LIMIT 1`,
      );

      let teamIdValue: string;

      if (existingTeam.length > 0) {
        console.log(`⚠ ${teamData.name} - Já existe`);
        teamIdValue = existingTeam[0].id;
      } else {
        // Criar equipe
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

        teamIdValue = teamId[0].id;
        console.log(`✓ ${teamData.name} criada`);
      }

      createdTeams.push({ id: teamIdValue, name: teamData.name });

      // Adicionar membros
      for (const member of teamData.members) {
        const user = userMap[member.email];
        if (!user) {
          console.warn(`⚠ Usuário ${member.email} não encontrado, pulando...`);
          continue;
        }

        // Verificar se membro já está na equipe
        const existingMember = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `
          SELECT id FROM ${tenant.schemaName}.team_members
          WHERE "teamId" = '${teamIdValue}' AND "userId" = '${user.id}' AND "removedAt" IS NULL
          LIMIT 1
        `,
        );

        if (existingMember.length > 0) {
          console.log(`  ⚠ ${user.name} já é membro`);
          continue;
        }

        await prisma.$executeRawUnsafe(`
          INSERT INTO ${tenant.schemaName}.team_members (
            id, "tenantId", "teamId", "userId", role, "addedBy", "addedAt"
          )
          VALUES (
            gen_random_uuid(),
            '${tenant.id}',
            '${teamIdValue}',
            '${user.id}',
            ${member.role ? `'${member.role}'` : 'NULL'},
            '${adminUserId}',
            NOW()
          )
        `);

        console.log(`  ✓ ${user.name}${member.role ? ` (${member.role})` : ''}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao criar equipe ${teamData.name}:`, error);
      throw error;
    }
  }

  console.log(`\n✓ ${createdTeams.length} equipes configuradas\n`);

  // 4. Buscar Shift Templates
  const dayShiftTemplate = await prisma.shiftTemplate.findUnique({
    where: { type: 'DAY_12H' },
  });

  const nightShiftTemplate = await prisma.shiftTemplate.findUnique({
    where: { type: 'NIGHT_12H' },
  });

  if (!dayShiftTemplate || !nightShiftTemplate) {
    throw new Error('❌ Shift templates DAY_12H ou NIGHT_12H não encontrados');
  }

  console.log(`✓ Shift Templates encontrados (Dia 12h, Noite 12h)\n`);

  // 5. Criar Padrão Semanal Quinzenal
  const existingPattern = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
    SELECT id FROM ${tenant.schemaName}.weekly_schedule_patterns
    WHERE "isActive" = true AND "deletedAt" IS NULL
    LIMIT 1
  `,
  );

  let patternIdValue: string;

  if (existingPattern.length > 0) {
    console.log(`⚠ Padrão semanal ativo já existe\n`);
    patternIdValue = existingPattern[0].id;
  } else {
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

    patternIdValue = patternId[0].id;
    console.log(`✓ Padrão Quinzenal criado (início: 2026-01-19)\n`);
  }

  // 6. Mapear equipes
  const teamMap = createdTeams.reduce(
    (acc, team) => {
      acc[team.name] = team.id;
      return acc;
    },
    {} as Record<string, string>,
  );

  // 7. Criar Pattern Assignments
  const patternAssignments = [
    // Semana 0 (Domingo a Sábado) - Alternar Equipes A e B
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

    // Semana 1 (Domingo a Sábado) - Inverter: começar com B
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

  let assignmentsCreated = 0;
  let assignmentsExisting = 0;

  for (const assignment of patternAssignments) {
    try {
      const shiftTemplateId = assignment.shiftType === 'DAY_12H' ? dayShiftTemplate.id : nightShiftTemplate.id;
      const teamId = teamMap[assignment.teamName];

      // Verificar se assignment já existe
      const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
        SELECT id FROM ${tenant.schemaName}.weekly_schedule_pattern_assignments
        WHERE "patternId" = '${patternIdValue}'
          AND "weekNumber" = ${assignment.weekNumber}
          AND "dayOfWeek" = ${assignment.dayOfWeek}
          AND "shiftTemplateId" = '${shiftTemplateId}'
        LIMIT 1
      `,
      );

      if (existing.length > 0) {
        assignmentsExisting++;
        continue;
      }

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

      assignmentsCreated++;
    } catch (error) {
      console.error(`❌ Erro ao criar assignment:`, error);
      throw error;
    }
  }

  console.log(`✓ Pattern Assignments:`);
  console.log(`  Criados: ${assignmentsCreated}`);
  console.log(`  Já existiam: ${assignmentsExisting}`);
  console.log(`  Total: ${patternAssignments.length}\n`);

  console.log('✅ Care Shifts ILPI Teste criados com sucesso!\n');
  console.log('📋 Resumo Final:');
  console.log(`   - Equipes: 4`);
  console.log(`   - Membros: 5 (2 na Equipe A Dia, 1 em cada outra)`);
  console.log(`   - Padrão: Quinzenal (2 semanas)`);
  console.log(`   - Assignments: 28 (2 turnos × 7 dias × 2 semanas)\n`);
  console.log('🎯 Próximo passo:');
  console.log('   Acesse o sistema e gere os plantões através do botão "Gerar Plantões"\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
