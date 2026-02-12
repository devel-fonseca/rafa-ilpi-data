import {
  FinancialTransactionStatus,
  FinancialTransactionType,
  Prisma,
  PrismaClient,
} from '@prisma/client'

type TenantInfo = {
  id: string
  name: string
  schemaName: string
}

type Args = {
  schema?: string
  dryRun: boolean
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  const schemaArg = args.find((arg) => arg.startsWith('--schema='))
  const dryRun = args.includes('--dry-run')

  return {
    schema: schemaArg?.split('=')[1],
    dryRun,
  }
}

function buildTenantDatabaseUrl(schemaName: string): string {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL não definida no ambiente')
  }
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}schema=${schemaName}`
}

function signedImpact(
  type: FinancialTransactionType,
  amount: Prisma.Decimal,
): Prisma.Decimal {
  return type === FinancialTransactionType.INCOME ? amount : amount.neg()
}

async function listTenants(publicClient: PrismaClient, schema?: string): Promise<TenantInfo[]> {
  if (schema) {
    const tenant = await publicClient.tenant.findFirst({
      where: {
        schemaName: schema,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        schemaName: true,
      },
    })
    if (!tenant) {
      throw new Error(`Tenant com schema "${schema}" não encontrado`)
    }
    return [tenant]
  }

  return publicClient.tenant.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      schemaName: true,
    },
    orderBy: { name: 'asc' },
  })
}

async function backfillTenant(tenant: TenantInfo, dryRun: boolean) {
  const tenantClient = new PrismaClient({
    datasources: {
      db: {
        url: buildTenantDatabaseUrl(tenant.schemaName),
      },
    },
  })

  try {
    const accounts = await tenantClient.financialBankAccount.findMany({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
      },
      select: {
        id: true,
        accountName: true,
        bankName: true,
        currentBalance: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    let createdEntries = 0
    let skippedAccounts = 0

    for (const account of accounts) {
      const existingLedgerCount = await tenantClient.financialBankAccountLedger.count({
        where: {
          tenantId: tenant.id,
          bankAccountId: account.id,
        },
      })

      // Tradeoff: para manter o backfill idempotente e seguro, só reconstruímos
      // contas sem histórico no razão. Contas com qualquer lançamento existente
      // são preservadas para evitar duplicidade ou reordenação.
      if (existingLedgerCount > 0) {
        skippedAccounts++
        continue
      }

      const paidTransactions = await tenantClient.financialTransaction.findMany({
        where: {
          tenantId: tenant.id,
          bankAccountId: account.id,
          deletedAt: null,
          status: FinancialTransactionStatus.PAID,
        },
        select: {
          id: true,
          type: true,
          netAmount: true,
          paymentDate: true,
          dueDate: true,
          description: true,
          createdBy: true,
          createdAt: true,
        },
        orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
      })

      const totalImpact = paidTransactions.reduce(
        (acc, tx) => acc.plus(signedImpact(tx.type, tx.netAmount)),
        new Prisma.Decimal(0),
      )
      const openingBalance = new Prisma.Decimal(account.currentBalance).minus(totalImpact)
      const initialDate =
        paidTransactions[0]?.paymentDate ??
        paidTransactions[0]?.dueDate ??
        account.createdAt

      if (dryRun) {
        console.log(
          `   [dry-run] Conta ${account.bankName} / ${account.accountName}: ` +
            `saldo atual ${account.currentBalance.toString()}, saldo inicial estimado ${openingBalance.toString()}, ` +
            `${paidTransactions.length} transação(ões) paga(s).`,
        )
        continue
      }

      await tenantClient.$transaction(async (tx) => {
        let runningBalance = openingBalance

        await tx.financialBankAccountLedger.create({
          data: {
            tenantId: tenant.id,
            bankAccountId: account.id,
            transactionId: null,
            entryType: 'INITIAL_BALANCE',
            referenceType: 'ACCOUNT',
            referenceId: account.id,
            description: 'Saldo inicial (backfill)',
            effectiveDate: initialDate,
            amount: openingBalance,
            balanceAfter: openingBalance,
            createdBy: null,
          },
        })
        createdEntries++

        for (const transaction of paidTransactions) {
          const impact = signedImpact(transaction.type, transaction.netAmount)
          runningBalance = runningBalance.plus(impact)

          await tx.financialBankAccountLedger.create({
            data: {
              tenantId: tenant.id,
              bankAccountId: account.id,
              transactionId: transaction.id,
              entryType: 'PAYMENT_CONFIRMATION',
              referenceType: 'TRANSACTION',
              referenceId: transaction.id,
              description: transaction.description,
              effectiveDate: transaction.paymentDate ?? transaction.dueDate,
              amount: impact,
              balanceAfter: runningBalance,
              createdBy: transaction.createdBy ?? null,
            },
          })
          createdEntries++
        }
      })
    }

    return {
      accounts: accounts.length,
      skippedAccounts,
      createdEntries,
    }
  } finally {
    await tenantClient.$disconnect()
  }
}

async function main() {
  const args = parseArgs()
  const publicClient = new PrismaClient()

  try {
    console.log('💰 Iniciando backfill do razão financeiro por tenant...')
    if (args.schema) {
      console.log(`🎯 Modo: schema específico (${args.schema})`)
    } else {
      console.log('🌍 Modo: todos os tenants ativos')
    }
    if (args.dryRun) {
      console.log('🧪 Dry-run ativo (nenhuma alteração será persistida)')
    }
    console.log('')

    const tenants = await listTenants(publicClient, args.schema)
    console.log(`🔍 ${tenants.length} tenant(s) encontrado(s)\n`)

    for (const tenant of tenants) {
      console.log(`🏢 ${tenant.name} (${tenant.schemaName})`)
      const result = await backfillTenant(tenant, args.dryRun)
      console.log(
        `   Contas: ${result.accounts} | Ignoradas (já com razão): ${result.skippedAccounts} | ` +
          `Lançamentos criados: ${result.createdEntries}\n`,
      )
    }

    console.log('✅ Backfill concluído')
  } finally {
    await publicClient.$disconnect()
  }
}

main().catch((error) => {
  console.error('❌ Erro no backfill do razão financeiro:', error)
  process.exit(1)
})
