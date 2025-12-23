# Sistema de Mapeamento de Features

## Visão Geral

O sistema de mapeamento de features é uma solução centralizada para gerenciar a conversão entre representações técnicas (chaves do banco de dados) e representações humanizadas (labels de interface) das funcionalidades dos planos.

**Objetivo Principal**: Garantir consistência absoluta na exibição de features em todo o sistema, mantendo compatibilidade retroativa com dados existentes.

## Arquitetura

### Single Source of Truth

```
┌─────────────────────────────────────────────────────────────┐
│           apps/frontend/src/constants/features.ts           │
│                  (Single Source of Truth)                   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼───────┐      ┌───────▼──────────┐
        │  SuperAdmin   │      │   Register.tsx   │
        │ PlansList.tsx │      │  (Cadastro)      │
        └───────────────┘      └──────────────────┘
```

### Componentes do Sistema

#### 1. FEATURES_MAP

Mapeamento bidirecional entre chaves técnicas e labels humanizados.

```typescript
export const FEATURES_MAP: Record<string, string> = {
  // Chaves antigas (snake_case ou camelCase)
  'medicacoes': 'Controle de medicamentos',
  'usuarios': 'Gestão de usuários',

  // Labels modernos (mapeamento idempotente)
  'Controle de medicamentos': 'Controle de medicamentos',
  'Gestão de usuários': 'Gestão de usuários',
}
```

**Por que bidirecional?**
- Permite converter chaves antigas do banco → labels modernos
- Permite verificar se um label moderno existe no sistema
- Garante idempotência (aplicar duas vezes retorna o mesmo resultado)

#### 2. AVAILABLE_FEATURES

Array de features pré-definidas disponíveis para seleção.

```typescript
export const AVAILABLE_FEATURES = [
  'Gestão de residentes',
  'Gestão de usuários',
  'Prontuário eletrônico',
  'Controle de medicamentos',
  // ... 14 features no total
] as const
```

**Organização**: Features agrupadas por categoria (Core, Clínicos, Gestão, Comunicação, Avançados, Suporte).

#### 3. featuresToArray()

Converte objeto de features do banco de dados para array de labels humanizados.

```typescript
export function featuresToArray(
  featuresObj: Record<string, any>
): string[]
```

**Fluxo de Conversão**:

```
Banco de dados:
{
  medicacoes: true,
  usuarios: true,
  financeiro: false
}
        ↓
  featuresToArray()
        ↓
Interface:
[
  "Controle de medicamentos",
  "Gestão de usuários"
]
```

**Lógica**:
1. Filtra apenas features habilitadas (`true`)
2. Para cada chave, busca o label correspondente em `FEATURES_MAP`
3. Se não encontrar mapeamento, usa a própria chave (preserva features customizadas)

#### 4. arrayToFeatures()

Converte array de labels humanizados para objeto de features do banco.

```typescript
export function arrayToFeatures(
  featuresArray: string[]
): Record<string, boolean>
```

**Fluxo de Conversão**:

```
Interface:
[
  "Controle de medicamentos",
  "Módulo de fisioterapia" // customizada
]
        ↓
  arrayToFeatures()
        ↓
Banco de dados:
{
  medicacoes: true,
  "Módulo de fisioterapia": true
}
```

**Lógica Inteligente**:
1. Para cada label, tenta encontrar a chave técnica correspondente
2. Busca no `FEATURES_MAP` por entradas onde o **valor** é o label e a **chave** não contém espaços (chave técnica)
3. Se encontrar → usa a chave técnica (`medicacoes`)
4. Se não encontrar → usa o próprio label como chave (feature customizada)

**Exemplo de Busca**:

```typescript
// Label: "Controle de medicamentos"

// Procura em FEATURES_MAP:
Object.entries(FEATURES_MAP).find(
  ([key, value]) =>
    value === "Controle de medicamentos" && // valor correto
    !key.includes(' ')                      // chave técnica (sem espaços)
)

// Resultado: ["medicacoes", "Controle de medicamentos"]
// Retorna: "medicacoes" (índice [0])
```

## Compatibilidade Retroativa

### Problema Solucionado

**Antes**: Dados antigos usavam chaves técnicas, novos dados usariam labels humanizados → **Inconsistência**.

**Solução**: Mapeamento bidirecional aceita ambos os formatos.

### Cenários Suportados

