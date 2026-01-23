/**
 * ──────────────────────────────────────────────────────────────────────────────
 * MIGRATION SCRIPT: Simplificar Escalas para Day Assignments
 *
 * Executa migration em TODOS os tenant schemas:
 * 1. Remove weekly_schedule_patterns e weekly_schedule_pattern_assignments
 * 2. Cria day_schedule_assignments
 * 3. Remove colunas isFromPattern e patternId de shifts
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client';

const publicClient = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando migration: Simplificar para Day Assignments\n');

  // 1. Obter todos os tenant schemas
  const tenants = await publicClient.$queryRaw<Array<{ schema_name: string }>>`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name;
  `;

  console.log(`📋 Encontrados ${tenants.length} tenant schemas:\n`);
  tenants.forEach((t, idx) => {
    console.log(`   ${idx + 1}. ${t.schema_name}`);
  });
  console.log();

  // 2. Executar migration em cada schema
  for (const tenant of tenants) {
    const schema = tenant.schema_name;
    console.log(`\n🔧 Migrando schema: ${schema}`);

    try {
      // Set search_path para o schema do tenant
      await publicClient.$executeRawUnsafe(`SET search_path TO "${schema}";`);

      // 2.1. Criar nova tabela: day_schedule_assignments
      console.log('   ✓ Criando tabela day_schedule_assignments...');
      await publicClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "day_schedule_assignments" (
          "id" UUID NOT NULL,
          "tenantId" UUID NOT NULL,
          "date" DATE NOT NULL,
          "shiftTemplateId" UUID NOT NULL,
          "teamId" UUID,
          "createdBy" UUID NOT NULL,
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedBy" UUID,
          "updatedAt" TIMESTAMPTZ(3) NOT NULL,
          "deletedAt" TIMESTAMPTZ(3),

          CONSTRAINT "day_schedule_assignments_pkey" PRIMARY KEY ("id")
        );
      `);

      // Índices
      console.log('   ✓ Criando índices...');
      await publicClient.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "day_schedule_assignments_tenantId_date_shiftTemplateId_del_key"
          ON "day_schedule_assignments"("tenantId", "date", "shiftTemplateId", "deletedAt");
      `);
      await publicClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "day_schedule_assignments_tenantId_date_idx"
          ON "day_schedule_assignments"("tenantId", "date");
      `);
      await publicClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "day_schedule_assignments_teamId_idx"
          ON "day_schedule_assignments"("teamId");
      `);
      await publicClient.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "day_schedule_assignments_deletedAt_idx"
          ON "day_schedule_assignments"("deletedAt");
      `);

      // Foreign Key para Team
      console.log('   ✓ Criando foreign key para teams...');
      await publicClient.$executeRawUnsafe(`
        ALTER TABLE "day_schedule_assignments"
          DROP CONSTRAINT IF EXISTS "day_schedule_assignments_teamId_fkey";
      `);
      await publicClient.$executeRawUnsafe(`
        ALTER TABLE "day_schedule_assignments"
          ADD CONSTRAINT "day_schedule_assignments_teamId_fkey"
          FOREIGN KEY ("teamId") REFERENCES "teams"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      `);

      // 2.2. Remover colunas obsoletas de shifts
      console.log('   ✓ Removendo colunas obsoletas de shifts...');
      await publicClient.$executeRawUnsafe(`
        ALTER TABLE "shifts" DROP COLUMN IF EXISTS "isFromPattern";
      `);
      await publicClient.$executeRawUnsafe(`
        ALTER TABLE "shifts" DROP COLUMN IF EXISTS "patternId";
      `);

      // 2.3. Remover tabelas antigas
      console.log('   ✓ Removendo tabelas antigas...');
      await publicClient.$executeRawUnsafe(`
        DROP TABLE IF EXISTS "weekly_schedule_pattern_assignments" CASCADE;
      `);
      await publicClient.$executeRawUnsafe(`
        DROP TABLE IF EXISTS "weekly_schedule_patterns" CASCADE;
      `);

      console.log(`   ✅ Schema ${schema} migrado com sucesso!`);
    } catch (error) {
      console.error(`   ❌ Erro ao migrar schema ${schema}:`, error);
      throw error;
    }
  }

  // 3. Reset search_path
  await publicClient.$executeRawUnsafe(`RESET search_path;`);

  console.log('\n\n✅ Migration concluída com sucesso em todos os schemas!\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Erro fatal durante migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await publicClient.$disconnect();
  });
