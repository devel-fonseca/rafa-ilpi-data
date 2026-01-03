# Portal SuperAdmin

**Status:** ✅ Implementado
**Última atualização:** 20/12/2024
**Responsável:** Rafa Labs

---

## Visão Geral

O Portal SuperAdmin é uma interface administrativa completa para gestão de tenants (clientes), assinaturas, planos, faturas e monitoramento de métricas financeiras da plataforma SaaS multi-tenant Rafa ILPI.

**Principais capacidades:**
- Gerenciamento de tenants (criar, editar, suspender, deletar)
- Gestão de planos e assinaturas
- Controle de faturas e integração com Asaas
- Sistema de alertas automáticos
- Analytics financeiros (MRR, LTV, churn, receita)
- Aplicação de descontos e preços customizados

---

## Arquitetura

### Stack Tecnológico

**Frontend:**
- React + TypeScript
- TanStack Query (React Query) para data fetching
- React Router para navegação
- shadcn/ui + Tailwind CSS para componentes
- Recharts para visualizações de dados

**Backend:**
- NestJS + TypeScript
- Prisma ORM
- PostgreSQL
- Jobs agendados (@nestjs/schedule)
- Integração com Asaas (gateway de pagamento)

**Design System:**
- **Brand Kit Rafa Labs:**
  - Azul Marinho: `#0f172a` (textos principais)
  - Verde: `#059669` (ações positivas, destaque)
  - Ciano: `#06b6d4` (informações, links)
  - Slate: Tons de cinza para backgrounds e textos secundários

### Estrutura de Diretórios

```
apps/backend/src/superadmin/
├── dto/                          # Data Transfer Objects
│   ├── apply-custom-price.dto.ts
│   ├── apply-discount.dto.ts
│   ├── create-invoice.dto.ts
│   ├── create-tenant.dto.ts
│   ├── update-plan.dto.ts
│   └── update-tenant.dto.ts
├── jobs/                         # Cron jobs
│   ├── payment-alerts.job.ts     # Monitora faturas vencidas
│   └── subscription-alerts.job.ts # Monitora assinaturas
├── services/                     # Serviços de negócio
│   ├── alerts.service.ts         # Gerenciamento de alertas
│   ├── plans-admin.service.ts    # CRUD de planos
│   ├── subscription-admin.service.ts
│   └── tenant-admin.service.ts
└── superadmin.controller.ts      # Endpoints REST

apps/frontend/src/
├── api/
│   ├── alerts.api.ts
│   ├── invoices.api.ts
│   ├── plans.api.ts
│   └── superadmin.api.ts
├── components/superadmin/
│   ├── ApplyDiscountDialog.tsx
│   ├── ChangePlanDialog.tsx
│   ├── CreateInvoiceDialog.tsx
│   ├── DeleteTenantDialog.tsx
│   ├── EditTenantDialog.tsx
│   ├── MetricCard.tsx
│   ├── RevenueChart.tsx
│   └── SuspendTenantDialog.tsx
├── hooks/
│   ├── useAlerts.ts
│   ├── useInvoices.ts
│   ├── usePlans.ts
│   └── useSuperAdmin.ts
├── layouts/
│   └── SuperAdminLayout.tsx
└── pages/superadmin/
    ├── AlertCenter.tsx
    ├── Dashboard.tsx
    ├── FinancialAnalytics.tsx
    ├── InvoiceDetails.tsx
    ├── InvoicesList.tsx
    ├── PlansList.tsx
    ├── TenantDetails.tsx
    └── TenantsList.tsx
```

---

## Funcionalidades

### 1. Dashboard

**Rota:** `/superadmin`

**Métricas exibidas:**
- **Total de Tenants** (ativos/inativos/trial)
- **MRR (Monthly Recurring Revenue)** - Receita mensal recorrente
- **LTV (Lifetime Value)** - Valor médio do tempo de vida do cliente
- **Churn Rate** - Taxa de cancelamento
- **Gráfico de evolução de MRR** (últimos 6 meses)

