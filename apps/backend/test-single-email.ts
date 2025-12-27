import { Resend } from 'resend'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '.env') })

const resend = new Resend(process.env.RESEND_API_KEY)

async function testEmail() {
  console.log('📧 TESTE DE EMAIL ÚNICO\n')
  console.log('━'.repeat(60))

  console.log('\n🔑 RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Configurada' : '❌ NÃO ENCONTRADA')

  if (!process.env.RESEND_API_KEY) {
    console.error('\n❌ RESEND_API_KEY não encontrada!')
    process.exit(1)
  }

  try {
    console.log('\n📤 Enviando email de teste para manu.root@gmail.com...\n')

    const result = await resend.emails.send({
      from: 'Rafa ILPI <onboarding@resend.dev>', // ✅ Email de teste da Resend (sempre funciona)
      to: 'manu.root@gmail.com',
      subject: '🧪 TESTE - Email de Trial (Rafa ILPI)',
      html: `
        <h2>🧪 Este é um email de TESTE</h2>
        <p>Se você está vendo este email, significa que o sistema de envio está funcionando!</p>
        <p><strong>Horário:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        <hr/>
        <p><em>Este é um teste do sistema de conversão trial → active do Rafa ILPI.</em></p>
      `,
    })

    console.log('✅ Email enviado com sucesso!')
    console.log('\n📊 Resultado da Resend:')
    console.log(JSON.stringify(result, null, 2))
    console.log('\n━'.repeat(60))
    console.log('\n📬 Verifique a inbox (e SPAM) de manu.root@gmail.com\n')

  } catch (error: any) {
    console.error('\n❌ ERRO ao enviar email:')
    console.error('Mensagem:', error.message)
    console.error('Detalhes:', JSON.stringify(error, null, 2))
  }
}

testEmail()