#### Cenário 1: Dados Antigos

```typescript
// Banco (formato antigo):
{ medicacoes: true, usuarios: true }

// Conversão para UI:
featuresToArray(obj)
// → ["Controle de medicamentos", "Gestão de usuários"]

// Conversão de volta (se editado):
arrayToFeatures(arr)
// → { medicacoes: true, usuarios: true } ✓ Preservado!
```

#### Cenário 2: Feature Customizada

```typescript
// SuperAdmin adiciona:
["Módulo de fisioterapia"]

// Salvando no banco:
arrayToFeatures(arr)
// → { "Módulo de fisioterapia": true }

// Lendo novamente:
featuresToArray(obj)
// → ["Módulo de fisioterapia"] ✓ Preservado!
```

#### Cenário 3: Mix de Formatos

```typescript
// Banco (mix):
{
  medicacoes: true,                    // chave antiga
  "Gestão de usuários": true,          // label moderno
  "Módulo de fisioterapia": true       // customizada
}

// Conversão para UI:
featuresToArray(obj)
// → [
//     "Controle de medicamentos",    // mapeado de 'medicacoes'
//     "Gestão de usuários",           // preservado
//     "Módulo de fisioterapia"        // preservado
//   ]
```

## Integração com Componentes

### SuperAdmin (PlansList.tsx)

**Interface de três níveis**:

```
┌─────────────────────────────────────────────┐
│ 🟢 Features Ativas                          │
│ [Gestão de residentes] [x]                  │
│ [Controle de medicamentos] [x]              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🔵 Clique para adicionar:                   │
│ [+ Prontuário eletrônico]                   │
│ [+ Sinais vitais]                           │
│ [+ Relatórios e dashboards]                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ ✏️ Ou adicione uma feature customizada:     │
│ [____________________________] [+]          │
└─────────────────────────────────────────────┘
```

**Uso**:

```typescript
import { AVAILABLE_FEATURES, featuresToArray, arrayToFeatures } from '@/constants/features'

// Ao abrir modal de edição:
const handleEdit = (plan: Plan) => {
  setFeatures(featuresToArray(plan.features))
}

// Ao salvar:
const handleSave = () => {
  const dataToSave = {
    ...formData,
    features: arrayToFeatures(features)
  }
  updatePlanMutation.mutate({ id, data: dataToSave })
}
```

### Register.tsx (Cadastro)

**Exibição de features do plano selecionado**:

```typescript
import { featuresToArray } from '@/constants/features'

// No componente:
{featuresToArray(plan.features).map((feature, idx) => (
  <div key={idx} className="flex items-center gap-2">
    <Check className="h-4 w-4 text-green-500" />
    <span>{feature}</span>
  </div>
))}
```

## Fluxo Completo de Dados

### 1. Criação de Plano (SuperAdmin)

```
SuperAdmin seleciona:
├─ [✓] Gestão de residentes
├─ [✓] Controle de medicamentos
└─ Customizada: "Módulo de fisioterapia"
         ↓
   arrayToFeatures()
         ↓
Banco salva:
{
  "residentes": true,
  "medicacoes": true,
  "Módulo de fisioterapia": true
}
```

### 2. Leitura no Cadastro (Register.tsx)

```
Backend retorna:
{
  "residentes": true,
  "medicacoes": true,
  "Módulo de fisioterapia": true
}
         ↓
   featuresToArray()
         ↓
Interface exibe:
✓ Gestão de residentes
✓ Controle de medicamentos
✓ Módulo de fisioterapia
```

### 3. Edição Posterior (SuperAdmin)

```
Carrega do banco:
{ residentes: true, medicacoes: true }
         ↓
   featuresToArray()
         ↓
Modal mostra:
🟢 [Gestão de residentes] [x]
🟢 [Controle de medicamentos] [x]
         ↓
SuperAdmin adiciona: "Sinais vitais"
         ↓
   arrayToFeatures()
         ↓
Salva no banco:
{
  residentes: true,
  medicacoes: true,
  "sinais_vitais": true  // nova chave técnica
}
```

## Adicionando Novas Features

### Features Pré-definidas

Para adicionar uma nova feature ao sistema:

1. **Editar `features.ts`**:

