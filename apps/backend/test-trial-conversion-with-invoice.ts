import { PrismaClient } from '@prisma/client'
import { addDays, addMonths, addYears } from 'date-fns'
import { Resend } from 'resend'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar variáveis de ambiente do .env
dotenv.config({ path: path.join(__dirname, '.env') })

/**
 * Script COMPLETO para testar conversão trial → active COM GERAÇÃO DE FATURA
 *
 * TESTE:
 * 1. Cria 1 tenant trial expirado
 * 2. Converte para active
 * 3. Gera primeira fatura
 * 4. Envia ao Asaas (Sandbox)
 * 5. Envia email de confirmação
 */

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

console.log('🔑 RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Configurada' : '❌ NÃO ENCONTRADA')
console.log('🔑 ASAAS_API_KEY:', process.env.ASAAS_API_KEY ? '✅ Configurada' : '❌ NÃO ENCONTRADA')
console.log('🔑 ASAAS_ENV:', process.env.ASAAS_ENV || 'SANDBOX')

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const result = await resend.emails.send({
      from: 'Rafa ILPI <noreply@mail.rafalabs.com.br>',
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

async function createAsaasPayment(data: {
  customer: string
  billingType: string
  value: number
  dueDate: string
  description: string
}) {
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY
  const ASAAS_ENV = process.env.ASAAS_ENV || 'SANDBOX'
  const ASAAS_URL = ASAAS_ENV === 'PRODUCTION'
    ? 'https://www.asaas.com/api/v3'
    : 'https://sandbox.asaas.com/api/v3'

  try {
    const response = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY!,
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Asaas API error: ${JSON.stringify(result)}`)
    }

    return result
  } catch (error: any) {
    console.error(`   ❌ Erro ao criar pagamento no Asaas:`, error.message)
    throw error
  }
}

async function main() {
  console.log('\n🚀 TESTE COMPLETO: CONVERSÃO TRIAL → ACTIVE COM FATURA\n')
  console.log('━'.repeat(60))

  try {
    // 1. Buscar plano PAGO (não free, pois Asaas não aceita valor 0)
    const plan = await prisma.plan.findFirst({
      where: {
        name: { not: 'free' },
        price: { gt: 0 }
      },
      orderBy: { price: 'asc' } // Pegar o mais barato
    })

    if (!plan) {
      throw new Error('Plano PAGO não encontrado!')
    }

    console.log(`\n📦 Plano: ${plan.displayName} (R$ ${plan.price})`)

    // 2. Criar tenant de teste com trial EXPIRADO
    const now = new Date()
    const ts = Date.now()

    console.log('\n📋 Criando tenant de teste...')

    // Usar CPF válido para testes (Asaas Sandbox aceita CPF para pessoa jurídica)
    const cpfTeste = '12345678909' // CPF válido de teste

    const tenant = await prisma.tenant.create({
      data: {
        name: `TESTE Trial Conversion ${ts}`,
        slug: `trial-conv-${ts}`,
        schemaName: `trial_conv_${ts}`,
        email: 'manu.root@gmail.com',
        cnpj: cpfTeste, // CPF válido para testes
        status: 'TRIAL',
        // asaasCustomerId será criado dinamicamente
      },
    })

    console.log(`   ✅ Tenant criado: ${tenant.id}`)

    // 3. Criar subscription expirada (ontem)
    const trialEndDate = addDays(now, -1) // Expirou ontem

    const subscription = await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        status: 'trialing',
        billingCycle: 'MONTHLY', // ✅ Prisma Client usa camelCase
        preferredPaymentMethod: 'BOLETO',
        trialEndDate,
        trialAlert7Sent: true,
        trialAlert3Sent: true,
        trialAlert1Sent: true,
      },
    })

    console.log(`   ✅ Subscription criada: ${subscription.id}`)
    console.log(`   ✅ Trial expirou em: ${trialEndDate.toLocaleString('pt-BR')}`)
    console.log(`   ✅ Billing Cycle: ${subscription.billingCycle}`)
    console.log(`   ✅ Payment Method: ${subscription.preferredPaymentMethod}`)

    // 4. CONVERSÃO: trial → active
    console.log('\n🔄 CONVERTENDO TRIAL → ACTIVE...')

    const cycleStart = trialEndDate
    const cycleEnd = subscription.billingCycle === 'ANNUAL'
      ? addYears(cycleStart, 1)
      : addMonths(cycleStart, 1)

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'active',
          currentPeriodStart: cycleStart,
          currentPeriodEnd: cycleEnd,
        },
      })

      await tx.tenant.update({
        where: { id: tenant.id },
        data: { status: 'ACTIVE' },
      })
    })

    console.log(`   ✅ Status atualizado: trialing → active`)
    console.log(`   ✅ Período: ${cycleStart.toLocaleString('pt-BR')} → ${cycleEnd.toLocaleString('pt-BR')}`)

    // 5. GERAR PRIMEIRA FATURA
    console.log('\n💰 GERANDO PRIMEIRA FATURA...')

    const basePrice = plan.price
    const discount = 0 // Sem desconto
    const amount = basePrice * (1 - discount / 100)
    const dueDate = addDays(now, 7)

    // Mapear método de pagamento
    const billingType = subscription.preferredPaymentMethod === 'CREDIT_CARD'
      ? 'CREDIT_CARD'
      : 'BOLETO'

    console.log(`   Valor: R$ ${amount.toFixed(2)}`)
    console.log(`   Vencimento: ${dueDate.toLocaleDateString('pt-BR')}`)
    console.log(`   Método: ${billingType}`)

    // Gerar número de fatura
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    const lastNumber = lastInvoice?.invoiceNumber
      ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, ''))
      : 0

    const invoiceNumber = `INV-${String(lastNumber + 1).padStart(6, '0')}`

    // Criar invoice no banco
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        invoiceNumber,
        amount,
        originalAmount: basePrice,
        discountPercent: discount,
        billingCycle: subscription.billingCycle,
        currency: 'BRL',
        status: 'OPEN',
        dueDate,
        description: `Primeira fatura - ${plan.displayName}`,
      },
    })

    console.log(`   ✅ Invoice criada: ${invoice.invoiceNumber}`)

    // 6. CRIAR CLIENTE NO ASAAS (se não existir)
    console.log('\n👤 CRIANDO CLIENTE NO ASAAS...')

    const ASAAS_API_KEY = process.env.ASAAS_API_KEY
    const ASAAS_ENV = process.env.ASAAS_ENV || 'SANDBOX'
    const ASAAS_URL = ASAAS_ENV === 'PRODUCTION'
      ? 'https://www.asaas.com/api/v3'
      : 'https://sandbox.asaas.com/api/v3'

    let asaasCustomerId = tenant.asaasCustomerId

    if (!asaasCustomerId) {
      const customerResponse = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY!,
        },
        body: JSON.stringify({
          name: tenant.name,
          email: tenant.email,
          cpfCnpj: tenant.cnpj.replace(/\D/g, ''), // Remove pontuação
        }),
      })

      const customerResult = await customerResponse.json()

      if (!customerResponse.ok) {
        throw new Error(`Erro ao criar cliente no Asaas: ${JSON.stringify(customerResult)}`)
      }

      asaasCustomerId = customerResult.id

      // Atualizar tenant com asaasCustomerId
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { asaasCustomerId },
      })

      console.log(`   ✅ Cliente criado no Asaas: ${asaasCustomerId}`)
    } else {
      console.log(`   ✅ Cliente já existe: ${asaasCustomerId}`)
    }

    // 7. ENVIAR AO ASAAS
    console.log('\n📤 ENVIANDO COBRANÇA AO ASAAS (SANDBOX)...')

    const asaasPayment = await createAsaasPayment({
      customer: asaasCustomerId!,
      billingType,
      value: Number(amount),
      dueDate: dueDate.toISOString().split('T')[0],
      description: invoice.description || `Fatura ${invoice.invoiceNumber}`,
    })

    console.log(`   ✅ Pagamento criado no Asaas:`)
    console.log(`      ID: ${asaasPayment.id}`)
    console.log(`      Status: ${asaasPayment.status}`)
    console.log(`      Invoice URL: ${asaasPayment.invoiceUrl || 'N/A'}`)
    console.log(`      Bank Slip URL: ${asaasPayment.bankSlipUrl || 'N/A'}`)

    // Atualizar invoice com dados do Asaas
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        asaasInvoiceId: asaasPayment.id,
        paymentUrl: asaasPayment.invoiceUrl || asaasPayment.bankSlipUrl || null,
      },
    })

    console.log(`   ✅ Invoice atualizada com dados do Asaas`)

    // 7. ENVIAR EMAIL DE CONFIRMAÇÃO
    console.log('\n📧 ENVIANDO EMAIL DE CONFIRMAÇÃO...')

    const paymentMethodLabel = {
      BOLETO: '📄 Boleto Bancário',
      CREDIT_CARD: '💳 Cartão de Crédito',
    }[billingType] || 'Boleto Bancário'

    await sendEmail(
      tenant.email,
      '🎉 Bem-vindo ao plano ativo!',
      `<h2>Olá, ${tenant.name}!</h2>
       <p>Seu período de teste terminou e seu plano foi ativado automaticamente!</p>

       <div style="background: #efe; padding: 15px; border-left: 4px solid #0a0;">
         <strong>Plano Ativo:</strong> ${plan.displayName}<br/>
         <strong>Status:</strong> ✅ Ativo
       </div>

       <h3>Primeira Fatura Gerada</h3>
       <p><strong>Número:</strong> ${invoice.invoiceNumber}</p>
       <p><strong>Valor:</strong> R$ ${amount.toFixed(2)}</p>
       <p><strong>Vencimento:</strong> ${dueDate.toLocaleDateString('pt-BR')}</p>
       <p><strong>Método de Pagamento:</strong> ${paymentMethodLabel}</p>

       <p>
         <a href="${asaasPayment.invoiceUrl || asaasPayment.bankSlipUrl}" style="background: #0a0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
           💳 Pagar Agora
         </a>
       </p>

       <p><em>A cobrança será processada automaticamente via <strong>${billingType}</strong> conforme escolhido no cadastro.</em></p>

       <p><strong>🧪 AMBIENTE DE TESTE (ASAAS SANDBOX)</strong></p>
       <p>Continue aproveitando todos os recursos do seu plano!</p>`
    )

    console.log('\n━'.repeat(60))
    console.log('\n✅ TESTE COMPLETO EXECUTADO COM SUCESSO!\n')
    console.log('📊 RESUMO:')
    console.log(`   Tenant: ${tenant.name}`)
    console.log(`   Status: ${tenant.status}`)
    console.log(`   Subscription: ${subscription.status}`)
    console.log(`   Invoice: ${invoice.invoiceNumber}`)
    console.log(`   Asaas Payment ID: ${asaasPayment.id}`)
    console.log(`   Payment URL: ${asaasPayment.invoiceUrl || asaasPayment.bankSlipUrl}`)
    console.log('\n📬 Verifique:')
    console.log('   1. Inbox de manu.root@gmail.com')
    console.log('   2. Dashboard do Asaas Sandbox: https://sandbox.asaas.com')
    console.log('   3. Banco de dados (tabela Invoice)\n')
  } catch (error: any) {
    console.error('\n❌ Erro:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
