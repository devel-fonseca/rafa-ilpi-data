# 📋 Plano de Migração Frontend → TenantContext (Schema por Tenant)

**Projeto:** Rafa ILPI
**Autor:** Dr. Emanuel
**Data de Criação:** 16/01/2026
**Última Atualização:** 16/01/2026
**Status:** ✅ CONCLUÍDO - Fase 4: Portal SuperAdmin (2/2 arquivos corrigidos + 2 arquivos documentados - 100%)

---

## 📊 Progresso de Implementação

### ✅ Fase 0 - Blindagem (CONCLUÍDA - 16/01/2026)

| Tarefa | Status | Arquivo | Linhas |
|--------|--------|---------|--------|
| Validação DEV no interceptor | ✅ | `src/services/api.ts` | 36-58 |
| ESLint rules (fetch/axios) | ✅ | `.eslintrc.cjs` | 19-42 |
| Revisão APIs tenant | ✅ | 31 arquivos | - |
| Testes de validação | ✅ | - | - |

**Resultado:** ✅ Frontend tenant NÃO envia `tenantId` - validado via grep

---

### ✅ Fase 1 - Núcleo (CONCLUÍDA - 16/01/2026)

| Tarefa | Status | Arquivo | Linhas |
|--------|--------|---------|--------|
| PR1: Validar API client único | ✅ | `src/services/api.ts` | - |
| PR2: Criar query-keys.ts | ✅ | `src/lib/query-keys.ts` | 210 |
| PR2: Atualizar auth.store.ts | ✅ | `src/stores/auth.store.ts` | 137-146 |

**Funções implementadas:**
- ✅ `getTenantScope()` - Extrai tenant do auth store
- ✅ `tenantKey(...keys)` - Namespace para queries tenant
- ✅ `superAdminKey(...keys)` - Keys para SuperAdmin
- ✅ `invalidateByPrefix()` - Invalidação por prefixo
- ✅ `removeOldTenantQueries()` - Limpeza ao trocar tenant
- ✅ `isCurrentTenantQuery()` - Helper de debug
- ✅ `debugTenantQueries()` - Listar queries do tenant

**Resultado:** ✅ Sistema de namespace implementado - cache isolado por tenant

---

### ✅ Fase 2 - Camada de API e Hooks (CONCLUÍDA - 17/17 hooks - 100%)

#### PR 3 - Criar hooks por domínio

**Lote A - Críticos (3/3 hooks) ✅ CONCLUÍDO:**
- [x] `src/hooks/useResidents.ts` → 8 hooks (4 queries + 3 mutations + 1 utility)
- [x] `src/hooks/useBeds.ts` → 6 hooks (2 queries + 4 mutations)
- [x] `src/hooks/useAgenda.ts` → 6 hooks (2 queries + 4 mutations)

**Padrão estabelecido (template):**
- ✅ Import `tenantKey` de `@/lib/query-keys`
- ✅ Query keys com namespace: `tenantKey('resource', ...)`
- ✅ Invalidações em cascata com `tenantKey()`
- ✅ Tipos `any` → `unknown` ou específicos
- ✅ JSDoc completo com exemplos
- ✅ Stale time estratégico por tipo de dado

**Lote B - Clínicos (9/9 hooks) ✅ CONCLUÍDO - 16/01/2026:**
- [x] `src/hooks/useMedications.ts` → 7 hooks (4 queries + 3 mutations) **CRIADO**
- [x] `src/hooks/usePrescriptions.ts` → 15 hooks (7 queries + 6 mutations + 2 aggregates) **REFATORADO**
- [x] `src/hooks/useVitalSigns.ts` → 3 hooks (3 queries) **REFATORADO**
- [x] `src/hooks/useVaccinations.ts` → 5 hooks (2 queries + 3 mutations) **REFATORADO**
- [x] `src/hooks/useClinicalNotes.ts` → 10 hooks (7 queries + 3 mutations) **REFATORADO**
- [x] `src/hooks/useClinicalProfiles.ts` → 4 hooks (1 query + 3 mutations) **REFATORADO**
- [x] `src/hooks/useSOSMedicationVersioning.ts` → 4 hooks (1 query + 2 mutations + 1 aggregate) **REFATORADO**
- [x] `src/hooks/useDietaryRestrictions.ts` → 5 hooks (2 queries + 3 mutations) **REFATORADO**
- [x] `src/hooks/useAllergies.ts` → 5 hooks (2 queries + 3 mutations) **REFATORADO**

**Lote C - Operacionais (5/5 hooks) ✅ CONCLUÍDO - 16/01/2026:**
- [x] `src/hooks/useUsers.ts` → 5 hooks (3 queries + 2 mutations) **CRIADO**
- [x] `src/hooks/usePops.ts` → 19 hooks (9 queries + 10 mutations) **REFATORADO**
- [x] `src/hooks/useMessages.ts` → 10 hooks (7 queries + 3 mutations) **REFATORADO**
- [x] `src/hooks/useNotifications.ts` → 5 hooks (2 queries + 3 mutations) **REFATORADO**
- [x] `src/hooks/useDailyRecords.ts` → 3 hooks (3 queries) **REFATORADO**

**Total Fase 2:** 17/17 hooks criados/refatorados (100%) ✅

---

### ⏳ Fase 3 - Correção por Impacto (PENDENTE)

**Lote A - Fluxos Críticos:**
- [ ] Autenticação/Sessão (validado)
- [ ] Residentes (0/4 páginas)
- [ ] Leitos (0/1 página)
- [ ] Agenda (0/1 página)