```typescript
// 1. Adicionar ao mapeamento
export const FEATURES_MAP: Record<string, string> = {
  // ... existentes ...

  // ADICIONAR AQUI:
  'fisioterapia': 'Módulo de fisioterapia',
  'Módulo de fisioterapia': 'Módulo de fisioterapia',
}

// 2. Adicionar à lista de disponíveis
export const AVAILABLE_FEATURES = [
  // ... existentes ...
  'Módulo de fisioterapia',  // ADICIONAR AQUI
] as const
```

2. **Pronto!** A feature aparecerá automaticamente em:
   - SuperAdmin: badges azuis clicáveis
   - Register.tsx: listagem de features do plano

### Features Customizadas (Ad-hoc)

SuperAdmin pode adicionar features sem editar código:

1. Abrir modal de edição do plano
2. Digitar nome da feature no input customizado
3. Clicar em `[+]`
4. Salvar

A feature será armazenada usando o label como chave no banco.

## Vantagens da Arquitetura

### 1. DRY (Don't Repeat Yourself)

**Antes**:
```
❌ Register.tsx: const FEATURE_LABELS = { medicacoes: "...", ... }
❌ PlansList.tsx: const FEATURE_LABELS = { medicacoes: "...", ... }
❌ OutroComponente.tsx: const FEATURE_LABELS = { medicacoes: "...", ... }
```

**Depois**:
```
✓ features.ts: export const FEATURES_MAP = { ... }
✓ Todos importam: import { featuresToArray } from '@/constants/features'
```

### 2. Type Safety

TypeScript garante:
- `FEATURES_MAP` é `Record<string, string>`
- `featuresToArray()` sempre retorna `string[]`
- `arrayToFeatures()` sempre retorna `Record<string, boolean>`

### 3. Testabilidade

Funções puras, fáceis de testar:

```typescript
describe('featuresToArray', () => {
  it('deve converter chaves antigas', () => {
    expect(featuresToArray({ medicacoes: true }))
      .toEqual(['Controle de medicamentos'])
  })

  it('deve preservar features customizadas', () => {
    expect(featuresToArray({ 'Fisioterapia': true }))
      .toEqual(['Fisioterapia'])
  })
})
```

### 4. Manutenibilidade

- **Um único ponto de mudança**: Alterar um label? Edite apenas `features.ts`
- **Sem duplicação**: Impossível ter inconsistência entre telas
- **Fácil auditoria**: Todas as features do sistema em um arquivo

### 5. Flexibilidade

- Aceita features customizadas sem modificação de código
- Compatível com dados antigos e novos
- Permite migração gradual (não força reescrever dados antigos)

## Limitações Conhecidas

### 1. Performance com Muitas Features

**Cenário**: Plano com 100+ features customizadas.

**Impacto**: `arrayToFeatures()` faz busca O(n²) no pior caso.

**Mitigação**: Na prática, planos têm ~5-15 features. Não é problema real.

### 2. Ambiguidade em Features Similares

**Cenário**: Duas chaves técnicas mapeiam para o mesmo label.

```typescript
// ❌ EVITAR:
{
  'medicamentos': 'Controle de medicamentos',
  'medicacoes': 'Controle de medicamentos',  // duplicado!
}
```

**Mitigação**: Revisão manual do `FEATURES_MAP` antes de adicionar novas entradas.

### 3. Features Customizadas Não São Traduzidas

**Cenário**: SuperAdmin cria "Módulo de fisioterapia" (português).

**Impacto**: Se futuramente houver i18n, features customizadas não serão traduzidas.

**Mitigação**: Adicionar features customizadas populares ao `FEATURES_MAP` oficial.

## Referências

### Arquivos Relacionados

- **Core**: [`apps/frontend/src/constants/features.ts`](../../apps/frontend/src/constants/features.ts)
- **SuperAdmin**: [`apps/frontend/src/pages/superadmin/PlansList.tsx`](../../apps/frontend/src/pages/superadmin/PlansList.tsx)
- **Cadastro**: [`apps/frontend/src/pages/auth/Register.tsx`](../../apps/frontend/src/pages/auth/Register.tsx)

### Schemas de Banco

- **Plan**: `apps/backend/prisma/schema.prisma` (campo `features: Json`)

### Histórico

- **Criado**: 2025-12-23
- **Versão**: 1.0
- **Autor**: Dr. E. (Emanuel) + Claude Code
- **Motivação**: Resolver inconsistência entre SuperAdmin e Register.tsx na exibição de features
