import { PrismaClient } from '@prisma/client'
import { addDays, addHours } from 'date-fns'

/**
 * Script para criar tenant de teste com email manu.root@gmail.com
 *
 * Cria 4 cenários para testar TODOS os emails:
 * 1. Trial D-7 - Email INFO
 * 2. Trial D-3 - Email WARNING
 * 3. Trial D-1 - Email CRITICAL com CTA de cancelamento
 * 4. Trial expirado - Conversão automática + email de boas-vindas
 */

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 CRIANDO TENANTS DE TESTE PARA manu.root@gmail.com\n')
  console.log('━'.repeat(60))

  // Buscar plano existente
  const plan = await prisma.plan.findFirst({
    where: { isActive: true },
  })

  if (!plan) {
    console.error('❌ Nenhum plano ativo encontrado')
    return
  }

  console.log(`✅ Plano: ${plan.displayName} (R$ ${plan.price})\n`)

  const now = new Date()
  const baseEmail = 'manu.root@gmail.com'

  // ============================================================
  // CENÁRIO 1: D-7 (Email INFO)
  // ============================================================
  console.log('📋 Cenário 1: Trial D-7 (Email INFO)')
  const ts1 = Date.now()

  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'TESTE Manu D-7',
      slug: `manu-d7-${ts1}`,
      schemaName: `manu_d7_${ts1}`,
      email: baseEmail,
      cnpj: `71${ts1.toString().slice(-12)}`,
      status: 'TRIAL',
    },
  })

  const sub1 = await prisma.subscription.create({
    data: {
      tenantId: tenant1.id,
      planId: plan.id,
      status: 'trialing',
      billingCycle: 'MONTHLY',
      preferredPaymentMethod: 'BOLETO',
      trialEndDate: addDays(now, 7),
      trialAlert7Sent: false,
      trialAlert3Sent: false,
      trialAlert1Sent: false,
    },
  })

  console.log(`   ✅ Tenant: ${tenant1.id}`)
  console.log(`   ✅ Subscription: ${sub1.id}`)
  console.log(`   ✅ Expira em: ${sub1.trialEndDate?.toLocaleString('pt-BR')}\n`)

  // ============================================================
  // CENÁRIO 2: D-3 (Email WARNING)
  // ============================================================
  console.log('📋 Cenário 2: Trial D-3 (Email WARNING)')
  const ts2 = Date.now() + 1

  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'TESTE Manu D-3',
      slug: `manu-d3-${ts2}`,
      schemaName: `manu_d3_${ts2}`,
      email: baseEmail,
      cnpj: `72${ts2.toString().slice(-12)}`,
      status: 'TRIAL',
    },
  })

  const sub2 = await prisma.subscription.create({
    data: {
      tenantId: tenant2.id,
      planId: plan.id,
      status: 'trialing',
      billingCycle: 'MONTHLY',
      preferredPaymentMethod: 'BOLETO',
      trialEndDate: addDays(now, 3),
      trialAlert7Sent: false,
      trialAlert3Sent: false,
      trialAlert1Sent: false,
    },
  })

  console.log(`   ✅ Tenant: ${tenant2.id}`)
  console.log(`   ✅ Subscription: ${sub2.id}`)
  console.log(`   ✅ Expira em: ${sub2.trialEndDate?.toLocaleString('pt-BR')}\n`)

  // ============================================================
  // CENÁRIO 3: D-1 (Email CRITICAL com CTA)
  // ============================================================
  console.log('📋 Cenário 3: Trial D-1 (Email CRITICAL com CTA)')
  const ts3 = Date.now() + 2

  const tenant3 = await prisma.tenant.create({
    data: {
      name: 'TESTE Manu D-1',
      slug: `manu-d1-${ts3}`,
      schemaName: `manu_d1_${ts3}`,
      email: baseEmail,
      cnpj: `73${ts3.toString().slice(-12)}`,
      status: 'TRIAL',
    },
  })

  const sub3 = await prisma.subscription.create({
    data: {
      tenantId: tenant3.id,
      planId: plan.id,
      status: 'trialing',
      billingCycle: 'ANNUAL',
      preferredPaymentMethod: 'CREDIT_CARD',
      trialEndDate: addDays(now, 1),
      trialAlert7Sent: false,
      trialAlert3Sent: false,
      trialAlert1Sent: false,
    },
  })

  console.log(`   ✅ Tenant: ${tenant3.id}`)
  console.log(`   ✅ Subscription: ${sub3.id}`)
  console.log(`   ✅ Expira em: ${sub3.trialEndDate?.toLocaleString('pt-BR')}\n`)

  // ============================================================
  // CENÁRIO 4: Trial EXPIRADO (Conversão automática)
  // ============================================================
  console.log('📋 Cenário 4: Trial expirado (Conversão automática)')
  const ts4 = Date.now() + 3

  const tenant4 = await prisma.tenant.create({
    data: {
      name: 'TESTE Manu Expirado',
      slug: `manu-exp-${ts4}`,
      schemaName: `manu_exp_${ts4}`,
      email: baseEmail,
      cnpj: `74${ts4.toString().slice(-12)}`,
      status: 'TRIAL',
    },
  })

  const sub4 = await prisma.subscription.create({
    data: {
      tenantId: tenant4.id,
      planId: plan.id,
      status: 'trialing',
      billingCycle: 'MONTHLY',
      preferredPaymentMethod: 'BOLETO',
      trialEndDate: addHours(now, -1), // Expirou há 1 hora
      trialAlert7Sent: true,
      trialAlert3Sent: true,
      trialAlert1Sent: true,
    },
  })

  console.log(`   ✅ Tenant: ${tenant4.id}`)
  console.log(`   ✅ Subscription: ${sub4.id}`)
  console.log(`   ✅ Expirou em: ${sub4.trialEndDate?.toLocaleString('pt-BR')}\n`)

  // ============================================================
  // RESUMO
  // ============================================================
  console.log('━'.repeat(60))
  console.log('📊 RESUMO DOS TESTES:\n')
  console.log(`Email destino: ${baseEmail}`)
  console.log(`Total de cenários: 4\n`)

  console.log('Emails que você vai receber:')
  console.log('1️⃣  📅 Trial termina em 7 dias (INFO)')
  console.log('2️⃣  ⚠️  Trial terminando em 3 dias (WARNING)')
  console.log('3️⃣  🚨 Trial expira amanhã! (CRITICAL + CTA Cancelamento)')
  console.log('4️⃣  🎉 Bem-vindo ao plano ativo! (Conversão + Fatura)\n')

  console.log('━'.repeat(60))
  console.log('\n🔄 COMO TESTAR:\n')
  console.log('Opção A - Executar jobs manualmente via API')
  console.log('Opção B - Aguardar execução automática (Cron)')
  console.log('   - Trial Alerts: 08:00 diariamente')
  console.log('   - Conversão: 02:00 diariamente')
  console.log('\nOpção C - Executar job específico agora:')
  console.log('   No backend, importe e execute:')
  console.log('   - TrialExpirationAlertsJob.handleTrialExpirationAlerts()')
  console.log('   - TrialToActiveConversionJob.handleTrialConversion()\n')
}

main()
  .then(() => {
    console.log('✅ Script concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