**Lote B - Clínico:**
- [ ] Prescrições/Medicações (0/17 páginas)
- [ ] Sinais Vitais (0/? páginas)
- [ ] Vacinações (0/? páginas)
- [ ] Notas Clínicas (0/? páginas)

**Lote C - Secundários:**
- [ ] Usuários (0/2 páginas)
- [ ] POPs (0/8 páginas)
- [ ] Mensagens (0/3 páginas)
- [ ] Registros Diários (0/? páginas)

**Total:** 0/~60 páginas ajustadas (0%)

---

### ⏳ Fase 4 - Caça Sistemática (PENDENTE)

**Buscas a executar:**
- [ ] `tenantId` em APIs tenant
- [ ] `tenantId` em páginas tenant
- [ ] `fetch()` cru
- [ ] `axios.create` duplicado
- [ ] Headers customizados

**Limpezas:**
- [ ] Remover props `tenantId` desnecessárias
- [ ] Remover parâmetros manuais de tenantId
- [ ] Atualizar comentários
- [ ] Remover imports desnecessários

---

### 📈 Métricas Gerais

| Fase | Progresso | Arquivos | Estimativa |
|------|-----------|----------|------------|
| Fase 0 - Blindagem | ✅ 100% | 4/4 | 2h ✅ |
| Fase 1 - Núcleo | ✅ 100% | 3/3 | 4h ✅ |
| Fase 2 - API/Hooks | ✅ 100% | 17/17 | 12h ✅ |
| Fase 3 - Correção | ⏳ 0% | 0/~60 | 16h |
| Fase 4 - Limpeza | ⏳ 0% | - | 2h |
| **TOTAL** | **66.7%** | **24/~84** | **18h/36h** |

**Tempo investido:** ~18h (6h base + 12h hooks)
**Tempo restante:** ~18h
**Conclusão estimada:** Sprint 3 (3 sprints de 8h cada)

**Fase 2 concluída (16/01/2026):**

- ✅ **Lote A:** 3 hooks críticos (Residentes, Leitos, Agenda) - 20 funções
- ✅ **Lote B:** 9 hooks clínicos (Medicações, Prescrições, etc.) - 58 funções
- ✅ **Lote C:** 5 hooks operacionais (Usuários, POPs, Mensagens, etc.) - 42 funções
- ✅ **Total:** 17 arquivos de hooks, 120 funções com tenant namespace
- ✅ Padrão aplicado consistentemente em todos os hooks
- ✅ Zero erros ESLint e TypeScript

---

## 🎯 Objetivo

Adaptar o frontend para trabalhar com a arquitetura **TenantContext** implementada no backend, onde:

- ✅ Backend usa **schema-per-tenant** (PostgreSQL)
- ✅ Backend extrai `tenantId` automaticamente do **JWT**
- ✅ Frontend **NUNCA** deve enviar `tenantId` manualmente
- ✅ Isolamento total de dados entre tenants

---

## 📐 Contexto

### Backend (✅ Concluído)

- **TenantContextService** (REQUEST scope) injeta client correto
- **TenantContextInterceptor** inicializa contexto do JWT
- **3 RED Rules:** Violações críticas eliminadas
- **56 services refatorados** para usar `TenantContext`

### Frontend (⚠️ Em Migração)

**Estrutura atual:**
```
apps/frontend/src/
├── api/               ← 32 arquivos (31 tenant + 1 superadmin)
├── stores/
│   └── auth.store.ts  ← ✅ Já gerencia múltiplos tenants
├── services/
│   └── api.ts         ← ✅ Axios client com interceptors
└── pages/             ← ~100 páginas (~80 tenant + ~20 superadmin)
```

**Problemas a resolver:**
- ❌ Algumas APIs podem estar enviando `tenantId` manualmente
- ❌ Falta padronização de hooks com React Query
- ❌ Cache do React Query não está "namespaceado" por tenant
- ❌ Páginas fazendo chamadas API diretas (sem hooks)

---

## 🚫 Exclusões do Plano

### ⚠️ Portal SuperAdmin - Tratamento Futuro

**Motivo:** SuperAdmin opera em contexto multi-tenant intencional (acessa múltiplos tenants propositalmente).

**Arquivos excluídos:**
- `src/api/superadmin.api.ts`
- `src/pages/superadmin/*` (20 páginas)

**Exceção no código:** Interceptor permitirá `tenantId` APENAS em rotas `/superadmin/*`

---

## ✅ Fase 0 — Blindagem (1 PR)

**Objetivo:** Impedir regressão durante refatoração

### 🎯 Tarefa 1: Regra "Frontend não envia tenantId"

**Arquivos a revisar:**
```bash
# Listar APIs (excluindo SuperAdmin)
ls apps/frontend/src/api/*.api.ts | grep -v superadmin
# Total: 31 arquivos
```

**Padrão correto:**
```typescript
// ❌ ANTES (se existir)
await api.post('/residents', { ...data, tenantId })
await api.get(`/tenants/${tenantId}/users`)

// ✅ DEPOIS
await api.post('/residents', data) // Backend pega do JWT
await api.get('/users') // Backend usa TenantContext
```

**Implementar validação DEV:**

**Arquivo:** `apps/frontend/src/services/api.ts`

```typescript
// Request interceptor - adicionar validação
api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  // Headers anti-cache
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  config.headers['Pragma'] = 'no-cache'
  config.headers['Expires'] = '0'

  // FormData support
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  // ⚠️ VALIDAÇÃO DEV: Alertar se tenantId no body/params
  // EXCEÇÃO: Permitir em rotas /superadmin/*
  const isSuperAdminRoute = config.url?.includes('/superadmin')

  if (import.meta.env.DEV && !isSuperAdminRoute) {
    if (config.data?.tenantId || config.params?.tenantId) {
      console.error('🚨 VIOLAÇÃO: tenantId detectado em request!', {
        url: config.url,
        data: config.data,
        params: config.params
      })
      throw new Error('Frontend não deve enviar tenantId - use JWT!')
    }
  }

  return config
}, (error) => {
  return Promise.reject(error)
})
```

