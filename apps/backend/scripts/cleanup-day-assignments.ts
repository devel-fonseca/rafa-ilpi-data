/**
 * ──────────────────────────────────────────────────────────────────────────────
 * CLEANUP SCRIPT: Remover DayScheduleAssignments
 *
 * Remove tabela day_schedule_assignments de TODOS os tenant schemas
 * (decidimos usar abordagem ainda mais simples: shifts diretos)
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client';

const publicClient = new PrismaClient();

async function main() {
  console.log('🧹 Limpando tabela day_schedule_assignments\n');

  // 1. Obter todos os tenant schemas
  const tenants = await publicClient.$queryRaw<Array<{ schema_name: string }>>`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name;
  `;

  console.log(`📋 Encontrados ${tenants.length} tenant schemas\n`);

  // 2. Dropar tabela em cada schema
  for (const tenant of tenants) {
    const schema = tenant.schema_name;
    console.log(`🗑️  Removendo de ${schema}...`);

    try {
      await publicClient.$executeRawUnsafe(`SET search_path TO "${schema}";`);
      await publicClient.$executeRawUnsafe(`DROP TABLE IF EXISTS "day_schedule_assignments" CASCADE;`);
      console.log(`   ✅ Removido`);
    } catch (error) {
      console.error(`   ❌ Erro:`, error);
    }
  }

  await publicClient.$executeRawUnsafe(`RESET search_path;`);
  console.log('\n✅ Cleanup concluído!\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await publicClient.$disconnect();
  });
