import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkInvoices() {
  console.log('\n💰 VERIFICANDO FATURAS DOS TESTES DE CONVERSÃO\n')
  console.log('━'.repeat(80))

  // Buscar todos os tenants de teste
  const testTenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { name: { startsWith: 'TESTE Manu' } },
        { name: { startsWith: 'TESTE Trial' } },
      ],
    },
    include: {
      subscriptions: {
        include: {
          plan: true,
        },
      },
      invoices: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  console.log(`\n🔍 Encontrados ${testTenants.length} tenants de teste:\n`)

  for (const tenant of testTenants) {
    const sub = tenant.subscriptions[0]
    const invoices = tenant.invoices

    console.log(`\n📋 ${tenant.name}`)
    console.log('   ┌─ Tenant')
    console.log(`   │  Status: ${tenant.status}`)

    if (sub) {
      console.log('   ├─ Subscription')
      console.log(`   │  Status: ${sub.status}`)
      console.log(`   │  Plan: ${sub.plan.displayName}`)
      console.log(`   │  Billing Cycle: ${sub.billing_cycle}`)
      console.log(`   │  Payment Method: ${sub.preferredPaymentMethod || 'Não definido'}`)
    }

    console.log('   └─ Faturas')

    if (invoices.length === 0) {
      console.log('      ⚠️  NENHUMA FATURA GERADA')
    } else {
      invoices.forEach((inv, idx) => {
        console.log(`      ${idx + 1}. Invoice #${inv.invoiceNumber}`)
        console.log(`         Valor: R$ ${inv.amount.toFixed(2)}`)
        console.log(`         Status: ${inv.status}`)
        console.log(`         Vencimento: ${inv.dueDate.toLocaleDateString('pt-BR')}`)
        console.log(`         Asaas ID: ${inv.asaasInvoiceId || '❌ NÃO ENVIADO'}`)
        console.log(`         Payment URL: ${inv.paymentUrl ? '✅' : '❌'}`)
        console.log(`         Criado em: ${inv.createdAt.toLocaleString('pt-BR')}`)
      })
    }
  }

  console.log('\n' + '━'.repeat(80))

  // Estatísticas gerais
  const totalInvoices = await prisma.invoice.count({
    where: {
      tenant: {
        OR: [
          { name: { startsWith: 'TESTE Manu' } },
          { name: { startsWith: 'TESTE Trial' } },
        ],
      },
    },
  })

  const invoicesWithAsaas = await prisma.invoice.count({
    where: {
      tenant: {
        OR: [
          { name: { startsWith: 'TESTE Manu' } },
          { name: { startsWith: 'TESTE Trial' } },
        ],
      },
      asaasInvoiceId: { not: null },
    },
  })

  console.log('\n📊 ESTATÍSTICAS:')
  console.log(`   Total de faturas: ${totalInvoices}`)
  console.log(`   Faturas enviadas ao Asaas: ${invoicesWithAsaas}`)
  console.log(`   Faturas sem Asaas: ${totalInvoices - invoicesWithAsaas}`)
  console.log('')

  await prisma.$disconnect()
}

checkInvoices()