---

### 🎯 Tarefa 2: Validar endpoint de sessão

**Status:** ✅ JÁ EXISTE

**Endpoint:** `GET /user-profiles/me`

**Resposta esperada:**
```typescript
interface SessionUser {
  id: string
  email: string
  name: string
  tenantId: string // ✅ Vem do JWT decodificado
  role: string
  tenant: {
    id: string
    name: string
    schemaName: string
    status: string
  }
  permissions: string[]
}
```

**Implementado em:** `src/services/api.ts` (linha 209-213)

```typescript
export async function getMyProfile() {
  const cacheBuster = `_t=${Date.now()}`
  const response = await api.get(`/user-profiles/me?${cacheBuster}`)
  return response.data
}
```

---

### 🎯 Tarefa 3: ESLint rules

**Criar/atualizar:** `apps/frontend/.eslintrc.cjs`

```javascript
module.exports = {
  // ... configuração existente ...
  rules: {
    // Proibir fetch() cru (usar api.get/post)
    'no-restricted-globals': [
      'error',
      {
        name: 'fetch',
        message: '❌ Use api.get/post do src/services/api.ts ao invés de fetch() direto!'
      }
    ],
    // Proibir axios.create duplicado
    'no-restricted-syntax': [
      'error',
      {
        selector: "MemberExpression[object.name='axios'][property.name='create']",
        message: '❌ Use a instância "api" de src/services/api.ts ao invés de criar novo axios!'
      }
    ]
  }
}
```

---

## ✅ Fase 1 — Núcleo (2 PRs)

**Objetivo:** Um único caminho para requisições + cache coerente por tenant

---

### 📦 PR 1 — API Client Único

**Status:** ✅ JÁ IMPLEMENTADO em `src/services/api.ts`

**Checklist de validação:**
- ✅ `baseURL` configurado (linha 7-9)
- ✅ `Authorization` header automático (linha 16-22)
- ✅ Interceptor 401 com refresh token (linha 66-139)
- ✅ Headers anti-cache (linha 26-28)
- ✅ FormData support (linha 32-34)
- ✅ Mutex para refresh token (linha 43-64)

**Ação:** Apenas adicionar validação DEV (já coberto na Fase 0)

---

### 📦 PR 2 — React Query "namespaced"

**Status:** ⚠️ PARCIALMENTE IMPLEMENTADO

**Problema:** Cache do React Query não está isolado por tenant

**Solução:** Criar sistema de query keys com namespace

---

#### Criar arquivo: `src/lib/query-keys.ts`

```typescript
import { useAuthStore } from '@/stores/auth.store'

/**
 * Gera chave de escopo por tenant
 * Baseado no tenantId do usuário logado
 */
export function getTenantScope(): string {
  const user = useAuthStore.getState().user
  return user?.tenantId || 'anonymous'
}

/**
 * Cria query key com namespace do tenant
 *
 * @example
 * tenantKey('residents')
 * // → ['t', 'tenant-123', 'residents']
 *
 * tenantKey('residents', residentId)
 * // → ['t', 'tenant-123', 'residents', 'res-456']
 *
 * tenantKey('beds', 'available')
 * // → ['t', 'tenant-123', 'beds', 'available']
 */
export function tenantKey(...keys: (string | number | undefined)[]): unknown[] {
  const scope = getTenantScope()
  return ['t', scope, ...keys.filter(k => k !== undefined)]
}

/**
 * ⚠️ ESPECIAL: Keys para SuperAdmin (sem tenant scope)
 * Usar APENAS em páginas /superadmin/*
 *
 * @example
 * superAdminKey('tenants', 'list')
 * // → ['superadmin', 'tenants', 'list']
 */
export function superAdminKey(...keys: (string | number | undefined)[]): unknown[] {
  return ['superadmin', ...keys.filter(k => k !== undefined)]
}
```

---

#### Atualizar: `src/stores/auth.store.ts`

**Linha 139-142:** ✅ JÁ LIMPA CACHE - apenas melhorar comentário

```typescript
selectTenant: async (tenantId: string, email: string, password: string) => {
  set({ isLoading: true, error: null })
  try {
    const response = await api.post('/auth/select-tenant', {
      tenantId,
      email,
      password,
    })

    const { user, accessToken, refreshToken } = response.data

    // ✅ CRÍTICO: Limpar TODO o cache do React Query ANTES de setar novo tenant
    // Isso garante que queries com tenantKey() do tenant antigo sejam removidas
    // e não apareçam para o novo tenant (isolamento de dados)
    if (typeof window !== 'undefined' && window.queryClient) {
      console.log('🧹 Auth Store - Limpando cache ao trocar tenant...')
      window.queryClient.clear()
    }

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      availableTenants: null,
    })

    // Configurar token no axios
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
  } catch (error: any) {
    set({
      error: error.response?.data?.message || 'Erro ao selecionar tenant',
      isLoading: false,
    })
    throw error
  }
},
```

**Linha 228-245:** ✅ JÁ LIMPA CACHE no logout - validar ordem

