# 📚 Guia de Invalidação de Queries - React Query

## 🎯 Objetivo

Este documento explica o **padrão centralizado de invalidação** do React Query implementado no sistema Rafa ILPI.

**Problema resolvido:** Antes, cada mutation invalidava queries manualmente, resultando em:
- ❌ Dados stale (atividades recentes não atualizavam)
- ❌ Necessidade de F5 para ver mudanças
- ❌ Polling desnecessário (refetchInterval)
- ❌ Inconsistências ao trocar de tenant/usuário

**Solução implementada:**
- ✅ Query keys centralizadas em um único arquivo
- ✅ Helpers de invalidação que cuidam de todas as queries relacionadas
- ✅ Cache clearing automático ao trocar tenant
- ✅ Invalidação inteligente sem polling

---

## 📁 Arquivos Principais

### 1. `/apps/frontend/src/constants/queryKeys.ts`
**O que é:** Constantes TypeScript com TODAS as query keys do sistema.

**Por que existe:**
- Garante que todos os hooks usam as mesmas keys
- Previne typos (TypeScript infere os tipos)
- Facilita descobrir quais queries existem
- Torna invalidação previsível

**Estrutura:**
```typescript
export const QUERY_KEYS = {
  audit: {
    all: ['audit'] as const,
    recent: (limit: number) => ['audit', 'recent', limit] as const,
    logs: (filters?: any) => ['audit', 'logs', filters] as const,
  },

  scheduleConfigs: {
    all: ['schedule-configs'] as const,
    byResident: (residentId: string) => ['schedule-configs', residentId] as const,
  },

  dailyTasks: {
    all: ['daily-tasks'] as const,
    byResident: (residentId: string) => ['daily-tasks', residentId] as const,
  },

  // ... outros módulos
}
```

**Padrão hierárquico:**
- `all` - Invalida tudo de um módulo
- `lists()` - Lista geral (sem filtros)
- `list(filters)` - Lista com filtros
- `byResident(id)` - Filtrado por residente
- `byDate(date)` - Filtrado por data
- `detail(id)` - Detalhes de um item específico

---

### 2. `/apps/frontend/src/utils/queryInvalidation.ts`
**O que é:** Funções helper que invalidam múltiplas queries automaticamente.

**Por que existe:**
- Desenvolvedores não precisam lembrar quais queries invalidar
- Uma mutation afeta múltiplas áreas (ex: criar schedule → invalida audit + notifications + tasks)
- Centraliza lógica de invalidação em um só lugar

**Helpers disponíveis:**

#### `invalidateGlobalQueries(queryClient)`
Invalida dados que aparecem em TODAS as telas:
- ✅ Audit logs (atividades recentes)
- ✅ Notificações (badge de notificações)

**Quando usar:** Após QUALQUER CREATE/UPDATE/DELETE.

```typescript
// Exemplo
onSuccess: () => {
  invalidateGlobalQueries(queryClient)
}
```

---

#### `invalidateAfterScheduleMutation(queryClient, residentId)`
Invalida tudo relacionado a **agenda/schedule**.

**O que invalida:**
- ✅ `schedule-configs` do residente
- ✅ `daily-tasks` do residente
- ✅ `scheduled-events` do residente
- ✅ Queries globais (audit + notifications)

**Quando usar:**
- Criar/editar/deletar configuração de agenda
- Criar/editar/deletar evento agendado
- Criar/editar/deletar configuração de alimentação

```typescript
// Exemplo
export function useCreateScheduleConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateInput) => {
      // ... chamada API
    },
    onSuccess: (data) => {
      invalidateAfterScheduleMutation(queryClient, data.residentId)
    },
  })
}
```

---

#### `invalidateAfterDailyRecordMutation(queryClient, residentId, recordDate?)`
Invalida tudo relacionado a **registros diários** (higiene, alimentação, etc).

**O que invalida:**
- ✅ `daily-records` (all + byResident + byDate)
- ✅ `daily-tasks` do residente (marca como completa)
- ✅ Queries globais

**Quando usar:**
- Criar/editar/deletar registro diário
- Completar tarefa diária

```typescript
onSuccess: (data) => {
  invalidateAfterDailyRecordMutation(
    queryClient,
    data.residentId,
    data.recordDate
  )
}
```

---

#### `invalidateAfterResidentMutation(queryClient, residentId?)`
Invalida dados do **residente**.

**O que invalida:**
- ✅ `residents` (all + lists + detail)
- ✅ Queries globais

**Quando usar:**
- Criar/editar/deletar residente
- Alterar foto, documentos, dados básicos

---

#### `invalidateAfterClinicalMutation(queryClient, residentId)`
Invalida dados **clínicos**.

