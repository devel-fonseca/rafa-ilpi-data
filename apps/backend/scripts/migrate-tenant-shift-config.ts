/**
 * Script para criar tabela tenant_shift_config em todos os schemas de tenant
 *
 * Execução: npx tsx scripts/migrate-tenant-shift-config.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migração de tenant_shift_config...\n');

  // Buscar todos os tenants ativos
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, slug: true },
  });

  console.log(`📋 Encontrados ${tenants.length} tenants ativos\n`);

  for (const tenant of tenants) {
    // Buscar schema real no banco (não podemos calcular o hash aqui)
    const schemaQuery: any = await prisma.$queryRawUnsafe(`
      SELECT nspname
      FROM pg_namespace
      WHERE nspname LIKE 'tenant_%'
      AND nspname LIKE '%${tenant.slug.replace(/[.-]/g, '_')}%'
      LIMIT 1
    `);

    if (!schemaQuery || schemaQuery.length === 0) {
      console.error(`  ❌ Schema não encontrado para tenant ${tenant.name}`);
      continue;
    }

    const schema = schemaQuery[0].nspname;
    console.log(`\n🔧 Processando tenant: ${tenant.name} (${schema})`);

    try {
      // Criar tabela tenant_shift_config no schema do tenant (com schema qualificado)
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schema}".tenant_shift_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "tenantId" UUID NOT NULL,
          "shiftTemplateId" UUID NOT NULL,
          "isEnabled" BOOLEAN DEFAULT true NOT NULL,
          "customName" VARCHAR(50),
          "customStartTime" VARCHAR(5),
          "customEndTime" VARCHAR(5),
          "customDuration" INTEGER,
          notes TEXT,
          "createdBy" UUID NOT NULL,
          "updatedBy" UUID,
          "createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMPTZ(3) NOT NULL,
          "deletedAt" TIMESTAMPTZ(3),

          CONSTRAINT tenant_shift_config_shiftTemplateId_deletedAt_key UNIQUE ("shiftTemplateId", "deletedAt")
        );
      `);

      // Criar índices
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS tenant_shift_config_tenantId_idx ON "${schema}".tenant_shift_config ("tenantId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS tenant_shift_config_isEnabled_idx ON "${schema}".tenant_shift_config ("isEnabled");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS tenant_shift_config_deletedAt_idx ON "${schema}".tenant_shift_config ("deletedAt");`);

      console.log(`  ✅ Tabela tenant_shift_config criada em ${schema}`);
    } catch (error: any) {
      console.error(`  ❌ Erro ao criar tabela em ${schema}:`, error.message);
    }
  }

  console.log('\n✅ Migração concluída!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