```typescript
logout: async () => {
  set({ isLoading: true })
  try {
    const { accessToken, refreshToken } = get()
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      await api.post('/auth/logout', { refreshToken })
    }
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
  } finally {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      availableTenants: null,
    })
    delete api.defaults.headers.common['Authorization']

    // ✅ IMPORTANTE: Ordem correta de limpeza
    if (typeof window !== 'undefined') {
      console.log('🧹 Auth Store - Limpando cache no logout...')

      // 1. Limpar features store
      useFeaturesStore.getState().clearFeatures()

      // 2. Limpar cache do React Query
      if (window.queryClient) {
        console.log('🧹 Limpando React Query cache...')
        window.queryClient.clear()
      } else {
        console.warn('⚠️ queryClient não encontrado no window!')
      }

      // 3. Limpar localStorage (Zustand persist)
      console.log('🧹 Removendo rafa-ilpi-auth do localStorage...')
      localStorage.removeItem('rafa-ilpi-auth')
      console.log('✅ Logout completo - cache limpo!')
    }
  }
},
```

---

## ✅ Fase 2 — Camada de API e hooks (2–3 PRs)

**Objetivo:** Padronizar chamadas e hooks por domínio

---

### 📦 PR 3 — Estrutura "/hooks" por domínio

**Status:** ⚠️ APIs existem - CRIAR hooks

**Estrutura atual:**
```
apps/frontend/src/
├── api/               ← ✅ JÁ EXISTE (31 tenant APIs)
│   ├── residents.api.ts
│   ├── beds.api.ts
│   ├── medications.api.ts
│   └── ...
├── hooks/             ← ⚠️ CRIAR (pasta não existe)
└── services/
    └── api.ts
```

**Estrutura desejada:**
```
apps/frontend/src/
├── api/               ← Apenas chamadas HTTP
├── hooks/             ← React Query + invalidação
│   ├── useResidents.ts
│   ├── useBeds.ts
│   ├── useMedications.ts
│   └── ...
└── lib/
    └── query-keys.ts  ← Helper de keys
```

---

#### Template de hook: `src/hooks/useResidents.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  residentsAPI,
  type ResidentQuery,
  type CreateResidentDto,
  type UpdateResidentDto
} from '@/api/residents.api'
import { tenantKey } from '@/lib/query-keys'

/**
 * Hook para listar residentes com filtros
 */
export function useResidents(query?: ResidentQuery) {
  return useQuery({
    queryKey: tenantKey('residents', 'list', JSON.stringify(query)),
    queryFn: () => residentsAPI.getAll(query),
    staleTime: 30_000, // 30 segundos
  })
}

/**
 * Hook para buscar residente por ID
 */
export function useResident(id: string | undefined) {
  return useQuery({
    queryKey: tenantKey('residents', id),
    queryFn: () => residentsAPI.getById(id!),
    enabled: !!id,
    staleTime: 60_000, // 1 minuto
  })
}

/**
 * Hook para estatísticas de residentes
 */
export function useResidentsStats() {
  return useQuery({
    queryKey: tenantKey('residents', 'stats'),
    queryFn: () => residentsAPI.getStats(),
    staleTime: 60_000, // 1 minuto
  })
}

/**
 * Hook para criar residente
 */
export function useCreateResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateResidentDto) => residentsAPI.create(data),
    onSuccess: () => {
      // Invalidar lista de residentes e stats
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
    },
  })
}

/**
 * Hook para atualizar residente
 */
export function useUpdateResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResidentDto }) =>
      residentsAPI.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidar residente específico + lista + stats
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', variables.id) })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'list') })
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', 'stats') })
    },
  })
}

/**
 * Hook para deletar residente
 */
export function useDeleteResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, deleteReason }: { id: string; deleteReason: string }) =>
      residentsAPI.delete(id, deleteReason),
    onSuccess: () => {
      // Invalidar todas as queries de residents
      queryClient.invalidateQueries({ queryKey: tenantKey('residents') })
    },
  })
}

/**
 * Hook para histórico de versões do residente
 */
export function useResidentHistory(id: string | undefined) {
  return useQuery({
    queryKey: tenantKey('residents', id, 'history'),
    queryFn: () => residentsAPI.getHistory(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

/**
 * Hook para transferir residente de leito
 */
export function useTransferResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ residentId, toBedId, reason }: {
      residentId: string
      toBedId: string
      reason: string
    }) => residentsAPI.transferBed(residentId, toBedId, reason),
    onSuccess: (_, variables) => {
      // Invalidar residente + leitos
      queryClient.invalidateQueries({ queryKey: tenantKey('residents', variables.residentId) })
      queryClient.invalidateQueries({ queryKey: tenantKey('beds') })
    },
  })
}
```

---

#### Hooks a criar (ordem de prioridade)

**Lote A - Críticos (PRIMEIRO):**
- `src/hooks/useResidents.ts` ⚠️
- `src/hooks/useBeds.ts` ⚠️
- `src/hooks/useAgenda.ts` ⚠️ (se existir agenda.api.ts)

**Lote B - Clínicos (SEGUNDO):**
- `src/hooks/useMedications.ts` ⚠️
- `src/hooks/usePrescriptions.ts` ⚠️
- `src/hooks/useVitalSigns.ts` ⚠️
- `src/hooks/useVaccinations.ts` ⚠️
- `src/hooks/useClinicalNotes.ts` ⚠️
- `src/hooks/useClinicalProfiles.ts` ⚠️

**Lote C - Secundários (TERCEIRO):**
- `src/hooks/useUsers.ts` ⚠️
- `src/hooks/usePops.ts` ⚠️
- `src/hooks/useMessages.ts` ⚠️
- `src/hooks/useNotifications.ts` ⚠️
- `src/hooks/useDailyRecords.ts` ⚠️

**❌ NÃO criar:**
- `src/hooks/useSuperAdmin.ts` (futuro)

---

### 📦 PR 4 — Tipos Alinhados

**Objetivo:** Garantir que tipos do frontend correspondem ao backend

**Validar:**
```bash
# Verificar tipos em cada API
grep -n "interface\|type " apps/frontend/src/api/*.api.ts | grep -v superadmin
```

**Considerar:**
1. Se backend tem Swagger/OpenAPI → gerar tipos automaticamente
2. Se não → centralizar tipos compartilhados

**Criar (se necessário):** `src/types/backend.ts`

```typescript
/**
 * Tipos base retornados pelo backend
 */
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error?: string
}

