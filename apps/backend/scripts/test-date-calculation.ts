#!/usr/bin/env tsx
/**
 * Script de Teste: Comparação de Cálculo de Datas
 *
 * Demonstra a diferença entre usar toISOString() vs formatação manual
 * para evitar problemas de timezone ao calcular nextDueDate
 */

console.log('📅 Teste de Cálculo de Data para nextDueDate\n')

const now = new Date()
console.log('🕐 Horário atual (local):', now.toString())
console.log('🌍 Horário atual (UTC):  ', now.toUTCString())
console.log('')

// ❌ ABORDAGEM ANTIGA (problema de timezone)
console.log('❌ ABORDAGEM ANTIGA (toISOString):')
const oldNextDueDate = new Date()
oldNextDueDate.setDate(oldNextDueDate.getDate() + 7)
const oldDateStr = oldNextDueDate.toISOString().split('T')[0]
console.log('   Resultado:', oldDateStr)
console.log('   Problema: Se executado após 21:00 BRT, pode virar dia seguinte em UTC')
console.log('')

// ✅ ABORDAGEM NOVA (usa timezone de São Paulo)
console.log('✅ ABORDAGEM NOVA (timezone São Paulo):')
const brasiliaTime = new Date(
  now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }),
)
const newNextDueDate = new Date(brasiliaTime)
newNextDueDate.setDate(newNextDueDate.getDate() + 7)

const year = newNextDueDate.getFullYear()
const month = String(newNextDueDate.getMonth() + 1).padStart(2, '0')
const day = String(newNextDueDate.getDate()).padStart(2, '0')
const newDateStr = `${year}-${month}-${day}`
console.log('   Resultado:', newDateStr)
console.log('   Vantagem: Sempre usa horário de Brasília, independente do servidor')
console.log('')

// Comparação
console.log('🔍 Comparação:')
console.log(`   Antiga: ${oldDateStr}`)
console.log(`   Nova:   ${newDateStr}`)
if (oldDateStr !== newDateStr) {
  console.log('   ⚠️  DIFERENÇA DETECTADA! A correção resolve o problema de timezone.')
} else {
  console.log('   ✅ Mesma data (executado antes de 21:00 BRT)')
}