**O que invalida:**
- ✅ `clinical-profiles` + versions
- ✅ `clinical-notes`
- ✅ `vital-signs` + versions
- ✅ Queries globais

**Quando usar:**
- Criar/editar perfil clínico
- Adicionar notas clínicas
- Registrar sinais vitais

---

#### `invalidateAfterPrescriptionMutation(queryClient, residentId?)`
Invalida **prescrições e medicamentos**.

**O que invalida:**
- ✅ `prescriptions` (all + active + upcoming)
- ✅ `medications`
- ✅ Queries globais

**Quando usar:**
- Criar/editar/deletar prescrição
- Administrar medicamento
- Alterar dosagem

---

#### `invalidateAfterBedTransfer(queryClient, residentId, oldBedId?, newBedId?)`
Invalida dados de **leitos/transferências**.

**O que invalida:**
- ✅ `beds` (all + available + specific beds)
- ✅ `residents` (all + lists + detail do residente transferido)
- ✅ Queries globais

**Quando usar:**
- Transferir residente de leito
- Liberar/ocupar leito

---

## 🔄 Cache Clearing ao Trocar Tenant

### `/apps/frontend/src/stores/auth.store.ts`

**Problema:** Ao trocar de tenant/usuário, React Query mantinha dados do tenant anterior em cache.

**Solução:** Limpar TUDO antes de setar novo usuário.

```typescript
selectTenant: async (tenantId: string, email: string, password: string) => {
  // ... chamada API

  const { user, accessToken, refreshToken } = response.data

  // ✅ CRÍTICO: Limpar cache ANTES de setar novo user
  if (typeof window !== 'undefined' && (window as any).queryClient) {
    console.log('🧹 Auth Store - Limpando cache ao trocar tenant...')
    ;(window as any).queryClient.clear()
  }

  set({
    user,
    accessToken,
    refreshToken,
    isAuthenticated: true,
    // ...
  })
}
```

**Importante:** O mesmo acontece no `logout()`.

---

## ✅ Checklist: Como Criar Nova Mutation

Quando você criar um novo hook de mutation, siga estes passos:

### 1. Defina a query key em `queryKeys.ts` (se ainda não existe)
```typescript
export const QUERY_KEYS = {
  // ...
  myNewModule: {
    all: ['my-new-module'] as const,
    byResident: (residentId: string) => ['my-new-module', residentId] as const,
  },
}
```

### 2. Use helper de invalidação existente (ou crie um novo)
```typescript
export function useCreateMyThing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateInput) => {
      const response = await api.post('/my-endpoint', data)
      return response.data
    },
    onSuccess: (data) => {
      // ✅ Use helper apropriado
      invalidateAfterResidentMutation(queryClient, data.residentId)

      // OU crie um novo helper se necessário
    },
  })
}
```

### 3. Se precisar de novo helper, adicione em `queryInvalidation.ts`
```typescript
export function invalidateAfterMyModuleMutation(
  queryClient: QueryClient,
  residentId: string
) {
  console.log(`🔄 Invalidando queries de myModule para ${residentId}`)

  // Queries específicas
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.myNewModule.byResident(residentId),
  })

  // Sempre invalidar queries globais
  invalidateGlobalQueries(queryClient)
}
```

### 4. **NUNCA** faça invalidação manual inline
❌ **ERRADO:**
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ['schedule-configs', data.residentId] })
  queryClient.invalidateQueries({ queryKey: ['daily-tasks', data.residentId] })
  // Esqueceu de invalidar audit e notifications!
}
```

✅ **CORRETO:**
```typescript
onSuccess: (data) => {
  invalidateAfterScheduleMutation(queryClient, data.residentId)
}
```

---

## 🧪 Matriz de Invalidação

| Mutation | Invalida | Helper a usar |
|----------|----------|---------------|
| Criar/editar schedule config | scheduleConfigs + dailyTasks + scheduledEvents + audit + notifications | `invalidateAfterScheduleMutation()` |
| Criar/editar scheduled event | scheduleConfigs + dailyTasks + scheduledEvents + audit + notifications | `invalidateAfterScheduleMutation()` |
| Criar/editar registro diário | dailyRecords + dailyTasks + audit + notifications | `invalidateAfterDailyRecordMutation()` |
| Criar/editar residente | residents + audit + notifications | `invalidateAfterResidentMutation()` |
| Criar/editar perfil clínico | clinicalProfiles + clinicalNotes + vitalSigns + audit + notifications | `invalidateAfterClinicalMutation()` |
| Criar/editar prescrição | prescriptions + medications + audit + notifications | `invalidateAfterPrescriptionMutation()` |
| Transferir leito | beds + residents + audit + notifications | `invalidateAfterBedTransfer()` |
| Qualquer CREATE/UPDATE/DELETE | audit + notifications | `invalidateGlobalQueries()` |

---

## 🚫 Padrões a Evitar

### ❌ Polling desnecessário
```typescript
// ERRADO - Desperdiça rede e servidor
useQuery({
  queryKey: ['audit', 'recent'],
  queryFn: fetchAudit,
  refetchInterval: 30000, // ❌ Polling a cada 30s
})
```

```typescript
// CORRETO - Invalidação reativa
useQuery({
  queryKey: QUERY_KEYS.audit.recent(10),
  queryFn: fetchAudit,
  staleTime: 5 * 60 * 1000, // ✅ Dados frescos por 5min
  // Sem refetchInterval! Mutations invalidam quando necessário
})
```

### ❌ String literals em query keys
```typescript
// ERRADO
queryKey: ['schedule-configs', residentId]

