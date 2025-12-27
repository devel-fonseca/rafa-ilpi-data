import { PrismaClient } from '@prisma/client'
import { addDays } from 'date-fns'
import { Resend } from 'resend'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar variáveis de ambiente do .env
dotenv.config({ path: path.join(__dirname, '.env') })

/**
 * Script DIRETO para executar jobs de trial
 * Não depende do NestJS - executa diretamente
 *
 * Dispara:
 * 1. Avisos de trial (D-7, D-3, D-1)
 * 2. Conversão de trials expirados
 */

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

console.log('🔑 RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Configurada' : '❌ NÃO ENCONTRADA')

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const result = await resend.emails.send({
      from: 'Rafa ILPI <noreply@mail.rafalabs.com.br>', // ✅ Domínio verificado!
      to,
      subject,
      html,
    })

    if (result.error) {
      console.error(`   ❌ Erro ao enviar email:`, result.error.message)
      return false
    }

    console.log(`   ✅ Email enviado: ${subject} (ID: ${result.data?.id})`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Erro ao enviar email:`, error.message)
    return false
  }
}

async function handleTrialAlerts() {
  console.log('\n📧 EXECUTANDO: Trial Expiration Alerts\n')
  const now = new Date()

  // D-7
  const trials7Days = await prisma.subscription.findMany({
    where: {
      status: 'trialing',
      trialEndDate: {
        gte: addDays(now, 6.5),
        lte: addDays(now, 7.5),
      },
      trialAlert7Sent: false,
    },
    include: { tenant: true, plan: true },
  })

  console.log(`📅 D-7: ${trials7Days.length} trial(s) encontrado(s)`)
  for (const sub of trials7Days) {
    await sendEmail(
      sub.tenant.email,
      '📅 Seu trial termina em 7 dias',
      `<h2>Olá, ${sub.tenant.name}!</h2>
       <p>Seu período de teste do <strong>${sub.plan.displayName}</strong> está chegando ao fim.</p>
       <p>Dias restantes: <strong>7</strong></p>`
    )

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { trialAlert7Sent: true },
    })
  }

  // D-3
  const trials3Days = await prisma.subscription.findMany({
    where: {
      status: 'trialing',
      trialEndDate: {
        gte: addDays(now, 2.5),
        lte: addDays(now, 3.5),
      },
      trialAlert3Sent: false,
    },
    include: { tenant: true, plan: true },
  })

  console.log(`⚠️  D-3: ${trials3Days.length} trial(s) encontrado(s)`)
  for (const sub of trials3Days) {
    await sendEmail(
      sub.tenant.email,
      '⚠️ Trial terminando em 3 dias',
      `<h2>Olá, ${sub.tenant.name}!</h2>
       <p>Seu período de teste do <strong>${sub.plan.displayName}</strong> está chegando ao fim.</p>
       <p>Dias restantes: <strong>3</strong></p>`
    )

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { trialAlert3Sent: true },
    })
  }

  // D-1
  const trials1Day = await prisma.subscription.findMany({
    where: {
      status: 'trialing',
      trialEndDate: {
        gte: addDays(now, 0.5),
        lte: addDays(now, 1.5),
      },
      trialAlert1Sent: false,
    },
    include: { tenant: true, plan: true },
  })

  console.log(`🚨 D-1: ${trials1Day.length} trial(s) encontrado(s)`)
  for (const sub of trials1Day) {
    await sendEmail(
      sub.tenant.email,
      '🚨 Seu trial expira amanhã!',
      `<h2>Olá, ${sub.tenant.name}!</h2>
       <p>Seu período de teste do <strong>${sub.plan.displayName}</strong> expira amanhã!</p>

       <div style="background: #fee; padding: 15px; border-left: 4px solid #f00; margin: 20px 0;">
         <strong>⚠️ ATENÇÃO - ATIVAÇÃO AUTOMÁTICA</strong><br/><br/>
         Após a expiração do período de teste, seu plano será <strong>ativado automaticamente</strong>
         e a <strong>primeira cobrança será gerada</strong>.<br/><br/>

         <strong>Método de pagamento escolhido:</strong> ${sub.preferredPaymentMethod || 'Boleto'}<br/><br/>

         <strong>Caso não deseje a ativação automática</strong>, o cancelamento pode ser realizado até amanhã.
       </div>`
    )

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { trialAlert1Sent: true },
    })
  }

  console.log('\n✅ Trial Alerts concluído!\n')
}

async function handleTrialConversion() {
  console.log('\n🔄 EXECUTANDO: Trial Conversion\n')
  const now = new Date()

  const expiredTrials = await prisma.subscription.findMany({
    where: {
      status: 'trialing',
      trialEndDate: { lte: now },
    },
    include: { tenant: true, plan: true },
  })

  console.log(`🔎 Encontrado(s) ${expiredTrials.length} trial(s) expirado(s)\n`)

  for (const sub of expiredTrials) {
    // Validar se não foi cancelado
    if (
      sub.status === 'canceled' ||
      sub.tenant.status === 'SUSPENDED' ||
      sub.tenant.status === 'CANCELLED'
    ) {
      console.log(`⚠️  Trial ${sub.id} cancelado - IGNORADO`)
      continue
    }

    console.log(`🔄 Convertendo: ${sub.tenant.name}`)

    try {
      // Converter para active
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'active',
            currentPeriodStart: sub.trialEndDate,
            currentPeriodEnd:
              sub.billing_cycle === 'ANNUAL'
                ? addDays(sub.trialEndDate!, 365)
                : addDays(sub.trialEndDate!, 30),
          },
        })

        await tx.tenant.update({
          where: { id: sub.tenantId },
          data: { status: 'ACTIVE' },
        })
      })

      // Enviar email de boas-vindas
      await sendEmail(
        sub.tenant.email,
        '🎉 Bem-vindo ao plano ativo!',
        `<h2>Olá, ${sub.tenant.name}!</h2>
         <p>Seu período de teste terminou e seu plano foi ativado automaticamente!</p>

         <div style="background: #efe; padding: 15px; border-left: 4px solid #0a0;">
           <strong>Plano Ativo:</strong> ${sub.plan.displayName}<br/>
           <strong>Status:</strong> ✅ Ativo
         </div>

         <p>A primeira fatura será gerada em breve.</p>`
      )

      console.log(`   ✅ Convertido com sucesso!`)
    } catch (error) {
      console.error(`   ❌ Erro ao converter:`, error.message)
    }
  }

  console.log('\n✅ Trial Conversion concluído!\n')
}

async function main() {
  console.log('🚀 EXECUTANDO JOBS DE TRIAL DIRETAMENTE\n')
  console.log('━'.repeat(60))

  try {
    await handleTrialAlerts()
    await handleTrialConversion()

    console.log('━'.repeat(60))
    console.log('\n✅ TODOS OS JOBS EXECUTADOS COM SUCESSO!\n')
    console.log('📬 Verifique a inbox de manu.root@gmail.com')
    console.log('📊 Verifique o database para confirmar conversões e flags\n')
  } catch (error) {
    console.error('\n❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