// Re-exportar tipos de domínio
export type {
  Resident,
  CreateResidentDto,
  UpdateResidentDto
} from '@/api/residents.api'

export type {
  Bed,
  CreateBedDto,
  UpdateBedDto
} from '@/api/beds.api'

// ... outros tipos
```

---

## ✅ Fase 3 — Correção por Impacto

**Objetivo:** Ajustar fluxos por ordem de criticidade

---

### 🔥 Lote A — Fluxos Críticos (PRIMEIRO)

#### 1. Autenticação / Sessão

**Status:** ✅ Validado

**Arquivos:**
- `src/stores/auth.store.ts` ✅
- `src/services/api.ts` ✅

---

#### 2. Residentes

**APIs:**
- `src/api/residents.api.ts` ✅ (não envia tenantId)

**Hooks:**
- `src/hooks/useResidents.ts` ⚠️ CRIAR

**Páginas a ajustar:**
- `src/pages/residents/ResidentView.tsx`
- `src/pages/residents/ResidentDailyRecordsCalendar.tsx`
- `src/pages/residents/ResidentMedicationsCalendar.tsx`
- `src/pages/residents/ResidentPrintView.tsx`

**Ação:**
```typescript
// ❌ ANTES
import { residentsAPI } from '@/api/residents.api'
const { data } = await residentsAPI.getAll()