// CORRETO
queryKey: QUERY_KEYS.scheduleConfigs.byResident(residentId)
```

### ❌ Invalidação manual inline
```typescript
// ERRADO - Esquece queries relacionadas
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['schedule-configs'] })
}

// CORRETO - Helper cuida de tudo
onSuccess: (data) => {
  invalidateAfterScheduleMutation(queryClient, data.residentId)
}
```

---

## 🎓 Conceitos Importantes

### `staleTime` vs `gcTime` (cacheTime)

**`staleTime`** = Quanto tempo os dados são considerados "frescos"
- Durante este período, React Query NÃO refaz a request
- Padrão: `30 segundos` (configurado em QueryProvider)
- Use valores maiores para dados que mudam pouco

**`gcTime` (antes cacheTime)** = Quanto tempo manter dados não usados em cache
- Padrão: `5 minutos` (configurado em QueryProvider)
- Após este tempo, dados inativos são removidos da memória

### Invalidação vs Refetch

**Invalidar** = Marcar dados como "stale" (desatualizados)
- React Query refaz automaticamente se a query está ativa (componente montado)
- Se query não está ativa, refaz quando componente montar novamente

**Refetch** = Forçar busca imediata de dados
- Geralmente não é necessário se invalidação está correta
- Use apenas em casos especiais (ex: botão "Recarregar")

### React Query Devtools

Durante desenvolvimento, use as devtools para verificar:
- Quais queries estão ativas
- Quais estão stale vs fresh
- Quando invalidações acontecem

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Já configurado em QueryProvider.tsx
<ReactQueryDevtools initialIsOpen={false} />
```

---

## 🔍 Debugging

### Ver logs de invalidação
Todos os helpers logam no console quando invalidam:

```
🔄 Invalidating queries de schedule para residente abc-123
🧹 Invalidando queries globais (audit + notifications)
```

### Verificar cache no DevTools
1. Abra React Query DevTools (botão flutuante no canto da tela)
2. Veja quais queries estão "stale" vs "fresh"
3. Click em "Invalidate" para testar manualmente
4. Observe os logs no console

### Problemas comuns

**Problema:** Dados não atualizam após mutation
- ✅ Verifique se `onSuccess` está usando helper correto
- ✅ Confirme que query key está usando `QUERY_KEYS` constante
- ✅ Veja logs no console - invalidação está acontecendo?

**Problema:** Dados do tenant anterior aparecem
- ✅ Verifique se `auth.store.ts` está limpando cache em `selectTenant()`
- ✅ Confirme que `queryClient` está exposto em `window` (QueryProvider)

**Problema:** Muitas requests sendo feitas
- ✅ Aumente `staleTime` para dados que mudam pouco
- ✅ Remova `refetchInterval` (use invalidação ao invés de polling)
- ✅ Use `enabled: false` em queries que não devem rodar automaticamente

---

## 📚 Referências

- [React Query Docs - Invalidation](https://tanstack.com/query/latest/docs/react/guides/query-invalidation)
- [React Query Docs - Query Keys](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [React Query Docs - Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)

---

## ✨ Resumo

**O que você DEVE fazer:**
1. ✅ Sempre usar `QUERY_KEYS` constantes
2. ✅ Sempre usar helpers de invalidação em `onSuccess`
3. ✅ Invalidar queries globais (audit + notifications) em TODA mutation
4. ✅ Limpar cache ao trocar tenant/logout

**O que você NÃO DEVE fazer:**
1. ❌ String literals em query keys
2. ❌ Invalidação manual inline
3. ❌ Polling (`refetchInterval`) sem necessidade real
4. ❌ Esquecer de invalidar queries relacionadas

**Resultado:**
- 🚀 Sistema reativo - dados atualizam instantaneamente
- 🎯 Menos requests - apenas quando necessário
- 🔒 Segurança - dados de tenants não vazam
- 😊 UX melhor - sem necessidade de F5

---

**Última atualização:** 2025-12-19
**Mantido por:** Dr. E. (Emanuel) - Rafa Labs
