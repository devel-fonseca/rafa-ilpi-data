#!/usr/bin/env tsx
/**
 * Script de Teste: Trial to Active Conversion com Asaas Subscription
 *
 * Este script dispara manualmente o job TrialToActiveConversionJob
 * para testar a criação de subscriptions no Asaas após conversão de trial.
 *
 * Uso:
 *   npx tsx scripts/test-trial-to-active.ts
 */

import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { TrialToActiveConversionJob } from '../src/superadmin/jobs/trial-to-active-conversion.job'

async function main() {
  console.log('🚀 Iniciando teste de conversão Trial → Active com Asaas Subscription...\n')

  // Criar contexto da aplicação
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  })

  try {
    // Obter instância do job
    const job = app.get(TrialToActiveConversionJob)

    console.log('📋 Executando TrialToActiveConversionJob...\n')

    // Executar job manualmente
    await job.handleCron()

    console.log('\n✅ Job executado com sucesso!')
    console.log('\n📊 Próximos passos:')
    console.log('   1. Verificar logs acima para criação de subscriptions no Asaas')
    console.log('   2. Acessar dashboard do Asaas Sandbox:')
    console.log('      https://sandbox.asaas.com/subscription/index')
    console.log('   3. Verificar se asaasSubscriptionId foi populado no banco:')
    console.log('      SELECT id, "asaasSubscriptionId", "asaasCreatedAt", status')
    console.log('      FROM public.subscriptions')
    console.log('      WHERE "asaasSubscriptionId" IS NOT NULL;')
  } catch (error) {
    console.error('\n❌ Erro ao executar job:', error)
    process.exit(1)
  } finally {
    await app.close()
  }
}

main()
