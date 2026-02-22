# Tenant Billing - Sistema de Gerenciamento de Planos Self-Service

> **Documento complementar (não canônico)**
> Referências principais de implementação:
> - [plans](./plans.md)
> - [payments](./payments.md)
> - [tenant-profile](./tenant-profile.md)
> Uso: documentação de produto/self-service de cobrança do tenant.

## 📋 Visão Geral

O módulo **Tenant Billing** permite que administradores de tenants (ADMIN e MANAGER) gerenciem suas próprias assinaturas, planos e faturas de forma autônoma, sem depender de intervenção do SuperAdmin para operações básicas como upgrade de plano e visualização de faturas.

**Filosofia do Módulo:** Autonomia com Limites
- ✅ Self-service para **upgrades** (crescimento autônomo)
- ✅ Transparência total sobre **faturas e cobranças**
- ✅ Controle sobre **método de pagamento preferido**
- ✅ Cancelamento de **trial** antes da primeira cobrança
- ❌ Downgrades restritos ao SuperAdmin (gestão comercial)
- ❌ Descontos restritos ao SuperAdmin (decisão comercial)

---

## 🏗️ Arquitetura

### Separação de Responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│                     TENANT ADMIN (/admin/*)                  │
├─────────────────────────────────────────────────────────────┤
│  Acesso: ADMIN | MANAGER (do próprio tenant)               │
│  Escopo: Apenas dados do próprio tenant                     │
│  Funcionalidades:                                            │
│    • Visualizar plano atual e limites                       │
│    • Comparar planos disponíveis (apenas upgrades)          │
│    • Solicitar upgrade de plano (self-service)              │
│    • Visualizar histórico de faturas                        │
│    • Atualizar método de pagamento preferido                │
│    • Cancelar trial antes da primeira cobrança              │
│    • Aceitar contratos de serviço                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  SUPERADMIN (/superadmin/*)                  │
├─────────────────────────────────────────────────────────────┤
│  Acesso: Apenas SUPERADMIN                                  │
│  Escopo: Todos os tenants (visão global)                    │
│  Funcionalidades:                                            │
│    • CRUD completo de planos                                │
│    • Upgrade/Downgrade de qualquer tenant                   │
│    • Aplicar descontos e preços customizados                │
│    • Cancelar/Reativar subscriptions                        │
│    • Ver todas as faturas da plataforma                     │
│    • Analytics financeiros                                  │
└─────────────────────────────────────────────────────────────┘
```

### Reutilização de Services

O módulo **reutiliza 100%** dos services do SuperAdmin, aplicando validações específicas nos controllers:

```typescript
// Services Compartilhados
PlansService              → Busca e comparação de planos
InvoiceService            → Geração e listagem de faturas
SubscriptionAdminService  → Mudança de plano (changePlan)
ContractsService          → Gestão de contratos

// Validações Específicas do Tenant Admin (Controller Layer)
✓ Filtrar apenas upgrades (maxResidents >= atual)
✓ Bloquear downgrades (BadRequestException)
✓ Escopo de faturas (apenas tenantId do usuário)
✓ Cancelamento de trial (apenas status = 'trialing')
```

---

## 🔌 API Endpoints

### Base URL
```
/admin/*
```

### Autenticação
- **Guard:** `JwtAuthGuard` + `RolesGuard`
- **Roles Permitidas:** `ADMIN`, `MANAGER`
- **Validação:** Todas operações validam `user.tenantId`

---

### 1️⃣ Planos Disponíveis

**Endpoint:** `GET /admin/plans/available`

**Descrição:** Retorna planos disponíveis para upgrade (apenas planos com `maxResidents >= plano atual`).

**Response:**
```json
{
  "currentPlan": {
    "id": "uuid",
    "name": "BASICO",
    "displayName": "Básico",
    "maxResidents": 10,
    "maxUsers": 5,
    "price": 99.90
  },
  "availablePlans": [
    {
      "id": "uuid",
      "name": "PROFISSIONAL",
      "displayName": "Profissional",
      "maxResidents": 30,
      "maxUsers": 10,
      "price": 299.90
    }
  ]
}
```

**Regras de Negócio:**
- ✅ Inclui o plano atual (badge "Plano Atual" no frontend)
- ✅ Exclui planos menores (downgrade bloqueado)
- ✅ Ordena por `price ASC`

---

### 2️⃣ Comparar Planos

**Endpoint:** `GET /admin/plans/compare/:targetPlanId`

**Descrição:** Compara o plano atual com um plano target, retornando diferenças de preço, limites e recursos.

**Response:**
```json
{
  "currentPlan": { ... },
  "targetPlan": { ... },
  "isUpgrade": true,
  "isDowngrade": false,
  "priceDifference": 200.00,
  "residentsDifference": 20,
  "usersDifference": 5
}
```

**Validações:**
- ❌ Se `isDowngrade === true` → `BadRequestException`
- ✅ Exibe diferenças visuais no frontend

---

### 3️⃣ Upgrade de Plano (Self-Service)

**Endpoint:** `POST /admin/subscription/upgrade`

**Body:**
```json
{
  "newPlanId": "uuid",
  "acceptedContractId": "uuid" // Opcional (futuro)
}
```

**Descrição:** Realiza upgrade de plano e gera fatura automaticamente.

**Fluxo Interno:**
1. Valida que `newPlanId` é um upgrade válido
2. Chama `SubscriptionAdminService.changePlan()`
3. Cancela subscription antiga (status → 'cancelled')
4. Cria nova subscription (status → 'active')
5. Gera fatura via `InvoiceService.generateInvoice()`
6. Cria `SystemAlert` para auditoria

**Response:**
```json
{
  "subscription": { ... },
  "invoice": {
    "id": "uuid",
    "invoiceNumber": "INV-2025-001234",
    "amount": 299.90,
    "paymentUrl": "https://asaas.com/pay/..."
  },
  "message": "Upgrade realizado com sucesso. Fatura gerada."
}
```

**Log de Auditoria:**
```typescript
logger.log(
  `[TENANT-SELF-SERVICE] Upgrade solicitado: ${tenantId} → ${newPlanId} (usuário: ${user.email})`
)
```

---

### 4️⃣ Histórico de Faturas

**Endpoint:** `GET /admin/invoices?status=OPEN&limit=50`

**Query Params:**
- `status` (opcional): DRAFT | OPEN | PAID | VOID | UNCOLLECTIBLE
- `limit` (opcional): Máximo de faturas (default: 50)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-2025-001234",
      "status": "OPEN",
      "amount": 299.90,
      "dueDate": "2025-02-15T00:00:00Z",
      "paymentUrl": "https://asaas.com/pay/...",
      "subscription": {
        "plan": {
          "displayName": "Profissional"
        }
      }
    }
  ],
  "meta": {
    "total": 12
  }
}
```

**Validação de Segurança:**
```typescript
// Todas as faturas retornadas pertencem ao tenantId do usuário
where: { tenantId: user.tenantId }
```

---

### 5️⃣ Detalhes de Fatura

**Endpoint:** `GET /admin/invoices/:id`

**Response:**
```json
{
  "id": "uuid",
  "invoiceNumber": "INV-2025-001234",
  "status": "PAID",
  "amount": 299.90,
  "dueDate": "2025-02-15T00:00:00Z",
  "paidAt": "2025-02-10T14:30:00Z",
  "paymentUrl": "https://asaas.com/pay/...",
  "subscription": { ... },
  "tenant": { ... }
}
```

**Validação Crítica:**
```typescript
if (invoice.tenantId !== user.tenantId) {
  throw new ForbiddenException('Você não tem permissão para acessar esta fatura')
}
```

---

### 6️⃣ Atualizar Método de Pagamento

**Endpoint:** `PATCH /admin/subscription/payment-method`

**Body:**
```json
{
  "preferredPaymentMethod": "PIX" | "BOLETO" | "CREDIT_CARD"
}
```

**Descrição:** Atualiza o método de pagamento preferido. Próximas faturas serão geradas com esse método.

**Response:**
```json
{
  "subscription": { ... },
  "message": "Método de pagamento atualizado com sucesso"
}
```

---

### 7️⃣ Cancelar Trial

**Endpoint:** `POST /admin/subscription/cancel-trial`

**Descrição:** Cancela subscription durante o período de trial (antes da primeira cobrança).

**Validações:**
```typescript
✓ subscription.status === 'trialing'
✓ trialEndDate >= now (trial ainda ativo)
✗ Se trial já expirou → BadRequestException
```

**Ações:**
1. Atualiza `subscription.status` → 'canceled'
2. Atualiza `tenant.status` → 'CANCELLED'
3. Cria `SystemAlert` para auditoria
4. **NÃO** gera fatura (trial cancelado antes de cobrança)

**Response:**
```json
{
  "message": "Trial cancelado com sucesso. Sua conta foi desativada."
}
```

**Log de Auditoria:**
```typescript
logger.log(
  `[TENANT-SELF-SERVICE] Trial cancelado: ${tenantId} (usuário: ${user.email})`
)
```

---

### 8️⃣ Buscar Contrato Ativo

**Endpoint:** `GET /admin/contracts/active/:planId`

**Descrição:** Retorna o contrato ACTIVE mais recente para um plano (necessário antes de upgrade).

**Response:**
```json
{
  "id": "uuid",
  "version": "v1.2",
  "title": "Contrato de Serviço - Plano Profissional",
  "content": "Markdown/HTML do contrato...",
  "contentHash": "sha256...",
  "status": "ACTIVE"
}
```

---

### 9️⃣ Aceitar Contrato

**Endpoint:** `POST /admin/contracts/accept`

**Body:**
```json
{
  "contractId": "uuid"
}
```

**Descrição:** Registra aceite de contrato com snapshot imutável (LGPD compliance).

**Ações:**
1. Valida que contrato está ACTIVE
2. Cria `ContractAcceptance` com:
   - `contractVersion` (snapshot)
   - `contractContent` (snapshot)
   - `contractHash` (snapshot)
   - `ipAddress` (capturado do request)
   - `userAgent` (capturado do request)

**Response:**
```json
{
  "acceptance": {
    "id": "uuid",
    "acceptedAt": "2025-01-03T10:30:00Z",
    "contractVersion": "v1.2"
  },
  "message": "Contrato aceito com sucesso"
}
```

**Validação de Duplicação:**
- Se já existe aceite → retorna aceite existente (idempotente)

---

## 🎨 Frontend - Estrutura

### Página Principal

**Rota:** `/dashboard/settings/billing`

**Componente:** `BillingPage.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Gerenciamento de Plano                             │
│  Gerencie sua assinatura, faturas e método de      │
│  pagamento                                          │
├─────────────────────────────────────────────────────┤
│  [Plano Atual] [Planos Disponíveis] [Faturas]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <Conteúdo da Tab Ativa>                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Tab 1: Plano Atual

**Componente:** `CurrentPlanTab.tsx`

**Seções:**
1. **Trial Alert** (se `subscription.status === 'trialing'`)
   - Contador de dias restantes
   - Botão "Cancelar Antes da Cobrança"
   - Data de início da cobrança

2. **Plano Atual** (reutiliza `PlanStatusSection`)
   - Uso de residentes/usuários
   - Progress bars com cores (normal/warning/critical)
   - Botão "Gerenciar Plano"

3. **Método de Pagamento**
   - Dropdown com PIX/Boleto/Cartão
   - Atualização em tempo real

4. **Próxima Renovação**
   - Data de renovação
   - Status da subscription

### Tab 2: Planos Disponíveis

**Componente:** `AvailablePlansTab.tsx`

**Layout:**
```
Grid Responsivo (1/2/3 colunas)

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Plano Atual  │ │ Profissional │ │ Enterprise   │
│ R$ 99,90/mês │ │ R$ 299,90/mês│ │ R$ 599,90/mês│
│              │ │              │ │              │
│ 10 Residentes│ │ 30 Residentes│ │ 100 Resident.│
│ 5 Usuários   │ │ 10 Usuários  │ │ 30 Usuários  │
│              │ │              │ │              │
│ [Atual]      │ │ [Upgrade]    │ │ [Upgrade]    │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Funcionalidades Futuras:**
- Dialog de comparação detalhada
- Dialog de confirmação de upgrade com aceite de contrato

### Tab 3: Histórico de Faturas

**Componente:** `InvoicesHistoryTab.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Histórico de Faturas                  [Filtro: ▼]  │
├──────┬────────┬──────────┬─────────┬─────────┬─────┤
│ Núm. │ Status │ Plano    │ Valor   │ Venc.   │ Ação│
├──────┼────────┼──────────┼─────────┼─────────┼─────┤
│ 1234 │ Pago   │ Básico   │ R$ 99,90│ 15/01/25│ [>] │
│ 1235 │ Aberto │ Profis.  │ R$299,90│ 15/02/25│ [>] │
│ 1236 │ Vencida│ Profis.  │ R$299,90│ 15/12/24│ [>] │
└──────┴────────┴──────────┴─────────┴─────────┴─────┘
```

**Features:**
- Filtro por status (Todas, Pendentes, Pagas, Canceladas)
- Badge "Vencida" para faturas OPEN com `dueDate < now`
- Link "Ver no Asaas" para `paymentUrl`
- Ordenação por data (mais recentes primeiro)

---

## 🔧 Componentes de Billing

### TrialAlert.tsx

**Quando exibir:** Apenas se `subscription.status === 'trialing'`

**Visual:**
```
┌─────────────────────────────────────────────────────┐
│ 🕐  [PERÍODO DE TESTE]  7 dias restantes            │
│                                                     │
│ Você está no período de testes gratuito. A         │
│ cobrança começará em 10 de janeiro de 2025.        │
│                                                     │
│ [⚠️ Cancelar Antes da Cobrança]                    │
└─────────────────────────────────────────────────────┘
```

**Cálculo de dias restantes:**
```typescript
const daysRemaining = Math.ceil(
  (new Date(trialEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
)
```

### CancelTrialDialog.tsx

**Tipo:** AlertDialog (confirmação destrutiva)

**Conteúdo:**
```
⚠️ Cancelar Período de Teste

Atenção: Esta ação é irreversível. Ao cancelar o trial:
• Sua conta será imediatamente desativada
• Você perderá acesso a todos os dados e funcionalidades
• Não será cobrado nenhum valor
• Você poderá criar uma nova conta no futuro, se desejar

Tem certeza de que deseja cancelar seu período de teste?

[Manter Trial Ativo]  [Sim, Cancelar Trial]
```

**Fluxo:**
1. Usuário clica "Cancelar Antes da Cobrança"
2. Dialog abre com avisos claros
3. Confirma → `POST /admin/subscription/cancel-trial`
4. Sucesso → Toast + Redireciona para `/login` após 2s

### PaymentMethodSelector.tsx

**Tipo:** Select dropdown

**Opções:**
```typescript
{
  PIX: {
    label: 'PIX',
    description: 'Pagamento instantâneo via PIX'
  },
  BOLETO: {
    label: 'Boleto Bancário',
    description: 'Boleto com vencimento em até 3 dias úteis'
  },
  CREDIT_CARD: {
    label: 'Cartão de Crédito',
    description: 'Pagamento parcelado no cartão'
  }
}
```

**Atualização:**
- Ao trocar → `PATCH /admin/subscription/payment-method`
- Invalidação de cache: `invalidateQueries(['tenant', 'subscription'])`
- Toast de sucesso: "Suas próximas faturas serão geradas com PIX"

---

## 🪝 React Query Hooks

**Arquivo:** `src/hooks/useBilling.ts`

### Hook: useAvailablePlans()

```typescript
export function useAvailablePlans() {
  return useQuery({
    queryKey: ['admin', 'plans', 'available'],
    queryFn: async () => {
      const response = await api.get('/admin/plans/available')
      return response.data
    },
  })
}
```

### Hook: useUpgradeSubscription()

```typescript
export function useUpgradeSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { newPlanId: string }) => {
      const response = await api.post('/admin/subscription/upgrade', data)
      return response.data
    },
    onSuccess: () => {
      // Invalidar caches relacionados
      queryClient.invalidateQueries({ queryKey: ['tenant', 'subscription'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] })
    },
  })
}
```

**Todos os hooks:**
- `useAvailablePlans()` → GET /admin/plans/available
- `useComparePlans(planId)` → GET /admin/plans/compare/:planId
- `useUpgradeSubscription()` → POST /admin/subscription/upgrade
- `useTenantInvoices(filters)` → GET /admin/invoices
- `useInvoiceDetails(id)` → GET /admin/invoices/:id
- `useUpdatePaymentMethod()` → PATCH /admin/subscription/payment-method
- `useCancelTrial()` → POST /admin/subscription/cancel-trial
- `useActiveContract(planId)` → GET /admin/contracts/active/:planId
- `useAcceptContract()` → POST /admin/contracts/accept

---

## 🔒 Segurança

### Guards e Validações

**Backend:**
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class AdminController {
  // Todos endpoints validam user.tenantId
}
```

**Validação de Escopo:**
```typescript
// Exemplo: Detalhes de fatura
const invoice = await this.prisma.invoice.findUnique({ where: { id } })

if (invoice.tenantId !== user.tenantId) {
  throw new ForbiddenException('Acesso negado')
}
```

### Regras de Bloqueio

**Downgrade:**
```typescript
if (targetPlan.maxResidents < currentPlan.maxResidents) {
  throw new BadRequestException(
    'Downgrade não permitido. Entre em contato com o suporte.'
  )
}
```

**Trial Expirado:**
```typescript
if (subscription.status !== 'trialing') {
  throw new BadRequestException(
    'Apenas subscriptions em trial podem ser canceladas pelo tenant.'
  )
}

if (new Date() > subscription.trialEndDate) {
  throw new BadRequestException('O período de trial já expirou')
}
```

---

## 📊 Logs de Auditoria

### Formato Padronizado

**Tenant Admin (Self-Service):**
```typescript
logger.log(
  `[TENANT-SELF-SERVICE] ${action}: ${tenantId} → ${details} (user: ${user.email})`
)
```

**Exemplos:**
```
[TENANT-SELF-SERVICE] Upgrade solicitado: tenant-123 → PROFISSIONAL (user: admin@ilpi.com)
[TENANT-SELF-SERVICE] Trial cancelado: tenant-456 (user: manager@ilpi.com)
[TENANT-SELF-SERVICE] Método de pagamento atualizado: tenant-789 → PIX (user: admin@ilpi.com)
```

**SuperAdmin (Intervenção Manual):**
```typescript
logger.log(
  `[SUPERADMIN] ${action}: tenant=${tenantId} by=${adminEmail}`
)
```

**Exemplos:**
```
[SUPERADMIN] Plano alterado: tenant=tenant-123 newPlan=ENTERPRISE by=super@rafalabs.com
[SUPERADMIN] Desconto aplicado: tenant=tenant-456 discount=20% reason="Cliente fidelidade" by=super@rafalabs.com
```

### SystemAlerts (Auditoria Interna)

Todos upgrades e cancelamentos geram `SystemAlert`:

```typescript
await this.prisma.systemAlert.create({
  data: {
    tenantId,
    type: 'SYSTEM_ERROR', // TODO: Criar tipo específico 'PLAN_CHANGED'
    severity: 'INFO',
    title: 'Plano Alterado',
    message: `Upgrade solicitado via self-service: ${oldPlan} → ${newPlan}`,
    metadata: {
      oldPlanId,
      newPlanId,
      source: 'TENANT_SELF_SERVICE',
      userId: user.id,
    },
  },
})
```

---

## 🚀 Fluxos de Uso

### Fluxo 1: Upgrade de Plano

**Cenário:** Tenant atingiu limite de 10 residentes e precisa de mais espaço.

**Passos:**
1. Usuário acessa `/dashboard/settings/billing`
2. Vê alerta: "Limite Atingido! Faça upgrade"
3. Clica "Gerenciar Plano" → Navega para tab "Planos Disponíveis"
4. Vê grid de planos:
   - Básico (atual) - 10 residentes
   - Profissional - 30 residentes (+R$ 200/mês)
   - Enterprise - 100 residentes (+R$ 500/mês)
5. Clica "Fazer Upgrade" no Profissional
6. Dialog abre:
   - Comparação lado a lado
   - "Você pagará R$ 299,90/mês (diferença de +R$ 200)"
   - Checkbox "Li e aceito o contrato"
7. Aceita contrato → `POST /admin/contracts/accept`
8. Confirma upgrade → `POST /admin/subscription/upgrade`
9. Backend:
   - Cancela subscription antiga
   - Cria nova subscription (Profissional)
   - Gera fatura de R$ 299,90
   - Cria SystemAlert
10. Frontend:
    - Toast: "Upgrade realizado! Fatura gerada."
    - Redireciona para tab "Faturas"
11. Usuário vê nova fatura com link Asaas
12. Clica "Ver no Asaas" → Paga via PIX
13. Webhook Asaas atualiza status da fatura → PAID

### Fluxo 2: Cancelamento de Trial

**Cenário:** Tenant está testando o sistema mas decidiu não continuar.

**Passos:**
1. Usuário acessa `/dashboard/settings/billing`
2. Vê **TrialAlert:** "7 dias restantes"
3. Clica "Cancelar Antes da Cobrança"
4. Dialog abre com avisos:
   - "Sua conta será imediatamente desativada"
   - "Você perderá acesso a todos os dados"
   - "Não será cobrado nenhum valor"
5. Confirma → `POST /admin/subscription/cancel-trial`
6. Backend:
   - Atualiza subscription.status → 'canceled'
   - Atualiza tenant.status → 'CANCELLED'
   - Cria SystemAlert
7. Frontend:
   - Toast: "Trial cancelado com sucesso"
   - Redireciona para `/login` após 2 segundos
8. Usuário não pode mais fazer login (tenant CANCELLED)

### Fluxo 3: Atualização de Método de Pagamento

**Cenário:** Tenant prefere pagar via PIX ao invés de boleto.

**Passos:**
1. Usuário acessa `/dashboard/settings/billing` → Tab "Plano Atual"
2. Vê seção "Método de Pagamento Preferido"
3. Dropdown mostra "Boleto Bancário" (atual)
4. Seleciona "PIX"
5. Mutação: `PATCH /admin/subscription/payment-method`
6. Backend atualiza `subscription.preferredPaymentMethod`
7. Toast: "Suas próximas faturas serão geradas com PIX"
8. Próximas faturas (geradas automaticamente ou via upgrade) usam PIX

---

## 🔗 Integração com Portal SuperAdmin

### Separação de Contextos

**Tenant Admin:** Autonomia limitada (self-service)
- Rota: `/admin/*`
- Acesso: ADMIN | MANAGER do próprio tenant
- Funcionalidades: Upgrade, visualizar faturas, cancelar trial

**SuperAdmin:** Controle total (gestão comercial)
- Rota: `/superadmin/*`
- Acesso: Apenas SUPERADMIN
- Funcionalidades: CRUD planos, downgrades, descontos, analytics

### Pontos de Contato

**Services Compartilhados:**
```typescript
SubscriptionAdminService.changePlan()
├─ Usado por: POST /admin/subscription/upgrade (tenant)
└─ Usado por: POST /superadmin/tenants/:id/change-plan (superadmin)

InvoiceService.generateInvoice()
├─ Usado por: POST /admin/subscription/upgrade (tenant)
└─ Usado por: POST /superadmin/invoices (superadmin)
```

**Logs Diferenciados:**
- Tenant: `[TENANT-SELF-SERVICE]`
- SuperAdmin: `[SUPERADMIN]`

### Visibilidade no SuperAdmin

**TenantDetails.tsx** exibe histórico de subscriptions:
```
Subscription History
┌────────────┬─────────────┬────────────────────────┐
│ Plano      │ Período     │ Origem                 │
├────────────┼─────────────┼────────────────────────┤
│ Enterprise │ Atual       │ SuperAdmin (downgrade) │
│ Profissional│ Jan-Mar 25 │ Self-Service (upgrade) │
│ Básico     │ Trial       │ Cadastro inicial       │
└────────────┴─────────────┴────────────────────────┘
```

**Metadata em SystemAlert:**
```json
{
  "source": "TENANT_SELF_SERVICE" | "SUPERADMIN",
  "userId": "uuid do usuário que fez a mudança"
}
```

---

## 🧪 Testes Recomendados

### Testes de Integração (Backend)

**Cenário 1: Upgrade Válido**
```typescript
it('deve permitir upgrade de Básico para Profissional', async () => {
  // Given: Tenant com plano Básico
  // When: POST /admin/subscription/upgrade { newPlanId: profissionalId }
  // Then:
  //   - Status 200
  //   - Subscription criada com planId = profissionalId
  //   - Fatura gerada com amount = 299.90
  //   - SystemAlert criado
})
```

**Cenário 2: Downgrade Bloqueado**
```typescript
it('deve bloquear downgrade de Profissional para Básico', async () => {
  // Given: Tenant com plano Profissional
  // When: POST /admin/subscription/upgrade { newPlanId: basicoId }
  // Then:
  //   - Status 400
  //   - Message: "Downgrade não permitido"
})
```

**Cenário 3: Acesso Restrito a Faturas**
```typescript
it('não deve permitir acesso a fatura de outro tenant', async () => {
  // Given: Fatura do Tenant A
  // When: Usuário do Tenant B tenta GET /admin/invoices/:id
  // Then:
  //   - Status 403
  //   - Message: "Você não tem permissão..."
})
```

### Testes E2E (Frontend)

**Cenário 1: Fluxo de Upgrade Completo**
```typescript
describe('Billing - Upgrade de Plano', () => {
  it('deve completar upgrade e gerar fatura', async () => {
    // 1. Login como ADMIN
    // 2. Navegar para /dashboard/settings/billing
    // 3. Clicar tab "Planos Disponíveis"
    // 4. Clicar "Fazer Upgrade" no Profissional
    // 5. Aceitar contrato
    // 6. Confirmar upgrade
    // 7. Verificar toast de sucesso
    // 8. Verificar redirecionamento para tab "Faturas"
    // 9. Verificar nova fatura listada
  })
})
```

---

## 📝 Melhorias Futuras

### Fase 2: Dialog de Upgrade Completo

**UpgradeConfirmationDialog.tsx**
- Comparação lado a lado (atual vs target)
- Cálculo de prorrateio (opcional)
- Preview do valor a cobrar
- Checkbox obrigatório "Li e aceito o contrato"
- Integração com `ContractAcceptanceDialog`

### Fase 3: Analytics de Uso

**UsageDashboard.tsx**
- Gráfico de uso de residentes/usuários ao longo do tempo
- Projeção: "Se mantiver esse ritmo, atingirá o limite em X dias"
- Recomendação inteligente: "Recomendamos upgrade para Profissional"

### Fase 4: Prorrateio (Prorating)

**Cálculo proporcional:**
```typescript
const daysRemaining = subscription.currentPeriodEnd - today
const daysTotal = subscription.currentPeriodEnd - subscription.currentPeriodStart
const proratedCredit = (currentPrice / daysTotal) * daysRemaining
const amountToPay = newPrice - proratedCredit
```

### Fase 5: Notificações Proativas

**Email Alerts:**
- 7 dias antes do fim do trial: "Seu trial termina em 7 dias"
- Ao atingir 80% do limite: "Você está próximo do limite"
- Fatura vencida: "Sua fatura venceu há X dias"

---

## 📚 Recursos Relacionados

**Documentação:**
- [Portal SuperAdmin](./portal-superadmin.md) - Gestão global de planos
- [Multi-tenancy](../architecture/multi-tenancy.md) - Arquitetura de tenants
- [Permissions](./permissions.md) - Sistema de permissões

**Código-Fonte:**
- Backend: `apps/backend/src/admin/admin.controller.ts`
- Frontend: `apps/frontend/src/pages/settings/BillingPage.tsx`
- Hooks: `apps/frontend/src/hooks/useBilling.ts`

**APIs Externas:**
- [Asaas API](https://docs.asaas.com/) - Gateway de pagamentos

---

## 🐛 Troubleshooting

### Erro: "Nenhuma subscription ativa encontrada"

**Causa:** Tenant não possui subscription com status 'active' ou 'trialing'.

**Solução:**
```sql
-- Verificar subscription do tenant
SELECT id, status, planId FROM subscriptions WHERE tenantId = 'xxx';

-- SuperAdmin deve criar subscription manualmente via portal
```

### Erro: "Downgrade não permitido"

**Causa:** Tentativa de fazer upgrade para um plano menor.

**Solução:**
- Se realmente precisa de downgrade, contatar SuperAdmin
- SuperAdmin pode fazer via `/superadmin/tenants/:id/change-plan`

### Erro: "ForbiddenException ao acessar fatura"

**Causa:** Tentativa de acessar fatura de outro tenant.

**Solução:**
- Verificar autenticação (token JWT)
- Verificar tenantId do usuário logado
- Endpoint `/admin/invoices` só retorna faturas do próprio tenant

---

## ✅ Checklist de Deploy

**Backend:**
- [ ] Endpoints testados via Postman/Insomnia
- [ ] Guards de permissão funcionando
- [ ] Logs de auditoria implementados
- [ ] Validações de downgrade ativas
- [ ] SystemAlerts sendo criados

**Frontend:**
- [ ] Todas as tabs navegáveis
- [ ] Hooks de billing integrados
- [ ] Loading states implementados
- [ ] Error handling com toasts
- [ ] Rota `/dashboard/settings/billing` configurada

**Integração:**
- [ ] Asaas webhook configurado
- [ ] Emails de notificação configurados
- [ ] Logs sendo salvos corretamente

---

**Última atualização:** 2025-01-03
**Versão da documentação:** 1.0
**Mantido por:** Rafa Labs - Engineering Team
