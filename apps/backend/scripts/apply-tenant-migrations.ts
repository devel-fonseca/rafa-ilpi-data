import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
