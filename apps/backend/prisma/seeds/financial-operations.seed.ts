import {
  FinancialCategoryType,
  PositionCode,
  PrismaClient,
} from '@prisma/client'

type CategorySeed = {
  name: string
  type: FinancialCategoryType
  description?: string
  parentName?: string
}

const prisma = new PrismaClient()

const CATEGORY_SEED: CategorySeed[] = [
  { name: 'Receitas Operacionais', type: FinancialCategoryType.INCOME },
  {
    name: 'Mensalidades de residentes',
    type: FinancialCategoryType.INCOME,
    parentName: 'Receitas Operacionais',
  },
  {
    name: 'Taxas de adesão/matrícula',
    type: FinancialCategoryType.INCOME,
    parentName: 'Receitas Operacionais',
  },
  { name: 'Receitas Não Operacionais', type: FinancialCategoryType.INCOME },
  {
    name: 'Doações e contribuições',
    type: FinancialCategoryType.INCOME,
    parentName: 'Receitas Não Operacionais',
  },
  { name: 'Despesas Operacionais', type: FinancialCategoryType.EXPENSE },
  {
    name: 'Alimentação e nutrição',
    type: FinancialCategoryType.EXPENSE,
    parentName: 'Despesas Operacionais',
  },
  {
    name: 'Medicamentos e insumos',
    type: FinancialCategoryType.EXPENSE,
    parentName: 'Despesas Operacionais',
  },
  { name: 'Despesas Administrativas', type: FinancialCategoryType.EXPENSE },
  {
    name: 'Folha administrativa',
    type: FinancialCategoryType.EXPENSE,
    parentName: 'Despesas Administrativas',
  },
  {
    name: 'Contabilidade e jurídico',
    type: FinancialCategoryType.EXPENSE,
    parentName: 'Despesas Administrativas',
  },
  { name: 'Despesas Fixas', type: FinancialCategoryType.EXPENSE },
  {
    name: 'Energia elétrica',
    type: FinancialCategoryType.EXPENSE,
    parentName: 'Despesas Fixas',
  },
  {
    name: 'Água e gás',
    type: FinancialCategoryType.EXPENSE,
    parentName: 'Despesas Fixas',
  },
]

const PAYMENT_METHOD_SEED = [
  {
    name: 'PIX',
    code: 'pix',
    description: 'Pagamento instantâneo via PIX',
    requiresManualConfirmation: true,
    allowsInstallments: false,
    maxInstallments: 1,
  },
  {
    name: 'Boleto',
    code: 'bank_slip',
    description: 'Boleto bancário',
    requiresManualConfirmation: true,
    allowsInstallments: false,
    maxInstallments: 1,
  },
  {
    name: 'Transferência bancária',
    code: 'bank_transfer',
    description: 'TED/DOC/Transferência',
    requiresManualConfirmation: true,
    allowsInstallments: false,
    maxInstallments: 1,
  },
  {
    name: 'Cartão de crédito',
    code: 'credit_card',
    description: 'Pagamento em cartão de crédito',
    requiresManualConfirmation: true,
    allowsInstallments: true,
    maxInstallments: 12,
  },
  {
    name: 'Dinheiro',
    code: 'cash',
    description: 'Pagamento em espécie',
    requiresManualConfirmation: true,
    allowsInstallments: false,
    maxInstallments: 1,
  },
]

function buildTenantUrl(schemaName: string): string {
  const baseUrl = process.env.DATABASE_URL

  if (!baseUrl) {
    throw new Error('DATABASE_URL não configurada')
  }

  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}schema=${schemaName}`
}

async function pickSeedUserId(tenantClient: PrismaClient): Promise<string | null> {
  const preferredPositions: PositionCode[] = [
    PositionCode.ADMINISTRATOR,
    PositionCode.TECHNICAL_MANAGER,
    PositionCode.ADMINISTRATIVE,
  ]

  for (const positionCode of preferredPositions) {
    const profile = await tenantClient.userProfile.findFirst({
      where: { positionCode },
      select: { userId: true },
      orderBy: { createdAt: 'asc' },
    })

    if (profile?.userId) {
      return profile.userId
    }
  }

  const fallbackUser = await tenantClient.user.findFirst({
    where: { deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  return fallbackUser?.id ?? null
}

async function seedTenantFinancialDefaults(schemaName: string, tenantName: string): Promise<void> {
  const tenantClient = new PrismaClient({
    datasources: { db: { url: buildTenantUrl(schemaName) } },
  })

  try {
    const localTenant = await tenantClient.tenant.findFirst({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!localTenant?.id) {
      console.warn(`⚠️  [${tenantName}] sem tenant local no schema; seed financeiro pulado.`)
      return
    }

    const seedUserId = await pickSeedUserId(tenantClient)

    if (!seedUserId) {
      console.warn(`⚠️  [${tenantName}] sem usuário para createdBy; seed financeiro pulado.`)
      return
    }

    const existingCategories = await tenantClient.financialCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, type: true },
    })

    const categoryMap = new Map(existingCategories.map((c) => [c.name, c]))

    for (const category of CATEGORY_SEED.filter((c) => !c.parentName)) {
      if (categoryMap.has(category.name)) continue

      const created = await tenantClient.financialCategory.create({
        data: {
          tenantId: localTenant.id,
          name: category.name,
          description: category.description,
          type: category.type,
          isSystemDefault: true,
          isActive: true,
          createdBy: seedUserId,
          updatedBy: seedUserId,
        },
        select: { id: true, name: true, type: true },
      })

      categoryMap.set(created.name, created)
    }

    for (const category of CATEGORY_SEED.filter((c) => c.parentName)) {
      if (categoryMap.has(category.name)) continue

      const parent = categoryMap.get(category.parentName!)
      if (!parent) {
        console.warn(`⚠️  [${tenantName}] categoria pai não encontrada: ${category.parentName}`)
        continue
      }

      const created = await tenantClient.financialCategory.create({
        data: {
          tenantId: localTenant.id,
          name: category.name,
          description: category.description,
          type: category.type,
          parentCategoryId: parent.id,
          isSystemDefault: true,
          isActive: true,
          createdBy: seedUserId,
          updatedBy: seedUserId,
        },
        select: { id: true, name: true, type: true },
      })

      categoryMap.set(created.name, created)
    }

    const existingMethods = await tenantClient.financialPaymentMethod.findMany({
      where: { deletedAt: null },
      select: { code: true },
    })

    const existingCodes = new Set(existingMethods.map((m) => m.code))

    for (const method of PAYMENT_METHOD_SEED) {
      if (existingCodes.has(method.code)) continue

      await tenantClient.financialPaymentMethod.create({
        data: {
          tenantId: localTenant.id,
          ...method,
          isActive: true,
        },
      })
    }

    console.log(`✅ [${tenantName}] seed financeiro aplicado com sucesso.`)
  } finally {
    await tenantClient.$disconnect()
  }
}

async function main() {
  console.log('💰 Iniciando seed de Financeiro Operacional por tenant...')

  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { name: true, schemaName: true },
    orderBy: { name: 'asc' },
  })

  if (tenants.length === 0) {
    console.log('⚠️  Nenhum tenant ativo encontrado para seed financeiro.')
    return
  }

  for (const tenant of tenants) {
    await seedTenantFinancialDefaults(tenant.schemaName, tenant.name)
  }

  console.log('✨ Seed financeiro concluído para todos os tenants ativos.')
}

main()
  .catch((error) => {
    console.error('❌ Erro no seed financeiro:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
