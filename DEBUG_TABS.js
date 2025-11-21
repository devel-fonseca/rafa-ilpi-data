// SCRIPT DE DEBUG - Verificar se tabs estão realmente renderizadas
console.log('=== VERIFICANDO RENDERIZAÇÃO DAS ABAS ===\n')

// 1. Verificar se Tabs estão presentes
const tabsList = document.querySelector('[role="tablist"]')
console.log('✓ TabsList encontrado?', !!tabsList)

// 2. Verificar cada tab content
const tabs = document.querySelectorAll('[role="tabpanel"]')
console.log('✓ Total de TabsContent found: ' + tabs.length)

// 3. Para cada tab, contar campos
let totalFields = 0
tabs.forEach(function(tab, idx) {
  const fields = tab.querySelectorAll('input, select, textarea')
  console.log('\nAba ' + (idx + 1) + ':')
  console.log('  - Display: ' + window.getComputedStyle(tab).display)
  console.log('  - Visibility: ' + window.getComputedStyle(tab).visibility)
  console.log('  - Campos: ' + fields.length)

  if (fields.length > 0) {
    fields.forEach(function(field) {
      console.log('    └─ ' + (field.name || field.id || field.placeholder))
    })
  }

  totalFields += fields.length
})

console.log('\n✓ TOTAL de campos renderizados: ' + totalFields)

// 4. Procurar por campos "genero" especificamente
const generoFields = document.querySelectorAll('[name*="genero"], [name*="gender"], [id*="genero"]')
console.log('\n✓ Campos "genero" encontrados: ' + generoFields.length)
generoFields.forEach(function(field) {
  console.log('  └─ ' + (field.name || field.id) + ' (' + field.value + ')')
})

// 5. Procurar por qualquer input text com label "Nome"
const labels = Array.from(document.querySelectorAll('label'))
const nomeLabel = labels.find(function(l) { return l.textContent.includes('Nome') })
if (nomeLabel) {
  console.log('\n✓ Label "Nome" encontrada')
  // Tentar achar o input associado
  const nomeInput = nomeLabel.parentElement?.querySelector('input')
  console.log('  └─ Input encontrado? ' + !!nomeInput)
  if (nomeInput) {
    console.log('  └─ Valor: "' + nomeInput.value + '"')
    console.log('  └─ Display: ' + window.getComputedStyle(nomeInput).display)
  }
}

// 6. Verificar form
const form = document.querySelector('form')
console.log('\n✓ Form encontrado? ' + !!form)
console.log('✓ Form dentro da página? ' + (form?.offsetParent !== null))

// 7. Verificar botão submit
const submitBtn = Array.from(document.querySelectorAll('button')).find(function(btn) {
  return btn.textContent.includes('Atualizar') || btn.textContent.includes('Salvar')
})
console.log('\n✓ Botão submit encontrado? ' + !!submitBtn)
console.log('✓ Botão está visível? ' + (submitBtn?.offsetParent !== null))
console.log('✓ Botão dentro do form? ' + form?.contains(submitBtn))
console.log('✓ Botão type: ' + submitBtn?.type)

// 8. Listar TODOS os inputs e selects
console.log('\n=== TODOS OS CAMPOS NO FORMULÁRIO ===')
const allFields = form?.querySelectorAll('input, select, textarea') || []
console.log('Total: ' + allFields.length)
Array.from(allFields).forEach(function(field, idx) {
  const label = field.previousElementSibling?.textContent || field.placeholder || field.name || ('Campo ' + idx)
  console.log((idx + 1) + '. ' + label + ' = "' + field.value + '" [' + (field.type || field.tagName.toLowerCase()) + ']')
})

console.log('\n=== FIM DO DEBUG ===')