**Backend:**
```typescript
// GET /superadmin/metrics
{
  totalTenants: number
  activeTenants: number
  inactiveTenants: number
  trialTenants: number
  mrr: number
  ltv: number
  churn: number
}

// GET /superadmin/mrr-evolution
{
  evolution: Array<{ month: string, mrr: number }>
}
```

**Cálculos:**
- **MRR:** Soma de todas assinaturas ativas * preço mensal
- **LTV:** `MRR médio / (Churn Rate / 100)`
- **Churn Rate:** `(Cancelamentos no período / Total de clientes início) * 100`

---

### 2. Gerenciamento de Tenants

#### 2.1 Lista de Tenants

**Rota:** `/superadmin/tenants`

**Funcionalidades:**
- Busca por nome ou CNPJ
- Filtro por status (ACTIVE, SUSPENDED, TRIAL, CANCELLED)
- Ordenação por data de criação, nome, plano
- Ações rápidas: Editar, Suspender, Deletar

**Backend:**
```typescript
// GET /superadmin/tenants?search=&status=&sort=
{
  tenants: Tenant[]
  total: number
}
```

#### 2.2 Detalhes do Tenant

**Rota:** `/superadmin/tenants/:id`

**Informações exibidas:**
- Dados cadastrais (nome, email, CNPJ, telefone, endereço)
- Estatísticas (nº usuários, residentes)
- Plano atual e histórico de assinaturas
- Lista de faturas
- Botões de ação:
  - **Editar Tenant** - Atualizar dados cadastrais
  - **Mudar Plano** - Trocar assinatura de plano
  - **Suspender** - Bloquear acesso temporariamente
  - **Reativar** - Restaurar acesso
  - **Deletar** - Remover permanentemente (confirma antes)

**Backend:**
```typescript
// GET /superadmin/tenants/:id
// GET /superadmin/tenants/:id/stats
// GET /superadmin/tenants/:id/subscriptions/history
// GET /superadmin/invoices?tenantId=:id
```

#### 2.3 Ações sobre Tenants

**Criar Tenant:**
```typescript
// POST /superadmin/tenants
{
  name: string
  email: string
  cnpj?: string
  phone?: string
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressZip?: string
}
```

**Editar Tenant:**
```typescript
// PATCH /superadmin/tenants/:id
{
  name?: string
  email?: string
  cnpj?: string
  phone?: string
  // ... outros campos
}
```

**Suspender Tenant:**
```typescript
// POST /superadmin/tenants/:id/suspend
{
  reason: string // Motivo da suspensão
}
```

**Reativar Tenant:**
```typescript
// POST /superadmin/tenants/:id/reactivate
```

**Deletar Tenant:**
```typescript
// DELETE /superadmin/tenants/:id
```

---

### 3. Gerenciamento de Planos

**Rota:** `/superadmin/plans`

**Campos de um Plano:**
```typescript
interface Plan {
  id: string
  name: string            // Identificador técnico (ex: "plan_starter")
  displayName: string     // Nome de exibição (ex: "Starter")
  description: string     // Descrição do plano
  price: number          // Preço mensal em R$
  maxResidents: number   // Limite de residentes
  maxUsers: number       // Limite de usuários
  features: string[]     // Array de features (ex: ["Prontuários", "Medicações"])
  isActive: boolean      // Se está disponível para venda
  isDefault: boolean     // Plano padrão para novos tenants
}
```

**Operações:**

**Criar Plano:**
```typescript
// POST /superadmin/plans
{
  name: string
  displayName: string
  description: string
  price: number
  maxResidents: number
  maxUsers: number
  features: string[]
  isActive: boolean
  isDefault: boolean
}
```

**Editar Plano:**
```typescript
// PATCH /superadmin/plans/:id
{
  displayName?: string
  description?: string
  price?: number
  maxResidents?: number
  maxUsers?: number
  features?: string[]
  isActive?: boolean
  isDefault?: boolean
}
```

