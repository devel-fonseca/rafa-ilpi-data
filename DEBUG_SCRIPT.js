// SCRIPT DE DEBUG - Cole no console do browser (F12)
// Execute enquanto está na página de edição de residente

console.log('=== INICIANDO DEBUG DE FORM ===')

// 1. Verificar estado do form e botão
const formElement = document.querySelector('form')
const submitBtn = Array.from(document.querySelectorAll('button')).find(btn =>
  btn.textContent.includes('Atualizar') || btn.textContent.includes('Salvar')
)

console.log('✓ Form existe?', !!formElement)
console.log('✓ Botão submit existe?', !!submitBtn)
console.log('✓ Botão está desabilitado?', submitBtn?.disabled)
console.log('✓ Botão está visível?', submitBtn?.offsetParent !== null)

// 2. Verificar inputs do formulário
const inputs = formElement?.querySelectorAll('input, select, textarea')
console.log(`✓ Total de campos no form: ${inputs?.length}`)

// 3. Listar campos com valores
if (inputs) {
  console.log('\n=== VALORES DOS CAMPOS ===')
  inputs.forEach((input, idx) => {
    const label = input.previousElementSibling?.textContent || input.name || `Campo ${idx}`
    const value = input.value || '(vazio)'
    const disabled = input.disabled ? '[DESABILITADO]' : ''
    console.log(`${label}: "${value}" ${disabled}`)
  })
}

// 4. Verificar se há erros de validação visíveis
const errorMessages = document.querySelectorAll('[class*="error"], [class*="invalid"]')
console.log(`\n✓ Elementos de erro encontrados: ${errorMessages.length}`)
if (errorMessages.length > 0) {
  errorMessages.forEach((el, idx) => {
    console.log(`  Erro ${idx + 1}: "${el.textContent}"`)
  })
}

// 5. Adicionar listener para detectar submissão
console.log('\n=== TESTANDO SUBMISSÃO ===')
console.log('Clique no botão "Atualizar Residente" agora...')
console.log('Se você ver "FORM SUBMETIDO!" abaixo, o form está funcionando.')

// Interceptar submit
const originalHandler = formElement?.onsubmit
formElement?.addEventListener('submit', (e) => {
  console.error('🔴 FORM SUBMETIDO! Event:', e)
  console.log('Dados do form seriam enviados agora')
})

// 6. Testar disparo manual
console.log('\n=== TESTE MANUAL ===')
console.log('Se você quiser testar um submit forçado, execute:')
console.log('document.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true }))')

console.log('\n=== FIM DO DEBUG ===')
