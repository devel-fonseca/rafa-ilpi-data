# 🔍 ESLint - Regras para Prevenir Bugs de Timezone

**Versão:** 1.0
**Data:** 06/12/2025
**Projeto:** Rafa ILPI Data

---

## 🎯 Objetivo

Este documento descreve as regras de ESLint customizadas implementadas no projeto para **prevenir bugs de timezone** relacionados à manipulação de datas.

---

## 📋 Regras Implementadas

### **Regra 1: Evitar `new Date(variável)`**

**Tipo:** `no-restricted-syntax`
**Severidade:** Warning ⚠️
**Aplicado em:** Frontend e Backend

#### **O que detecta:**

```typescript
// ❌ ESLint vai alertar
const dateStr = "2025-12-06"
const date = new Date(dateStr)  // ⚠️ Evite new Date(variável)
```

#### **Por que é problemático:**

`new Date(string)` interpreta a string de forma diferente dependendo do formato e ambiente:
- `new Date("2025-12-06")` → interpretado como UTC midnight
- `new Date("2025-12-06T00:00:00")` → interpretado como local time
- Comportamento inconsistente entre navegadores

#### **Como corrigir:**

**Backend:**
```typescript
import { parseISO } from 'date-fns'

// ✅ Para campos date-only (data de nascimento, vacinação, etc.)
const date = parseISO(`${dateStr}T12:00:00.000`)

// ✅ Para campos com hora relevante
const timestamp = new Date(isoStringWithTime)  // OK se tiver hora
```

**Frontend:**
```typescript
import { displayToDate } from '@/utils/formMappers'

// ✅ Converter DD/MM/YYYY para Date
const date = displayToDate("06/12/2025")  // Retorna Date com meio-dia

// ✅ Ou simplesmente enviar string
const payload = {
  date: dateStr  // Enviar "2025-12-06" diretamente
}
```

---

### **Regra 2: Evitar `date.setHours()`** (Backend apenas)

**Tipo:** `no-restricted-syntax`
**Severidade:** Warning ⚠️
**Aplicado em:** Backend

#### **O que detecta:**

```typescript
// ❌ ESLint vai alertar
const today = new Date()
today.setHours(0, 0, 0, 0)  // ⚠️ Evite setHours()
```

#### **Por que é problemático:**

`setHours()` muta o objeto Date e é frágil para timezone:
- Trabalha com timezone local, não UTC
- Pode dar resultados inesperados em queries
- Dificulta debugging

#### **Como corrigir:**

```typescript
import { startOfDay, endOfDay } from 'date-fns'

// ✅ Usar helpers do date-fns
const todayStart = startOfDay(new Date())
const todayEnd = endOfDay(new Date())

// ✅ Em queries
where: {
  date: {
    gte: startOfDay(dateObj),
    lte: endOfDay(dateObj)
  }
}
```

---

### **Regra 3: Evitar Aritmética Manual de Datas** (Backend apenas)

**Tipo:** `no-restricted-syntax`
**Severidade:** Warning ⚠️
**Aplicado em:** Backend

#### **O que detecta:**

```typescript
// ❌ ESLint vai alertar
const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // ⚠️

// ❌ ESLint vai alertar
const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)  // ⚠️
```

#### **Por que é problemático:**

Aritmética manual de datas:
- Não considera horário de verão
- Não considera meses com diferentes números de dias
- Código difícil de ler e manter
- Propenso a erros de cálculo

#### **Como corrigir:**

```typescript
import { addDays, addMonths, addYears, subDays, endOfDay } from 'date-fns'

// ✅ Adicionar dias
const futureDate = endOfDay(addDays(new Date(), 30))

// ✅ Subtrair dias
const pastDate = startOfDay(subDays(new Date(), 7))

// ✅ Adicionar meses (considera diferentes tamanhos)
const nextMonth = addMonths(new Date(), 1)

// ✅ Adicionar anos (considera anos bissextos)
const nextYear = addYears(new Date(), 1)
```

---

## 🔧 Configuração

### **Frontend (`apps/frontend/.eslintrc.cjs`)**

```javascript
rules: {
  'no-restricted-syntax': [
    'warn',
    {
      selector: "NewExpression[callee.name='Date'][arguments.length=1][arguments.0.type='Identifier']",
      message: '⚠️ Evite new Date(variável) - Use helpers de dateHelpers.ts ou formMappers.ts. Veja docs/GUIA-PADROES-DATA.md',
    },
  ],
}
```

### **Backend (`apps/backend/.eslintrc.js`)**

```javascript
rules: {
  'no-restricted-syntax': [
    'warn',
    {
      selector: "NewExpression[callee.name='Date'][arguments.length=1][arguments.0.type='Identifier']",
      message: '⚠️ Evite new Date(variável) para campos date-only. Use parseISO(`${date}T12:00:00.000`). Veja docs/GUIA-PADROES-DATA.md',
    },
    {
      selector: "CallExpression[callee.property.name='setHours']",
      message: '⚠️ Evite setHours() - Use startOfDay/endOfDay do date-fns. Veja docs/GUIA-PADROES-DATA.md',
    },
    {
      selector: "BinaryExpression[operator=/^[+\\-]$/][left.callee.object.name='Date'][left.callee.property.name='now']",
      message: '⚠️ Evite Date.now() + aritmética manual - Use addDays/addMonths do date-fns. Veja docs/GUIA-PADROES-DATA.md',
    },
  ],
}
```