**Deletar Plano:**
```typescript
// DELETE /superadmin/plans/:id
// Só permite se não houver assinaturas ativas neste plano
```

**Mudar Plano de um Tenant:**
```typescript
// POST /superadmin/tenants/:tenantId/change-plan
{
  newPlanId: string
  reason?: string  // Motivo da mudança
}
```

**Aplicar Desconto:**
```typescript
// POST /superadmin/tenants/:tenantId/subscriptions/apply-discount
{
  discountPercentage: number  // 0-100
  reason: string              // Justificativa do desconto
}
```

**Aplicar Preço Customizado:**
```typescript
// POST /superadmin/tenants/:tenantId/subscriptions/custom-price
{
  customPrice: number
  reason: string
}
```

---

### 4. Gerenciamento de Faturas

#### 4.1 Lista de Faturas

**Rota:** `/superadmin/invoices`

**Filtros disponíveis:**
- Status: DRAFT, OPEN, PAID, VOID, UNCOLLECTIBLE
- Tenant (busca por nome)
- Número da fatura

**Informações exibidas:**
- Número da fatura
- Tenant
- Valor
- Data de vencimento
- Status (com badge colorido)
- Badge "Vencida" se status=OPEN e vencimento < hoje

**Backend:**
```typescript
// GET /superadmin/invoices?status=&search=&tenantId=
{
  invoices: Invoice[]
  total: number
}
```

#### 4.2 Detalhes da Fatura

**Rota:** `/superadmin/invoices/:id`

**Informações:**
- Número da fatura e status
- Valor, vencimento, método de pagamento
- Dados do tenant (com link para detalhes)
- Informações da assinatura e plano
- Descrição (se houver)
- Histórico (data criação, última atualização)

**Ações disponíveis:**
- **Sincronizar** (status=OPEN) - Busca status atualizado no Asaas
- **Cancelar** (status=OPEN ou DRAFT) - Cancela a fatura
- **Ver no Asaas** - Link externo para painel do Asaas

**Backend:**
```typescript
// GET /superadmin/invoices/:id
// POST /superadmin/invoices/:id/sync
// POST /superadmin/invoices/:id/cancel
```

#### 4.3 Criar Fatura Manual

**Componente:** `CreateInvoiceDialog`

```typescript
// POST /superadmin/invoices
{
  tenantId: string
  subscriptionId: string
  amount: number
  dueDate: string          // ISO date
  description?: string
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'
}
```

**Validações:**
- Tenant deve existir
- Subscription deve estar ativa
- Amount > 0
- dueDate deve ser futuro

---

### 5. Sistema de Alertas

**Rota:** `/superadmin/alerts`

**Tipos de Alertas:**

| Tipo | Severidade | Descrição |
|------|-----------|-----------|
| `PAYMENT_OVERDUE` | `high` | Fatura vencida há X dias |
| `PAYMENT_DUE_SOON` | `medium` | Fatura vence em X dias |
| `SUBSCRIPTION_EXPIRING` | `medium` | Assinatura expira em X dias |
| `TRIAL_ENDING` | `low` | Trial acaba em X dias |
| `USAGE_LIMIT_EXCEEDED` | `high` | Tenant ultrapassou limites do plano |

**Estrutura de um Alerta:**
```typescript
interface Alert {
  id: string
  type: AlertType
  severity: 'low' | 'medium' | 'high'
  title: string
  message: string
  tenantId?: string
  tenant?: Tenant
  read: boolean
  createdAt: Date
}
```

**Jobs Automáticos:**

**1. PaymentAlertsJob** - Roda diariamente às 9h
```typescript
// Verifica:
// - Faturas vencidas (status=OPEN e dueDate < hoje)
// - Faturas vencendo em 3 dias
```

**2. SubscriptionAlertsJob** - Roda diariamente às 9h
```typescript
// Verifica:
// - Assinaturas expirando em 7 dias
// - Trials acabando em 3 dias
// - Tenants que ultrapassaram limites do plano (users, residents)
```

