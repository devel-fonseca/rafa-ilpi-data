/**
 * Script para popular ShiftTemplates em tenants existentes
 * Uso: npx tsx scripts/populate-shift-templates-existing-tenants.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Populando ShiftTemplates em tenants existentes...\n');

  // Buscar todos os tenants (exceto deletados)
  const tenants = await prisma.tenant.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      schemaName: true,
      status: true,
    },
  });

  console.log(`✓ Encontrados ${tenants.length} tenants\n`);

  const templates = [
    {
      type: 'DAY_8H',
      name: 'Dia 8h',
      startTime: '07:00',
      endTime: '15:00',
      duration: 8,
      description: 'Turno diurno de 8 horas',
      displayOrder: 1,
    },
    {
      type: 'AFTERNOON_8H',
      name: 'Tarde 8h',
      startTime: '15:00',
      endTime: '23:00',
      duration: 8,
      description: 'Turno vespertino de 8 horas',
      displayOrder: 2,
    },
    {
      type: 'NIGHT_8H',
      name: 'Noite 8h',
      startTime: '23:00',
      endTime: '07:00',
      duration: 8,
      description: 'Turno noturno de 8 horas',
      displayOrder: 3,
    },
    {
      type: 'DAY_12H',
      name: 'Dia 12h',
      startTime: '07:00',
      endTime: '19:00',
      duration: 12,
      description: 'Turno diurno de 12 horas',
      displayOrder: 4,
    },
    {
      type: 'NIGHT_12H',
      name: 'Noite 12h',
      startTime: '19:00',
      endTime: '07:00',
      duration: 12,
      description: 'Turno noturno de 12 horas',
      displayOrder: 5,
    },
  ];

  for (const tenant of tenants) {
    console.log(`\n📦 Processando tenant: ${tenant.name} (${tenant.schemaName})`);

    // Usar query raw para verificar se já existem turnos
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*)::int as count FROM "${tenant.schemaName}".shift_templates`,
    );

    const count = existing[0]?.count || 0;

    if (count > 0) {
      console.log(`  ⊙ Já possui ${count} turnos, pulando...`);
      continue;
    }

    // Inserir os 5 turnos
    for (const template of templates) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "${tenant.schemaName}".shift_templates
         (id, type, name, "startTime", "endTime", duration, description, "isActive", "displayOrder", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())
         ON CONFLICT (type) DO NOTHING`,
        template.type,
        template.name,
        template.startTime,
        template.endTime,
        template.duration,
        template.description,
        template.displayOrder,
      );
    }

    console.log(`  ✓ 5 ShiftTemplates criados com sucesso!`);
  }

  console.log('\n✅ Processo concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