---

## 🧪 Testando as Regras

### **Executar ESLint manualmente:**

```bash
# Frontend
cd apps/frontend
npm run lint

# Backend
cd apps/backend
npx eslint "src/**/*.ts"
```

### **Exemplos de Código que Vai Alertar:**

```typescript
// ⚠️ Warning: new Date(variável)
const dateStr = "2025-12-06"
const date = new Date(dateStr)

// ⚠️ Warning: setHours()
const today = new Date()
today.setHours(0, 0, 0, 0)

// ⚠️ Warning: aritmética manual
const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
```

### **Exemplos de Código que NÃO Vai Alertar:**

```typescript
// ✅ OK: new Date() sem argumentos
const now = new Date()

// ✅ OK: new Date() com múltiplos argumentos
const date = new Date(2025, 11, 6, 12, 0, 0)

// ✅ OK: new Date() com literal string
const specificDate = new Date("2025-12-06T12:00:00.000")

// ✅ OK: Usando helpers
import { parseISO, startOfDay, addDays } from 'date-fns'
const date = parseISO(`${dateStr}T12:00:00.000`)
const today = startOfDay(new Date())
const future = addDays(new Date(), 30)
```

---

## 🚫 Limitações das Regras

### **Casos que NÃO são detectados:**

1. **`new Date()` com literal string:**
   ```typescript
   // ❌ Não vai alertar, mas pode ser problemático
   const date = new Date("2025-12-06")
   ```
   **Por que:** ESLint só detecta variáveis, não literais

2. **Funções que retornam Date:**
   ```typescript
   // ❌ Não vai alertar
   const date = someFunction()  // se retornar Date problemático
   ```
   **Por que:** ESLint não analisa tipos em runtime

3. **`new Date()` em templates:**
   ```typescript
   // ❌ Não vai alertar
   const date = new Date(`${year}-${month}-${day}`)
   ```
   **Por que:** ESLint detecta apenas identifier simples

### **Como lidar com limitações:**

1. **Code Review Manual:**
   - Revisar PRs procurando por `new Date(`
   - Verificar que campos date-only usam `parseISO` com T12:00:00

2. **Testes de Integração:**
   - Testar criação/edição de registros
   - Validar que datas estão sendo salvas com horário correto

3. **Documentação e Treinamento:**
   - Compartilhar [GUIA-PADROES-DATA.md](./GUIA-PADROES-DATA.md) com equipe
   - Incluir no onboarding de novos desenvolvedores

---

## 📚 Desabilitando Avisos (Quando Apropriado)

Se você **realmente** precisa usar um padrão alertado pelo ESLint (casos raros!), você pode desabilitar o aviso:

```typescript
// eslint-disable-next-line no-restricted-syntax
const date = new Date(variavel)  // OK apenas se for timestamp completo com hora
```

**⚠️ IMPORTANTE:** Sempre adicione um comentário explicando **POR QUE** o padrão é seguro neste caso específico.

```typescript
// ✅ Bom exemplo de disable
// eslint-disable-next-line no-restricted-syntax
// OK: prescriptionDate é um ISO timestamp completo com hora relevante
const prescriptionDate = new Date(dto.prescriptionDate)
```

---

## 🔗 Recursos Relacionados

- [Guia de Padrões de Data](./GUIA-PADROES-DATA.md)
- [Auditoria Frontend TIMESTAMPTZ](./AUDITORIA-FRONTEND-TIMESTAMPTZ.md)
- [ESLint no-restricted-syntax](https://eslint.org/docs/latest/rules/no-restricted-syntax)
- [date-fns Documentation](https://date-fns.org/)

---

## 📝 FAQ

### **P: Por que warnings e não errors?**

**R:** Usamos warnings porque:
- Alguns casos de `new Date()` são legítimos (timestamps completos)
- Permite flexibilidade durante desenvolvimento
- Encoraja boas práticas sem bloquear builds

### **P: As regras afetam performance do ESLint?**

**R:** Impacto mínimo. As regras usam seletores AST simples.

### **P: Posso adicionar mais regras customizadas?**

**R:** Sim! Edite `.eslintrc.js` e adicione novos seletores em `no-restricted-syntax`.

### **P: Como faço para que o ESLint rode automaticamente no commit?**

**R:** Configure Husky com lint-staged:

```bash
npm install --save-dev husky lint-staged
npx husky install
```

Adicione ao `package.json`:
```json
{
  "lint-staged": {
    "*.ts": "eslint --fix",
    "*.tsx": "eslint --fix"
  }
}
```

---

**Última atualização:** 06/12/2025
**Mantido por:** Equipe de Desenvolvimento Rafa Labs