**Operações:**

**Listar Alertas:**
```typescript
// GET /superadmin/alerts?severity=&type=&tenantId=&read=
{
  alerts: Alert[]
  total: number
}
```

**Marcar como Lido:**
```typescript
// PATCH /superadmin/alerts/:id/read
```

**Marcar como Não Lido:**
```typescript
// PATCH /superadmin/alerts/:id/unread
```

**Deletar Alerta:**
```typescript
// DELETE /superadmin/alerts/:id
```

---

### 6. Analytics Financeiros

**Rota:** `/superadmin/analytics`

**Métricas Principais:**

**1. Receita Total**
- Soma de todas as faturas pagas
- Badge: Verde (`border-l-[#059669]`)

**2. Receita Pendente**
- Soma de faturas abertas (status=OPEN)
- Badge: Amarelo (`border-l-yellow-500`)

**3. Taxa de Conversão**
- `(Faturas pagas / Total de faturas) * 100`
- Badge: Azul (`border-l-blue-500`)

**4. Faturas Vencidas**
- Quantidade de faturas com status=OPEN e vencimento passado
- Badge: Vermelho (`border-l-red-500`)

**MRR Breakdown (por método de pagamento):**
```typescript
{
  total: number  // MRR total
  byMethod: Array<{
    billingType: string
    mrr: number
    percentage: number
  }>
}
```

**Performance por Método de Pagamento:**
- Melhor método (maior taxa de conversão)
- Comparativo de todos métodos (sorted by conversion rate)

**Backend:**
```typescript
// GET /superadmin/analytics/financial-metrics
{
  overview: {
    totalInvoices: number
    paidInvoices: number
    pendingInvoices: number
    overdueInvoices: number
    totalRevenue: number
    pendingRevenue: number
  }
  byPaymentMethod: Array<{
    billingType: string
    totalInvoices: number
    paidInvoices: number
    totalRevenue: number
    conversionRate: number
  }>
  topPerformingMethod: {
    billingType: string
    conversionRate: number
  }
}

// GET /superadmin/analytics/mrr-breakdown
{
  total: number
  byMethod: Array<{
    billingType: string
    mrr: number
    percentage: number
  }>
}
```

---

## Integrações

### Asaas (Gateway de Pagamento)

**Funcionalidades integradas:**

1. **Criação de Faturas**
   - Ao criar fatura manual, envia para Asaas
   - Retorna `paymentUrl` para o tenant pagar

2. **Sincronização de Status**
   - Botão "Sincronizar" consulta API do Asaas
   - Atualiza status local (OPEN → PAID)

3. **Webhooks (Recomendado - não implementado ainda)**
   - Asaas notifica automaticamente quando fatura é paga
   - Backend atualiza status sem necessidade de sync manual

**Configuração necessária:**
```env
# apps/backend/.env
ASAAS_API_KEY=your_api_key_here
ASAAS_API_URL=https://sandbox.asaas.com/api/v3  # ou production
```

**Endpoints Asaas utilizados:**
- `POST /payments` - Criar cobrança
- `GET /payments/:id` - Consultar status
- `DELETE /payments/:id` - Cancelar cobrança

---

## Segurança e Permissões

### Controle de Acesso

**Apenas usuários com role `SUPERADMIN` podem acessar o portal.**

**Implementação:**

**Frontend:**
```tsx
// routes/index.tsx
<ProtectedRoute requiredRole="SUPERADMIN">
  <SuperAdminLayout />
</ProtectedRoute>
```

**Backend:**
```typescript
// Decorator customizado
@Roles('SUPERADMIN')
export class SuperadminController {
  // ...
}

// Guard verifica JWT e role
@UseGuards(JwtAuthGuard, RolesGuard)
```

**Como criar um SuperAdmin:**

