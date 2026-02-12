import {
  FinancialTransactionStatus,
  FinancialTransactionType,
  Prisma,
  PrismaClient,
} from '@prisma/client'

type Args = {
  schema: string
  accountId: string
  openingBalance: string
  openingDate?: string
  dryRun: boolean
}

function parseArgs(): Args {
  const args = process.argv.slice(2)

  const getArg = (name: string) => {
    const prefix = `--${name}=`
    return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
  }

  const schema = getArg('schema')
  const accountId = getArg('accountId')
  const openingBalance = getArg('openingBalance')
  const openingDate = getArg('openingDate')
  const dryRun = args.includes('--dry-run')

  if (!schema) throw new Error('Parâmetro obrigatório: --schema=...')
  if (!accountId) throw new Error('Parâmetro obrigatório: --accountId=...')
  if (!openingBalance) throw new Error('Parâmetro obrigatório: --openingBalance=...')

  return {
    schema,
    accountId,
    openingBalance,
    openingDate,
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

function parseDateOnlyToDate(dateOnly: string): Date {
  return new Date(`${dateOnly}T12:00:00.000`)
}

function signedImpact(
  type: FinancialTransactionType,
  amount: Prisma.Decimal,
): Prisma.Decimal {
  return type === FinancialTransactionType.INCOME ? amount : amount.neg()
}

async function main() {
  const args = parseArgs()
  const openingBalance = new Prisma.Decimal(args.openingBalance)

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: buildTenantDatabaseUrl(args.schema),
      },
    },
  })

  try {
    const account = await prisma.financialBankAccount.findFirst({
      where: {
        id: args.accountId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        bankName: true,
        accountName: true,
        currentBalance: true,
      },
    })

    if (!account) {
      throw new Error('Conta bancária não encontrada')
    }

    const paidTransactions = await prisma.financialTransaction.findMany({
      where: {
        tenantId: account.tenantId,
        bankAccountId: account.id,
        deletedAt: null,
        status: FinancialTransactionStatus.PAID,
      },
      select: {
        id: true,
        type: true,
        netAmount: true,
        description: true,
        paymentDate: true,
        dueDate: true,
        createdBy: true,
        createdAt: true,
      },
      orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
    })

    const totalImpact = paidTransactions.reduce(
      (acc, tx) => acc.plus(signedImpact(tx.type, tx.netAmount)),
      new Prisma.Decimal(0),
    )
    const resultingBalance = openingBalance.plus(totalImpact)
    const firstTxDate =
      paidTransactions[0]?.paymentDate ?? paidTransactions[0]?.dueDate ?? new Date()
    const initialDate = args.openingDate ? parseDateOnlyToDate(args.openingDate) : firstTxDate

    const existingEntries = await prisma.financialBankAccountLedger.count({
      where: {
        tenantId: account.tenantId,
        bankAccountId: account.id,
      },
    })

    console.log(`🏦 Conta: ${account.bankName} / ${account.accountName}`)
    console.log(`🧾 Lançamentos atuais no razão: ${existingEntries}`)
    console.log(`💵 Saldo atual salvo: ${account.currentBalance.toString()}`)
    console.log(`💵 Saldo inicial informado: ${openingBalance.toString()}`)
    console.log(`📈 Impacto de transações pagas: ${totalImpact.toString()}`)
    console.log(`✅ Saldo final calculado: ${resultingBalance.toString()}`)
    console.log(`📦 Transações pagas consideradas: ${paidTransactions.length}`)

    if (args.dryRun) {
      console.log('\n🧪 Dry-run: nenhuma alteração aplicada.')
      return
    }

    await prisma.$transaction(async (tx) => {
      // Tradeoff: para corrigir histórico inconsistente, reconstruímos o razão
      // completo desta conta. Isso remove lançamentos anteriores do ledger dessa conta,
      // mas preserva as transações financeiras originais (fonte de verdade).
      await tx.financialBankAccountLedger.deleteMany({
        where: {
          tenantId: account.tenantId,
          bankAccountId: account.id,
        },
      })

      let runningBalance = openingBalance

      await tx.financialBankAccountLedger.create({
        data: {
          tenantId: account.tenantId,
          bankAccountId: account.id,
          transactionId: null,
          entryType: 'INITIAL_BALANCE',
          referenceType: 'ACCOUNT',
          referenceId: account.id,
          description: 'Saldo inicial (reconstrução manual do razão)',
          effectiveDate: initialDate,
          amount: openingBalance,
          balanceAfter: openingBalance,
          createdBy: null,
        },
      })

      for (const transaction of paidTransactions) {
        const impact = signedImpact(transaction.type, transaction.netAmount)
        runningBalance = runningBalance.plus(impact)

        await tx.financialBankAccountLedger.create({
          data: {
            tenantId: account.tenantId,
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
      }

      await tx.financialBankAccount.update({
        where: { id: account.id },
        data: {
          currentBalance: runningBalance,
          lastBalanceUpdate: new Date(),
        },
      })
    })

    console.log('\n✅ Razão reconstruído e saldo da conta atualizado com sucesso.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('❌ Erro ao reconstruir razão da conta:', error)
  process.exit(1)
})
