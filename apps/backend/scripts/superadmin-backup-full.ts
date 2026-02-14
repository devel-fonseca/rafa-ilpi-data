import {
  createFullDatabaseBackup,
  createTenantDatabaseBackup,
  findDatabaseBackupById,
  listDatabaseBackups,
  restoreFullDatabaseBackupById,
  restoreFullDatabaseBackupFromFile,
  restoreTenantDatabaseBackupFromFile,
} from '../src/superadmin/utils/database-backup.util'
import { PrismaClient } from '@prisma/client'

function printUsage() {
  console.log('Uso:')
  console.log('  npm run backup:full:create')
  console.log('  npm run backup:tenant:create -- --tenantId=<uuid>')
  console.log('  npm run backup:full:list')
  console.log('  npm run backup:full:restore -- --id=<backup_id>')
  console.log('  npm run backup:full:restore -- --file=/caminho/backup.sql')
  console.log('  npm run backup:tenant:restore -- --id=<backup_id_tenant>')
  console.log('  npm run backup:tenant:restore -- --file=/caminho/backup.sql --schema=tenant_xxx')
}

async function run() {
  const command = process.argv[2]

  if (
    !command ||
    (
      command !== 'create' &&
      command !== 'list' &&
      command !== 'create-tenant' &&
      command !== 'restore-full' &&
      command !== 'restore-tenant'
    )
  ) {
    printUsage()
    process.exit(1)
  }

  if (command === 'create') {
    console.log('Iniciando backup full...')
    const backup = await createFullDatabaseBackup()
    console.log('Backup concluído com sucesso:')
    console.log(`  id: ${backup.id}`)
    console.log(`  arquivo: ${backup.filePath}`)
    console.log(`  tamanho: ${backup.sizeBytes} bytes`)
    return
  }

  if (command === 'create-tenant') {
    const tenantArg = process.argv.find((arg) => arg.startsWith('--tenantId='))
    const tenantId = tenantArg?.split('=')[1]

    if (!tenantId) {
      throw new Error('Informe --tenantId=<uuid>')
    }

    const prisma = new PrismaClient()
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, schemaName: true },
      })

      if (!tenant) {
        throw new Error('Tenant não encontrado')
      }

      console.log(`Iniciando backup do tenant ${tenant.id} (${tenant.name})...`)
      const backup = await createTenantDatabaseBackup({
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSchemaName: tenant.schemaName,
      })
      console.log('Backup do tenant concluído com sucesso:')
      console.log(`  id: ${backup.id}`)
      console.log(`  arquivo: ${backup.filePath}`)
      console.log(`  tamanho: ${backup.sizeBytes} bytes`)
      return
    } finally {
      await prisma.$disconnect()
    }
  }

  if (command === 'restore-full') {
    const idArg = process.argv.find((arg) => arg.startsWith('--id='))
    const fileArg = process.argv.find((arg) => arg.startsWith('--file='))

    const backupId = idArg?.split('=')[1]
    const filePath = fileArg?.split('=')[1]

    if (!backupId && !filePath) {
      throw new Error('Informe --id=<backup_id> ou --file=/caminho/backup.sql')
    }

    console.log('Iniciando restore full...')
    const result = backupId
      ? await restoreFullDatabaseBackupById(backupId)
      : await restoreFullDatabaseBackupFromFile(filePath as string)

    console.log('Restore full concluído com sucesso:')
    if (result.backupId) {
      console.log(`  backupId: ${result.backupId}`)
    }
    console.log(`  arquivo: ${result.filePath}`)
    console.log(`  início: ${result.startedAt}`)
    console.log(`  fim: ${result.finishedAt}`)
    console.log(`  duração: ${result.durationMs} ms`)
    return
  }

  if (command === 'restore-tenant') {
    const idArg = process.argv.find((arg) => arg.startsWith('--id='))
    const fileArg = process.argv.find((arg) => arg.startsWith('--file='))
    const schemaArg = process.argv.find((arg) => arg.startsWith('--schema='))

    const backupId = idArg?.split('=')[1]
    const filePath = fileArg?.split('=')[1]
    const schemaName = schemaArg?.split('=')[1]

    if (!backupId && !filePath) {
      throw new Error('Informe --id=<backup_id_tenant> ou --file=/caminho/backup.sql')
    }

    if (filePath && !schemaName) {
      throw new Error('Para restore por arquivo, informe também --schema=tenant_xxx')
    }

    console.log('Iniciando restore de tenant...')

    let result
    if (backupId) {
      const backup = await findDatabaseBackupById(backupId)
      if (!backup || backup.scope !== 'tenant') {
        throw new Error('Backup de tenant não encontrado')
      }
      if (!backup.tenantId) {
        throw new Error('Backup de tenant sem tenantId associado')
      }

      const prisma = new PrismaClient()
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: backup.tenantId },
          select: { schemaName: true },
        })
        if (!tenant) {
          throw new Error('Tenant associado ao backup não encontrado')
        }

        result = await restoreTenantDatabaseBackupFromFile(
          backup.filePath,
          tenant.schemaName,
          backup.id,
        )
      } finally {
        await prisma.$disconnect()
      }
    } else {
      result = await restoreTenantDatabaseBackupFromFile(filePath as string, schemaName as string)
    }

    console.log('Restore de tenant concluído com sucesso:')
    if (result.backupId) {
      console.log(`  backupId: ${result.backupId}`)
    }
    console.log(`  schema alvo: ${result.targetSchemaName || '-'}`)
    console.log(`  arquivo: ${result.filePath}`)
    console.log(`  início: ${result.startedAt}`)
    console.log(`  fim: ${result.finishedAt}`)
    console.log(`  duração: ${result.durationMs} ms`)
    return
  }

  const backups = await listDatabaseBackups({ limit: 20 })
  if (backups.length === 0) {
    console.log('Nenhum backup encontrado.')
    return
  }

  console.log('Backups disponíveis (mais recentes primeiro):')
  backups.forEach((backup) => {
    console.log(
      `- ${backup.id} | ${backup.scope} | ${backup.createdAt} | ${backup.sizeBytes} bytes | ${backup.filePath}`,
    )
  })
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Erro no CLI de backup: ${message}`)
  process.exit(1)
})