```sql
-- Diretamente no banco (uso único, bootstrap)
UPDATE "User"
SET role = 'SUPERADMIN'
WHERE email = 'admin@rafalabs.com';
```

---

## Boas Práticas

### Frontend

**1. Data Fetching com TanStack Query:**
```typescript
// Sempre use hooks customizados
const { data: tenants, isLoading } = useTenants()

// Configurar staleTime para evitar fetches desnecessários
queryClient.setQueryData(['tenants'], data, {
  staleTime: 1000 * 60 * 5 // 5 minutos
})
```

**2. Feedback de Ações:**
```typescript
// Sempre mostre toast após mutations
toast({
  title: '✓ Tenant criado',
  description: `"${tenant.name}" foi adicionado com sucesso.`,
})
```

**3. Confirmações de Ações Destrutivas:**
```typescript
// Use confirm() nativo para ações críticas
if (!confirm(`Confirma a exclusão de "${tenant.name}"?`)) return
```

**4. Brand Kit Consistency:**
```tsx
// Use classes padronizadas
<Card className="bg-white border-l-4 border-l-[#059669] border-slate-200">
  <CardTitle className="text-slate-900">Título</CardTitle>
  <p className="text-slate-600">Texto secundário</p>
</Card>
```

### Backend

**1. Validação de DTOs:**
```typescript
export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  cnpj?: string
}
```

**2. Tratamento de Erros:**
```typescript
try {
  await this.tenantsService.delete(id)
} catch (error) {
  throw new BadRequestException('Não é possível deletar tenant com assinaturas ativas')
}
```

**3. Logs de Auditoria:**
```typescript
// Registrar ações críticas
this.logger.log(`[SUPERADMIN] Tenant ${id} suspenso por ${adminEmail}. Motivo: ${reason}`)
```

---

## Troubleshooting

### Problema: 404 ao acessar `/superadmin`

**Causa:** Usuário não tem role `SUPERADMIN`

**Solução:**
```sql
UPDATE "User" SET role = 'SUPERADMIN' WHERE email = 'seu-email@dominio.com';
```

### Problema: Faturas não sincronizam com Asaas

**Causa:** Credenciais do Asaas incorretas ou ausentes

**Verificar:**
1. `.env` tem `ASAAS_API_KEY` preenchida
2. Testar endpoint do Asaas manualmente:
```bash
curl -H "access_token: $ASAAS_API_KEY" \
  https://sandbox.asaas.com/api/v3/payments
```

### Problema: Alertas não aparecem

**Causa:** Jobs agendados não estão rodando

**Verificar:**
```typescript
// Logs do NestJS devem mostrar:
// [Nest] INFO [PaymentAlertsJob] Verificando faturas vencidas...
// [Nest] INFO [SubscriptionAlertsJob] Verificando assinaturas expirando...
```

**Forçar execução manual (dev):**
```typescript
// No controller, adicionar endpoint temporário:
@Get('run-jobs')
async runJobs() {
  await this.paymentAlertsJob.handleCron()
  await this.subscriptionAlertsJob.handleCron()
  return 'Jobs executados'
}
```

---

## Roadmap

### Implementações Futuras

**1. Customização de Assinaturas (em análise)**
- [ ] Edit Subscription Dialog
- [ ] Override de limites por tenant (maxUsers, maxResidents)
- [ ] Aplicar desconto personalizado
- [ ] Preço customizado por tenant

**2. Webhooks do Asaas**
- [ ] Endpoint `/webhooks/asaas/payment`
- [ ] Atualização automática de status de faturas
- [ ] Notificações em tempo real

**3. Relatórios Avançados**
- [ ] Exportar CSV de faturas
- [ ] Relatório de churn detalhado
- [ ] Forecast de receita (projeção)

**4. Automações**
- [ ] Auto-suspensão de tenants com faturas vencidas > 30 dias
- [ ] Email automático para tenants em trial próximo do fim
- [ ] Downgrade automático se limites ultrapassados

