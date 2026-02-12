import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as path from 'path'

const prisma = new PrismaClient()

async function ensureFinancialEnumsInSchema(schemaName: string) {
  const safeSchemaName = schemaName.replace(/"/g, '""')

  // Tradeoff: migration 20260212064000 checks pg_type globally by typname.
  // When enum exists in public, tenant schema creation may be skipped and table creation fails.
  // To keep deploy deterministic for all tenant schemas, ensure enums exist in target schema first.
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'FinancialCategoryType'
          AND n.nspname = '${safeSchemaName}'
      ) THEN
        EXECUTE 'CREATE TYPE "${safeSchemaName}"."FinancialCategoryType" AS ENUM (''INCOME'', ''EXPENSE'')';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'FinancialAccountType'
          AND n.nspname = '${safeSchemaName}'
      ) THEN
        EXECUTE 'CREATE TYPE "${safeSchemaName}"."FinancialAccountType" AS ENUM (''CHECKING'', ''SAVINGS'', ''PAYMENT'')';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'FinancialTransactionType'
          AND n.nspname = '${safeSchemaName}'
      ) THEN
        EXECUTE 'CREATE TYPE "${safeSchemaName}"."FinancialTransactionType" AS ENUM (''INCOME'', ''EXPENSE'')';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'FinancialTransactionStatus'
          AND n.nspname = '${safeSchemaName}'
      ) THEN
        EXECUTE 'CREATE TYPE "${safeSchemaName}"."FinancialTransactionStatus" AS ENUM (''PENDING'', ''PAID'', ''OVERDUE'', ''CANCELLED'', ''REFUNDED'', ''PARTIALLY_PAID'')';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'FinancialReconciliationStatus'
          AND n.nspname = '${safeSchemaName}'
      ) THEN
        EXECUTE 'CREATE TYPE "${safeSchemaName}"."FinancialReconciliationStatus" AS ENUM (''PENDING'', ''IN_PROGRESS'', ''RECONCILED'', ''DISCREPANCY'')';
      END IF;
    END $$;
  `)
}

async function applyMigrationsToTenant(schemaName: string) {
  console.log(`📦 Aplicando migrations no schema: ${schemaName}`)

  // Construir DATABASE_URL com schema específico
  const baseUrl = process.env.DATABASE_URL!
  const tenantUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}schema=${schemaName}`

  // Executar prisma migrate deploy com URL do tenant
  try {
    execSync(`DATABASE_URL="${tenantUrl}" npx prisma migrate deploy`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: tenantUrl },
    })
    console.log(`✅ Migrations aplicadas com sucesso em ${schemaName}\n`)
  } catch (error) {
    console.error(`❌ Erro ao aplicar migrations em ${schemaName}:`, error)
    throw error
  }
}

async function main() {
  console.log('🚀 Iniciando sincronização de schemas de tenants...\n')

  // Verificar se foi especificado um schema específico via --schema=nome
  const args = process.argv.slice(2)
  const schemaArg = args.find((arg) => arg.startsWith('--schema='))
  const specificSchema = schemaArg?.split('=')[1]

  let tenants: Array<{ id: string; name: string; schemaName: string }>

  if (specificSchema) {
    console.log(`🎯 Modo: Schema específico (${specificSchema})\n`)

    const tenant = await prisma.tenant.findFirst({
      where: {
        schemaName: specificSchema,
        deletedAt: null,
      },
      select: { id: true, name: true, schemaName: true },
    })

    if (!tenant) {
      console.error(
        `❌ Tenant com schema "${specificSchema}" não encontrado ou está deletado.`
      )
      process.exit(1)
    }

    tenants = [tenant]
  } else {
    console.log('🌍 Modo: Todos os tenants ativos\n')

    // Buscar todos os tenants ativos
    tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, schemaName: true },
      orderBy: { name: 'asc' },
    })
  }

  console.log(`🔍 Encontrados ${tenants.length} tenant(s) para processar\n`)

  if (tenants.length === 0) {
    console.log('⚠️  Nenhum tenant ativo encontrado.')
    console.log('💡 Crie tenants via API: POST /api/auth/register\n')
    return
  }

  let successCount = 0
  let errorCount = 0

  for (const tenant of tenants) {
    console.log(`${'='.repeat(80)}`)
    console.log(`🏢 Processando tenant: ${tenant.name}`)
    console.log(`   ID: ${tenant.id}`)
    console.log(`   Schema: ${tenant.schemaName}`)
    console.log(`${'='.repeat(80)}\n`)

    try {
      // Criar schema se não existir
      await prisma.$executeRawUnsafe(
        `CREATE SCHEMA IF NOT EXISTS "${tenant.schemaName}";`,
      )

      await ensureFinancialEnumsInSchema(tenant.schemaName)

      // Aplicar migrations
      await applyMigrationsToTenant(tenant.schemaName)
      successCount++
    } catch (error: any) {
      console.error(`\n❌ Falha ao processar tenant ${tenant.name}:`, error.message)
      errorCount++
    }
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log('📊 RESUMO DA SINCRONIZAÇÃO')
  console.log(`${'='.repeat(80)}`)
  console.log(`✅ Sucesso: ${successCount} tenants`)
  console.log(`❌ Erros: ${errorCount} tenants`)
  console.log(`📦 Total processado: ${tenants.length} tenants`)
  console.log(`${'='.repeat(80)}\n`)

  if (errorCount === 0) {
    console.log('✨ Todas as migrations foram aplicadas com sucesso!')
  } else {
    console.log(
      '⚠️  Alguns tenants falharam. Revise os erros acima e tente novamente.',
    )
    process.exit(1)
  }
}

main()
  .catch((error) => {
    console.error('\n💥 Erro fatal ao sincronizar schemas:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
