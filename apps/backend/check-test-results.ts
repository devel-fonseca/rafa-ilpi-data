import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  console.log('\n📊 VALIDANDO RESULTADOS DOS TESTES\n')
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
    },
    orderBy: {
      name: 'asc',
    },
  })

  console.log(`\n🔍 Encontrados ${testTenants.length} tenants de teste:\n`)

  for (const tenant of testTenants) {
    const sub = tenant.subscriptions[0]

    if (!sub) {
      console.log(`\n📋 ${tenant.name}`)
      console.log('   ⚠️  SEM SUBSCRIPTION')
      continue
    }

    console.log(`\n📋 ${tenant.name}`)
    console.log('   ┌─ Tenant')
    console.log(`   │  Status: ${tenant.status}`)
    console.log('   ├─ Subscription')
    console.log(`   │  Status: ${sub.status}`)
    console.log(`   │  Trial End: ${sub.trialEndDate?.toLocaleString('pt-BR')}`)
    console.log('   ├─ Flags de Alertas')
    console.log(`   │  D-7 enviado: ${sub.trialAlert7Sent ? '✅' : '❌'}`)
    console.log(`   │  D-3 enviado: ${sub.trialAlert3Sent ? '✅' : '❌'}`)
    console.log(`   │  D-1 enviado: ${sub.trialAlert1Sent ? '✅' : '❌'}`)
    console.log('   └─ Conversão')

    if (sub.status === 'active') {
      console.log(`      ✅ CONVERTIDO para active`)
      console.log(`      Período: ${sub.currentPeriodStart?.toLocaleString('pt-BR')} → ${sub.currentPeriodEnd?.toLocaleString('pt-BR')}`)
    } else if (sub.status === 'trialing') {
      console.log(`      ⏳ Ainda em trial (expira: ${sub.trialEndDate?.toLocaleString('pt-BR')})`)
    } else {
      console.log(`      ⚠️  Status: ${sub.status}`)
    }
  }

  console.log('\n' + '━'.repeat(80))
  console.log('\n✅ VALIDAÇÃO COMPLETA!\n')

  await prisma.$disconnect()
}

check()