**5. Melhorias de UX**
- [ ] Dark mode toggle
- [ ] Filtros avançados com multiple selection
- [ ] Paginação server-side para grandes volumes

---

## 🔗 Integração com Tenant Admin Billing

### Separação de Responsabilidades

O Portal SuperAdmin convive harmoniosamente com o sistema de **Tenant Admin Billing** (self-service de planos), mantendo separação clara de responsabilidades:

**SUPERADMIN (/superadmin/*):**
- **Acesso:** Apenas usuários com role `SUPERADMIN`
- **Escopo:** Todos os tenants (visão global)
- **Funcionalidades:**
  - ✅ CRUD completo de planos
  - ✅ Upgrade/Downgrade de qualquer tenant
  - ✅ Aplicar descontos e preços customizados
  - ✅ Cancelar/Reativar subscriptions
  - ✅ Ver todas as faturas da plataforma
  - ✅ Analytics financeiros globais
  - ✅ Gestão de contratos e templates de email

**TENANT ADMIN (/admin/*):**
- **Acesso:** Usuários com role `ADMIN` ou `MANAGER` do próprio tenant
- **Escopo:** Apenas dados do próprio tenant
- **Funcionalidades:**
  - ✅ Ver plano atual e planos disponíveis para UPGRADE
  - ✅ Solicitar upgrade de plano (self-service)
  - ✅ Ver histórico de faturas do próprio tenant
  - ✅ Atualizar método de pagamento preferido
  - ✅ Cancelar trial antes da primeira cobrança
  - ❌ **NÃO** pode aplicar descontos (reservado ao SuperAdmin)
  - ❌ **NÃO** pode fazer downgrade (reservado ao SuperAdmin)
  - ❌ **NÃO** pode ver faturas de outros tenants

### Pontos de Integração

#### 1. Services Compartilhados

Os serviços do SuperAdmin são **reutilizados** pelo Tenant Admin com validações específicas:

```typescript
// SubscriptionAdminService.changePlan()
// Usado em dois contextos:

// Contexto 1: Tenant Admin (self-service upgrade)
POST /admin/subscription/upgrade
├─ Validações: Apenas upgrades permitidos
├─ Source: TENANT_SELF_SERVICE
└─ Chama: SubscriptionAdminService.changePlan()

// Contexto 2: SuperAdmin (gestão manual)
POST /superadmin/tenants/:id/change-plan
├─ Validações: Upgrades ou downgrades permitidos
├─ Source: SUPERADMIN
└─ Chama: SubscriptionAdminService.changePlan()
```

#### 2. Logs de Auditoria Diferenciados

Para rastreabilidade, logs seguem padrões distintos:

**Tenant Admin (Self-Service):**
```typescript
logger.log(
  `[TENANT-SELF-SERVICE] Upgrade solicitado: ${tenantId} → ${newPlanId} (user: ${user.email})`
)
```

**SuperAdmin (Intervenção Manual):**
```typescript
logger.log(
  `[SUPERADMIN] Plano alterado: tenant=${tenantId} newPlan=${planId} by=${adminEmail}`
)
```

#### 3. Visibilidade no Portal SuperAdmin

**TenantDetails.tsx** exibe histórico completo de subscriptions com origem da mudança:

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

**Metadata em SystemAlerts:**
```json
{
  "source": "TENANT_SELF_SERVICE" | "SUPERADMIN",
  "userId": "uuid do usuário que executou a mudança",
  "reason": "Motivo da mudança (se fornecido)"
}
```

### Tabela Comparativa de Funcionalidades

| Funcionalidade                  | SuperAdmin | Tenant Admin |
|--------------------------------|------------|--------------|
| Ver todos os planos            | ✅         | ✅ (apenas upgrades) |
| Criar/Editar planos            | ✅         | ❌           |
| Upgrade de plano               | ✅         | ✅ (self-service) |
| Downgrade de plano             | ✅         | ❌           |
| Aplicar descontos              | ✅         | ❌           |
| Ver todas as faturas           | ✅         | ❌ (apenas próprias) |
| Gerar faturas manuais          | ✅         | ❌           |
| Cancelar trial                 | ✅         | ✅ (apenas próprio) |
| Cancelar subscription ativa    | ✅         | ❌           |
| Reativar subscription          | ✅         | ❌           |
| Analytics financeiros          | ✅         | ❌           |
| Gestão de contratos            | ✅         | ✅ (aceite apenas) |

### Casos de Uso de Integração

#### Caso 1: Upgrade Solicitado pelo Tenant

**Fluxo:**
1. Tenant Admin acessa `/dashboard/settings/billing`
2. Seleciona plano Profissional e confirma upgrade
3. `POST /admin/subscription/upgrade` é chamado
4. Backend:
   - Valida que é upgrade válido
   - Chama `SubscriptionAdminService.changePlan()`
   - Gera fatura via `InvoiceService.generateInvoice()`
   - Cria `SystemAlert` com `source: 'TENANT_SELF_SERVICE'`
5. SuperAdmin visualiza em `/superadmin/tenants/:id`:
   - Nova subscription com badge "Self-Service"
   - Fatura gerada automaticamente
   - Alert no histórico: "Upgrade solicitado via self-service"

#### Caso 2: Desconto Aplicado pelo SuperAdmin

**Fluxo:**
1. SuperAdmin acessa `/superadmin/subscriptions/:id`
2. Aplica desconto de 20% com razão "Cliente fidelidade"
3. `POST /superadmin/subscriptions/:id/apply-discount` é chamado
4. Backend atualiza `subscription.discountPercent` e `subscription.discountReason`
5. Tenant Admin acessa `/dashboard/settings/billing`:
   - **MELHORIA IMPLEMENTADA:** Vê seção "Desconto Aplicado"
   - Exibe: "Desconto de 20% - Cliente fidelidade"
   - Próxima fatura reflete o desconto

#### Caso 3: Downgrade Necessário (Apenas SuperAdmin)

**Fluxo:**
1. Tenant contata suporte solicitando downgrade
2. SuperAdmin avalia e aprova
3. SuperAdmin acessa `/superadmin/tenants/:id`
4. Seleciona plano menor e confirma mudança
5. `POST /superadmin/tenants/:id/change-plan` é chamado
6. Backend:
   - Permite downgrade (sem validação de bloqueio)
   - Chama `SubscriptionAdminService.changePlan()`
   - Cria `SystemAlert` com `source: 'SUPERADMIN'`
7. Tenant Admin visualiza mudança na próxima renovação

### Garantias de Isolamento

**Segurança de Dados:**
```typescript
// Tenant Admin NUNCA acessa dados de outros tenants
const invoices = await this.prisma.invoice.findMany({
  where: {
    tenantId: user.tenantId, // ← Scoped ao tenant do usuário
  }
})

// Validação adicional em endpoints de detalhes
if (invoice.tenantId !== user.tenantId) {
  throw new ForbiddenException('Acesso negado')
}
```

**Separação de Rotas:**
- `/admin/*` → Controllers com guards `@Roles('ADMIN', 'MANAGER')`
- `/superadmin/*` → Controllers com guards `@Roles('SUPERADMIN')`
- Zero conflito de rotas (prefixos diferentes)

### Documentação Relacionada

Para entender o sistema completo de billing do tenant, consulte:
- **[Tenant Billing](./tenant-billing.md)** - Documentação completa do self-service
- **[Multi-tenancy](../architecture/multi-tenancy.md)** - Arquitetura de isolamento

---

## Referências

- [Documentação Multi-tenancy](./multi-tenancy.md)
- [Documentação Tenant Billing](./tenant-billing.md)
- [Schema do Banco de Dados](../architecture/database-schema.md)
- [Asaas API Docs](https://docs.asaas.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [NestJS Schedule](https://docs.nestjs.com/techniques/task-scheduling)