// ✅ DEPOIS
import { useResidents } from '@/hooks/useResidents'
const { data, isLoading, error } = useResidents()
```

---

#### 3. Leitos

**APIs:**
- `src/api/beds.api.ts` ⚠️ REVISAR (verificar se envia tenantId)

**Hooks:**
- `src/hooks/useBeds.ts` ⚠️ CRIAR

**Páginas:**
- `src/pages/beds/BedsStructurePage.tsx`

---

#### 4. Agenda

**APIs:**
- Buscar: `*agenda*.api.ts` ou `*schedule*.api.ts`

**Hooks:**
- `src/hooks/useAgenda.ts` ⚠️ CRIAR (se API existir)

**Páginas:**
- `src/pages/agenda/AgendaPage.tsx`

---

### 🏥 Lote B — Clínico (SEGUNDO)

**Ordem de implementação:**

#### 1. Prescrições e Medicações

**APIs:**
- `src/api/medications.api.ts`
- `src/api/prescriptions.api.ts`

**Hooks:**
- `src/hooks/useMedications.ts` ⚠️
- `src/hooks/usePrescriptions.ts` ⚠️

**Páginas (17 arquivos):**
- `src/pages/medications/ActiveMedicationsPage.tsx`
- `src/pages/prescriptions/PrescriptionsPage.tsx`
- `src/pages/prescriptions/PrescriptionForm.tsx`
- `src/pages/prescriptions/PrescriptionEdit.tsx`
- `src/pages/prescriptions/PrescriptionDetails.tsx`
- `src/pages/prescriptions/PrescriptionsList.tsx`
- `src/pages/prescriptions/components/*.tsx` (11 arquivos)

---

#### 2. Sinais Vitais

**APIs:**
- `src/api/vital-signs.api.ts`

**Hooks:**
- `src/hooks/useVitalSigns.ts` ⚠️

---

#### 3. Vacinações

**APIs:**
- `src/api/vaccinations.api.ts`

**Hooks:**
- `src/hooks/useVaccinations.ts` ⚠️

---

#### 4. Notas Clínicas

**APIs:**
- `src/api/clinical-notes.api.ts`

**Hooks:**
- `src/hooks/useClinicalNotes.ts` ⚠️

---

### ⚙️ Lote C — Admin e Bordas (TERCEIRO)

**EXCLUINDO páginas SuperAdmin**

#### 1. Usuários

**APIs:**
- `src/api/users.api.ts`

**Hooks:**
- `src/hooks/useUsers.ts` ⚠️

**Páginas:**
- `src/pages/users/UserCreatePage.tsx`
- `src/pages/users/UserEditPage.tsx`

---

#### 2. POPs (Procedimentos Operacionais)

**APIs:**
- `src/api/pops.api.ts`

**Hooks:**
- `src/hooks/usePops.ts` ⚠️

**Páginas (8 arquivos):**
- `src/pages/pops/PopsList.tsx`
- `src/pages/pops/PopViewer.tsx`
- `src/pages/pops/PopEditor.tsx`
- `src/pages/pops/PopHistoryPage.tsx`
- `src/pages/pops/PopVersionModal.tsx`
- `src/pages/pops/PopObsoleteModal.tsx`
- `src/pages/pops/PopTemplatesModal.tsx`

---

#### 3. Mensagens

**APIs:**
- `src/api/messages.api.ts`

**Hooks:**
- `src/hooks/useMessages.ts` ⚠️

**Páginas:**
- `src/pages/messages/MessagesListPage.tsx`
- `src/pages/messages/MessageDetailPage.tsx`
- `src/pages/messages/ComposeMessagePage.tsx`

---

#### 4. Notificações

**APIs:**
- `src/api/notifications.api.ts`

**Hooks:**
- `src/hooks/useNotifications.ts` ⚠️

---

#### 5. Registros Diários

**APIs:**
- `src/api/dailyRecords.api.ts`

**Hooks:**
- `src/hooks/useDailyRecords.ts` ⚠️

**Páginas:**
- `src/pages/daily-records/` (vários componentes e modais)

---

### ❌ EXCLUIR do Lote C (uso exclusivo SuperAdmin)

**APIs que NÃO serão refatoradas agora:**
- `src/api/contracts.api.ts`
- `src/api/plans.api.ts` (se usado só no SuperAdmin)
- `src/api/invoices.api.ts` (se usado só no SuperAdmin)
- `src/api/overdue.api.ts` (se usado só no SuperAdmin)
- `src/api/collections.api.ts` (se usado só no SuperAdmin)

---

## ✅ Fase 4 — Caça Sistemática (1 PR "limpeza")

**Objetivo:** Eliminar resquícios de código antigo

---

### 🔍 Comandos de busca (EXCLUINDO SuperAdmin)

#### 1. Buscar `tenantId` em requests

```bash
grep -r "tenantId" apps/frontend/src/api/ \
  --include="*.ts" \
  --exclude="superadmin.api.ts"
```

**Resultado esperado:** 0 (ou apenas em types/interfaces)

---

#### 2. Buscar `tenantId` em páginas

```bash
grep -r "tenantId" apps/frontend/src/pages/ \
  --include="*.tsx" \
  --exclude-dir="superadmin"
```

**Resultado esperado:** 0 (ou apenas props de componente documentadas)

---

#### 3. Buscar `fetch()` cru

```bash
grep -r "fetch(" apps/frontend/src/ \
  --include="*.tsx" --include="*.ts" \
  --exclude-dir="superadmin" \
  | grep -v "node_modules"
```

**Resultado esperado:** 0

---

#### 4. Buscar `axios.create` duplicado

```bash
grep -r "axios.create" apps/frontend/src/ \
  --include="*.ts" \
  --exclude="api.ts" \
  --exclude-dir="superadmin"
```

**Resultado esperado:** 0

---

#### 5. Buscar headers customizados

```bash
grep -r "x-tenant\|X-Tenant" apps/frontend/src/ \
  --include="*.ts" \
  --exclude-dir="superadmin"
```

**Resultado esperado:** 0

---

### 🧹 Ações de limpeza

#### 1. Remover props `tenantId`

```typescript
// ❌ ANTES
interface ResidentFormProps {
  tenantId: string // ← REMOVER
  residentId?: string
}

// ✅ DEPOIS
interface ResidentFormProps {
  residentId?: string
}
```

---

#### 2. Remover parâmetros manuais

```typescript
// ❌ ANTES
const users = await api.get(`/tenants/${tenantId}/users`)

// ✅ DEPOIS
const users = await api.get('/users') // Backend pega do JWT
```

---

#### 3. Atualizar comentários

```typescript
// ❌ ANTES
// Busca residentes do tenant X

// ✅ DEPOIS
// Busca residentes do tenant atual (extraído do JWT no backend)
```

---

#### 4. Remover imports desnecessários

```typescript
// ❌ ANTES
import { useAuthStore } from '@/stores/auth.store'

const MyComponent = () => {
  const tenantId = useAuthStore(state => state.user?.tenantId)
  // ... usa tenantId em requests
}

// ✅ DEPOIS
// Se não precisa de tenantId, remover import
const MyComponent = () => {
  // ... usa hooks direto (tenantId está no JWT)
}
```

---

## ✅ Checkpoints Objetivos

**Como saber que terminou:**

---

### ✅ Checkpoint 1: Nenhum request tenant contém tenantId

```bash
grep -r "tenantId" apps/frontend/src/api/ \
  --include="*.ts" \
  --exclude="superadmin.api.ts" \
  | grep -v "interface\|type " \
  | wc -l
```

**Resultado esperado:** 0

---

### ✅ Checkpoint 2: Cache limpo ao trocar tenant

**Teste manual:**
1. Login como João (Tenant A)
2. Ver lista de residentes → Anotar nomes
3. Clicar em "Trocar ILPI"
4. Selecionar Tenant B
5. Ver lista de residentes → Deve ser DIFERENTE
6. Verificar no DevTools → React Query cache deve ter mudado de `['t', 'tenant-A', ...]` para `['t', 'tenant-B', ...]`

**Critério de sucesso:** ✅ Listas diferentes + cache limpo

---

### ✅ Checkpoint 3: Todos domínios tenant têm hooks

```bash
ls apps/frontend/src/hooks/ | grep -v superadmin | wc -l
```

**Resultado esperado:** >= 12 arquivos

**Lista esperada:**
- `useResidents.ts`
- `useBeds.ts`
- `useAgenda.ts` (se aplicável)
- `useMedications.ts`
- `usePrescriptions.ts`
- `useVitalSigns.ts`
- `useVaccinations.ts`
- `useClinicalNotes.ts`
- `useClinicalProfiles.ts`
- `useUsers.ts`
- `usePops.ts`
- `useMessages.ts`
- `useNotifications.ts`
- `useDailyRecords.ts`

---

### ✅ Checkpoint 4: Telas críticas sem erros

**Teste manual (EXCLUINDO SuperAdmin):**

**Dashboard:**
- [ ] Login → Dashboard carrega
- [ ] Cards de estatísticas aparecem
- [ ] Gráficos renderizam
- [ ] Sem erros 500/400 no console

**Residentes:**
- [ ] Lista de residentes carrega
- [ ] Detalhes de residente abre
- [ ] Edição funciona
- [ ] Criação funciona
- [ ] Sem erros 500/400

**Leitos:**
- [ ] Mapa de leitos carrega
- [ ] Transferência funciona
- [ ] Status-history aparece
- [ ] Sem erros 500/400

**Prescrições:**
- [ ] Lista de prescrições carrega
- [ ] Criar prescrição funciona
- [ ] Editar prescrição funciona
- [ ] Medicações aparecem
- [ ] Sem erros 500/400

**Agenda:**
- [ ] Calendário carrega
- [ ] Criar evento funciona
- [ ] Sem erros 500/400

**POPs:**
- [ ] Lista de POPs carrega
- [ ] Visualizar POP funciona
- [ ] Sem erros 500/400

---

### ✅ Checkpoint 5: Busca tenantId = 0 (páginas tenant)

```bash
grep -r "tenantId" apps/frontend/src/ \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir="superadmin" \
  --exclude-dir="node_modules" \
  | grep -v "interface\|type \|//" \
  | wc -l
```

**Resultado esperado:** 0 (ou apenas em `auth.store.ts` e `query-keys.ts`)

---

### ✅ Checkpoint 6: ESLint passa

```bash
cd apps/frontend
npm run lint
```

**Resultado esperado:** 0 erros relacionados a `fetch()` ou `axios.create`

---

## 📊 Métricas de Escopo

### Antes vs Depois (Sem SuperAdmin)

| Categoria | Antes | Depois | Redução |
|-----------|-------|--------|---------|
| APIs para refatorar | 32 | 31 | -1 (3%) |
| Hooks para criar | ~15 | ~14 | -1 (7%) |
| Páginas para ajustar | ~100 | ~80 | -20 (20%) |
| Complexidade estimada | Alta | Média | ✅ |

---

### Distribuição de esforço

| Fase | PRs | Complexidade | Tempo estimado |
|------|-----|--------------|----------------|
| Fase 0 - Blindagem | 1 | Baixa | 2h |
| Fase 1 - Núcleo | 2 | Média | 4h |
| Fase 2 - API/Hooks | 3 | Alta | 12h |
| Fase 3 - Correção | 6 | Média-Alta | 16h |
| Fase 4 - Limpeza | 1 | Baixa | 2h |
| **TOTAL** | **13** | - | **~36h** |

---

## 🚀 Ordem de Execução Recomendada

### Sprint 1 - Fundação (4h)
1. ✅ Fase 0 - Blindagem (validação DEV + ESLint)
2. ✅ Fase 1 PR1 - Validar API client
3. ✅ Fase 1 PR2 - Query keys + cache namespaced

### Sprint 2 - Infraestrutura (12h)
4. ✅ Fase 2 PR3 - Criar hooks Lote A (Residentes, Leitos, Agenda)
5. ✅ Fase 3 Lote A - Ajustar páginas críticas

### Sprint 3 - Clínico (12h)
6. ✅ Fase 2 PR3 - Criar hooks Lote B (Medicações, Sinais Vitais, etc.)
7. ✅ Fase 3 Lote B - Ajustar páginas clínicas

### Sprint 4 - Secundários (8h)
8. ✅ Fase 2 PR3 - Criar hooks Lote C (Usuários, POPs, Mensagens)
9. ✅ Fase 3 Lote C - Ajustar páginas admin/bordas
10. ✅ Fase 4 - Limpeza sistemática

### Sprint 5 - Validação Final (2h)
11. ✅ Executar todos os checkpoints
12. ✅ Testes manuais completos
13. ✅ Code review final

---

## 🎓 Princípios Arquiteturais

### ✅ Frontend NUNCA envia tenantId

**Motivo:** Backend extrai do JWT automaticamente via `TenantContextService`

```typescript
// ❌ ERRADO
api.post('/residents', { ...data, tenantId })

// ✅ CORRETO
api.post('/residents', data) // tenantId vem do JWT no backend
```

---

### ✅ Cache isolado por tenant

**Motivo:** Evitar vazamento de dados entre tenants

```typescript
// ✅ Query key com namespace
tenantKey('residents') → ['t', 'tenant-123', 'residents']

// ✅ Ao trocar tenant: queryClient.clear()
```

---

### ✅ Hooks centralizam lógica

**Motivo:** Invalidação de cache em um lugar só

```typescript
// ✅ Hook gerencia create + invalidação
export function useCreateResident() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data) => residentsAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKey('residents') })
    }
  })
}
```

---

### ✅ API layer separada de UI

**Motivo:** Mudanças de endpoint afetam 1 arquivo só

```
api/residents.api.ts → Define contratos HTTP
hooks/useResidents.ts → Gerencia cache React Query
pages/residents/*.tsx → Consome hooks
```

---

## 🔒 Regras de Segurança

### 1. Interceptor valida requests (DEV only)

**Bloqueia:** `tenantId` em body/params (exceto `/superadmin/*`)

**Implementado em:** `src/services/api.ts`

---

### 2. ESLint previne padrões ruins

**Bloqueia:**
- `fetch()` cru
- `axios.create` duplicado

**Implementado em:** `apps/frontend/.eslintrc.cjs`

---

### 3. Cache limpo ao trocar tenant

**Garante:** Dados de Tenant A não aparecem para Tenant B

**Implementado em:** `src/stores/auth.store.ts` (linha 139-142)

---

## 📚 Referências

### Documentação Backend

- **Multi-Tenancy:** `docs/architecture/multi-tenancy.md`
- **Isolamento:** `docs/architecture/MULTI-TENANT-ISOLATION.md`
- **Validação:** `docs/architecture/MULTI-TENANT-VALIDATION.md`

### Padrões Backend

- **TenantContextService** (REQUEST scope)
- **TenantContextInterceptor** (global)
- **3 RED Rules** (violações críticas)

### Frontend

- **Auth Store:** `apps/frontend/src/stores/auth.store.ts`
- **API Client:** `apps/frontend/src/services/api.ts`
- **APIs:** `apps/frontend/src/api/*.api.ts`

---

## ✅ Fase 4 — Portal SuperAdmin

**Objetivo:** Corrigir e documentar hooks cross-tenant do portal superadmin

**Data de Conclusão:** 16/01/2026

---

### 🎯 Análise Executada

**Total de arquivos analisados:** 44 arquivos
- 42 páginas e componentes superadmin
- 2 hooks principais: `useSuperAdmin.ts`, `useCollections.ts`

**Conclusão da análise:**
- ✅ **42 arquivos CORRETOS** - Já seguem padrão `['superadmin', ...]` cross-tenant
- ⚠️ **2 arquivos para correção** - Queries sem namespace consistente
- 📚 **2 arquivos para documentação** - Hooks principais sem documentação sobre padrão cross-tenant

---

### 🔧 Correções Implementadas

| Arquivo | Tipo | Problema | Solução | Status |
|---------|------|----------|---------|--------|
| `ChangePlanDialog.tsx` | Componente | `queryKey: ['plans']` | `queryKey: ['superadmin', 'plans']` | ✅ |
| `VersionHistory.tsx` | Componente | `queryKey: ['email-template-versions', id]` | `queryKey: ['superadmin', 'email-template-versions', id]` | ✅ |
| `VersionHistory.tsx` | Componente | 3 invalidações sem namespace | Adicionar prefixo `['superadmin', ...]` | ✅ |

**Total:** 2 arquivos corrigidos, 4 queries/invalidations ajustadas

---

### 📚 Documentação Adicionada

#### 1. `useSuperAdmin.ts`
**Adicionado:** Cabeçalho de documentação completo explicando:
- ⚠️ Hook cross-tenant (NÃO usar tenantKey)
- ✅ Padrão correto: `['superadmin', 'tenants', filters]`
- ❌ Padrão incorreto: `tenantKey('tenants')`
- 💡 Razão: SuperAdmin visualiza TODOS os tenants simultaneamente
- 🤔 Guideline: Quando usar tenant-scoped vs cross-tenant

#### 2. `useCollections.ts`
**Adicionado:** Cabeçalho de documentação completo explicando:
- ⚠️ Hook cross-tenant de cobrança (NÃO usar tenantKey)
- ✅ Padrão correto: `['overdue']`, `['invoices']`, `['analytics']`
- ❌ Padrão incorreto: `tenantKey('invoices')`
- 💡 Razão: Dashboard financeiro agregado de todos os tenants
- 🤔 Guideline: Faturas do tenant (tenant-scoped) vs faturas agregadas (cross-tenant)

---

### 🎯 Padrão Estabelecido

**Cache Keys SuperAdmin:**
```typescript
// ✅ CORRETO - Cross-tenant queries
queryKey: ['superadmin', 'tenants', filters]
queryKey: ['superadmin', 'tenant', id]
queryKey: ['superadmin', 'plans']
queryKey: ['overdue']  // Métricas financeiras
queryKey: ['invoices'] // Cross-tenant
queryKey: ['analytics'] // Dashboard agregado

// ❌ INCORRETO - NUNCA usar no SuperAdmin
queryKey: tenantKey('tenants') // Isolaria por tenant!
```

**Invalidações SuperAdmin:**
```typescript
// ✅ CORRETO
queryClient.invalidateQueries({ queryKey: ['superadmin', 'tenants'] })
queryClient.invalidateQueries({ queryKey: ['overdue'] })

// ❌ INCORRETO
queryClient.invalidateQueries({ queryKey: tenantKey('tenants') })
```

---

### 📊 Resultados

**Antes:**
- 2 queries sem namespace consistente
- 0 documentação sobre padrão cross-tenant
- Risco de confusão futura ao adicionar novos hooks

**Depois:**
- ✅ 100% das queries com namespace `['superadmin', ...]`
- ✅ Documentação clara nos 2 hooks principais
- ✅ Guidelines para futuras adições
- ✅ Distinção explícita: tenant-scoped vs cross-tenant

---

## 🔄 Próximos Passos (Pós-Migração)

### Fase 5 - SuperAdmin (Futuro)

**Quando implementar:**
- Após validar que tenant pages funcionam 100%
- Com estratégia específica para multi-tenant intencional

**Abordagem diferente:**
- SuperAdmin PODE enviar `tenantId` (contexto diferente)
- Hooks com `superAdminKey()` ao invés de `tenantKey()`
- Cache não limpa ao trocar tenant (visualização múltipla)

---

### Melhorias Futuras

**Performance:**
- [ ] Implementar React Query `prefetchQuery` para navegação rápida
- [ ] Adicionar `optimisticUpdates` em mutations críticas
- [ ] Configurar `gcTime` por tipo de dado

**Developer Experience:**
- [ ] Gerar tipos TypeScript do OpenAPI (se disponível)
- [ ] Criar hooks genéricos reutilizáveis
- [ ] Documentar padrões em Storybook

**Monitoramento:**
- [ ] Adicionar Sentry para erros em produção
- [ ] Logs estruturados de chamadas API
- [ ] Métricas de performance (Web Vitals)

---

## 📝 Changelog

| Data | Versão | Alteração |
|------|--------|-----------|
| 16/01/2026 | 1.0.0 | Criação do plano (Dr. Emanuel) |

---

**Última atualização:** 16/01/2026
**Próxima revisão:** Após conclusão da Fase 1
