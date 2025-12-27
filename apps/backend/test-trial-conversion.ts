import { PrismaClient } from '@prisma/client'
import { addDays, addHours } from 'date-fns'

/**
 * Script de Teste: Conversão Trial → Active
 *
 * Cria 5 cenários de teste para validar o sistema de conversão automática:
 *
 * 1. Trial expirando em 7 dias (D-7) - deve receber email info
 * 2. Trial expirando em 3 dias (D-3) - deve receber email warning
 * 3. Trial expirando em 1 dia (D-1) - deve receber email critical com CTA cancelamento
 * 4. Trial já expirado - deve converter para active automaticamente
 * 5. Trial expirado MAS cancelado - NÃO deve converter (validação de segurança)
 *
 * Uso:
 * ```bash
 * npx tsx test-trial-conversion.ts
 * ```
 */

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 INICIANDO CRIAÇÃO DE CENÁRIOS DE TESTE\n')
  console.log('━'.repeat(60))

  // Buscar plano existente para usar nos testes
  const plan = await prisma.plan.findFirst({
    where: { isActive: true },
  })

  if (!plan) {
    console.error('❌ Nenhum plano ativo encontrado. Crie um plano primeiro.')
    return
  }

  console.log(`✅ Plano selecionado: ${plan.displayName} (R$ ${plan.price})\n`)

  const now = new Date()
  const scenarios = []

  // ============================================================
  // CENÁRIO 1: Trial D-7 (deve enviar email INFO)
  // ============================================================
  console.log('📋 Cenário 1: Trial expirando em 7 dias (D-7)')
  const timestamp1 = Date.now()
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'TESTE Trial D-7',
      slug: `trial-d7-${timestamp1}`,
      schemaName: `trial_d7_${timestamp1}`,
      email: `trial-d7-${timestamp1}@teste.com`,
      cnpj: `11${timestamp1.toString().slice(-12)}`, // CNPJ único
      status: 'TRIAL',
    },
  })

  const subscription1 = await prisma.subscription.create({
    data: {
      tenantId: tenant1.id,
      planId: plan.id,
      status: 'trialing',
      billingCycle: 'MONTHLY',
      preferredPaymentMethod: 'BOLETO',
      trialEndDate: addDays(now, 7), // Expira em 7 dias
      trialAlert7Sent: false,
      trialAlert3Sent: false,
      trialAlert1Sent: false,
    },
  })

  scenarios.push({
    cenario: 'D-7 (Info)',
    tenant: tenant1.name,
    email: tenant1.email,
    trialEndDate: subscription1.trialEndDate,
    status: subscription1.status,
    esperado: 'Email D-7 enviado, flag trialAlert7Sent = true',
  })

  console.log(`   ✅ Tenant criado: ${tenant1.id}`)
  console.log(`   ✅ Subscription criada: ${subscription1.id}`)
  console.log(`   ✅ Trial expira em: ${subscription1.trialEndDate?.toLocaleString('pt-BR')}\n`)

  // ============================================================
  // CENÁRIO 2: Trial D-3 (deve enviar email WARNING)
  // ============================================================
  console.log('📋 Cenário 2: Trial expirando em 3 dias (D-3)')
  const timestamp2 = Date.now() + 1
  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'TESTE Trial D-3',
      slug: `trial-d3-${timestamp2}`,
      schemaName: `trial_d3_${timestamp2}`,
      email: `trial-d3-${timestamp2}@teste.com`,
      cnpj: `22${timestamp2.toString().slice(-12)}`, // CNPJ único
      status: 'TRIAL',
    },
  })

  const subscription2 = await prisma.subscription.create({
    data: {
      tenantId: tenant2.id,
      planId: plan.id,
      status: 'trialing',
      billingCycle: 'MONTHLY',
      preferredPaymentMethod: 'CREDIT_CARD',
      trialEndDate: addDays(now, 3), // Expira em 3 dias
      trialAlert7Sent: false,
      trialAlert3Sent: false,
      trialAlert1Sent: false,
    },
  })

  scenarios.push({
    cenario: 'D-3 (Warning)',
    tenant: tenant2.name,
    email: tenant2.email,
    trialEndDate: subscription2.trialEndDate,
    status: subscription2.status,
    esperado: 'Email D-3 enviado, flag trialAlert3Sent = true',
  })

  console.log(`   ✅ Tenant criado: ${tenant2.id}`)
  console.log(`   ✅ Subscription criada: ${subscription2.id}`)
  console.log(`   ✅ Trial expira em: ${subscription2.trialEndDate?.toLocaleString('pt-BR')}\n`)

  // ============================================================
  // CENÁRIO 3: Trial D-1 (deve enviar email CRITICAL com CTA)
  // ============================================================
  console.log('📋 Cenário 3: Trial expirando em 1 dia (D-1)')
  const timestamp3 = Date.now() + 2
  const tenant3 = await prisma.tenant.create({
    data: {
      name: 'TESTE Trial D-1',
      slug: `trial-d1-${timestamp3}`,
      schemaName: `trial_d1_${timestamp3}`,
      email: `trial-d1-${timestamp3}@teste.com`,
      cnpj: `33${timestamp3.toString().slice(-12)}`, // CNPJ único
      status: 'TRIAL',
    },
  })

  const subscription3 = await prisma.subscription.create({
    data: {
      tenantId: tenant3.id,
      planId: plan.id,
      status: 'trialing',
      billingCycle: 'ANNUAL',
      preferredPaymentMethod: 'BOLETO',
      trialEndDate: addDays(now, 1), // Expira em 1 dia
      trialAlert7Sent: false,
      trialAlert3Sent: false,
      trialAlert1Sent: false,
    },
  })

  scenarios.push({
    cenario: 'D-1 (Critical)',
    tenant: tenant3.name,
    email: tenant3.email,
    trialEndDate: subscription3.trialEndDate,
    status: subscription3.status,
    esperado: 'Email D-1 com CTA de cancelamento, flag trialAlert1Sent = true',
  })

  console.log(`   ✅ Tenant criado: ${tenant3.id}`)
  console.log(`   ✅ Subscription criada: ${subscription3.id}`)
  console.log(`   ✅ Trial expira em: ${subscription3.trialEndDate?.toLocaleString('pt-BR')}\n`)

  // ============================================================
  // CENÁRIO 4: Trial JÁ EXPIRADO (deve converter para active)
  // ============================================================
  console.log('📋 Cenário 4: Trial já expirado (deve converter)')
  const timestamp4 = Date.now() + 3
  const tenant4 = await prisma.tenant.create({
    data: {
      name: 'TESTE Trial Expirado',
      slug: `trial-exp-${timestamp4}`,
      schemaName: `trial_exp_${timestamp4}`,
      email: `trial-expirado-${timestamp4}@teste.com`,
      cnpj: `44${timestamp4.toString().slice(-12)}`, // CNPJ único
      status: 'TRIAL',
    },
  })

  const subscription4 = await prisma.subscription.create({
    data: {
      tenantId: tenant4.id,
      planId: plan.id,
      status: 'trialing',
      billingCycle: 'MONTHLY',
      preferredPaymentMethod: 'BOLETO',
      trialEndDate: addHours(now, -2), // Expirou há 2 horas
      trialAlert7Sent: true,
      trialAlert3Sent: true,
      trialAlert1Sent: true, // Já enviou todos os alertas
    },
  })

  scenarios.push({
    cenario: 'Expirado (Conversão)',
    tenant: tenant4.name,
    email: tenant4.email,
    trialEndDate: subscription4.trialEndDate,
    status: subscription4.status,
    esperado: 'Conversão trial → active, fatura gerada, email de confirmação',
  })

  console.log(`   ✅ Tenant criado: ${tenant4.id}`)
  console.log(`   ✅ Subscription criada: ${subscription4.id}`)
  console.log(`   ✅ Trial expirou em: ${subscription4.trialEndDate?.toLocaleString('pt-BR')}\n`)

  // ============================================================
  // CENÁRIO 5: Trial expirado MAS CANCELADO (NÃO deve converter)
  // ============================================================
  console.log('📋 Cenário 5: Trial expirado mas CANCELADO (validação de segurança)')
  const timestamp5 = Date.now() + 4
  const tenant5 = await prisma.tenant.create({
    data: {
      name: 'TESTE Trial Cancelado',
      slug: `trial-canc-${timestamp5}`,
      schemaName: `trial_canc_${timestamp5}`,
      email: `trial-cancelado-${timestamp5}@teste.com`,
      cnpj: `55${timestamp5.toString().slice(-12)}`, // CNPJ único
      status: 'CANCELLED', // ✅ Status cancelado
    },
  })

  const subscription5 = await prisma.subscription.create({
    data: {
      tenantId: tenant5.id,
      planId: plan.id,
      status: 'trialing', // Status ainda trialing (não foi atualizado)
      billingCycle: 'MONTHLY',
      preferredPaymentMethod: 'CREDIT_CARD',
      trialEndDate: addHours(now, -3), // Expirou há 3 horas
      trialAlert7Sent: true,
      trialAlert3Sent: true,
      trialAlert1Sent: true,
    },
  })

  scenarios.push({
    cenario: 'Cancelado (Ignorar)',
    tenant: tenant5.name,
    email: tenant5.email,
    trialEndDate: subscription5.trialEndDate,
    status: tenant5.status,
    esperado: 'Job deve IGNORAR (tenant.status = CANCELLED)',
  })

  console.log(`   ✅ Tenant criado: ${tenant5.id}`)
  console.log(`   ✅ Subscription criada: ${subscription5.id}`)
  console.log(`   ✅ Trial expirou em: ${subscription5.trialEndDate?.toLocaleString('pt-BR')}`)
  console.log(`   ⚠️  Tenant.status = CANCELLED (deve ser ignorado pelo job)\n`)

  // ============================================================
  // RESUMO DOS CENÁRIOS CRIADOS
  // ============================================================
  console.log('━'.repeat(60))
  console.log('📊 RESUMO DOS CENÁRIOS CRIADOS:\n')

  scenarios.forEach((s, i) => {
    console.log(`${i + 1}. ${s.cenario}`)
    console.log(`   Tenant: ${s.tenant}`)
    console.log(`   Email: ${s.email}`)
    console.log(`   Trial End: ${s.trialEndDate?.toLocaleString('pt-BR')}`)
    console.log(`   Status: ${s.status}`)
    console.log(`   Esperado: ${s.esperado}\n`)
  })

  console.log('━'.repeat(60))
  console.log('\n✅ CENÁRIOS CRIADOS COM SUCESSO!')
  console.log('\n📝 PRÓXIMOS PASSOS:')
  console.log('1. Aguardar execução dos jobs (ou executar manualmente)')
  console.log('2. Verificar logs do backend para confirmação')
  console.log('3. Verificar emails enviados (verificar Resend dashboard)')
  console.log('4. Validar flags atualizados no banco de dados')
  console.log('5. Confirmar conversão de subscriptions (cenário 4)')
  console.log('6. Confirmar NÃO conversão do cenário 5 (cancelado)\n')

  console.log('🔍 COMANDOS ÚTEIS PARA VALIDAÇÃO:')
  console.log('\n-- Verificar flags de alertas:')
  console.log('SELECT id, "tenantId", status, "trialEndDate",')
  console.log('       "trialAlert7Sent", "trialAlert3Sent", "trialAlert1Sent"')
  console.log('FROM subscriptions')
  console.log('WHERE "tenantId" IN (')
  console.log(`  '${tenant1.id}', '${tenant2.id}', '${tenant3.id}', '${tenant4.id}', '${tenant5.id}'`)
  console.log(');\n')

  console.log('-- Verificar conversão trial → active:')
  console.log('SELECT t.name, t.status as tenant_status, s.status as subscription_status,')
  console.log('       s."currentPeriodStart", s."currentPeriodEnd"')
  console.log('FROM tenants t')
  console.log('JOIN subscriptions s ON s."tenantId" = t.id')
  console.log('WHERE t.name LIKE \'TESTE Trial%\';')
  console.log('\n')
}

main()
  .then(() => {
    console.log('🎉 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro ao executar script:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
