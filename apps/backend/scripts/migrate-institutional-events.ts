/**
 * Script para criar tabela InstitutionalEvent em todos os schemas de tenant
 *
 * Execução: npx tsx scripts/migrate-institutional-events.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando migração de InstitutionalEvent...\n');

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
      // Dropar tabela existente se houver (para recriar com ENUMs corretos)
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${schema}".institutional_events CASCADE;`);

      // Criar ENUMs no schema do tenant (se não existirem)
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "${schema}"."InstitutionalEventType" AS ENUM (
            'DOCUMENT_EXPIRY',
            'TRAINING',
            'MEETING',
            'INSPECTION',
            'MAINTENANCE',
            'OTHER'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "${schema}"."InstitutionalEventVisibility" AS ENUM (
            'ADMIN_ONLY',
            'RT_ONLY',
            'ALL_USERS'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "${schema}"."ScheduledEventStatus" AS ENUM (
            'SCHEDULED',
            'COMPLETED',
            'CANCELLED',
            'MISSED'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Criar tabela institutional_events no schema do tenant (snake_case)
      // IMPORTANTE: ENUMs agora referenciam o próprio schema do tenant
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "${schema}".institutional_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "tenantId" UUID NOT NULL,
          "eventType" "${schema}"."InstitutionalEventType" NOT NULL,
          visibility "${schema}"."InstitutionalEventVisibility" DEFAULT 'ALL_USERS' NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          "scheduledDate" DATE NOT NULL,
          "scheduledTime" TEXT,
          "allDay" BOOLEAN DEFAULT false NOT NULL,
          status "${schema}"."ScheduledEventStatus" DEFAULT 'SCHEDULED' NOT NULL,
          "completedAt" TIMESTAMPTZ(3),
          notes TEXT,

          -- Campos específicos para vencimento de documentos
          "documentType" TEXT,
          "documentNumber" TEXT,
          "expiryDate" DATE,
          responsible TEXT,

          -- Campos específicos para treinamentos
          "trainingTopic" TEXT,
          instructor TEXT,
          "targetAudience" TEXT,
          location TEXT,

          -- Metadados adicionais (JSON flexível)
          metadata JSONB,

          -- Auditoria
          "createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMPTZ(3) NOT NULL,
          "deletedAt" TIMESTAMPTZ(3),
          "createdBy" UUID NOT NULL,
          "updatedBy" UUID
        );
      `);

      // Criar índices
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "institutional_events_tenantId_idx" ON "${schema}".institutional_events ("tenantId");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "institutional_events_scheduledDate_idx" ON "${schema}".institutional_events ("scheduledDate");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "institutional_events_eventType_idx" ON "${schema}".institutional_events ("eventType");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "institutional_events_visibility_idx" ON "${schema}".institutional_events (visibility);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "institutional_events_status_idx" ON "${schema}".institutional_events (status);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "institutional_events_deletedAt_idx" ON "${schema}".institutional_events ("deletedAt");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "institutional_events_tenantId_scheduledDate_idx" ON "${schema}".institutional_events ("tenantId", "scheduledDate");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "institutional_events_tenantId_eventType_scheduledDate_idx" ON "${schema}".institutional_events ("tenantId", "eventType", "scheduledDate");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "institutional_events_expiryDate_idx" ON "${schema}".institutional_events ("expiryDate");`);

      console.log(`  ✅ Tabela institutional_events criada em ${schema}`);
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
