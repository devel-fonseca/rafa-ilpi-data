/**
 * Script para executar jobs de trial manualmente via HTTP
 *
 * IMPORTANTE: O backend deve estar rodando em http://localhost:3000
 *
 * Dispara:
 * 1. TrialExpirationAlertsJob (envia emails D-7, D-3, D-1)
 * 2. TrialToActiveConversionJob (converte trials expirados → active)
 *
 * Uso:
 * ```bash
 * npx tsx trigger-trial-jobs.ts
 * ```
 */

async function triggerJobs() {
  console.log('🚀 DISPARANDO JOBS DE TRIAL VIA API\n')
  console.log('━'.repeat(60))

  const baseUrl = 'http://localhost:3000'

  try {
    // 1. Executar job de alertas (D-7, D-3, D-1)
    console.log('\n📧 Disparando TrialExpirationAlertsJob...')
    const alertsResponse = await fetch(`${baseUrl}/api/superadmin/jobs/trial-expiration-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!alertsResponse.ok) {
      console.error(`❌ Falha ao disparar alerts job: ${alertsResponse.status} ${alertsResponse.statusText}`)
    } else {
      console.log('✅ Alerts job disparado com sucesso')
    }

    console.log('\n━'.repeat(60))

    // 2. Executar job de conversão (trials expirados)
    console.log('\n🔄 Disparando TrialToActiveConversionJob...')
    const conversionResponse = await fetch(`${baseUrl}/api/superadmin/jobs/trial-conversion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!conversionResponse.ok) {
      console.error(`❌ Falha ao disparar conversion job: ${conversionResponse.status} ${conversionResponse.statusText}`)
    } else {
      console.log('✅ Conversion job disparado com sucesso')
    }

    console.log('\n━'.repeat(60))
    console.log('\n✅ JOBS DISPARADOS!\n')
    console.log('📬 Verifique a inbox de manu.root@gmail.com')
    console.log('📊 Verifique o database para confirmar conversões e flags')
    console.log('📝 Verifique os logs do backend para detalhes\n')
  } catch (error) {
    console.error('\n❌ Erro ao disparar jobs:', error)
    console.error('\n⚠️  Certifique-se de que o backend está rodando em http://localhost:3000\n')
  }
}

triggerJobs()
