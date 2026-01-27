# Integração Asaas - Sistema de Pagamentos Recorrentes

**Versão:** 1.0
**Data:** 2026-01-27
**Autor:** Rafa Labs Desenvolvimento e Tecnologia

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Fluxo de Conversão Trial → Active](#fluxo-de-conversão-trial--active)
4. [Webhooks](#webhooks)
5. [Sincronização Bidirecional](#sincronização-bidirecional)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Configuração](#configuração)
9. [Testes e Debugging](#testes-e-debugging)
10. [Troubleshooting](#troubleshooting)
11. [Roadmap](#roadmap)

---

## 🎯 Visão Geral

A integração com o **Asaas** (gateway de pagamento brasileiro) permite que o sistema Rafa ILPI Data gerencie subscriptions recorrentes de forma automatizada, eliminando a necessidade de geração manual de invoices.

### Objetivos

- ✅ **Automatizar conversão** de trials expirados em subscriptions pagas
- ✅ **Gerar cobranças recorrentes** automaticamente via Asaas
- ✅ **Sincronizar status** de pagamentos em tempo real via webhooks
- ✅ **Garantir resiliência** com sincronização bidirecional agendada
- ✅ **Auditoria completa** de todos os eventos de pagamento

### Tecnologias

- **Backend:** NestJS + Prisma ORM
- **Gateway:** Asaas API v3
- **Scheduler:** `@nestjs/schedule` (CRON jobs)
- **Webhook:** Express HTTP endpoint
- **Database:** PostgreSQL (multi-tenant)

---

## 🏗️ Arquitetura

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    ASAAS GATEWAY                                │
│  • Subscriptions API                                            │
│  • Payments API                                                 │
│  • Webhooks                                                     │
└────────────┬──────────────────────────────────┬─────────────────┘
             │                                  │
    ┌────────┴────────┐                ┌───────┴────────┐
    │  PUSH (Webhook) │                │  PULL (Polling)│
    │   Real-time     │                │   Every 6h     │
    └────────┬────────┘                └───────┬────────┘
             │                                  │
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              RAFA ILPI DATA - BACKEND                           │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐│
│  │ WebhooksController│  │  AsaasSyncJob    │  │SuperAdminUI  ││
│  │  /api/webhooks   │  │  (CRON 6h)       │  │ Manual Trigger││
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘│
│           │                     │                    │        │
│           └─────────────────────┼────────────────────┘        │
│                                 ▼                              │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              AsaasService (API Client)                   │ │
│  │  • createCustomer()                                      │ │
│  │  • createSubscription()                                  │ │
│  │  • getSubscription()                                     │ │
│  │  • getPayment()                                          │ │
│  │  • cancelSubscription()                                  │ │
│  └────────────────────┬─────────────────────────────────────┘ │
│                       ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              InvoiceService                              │ │
│  │  • createInvoiceFromAsaasPayment()                       │ │
│  │  • updateInvoiceStatus()                                 │ │
│  └────────────────────┬─────────────────────────────────────┘ │
│                       ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              PrismaService (Database)                    │ │
│  │  • Subscriptions                                         │ │
│  │  • Invoices                                              │ │
│  │  • WebhookEvents (Audit)                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes Principais

#### 1. **TrialToActiveConversionJob** (Fase 1)
- **Localização:** `apps/backend/src/superadmin/jobs/trial-to-active-conversion.job.ts`
- **Agendamento:** Diário às 02:00 BRT
- **Função:** Converte trials expirados em subscriptions ativas no Asaas

#### 2. **WebhooksController** (Fase 2)
- **Localização:** `apps/backend/src/payments/webhooks.controller.ts`
- **Endpoint:** `POST /api/webhooks/asaas`
- **Função:** Recebe eventos em tempo real do Asaas

#### 3. **AsaasSyncJob** (Fase 3)
- **Localização:** `apps/backend/src/payments/jobs/asaas-sync.job.ts`
- **Agendamento:** A cada 6 horas (00:00, 06:00, 12:00, 18:00 BRT)
- **Função:** Sincroniza status entre Asaas e banco local

#### 4. **AsaasService**
- **Localização:** `apps/backend/src/payments/services/asaas.service.ts`
- **Função:** Client HTTP para API do Asaas com retry e error handling

#### 5. **InvoiceService**
- **Localização:** `apps/backend/src/payments/services/invoice.service.ts`
- **Função:** Gerencia invoices locais sincronizados com Asaas

---

## 🔄 Fluxo de Conversão Trial → Active

### Diagrama de Sequência

```
┌──────────┐         ┌──────────────────┐      ┌─────────┐       ┌──────────┐
│ CRON Job │         │TrialConversionJob│      │  Asaas  │       │ Database │
└────┬─────┘         └────────┬─────────┘      └────┬────┘       └────┬─────┘
     │                        │                     │                 │
     │ 02:00 BRT              │                     │                 │
     ├───────────────────────>│                     │                 │
     │                        │                     │                 │
     │                        │ SELECT subscriptions WHERE           │
     │                        │  status=trialing AND trialEnd < NOW  │
     │                        ├─────────────────────────────────────>│
     │                        │                     │                 │
     │                        │<────────────────────────────────────┤
     │                        │  [trials_expirados]                  │
     │                        │                     │                 │
     │                        │ Para cada trial:    │                 │
     │                        │                     │                 │
     │                        │ 1. Buscar ou criar customer          │
     │                        ├────────────────────>│                 │
     │                        │ POST /customers     │                 │
     │                        │<───────────────────┤                 │
     │                        │ {customerId}        │                 │
     │                        │                     │                 │
     │                        │ 2. Criar subscription recorrente     │
     │                        ├────────────────────>│                 │
     │                        │ POST /subscriptions │                 │
     │                        │ {                   │                 │
     │                        │   customer,         │                 │
     │                        │   billingType,      │                 │
     │                        │   value,            │                 │
     │                        │   cycle: MONTHLY,   │                 │
     │                        │   nextDueDate: +7d  │ ← Timezone fix │
     │                        │ }                   │                 │
     │                        │<───────────────────┤                 │
     │                        │ {subscriptionId}    │                 │
     │                        │                     │                 │
     │                        │ ⚠️ IMPORTANTE: Asaas cria automaticamente
     │                        │    o primeiro payment aqui            │
     │                        │                     │                 │
     │                        │ 3. Atualizar subscription local      │
     │                        ├─────────────────────────────────────>│
     │                        │ UPDATE subscriptions SET             │
     │                        │   status='active',                   │
     │                        │   asaasSubscriptionId={id},          │
     │                        │   asaasCreatedAt=NOW()               │
     │                        │<────────────────────────────────────┤
     │                        │                     │                 │
     │                        │ 4. Aguardar webhook PAYMENT_CREATED  │
     │                        │    (invoice será criada via webhook) │
     │                        │                     │                 │
     │<──────────────────────┤                     │                 │
     │  Log: Converted X trials                    │                 │
```

### Código Exemplo

```typescript
// apps/backend/src/superadmin/jobs/trial-to-active-conversion.job.ts

@Cron('0 2 * * *', { timeZone: 'America/Sao_Paulo' })
async handleTrialConversion() {
  // 1. Buscar trials expirados
  const expiredTrials = await this.prisma.subscription.findMany({
    where: {
      status: 'trialing',
      trialEnd: { lt: new Date() },
    },
    include: { tenant: true, plan: true },
  })

  for (const trial of expiredTrials) {
    try {
      // 2. Criar ou buscar customer no Asaas
      let asaasCustomerId = trial.asaasCustomerId

      if (!asaasCustomerId) {
        const customer = await this.asaasService.createCustomer({
          name: trial.tenant.name,
          email: trial.tenant.email,
          cpfCnpj: trial.tenant.cnpj,
        })
        asaasCustomerId = customer.id
      }

      // 3. Criar subscription recorrente no Asaas
      const asaasSubscription = await this.asaasService.createSubscription({
        customerId: asaasCustomerId,
        billingType: 'BOLETO',
        value: trial.plan.price,
        cycle: 'MONTHLY',
        description: `Assinatura ${trial.plan.name} - ${trial.tenant.cnpj}`,
        nextDueDate: zonedTimeToUtc(
          addDays(new Date(), 7),
          'America/Sao_Paulo'
        ).toISOString().split('T')[0], // YYYY-MM-DD
      })

      // 4. Atualizar subscription local
      await this.prisma.subscription.update({
        where: { id: trial.id },
        data: {
          status: 'active',
          asaasSubscriptionId: asaasSubscription.id,
          asaasCustomerId,
          asaasCreatedAt: new Date(),
        },
      })

      // ⚠️ Invoice será criada via webhook PAYMENT_CREATED

    } catch (error) {
      this.logger.error(`Failed to convert trial ${trial.id}:`, error)

      await this.prisma.subscription.update({
        where: { id: trial.id },
        data: { asaasCreationError: error.message },
      })
    }
  }
}
```

### Pontos Importantes

1. **Timezone Fix:** Sempre usar `America/Sao_Paulo` para `nextDueDate` (evita diferenças de 1 dia)
2. **Customer Reuso:** Verificar se customer já existe antes de criar
3. **Primeira Cobrança:** Asaas cria automaticamente o primeiro payment
4. **Invoice Local:** Criada via webhook `PAYMENT_CREATED`, não manualmente
5. **Error Handling:** Salvar erro em `asaasCreationError` para retry manual

---

## 🔔 Webhooks

### Configuração no Asaas

1. Acessar Painel Asaas → Configurações → Webhooks
2. URL de Callback: `https://seu-dominio.com/api/webhooks/asaas`
3. Eventos configurados:
   - ✅ `PAYMENT_CREATED`
   - ✅ `PAYMENT_RECEIVED`
   - ✅ `PAYMENT_CONFIRMED`
   - ✅ `PAYMENT_OVERDUE`
   - ✅ `SUBSCRIPTION_CREATED`
   - ✅ `SUBSCRIPTION_UPDATED`
   - ✅ `SUBSCRIPTION_INACTIVATED`

### Endpoint de Webhooks

**Rota:** `POST /api/webhooks/asaas`

**Controller:** `apps/backend/src/payments/webhooks.controller.ts`

```typescript
@Post('asaas')
async handleAsaasWebhook(@Body() webhook: AsaasWebhookDto) {
  // 1. Verificar idempotência
  const existingEvent = await this.prisma.webhookEvent.findUnique({
    where: {
      gateway_eventId: {
        gateway: PaymentGateway.ASAAS,
        eventId: webhook.id,
      },
    },
  })

  if (existingEvent) {
    this.logger.log(`⏭️  Event ${webhook.id} already processed`)
    return { status: 'already_processed', eventId: webhook.id }
  }

  // 2. Salvar evento para auditoria
  await this.prisma.webhookEvent.create({
    data: {
      gateway: PaymentGateway.ASAAS,
      eventType: webhook.event,
      eventId: webhook.id,
      payload: webhook as unknown as Prisma.JsonObject,
      processed: true,
    },
  })

  // 3. Processar evento
  await this.processWebhookEvent(webhook)

  return { status: 'processed', eventId: webhook.id }
}
```

### Eventos Suportados

#### PAYMENT_CREATED

**Quando ocorre:** Asaas cria uma nova cobrança (manual ou via subscription)

**Ação do sistema:**
1. Verifica se payment pertence a uma subscription local
2. Cria invoice local com dados do Asaas
3. Status inicial: `OPEN`

```typescript
private async handlePaymentCreated(webhook: AsaasWebhookDto) {
  const paymentData = webhook.payment

  if (paymentData.subscription) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { asaasSubscriptionId: paymentData.subscription },
      include: { tenant: true },
    })

    if (subscription) {
      const invoice = await this.invoiceService.createInvoiceFromAsaasPayment({
        tenantId: subscription.tenantId,
        subscriptionId: subscription.id,
        asaasPaymentData: paymentData,
      })

      this.logger.log(`✓ Invoice created: ${invoice.invoiceNumber}`)
    }
  }
}
```

#### PAYMENT_RECEIVED / PAYMENT_CONFIRMED

**Quando ocorre:** Pagamento foi recebido/confirmado no Asaas

**Ação do sistema:**
1. Busca invoice local pelo `asaasInvoiceId`
2. Atualiza status: `OPEN` → `PAID`
3. Registra `paidAt` e `paymentMethod`

```typescript
private async handlePaymentReceived(webhook: AsaasWebhookDto) {
  const paymentData = webhook.payment

  const invoice = await this.prisma.invoice.findUnique({
    where: { asaasInvoiceId: paymentData.id },
  })

  if (invoice && invoice.status === 'OPEN') {
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod: this.mapAsaasBillingType(paymentData.billingType),
      },
    })

    this.logger.log(`✓ Invoice ${invoice.invoiceNumber} marked as PAID`)
  }
}
```

#### PAYMENT_OVERDUE

**Quando ocorre:** Cobrança venceu sem pagamento

**Ação do sistema:**
1. Atualiza status: `OPEN` → `OVERDUE`
2. Pode disparar alertas de cobrança (futuro)

#### SUBSCRIPTION_CREATED / UPDATED / INACTIVATED

**Quando ocorre:** Subscription mudou no Asaas

**Ação do sistema:**
1. Atualiza `lastSyncedAt` da subscription local
2. Limpa `asaasSyncError` se houver

### Idempotência

**Problema:** Asaas pode reenviar webhooks duplicados

**Solução:** Tabela `webhook_events` com unique constraint:

```prisma
model WebhookEvent {
  id         String   @id @default(cuid())
  gateway    PaymentGateway
  eventType  String
  eventId    String   // ID do evento no gateway
  payload    Json
  processed  Boolean  @default(false)
  error      String?
  createdAt  DateTime @default(now())

  @@unique([gateway, eventId])
}
```

**Comportamento:**
- ✅ Primeiro webhook: Processado normalmente
- ⏭️ Webhooks duplicados: Retornam `already_processed` sem reprocessar

### Teste Manual de Webhook

```bash
# Criar payload de teste
cat > /tmp/test-webhook.json <<'EOF'
{
  "id": "evt_test_123",
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_gpvq5g12m4c0ov47",
    "customer": "cus_000007490772",
    "subscription": "sub_dggvdpjygt7en3o0",
    "value": 499.00,
    "status": "RECEIVED",
    "billingType": "BOLETO",
    "dueDate": "2026-02-03",
    "paymentDate": "2026-01-27"
  }
}
EOF

# Enviar webhook de teste
curl -X POST http://localhost:3000/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -d @/tmp/test-webhook.json
```

---

## 🔄 Sincronização Bidirecional

### Objetivo

Garantir consistência entre Asaas e banco local, recuperando eventos perdidos caso webhooks falhem.

### AsaasSyncJob

**Localização:** `apps/backend/src/payments/jobs/asaas-sync.job.ts`

**Agendamento:** A cada 6 horas (CRON: `0 0 */6 * * *`)

**Horários de execução:**
- 00:00 BRT
- 06:00 BRT
- 12:00 BRT
- 18:00 BRT

### Fluxo de Sincronização

```
┌─────────────────────────────────────────────────────────────┐
│              AsaasSyncJob.handleCron()                      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│ syncSubscriptions│    │ syncPendingPayments  │
└────────┬─────────┘    └──────────┬───────────┘
         │                         │
         ▼                         ▼
```

#### 1. Sync Subscriptions

**Objetivo:** Verificar se subscriptions ativas no sistema foram canceladas no Asaas

```typescript
private async syncSubscriptions() {
  // Buscar subscriptions ativas/trialing/past_due com asaasSubscriptionId
  const subscriptions = await this.prisma.subscription.findMany({
    where: {
      status: { in: ['active', 'trialing', 'past_due'] },
      asaasSubscriptionId: { not: null },
    },
  })

  for (const subscription of subscriptions) {
    try {
      // Consultar status atual no Asaas
      const asaasSubscription = await this.asaasService.getSubscription(
        subscription.asaasSubscriptionId
      )

      // Mapear status
      const statusMap = {
        ACTIVE: 'active',
        INACTIVE: 'canceled',
        EXPIRED: 'canceled',
      }

      const newStatus = statusMap[asaasSubscription.status]

      // Atualizar se mudou
      if (newStatus !== subscription.status) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: newStatus,
            lastSyncedAt: new Date(),
            asaasSyncError: null,
          },
        })

        this.logger.log(
          `✓ Subscription ${subscription.asaasSubscriptionId}: ${subscription.status} → ${newStatus}`
        )
      }
    } catch (error) {
      // Salvar erro para retry manual
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { asaasSyncError: error.message },
      })
    }
  }
}
```

#### 2. Sync Pending Payments

**Objetivo:** Verificar se invoices pendentes foram pagas no Asaas

**Fix Crítico:** Processa TODOS os tenants (não apenas 100 invoices totais)

```typescript
private async syncPendingPayments() {
  // 1. Agrupar por tenant
  const tenantsWithOpenInvoices = await this.prisma.invoice.groupBy({
    by: ['tenantId'],
    where: {
      status: 'OPEN',
      asaasInvoiceId: { not: null },
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // 90 dias
    },
  })

  this.logger.log(`📊 Encontrados ${tenantsWithOpenInvoices.length} tenants com invoices abertas`)

  // 2. Para cada tenant, processar até 50 invoices mais recentes
  for (const { tenantId } of tenantsWithOpenInvoices) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: 'OPEN',
        asaasInvoiceId: { not: null },
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' }, // Mais recentes primeiro
      take: 50, // Limite POR TENANT
    })

    for (const invoice of invoices) {
      try {
        // Consultar payment no Asaas
        const asaasPayment = await this.asaasService.getPayment(invoice.asaasInvoiceId)

        // Atualizar se foi pago
        if (asaasPayment.status === 'RECEIVED' || asaasPayment.status === 'CONFIRMED') {
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: {
              status: 'PAID',
              paidAt: asaasPayment.paymentDate
                ? new Date(asaasPayment.paymentDate)
                : new Date(),
            },
          })

          this.logger.log(`✓ Invoice ${invoice.asaasInvoiceId}: OPEN → PAID`)
        }
      } catch (error) {
        this.logger.error(`❌ Erro ao sincronizar payment ${invoice.asaasInvoiceId}:`, error.message)
      }
    }
  }
}
```

### Trigger Manual

**Endpoint:** `POST /superadmin/jobs/asaas-sync`

**UI:** Portal SuperAdmin → Configurações → Sincronização Asaas

**Uso:**
- Testes de integração
- Correção de falhas
- Situações emergenciais

```typescript
// apps/backend/src/superadmin/superadmin.controller.ts

@Post('jobs/asaas-sync')
async triggerAsaasSync() {
  try {
    await this.asaasSyncJob.runManualSync()
    return {
      success: true,
      message: 'Asaas sync job executado com sucesso',
    }
  } catch (error) {
    return {
      success: false,
      message: `Erro ao executar job: ${error.message}`,
    }
  }
}
```

---

## 💾 Database Schema

### Subscriptions

```prisma
model Subscription {
  id                    String               @id @default(cuid())
  tenantId              String
  planId                String
  status                SubscriptionStatus
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  trialStart            DateTime?
  trialEnd              DateTime?
  canceledAt            DateTime?

  // Asaas Integration Fields
  asaasSubscriptionId   String?              @unique @map("asaas_subscription_id")
  asaasCustomerId       String?              @map("asaas_customer_id")
  asaasCreatedAt        DateTime?            @map("asaas_created_at")
  asaasCreationError    String?              @db.Text @map("asaas_creation_error")
  lastSyncedAt          DateTime?            @map("last_synced_at")
  asaasSyncError        String?              @db.Text @map("asaas_sync_error")

  createdAt             DateTime             @default(now())
  updatedAt             DateTime             @updatedAt

  tenant                Tenant               @relation(fields: [tenantId], references: [id])
  plan                  Plan                 @relation(fields: [planId], references: [id])
  invoices              Invoice[]

  @@map("subscriptions")
}
```

**Campos de Auditoria:**

- `asaasSubscriptionId`: ID da subscription no Asaas
- `asaasCustomerId`: ID do customer no Asaas
- `asaasCreatedAt`: Timestamp de quando foi criada no Asaas
- `asaasCreationError`: Erro ao criar no Asaas (para retry manual)
- `lastSyncedAt`: Última vez que foi sincronizada
- `asaasSyncError`: Erro na última sincronização

### Invoices

```prisma
model Invoice {
  id                   String        @id @default(cuid())
  invoiceNumber        String        @unique
  tenantId             String
  subscriptionId       String?
  amount               Decimal       @db.Decimal(10, 2)
  status               InvoiceStatus
  dueDate              DateTime
  paidAt               DateTime?
  paymentMethod        PaymentMethod?

  // Asaas Integration Fields
  asaasInvoiceId       String?       @unique @db.VarChar(255) @map("asaas_invoice_id")
  asaasInvoiceUrl      String?       @db.Text @map("asaas_invoice_url")
  asaasBankSlipUrl     String?       @db.Text @map("asaas_bank_slip_url")
  paymentUrl           String?       @db.Text // Deprecated, usar asaasInvoiceUrl

  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  tenant               Tenant        @relation(fields: [tenantId], references: [id])
  subscription         Subscription? @relation(fields: [subscriptionId], references: [id])

  @@map("invoices")
}
```

**URLs do Asaas:**

- `asaasInvoiceUrl`: Link direto para visualizar a fatura no Asaas
- `asaasBankSlipUrl`: Link direto para baixar o boleto bancário
- `asaasInvoiceId`: ID do payment no Asaas (para consultas via API)

### Webhook Events

```prisma
model WebhookEvent {
  id         String          @id @default(cuid())
  gateway    PaymentGateway
  eventType  String          @map("event_type")
  eventId    String          @map("event_id")
  payload    Json
  processed  Boolean         @default(false)
  error      String?         @db.Text
  createdAt  DateTime        @default(now()) @map("created_at")

  @@unique([gateway, eventId])
  @@index([gateway, eventType])
  @@index([createdAt])
  @@map("webhook_events")
}
```

**Propósito:**
- Garantir idempotência de webhooks
- Auditoria completa de eventos
- Debugging e troubleshooting

---

## 🔌 API Endpoints

### Asaas API (Externa)

**Base URL:**
- Sandbox: `https://sandbox.asaas.com/api/v3`
- Production: `https://api.asaas.com/v3`

**Authentication:** Header `access_token: {ASAAS_API_KEY}`

#### 1. Create Customer

```http
POST /v3/customers
Content-Type: application/json
access_token: {ASAAS_API_KEY}

{
  "name": "ILPI Exemplo LTDA",
  "email": "contato@ilpiexemplo.com.br",
  "cpfCnpj": "12.345.678/0001-90",
  "phone": "1140001234",
  "mobilePhone": "11987654321",
  "postalCode": "01310-100"
}
```

**Response:**
```json
{
  "id": "cus_000007490772",
  "name": "ILPI Exemplo LTDA",
  "email": "contato@ilpiexemplo.com.br",
  "cpfCnpj": "12345678000190"
}
```

#### 2. Create Subscription

```http
POST /v3/subscriptions
Content-Type: application/json
access_token: {ASAAS_API_KEY}

{
  "customer": "cus_000007490772",
  "billingType": "BOLETO",
  "value": 499.00,
  "cycle": "MONTHLY",
  "description": "Assinatura Plano Profissional",
  "nextDueDate": "2026-02-03",
  "externalReference": "sub_abc123xyz"
}
```

**Response:**
```json
{
  "id": "sub_dggvdpjygt7en3o0",
  "customer": "cus_000007490772",
  "billingType": "BOLETO",
  "value": 499.00,
  "status": "ACTIVE",
  "nextDueDate": "2026-02-03",
  "cycle": "MONTHLY"
}
```

⚠️ **IMPORTANTE:** Asaas cria automaticamente o primeiro payment aqui!

#### 3. Get Subscription

```http
GET /v3/subscriptions/{id}
access_token: {ASAAS_API_KEY}
```

**Response:**
```json
{
  "id": "sub_dggvdpjygt7en3o0",
  "customer": "cus_000007490772",
  "status": "ACTIVE",
  "value": 499.00,
  "cycle": "MONTHLY",
  "nextDueDate": "2026-03-03"
}
```

#### 4. Get Payment

```http
GET /v3/payments/{id}
access_token: {ASAAS_API_KEY}
```

**Response:**
```json
{
  "id": "pay_gpvq5g12m4c0ov47",
  "customer": "cus_000007490772",
  "subscription": "sub_dggvdpjygt7en3o0",
  "value": 499.00,
  "status": "RECEIVED",
  "billingType": "BOLETO",
  "dueDate": "2026-02-03",
  "paymentDate": "2026-01-27",
  "invoiceUrl": "https://sandbox.asaas.com/i/gpvq5g12m4c0ov47",
  "bankSlipUrl": "https://sandbox.asaas.com/b/pdf/gpvq5g12m4c0ov47"
}
```

#### 5. Cancel Subscription

```http
DELETE /v3/subscriptions/{id}
access_token: {ASAAS_API_KEY}
```

### Internal API (Backend)

#### 1. Webhook Receiver

```http
POST /api/webhooks/asaas
Content-Type: application/json

{
  "id": "evt_abc123",
  "event": "PAYMENT_RECEIVED",
  "payment": {
    "id": "pay_xyz789",
    "customer": "cus_123",
    "value": 499.00,
    "status": "RECEIVED"
  }
}
```

**Response:**
```json
{
  "status": "processed",
  "eventId": "evt_abc123"
}
```

#### 2. Manual Sync Trigger

```http
POST /api/superadmin/jobs/asaas-sync
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "success": true,
  "message": "Asaas sync job executado com sucesso"
}
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# .env

# Asaas API Configuration
ASAAS_API_KEY=your_sandbox_api_key_here
ASAAS_ENVIRONMENT=sandbox  # ou 'production'

# Webhook Configuration (opcional)
WEBHOOK_SECRET=your_webhook_secret_here
```

### Configuração de Sandbox (Desenvolvimento)

1. Criar conta em: https://sandbox.asaas.com
2. Acessar: Configurações → API → Gerar API Key
3. Copiar API Key e adicionar ao `.env`
4. Configurar webhook URL (ngrok para desenvolvimento local)

### Configuração de Produção

1. Criar conta em: https://www.asaas.com
2. Completar verificação KYC
3. Gerar API Key de produção
4. Configurar webhook com domínio real
5. Alterar `.env`: `ASAAS_ENVIRONMENT=production`

⚠️ **IMPORTANTE:** Nunca commitar API keys no Git!

---

## 🧪 Testes e Debugging

### Teste de Conversão Trial

```typescript
// Script de teste manual
import { PrismaClient } from '@prisma/client'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

async function createTestTrial() {
  const trial = await prisma.subscription.create({
    data: {
      tenantId: 'tenant_test_123',
      planId: 'plan_professional',
      status: 'trialing',
      trialStart: addDays(new Date(), -30),
      trialEnd: addDays(new Date(), -1), // Expirado ontem
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDays(new Date(), 30),
    },
  })

  console.log('✓ Trial criado:', trial.id)
  console.log('Aguardar execução do TrialConversionJob às 02:00...')
}

createTestTrial()
```

### Teste de Webhook Local

```bash
# Terminal 1: Iniciar ngrok
ngrok http 3000

# Terminal 2: Configurar webhook no Asaas
# URL: https://abc123.ngrok-free.app/api/webhooks/asaas

# Terminal 3: Monitorar logs
cd apps/backend
npm run start:dev | grep -E "Webhook|Payment|Subscription"

# Terminal 4: Simular webhook
curl -X POST http://localhost:3000/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_001",
    "event": "PAYMENT_CREATED",
    "payment": {
      "id": "pay_test_001",
      "customer": "cus_000007490772",
      "subscription": "sub_dggvdpjygt7en3o0",
      "value": 499.00,
      "status": "PENDING",
      "dueDate": "2026-02-03"
    }
  }'
```

### Teste de Sincronização Manual

```bash
# Via CLI (curl)
curl -X POST http://localhost:3000/api/superadmin/jobs/asaas-sync \
  -H "Authorization: Bearer {YOUR_JWT_TOKEN}"

# Via UI
# Acessar: http://localhost:5173/superadmin/settings
# Clicar: "Executar Job" no card "Sincronização Asaas"
```

### Debugging de Webhooks

```sql
-- Ver últimos webhooks recebidos
SELECT
  id,
  event_type,
  created_at,
  processed,
  error
FROM webhook_events
ORDER BY created_at DESC
LIMIT 10;

-- Ver webhooks com erro
SELECT
  id,
  event_type,
  error,
  payload
FROM webhook_events
WHERE error IS NOT NULL
ORDER BY created_at DESC;

-- Ver webhooks duplicados
SELECT
  event_id,
  COUNT(*) as count
FROM webhook_events
GROUP BY event_id
HAVING COUNT(*) > 1;
```

### Logs de Sincronização

```bash
# Ver logs do sync job
tail -f logs/backend.log | grep "AsaasSyncJob"

# Exemplo de output esperado:
# [AsaasSyncJob] 🔄 Iniciando sincronização bidirecional Asaas ↔ Local...
# [AsaasSyncJob] 📋 Sincronizando subscriptions...
# [AsaasSyncJob] 💰 Sincronizando payments pendentes...
# [AsaasSyncJob] 📊 Encontrados 5 tenants com invoices abertas
# [AsaasSyncJob] ✓ Invoice pay_abc123: OPEN → PAID (R$ 499)
# [AsaasSyncJob] ✅ Sincronização concluída em 2341ms | Subscriptions: 0/3 | Payments: 1/8
```

---

## 🔧 Troubleshooting

### Problema: Invoices Duplicadas

**Sintoma:** Duas invoices criadas para o mesmo payment

**Causa:** Job de conversão criando invoice manualmente + webhook criando outra

**Solução:** ✅ Removida criação manual de invoice do TrialConversionJob (Fase 1). Agora apenas webhook `PAYMENT_CREATED` cria invoices.

### Problema: Data Errada (nextDueDate)

**Sintoma:** `nextDueDate` está 1 dia antes/depois do esperado

**Causa:** Diferença de timezone (UTC vs America/Sao_Paulo)

**Solução:** ✅ Usar `zonedTimeToUtc` com timezone explícito:

```typescript
import { zonedTimeToUtc } from 'date-fns-tz'

const nextDueDate = zonedTimeToUtc(
  addDays(new Date(), 7),
  'America/Sao_Paulo'
).toISOString().split('T')[0] // YYYY-MM-DD
```

### Problema: Webhook 404

**Sintoma:** Asaas retorna 404 ao enviar webhook

**Causa:** Rota do controller não bate com URL configurada no Asaas

**Solução:** ✅ Controller alterado de `@Controller('payments/webhooks')` para `@Controller('webhooks')`

**URL final:** `/api/webhooks/asaas` (com global prefix `/api`)

### Problema: Sync Job Ignorando Tenants

**Sintoma:** Alguns tenants nunca são sincronizados

**Causa:** Limite de 100 invoices totais (não por tenant)

**Solução:** ✅ Implementado `groupBy` para processar TODOS os tenants:

```typescript
// ❌ ERRADO (antes)
const invoices = await prisma.invoice.findMany({
  where: { status: 'OPEN', asaasInvoiceId: { not: null } },
  take: 100, // Apenas 100 totais!
})

// ✅ CORRETO (depois)
const tenants = await prisma.invoice.groupBy({
  by: ['tenantId'],
  where: { status: 'OPEN', asaasInvoiceId: { not: null } },
})

for (const { tenantId } of tenants) {
  const invoices = await prisma.invoice.findMany({
    where: { tenantId, status: 'OPEN' },
    take: 50, // 50 POR TENANT
  })
  // ...
}
```

### Problema: Subscription Não Sincroniza

**Sintoma:** `lastSyncedAt` sempre NULL

**Diagnóstico:**

```sql
-- Verificar subscriptions com erro de sync
SELECT
  id,
  asaas_subscription_id,
  status,
  last_synced_at,
  asaas_sync_error
FROM subscriptions
WHERE asaas_subscription_id IS NOT NULL
  AND asaas_sync_error IS NOT NULL;
```

**Soluções possíveis:**
1. Verificar se `asaasSubscriptionId` está correto
2. Verificar conectividade com API Asaas
3. Trigger manual de sync via UI
4. Verificar logs de erro em `asaasSyncError`

### Problema: API Rate Limit

**Sintoma:** Erro 429 (Too Many Requests) da API Asaas

**Solução:** Implementado `@RetryWithBackoff`:

```typescript
@RetryWithBackoff(3, 1000, [429, 500, 502, 503, 504])
async getPayment(paymentId: string): Promise<PaymentResponse> {
  // Até 3 tentativas com backoff exponencial
  // 1ª tentativa: imediato
  // 2ª tentativa: +1s
  // 3ª tentativa: +2s
}
```

**Monitoramento:**

```bash
# Ver logs de retry
tail -f logs/backend.log | grep "Retrying"
```

---

## 🚀 Roadmap

### Próximas Implementações

#### 1. E2E Tests

**Objetivo:** Testar fluxo completo Trial → Active → Payment

**Escopo:**
- Criar trial via API
- Executar TrialConversionJob
- Simular webhook `PAYMENT_CREATED`
- Simular webhook `PAYMENT_RECEIVED`
- Verificar invoice `OPEN` → `PAID`

**Localização:** `apps/backend/test/e2e/asaas-integration.spec.ts`

#### 2. Alertas de Webhook Failure

**Objetivo:** Notificar SuperAdmin quando webhooks falham consistentemente

**Regra:** >3 webhooks consecutivos com erro

**Implementação:**

```typescript
// Verificar falhas consecutivas
const recentFailures = await prisma.webhookEvent.count({
  where: {
    gateway: 'ASAAS',
    error: { not: null },
    createdAt: { gte: subHours(new Date(), 24) },
  },
})

if (recentFailures > 3) {
  await alertsService.create({
    type: 'WEBHOOK_FAILURE',
    severity: 'HIGH',
    title: 'Webhooks Asaas falhando consistentemente',
    message: `${recentFailures} webhooks falharam nas últimas 24h`,
  })
}
```

#### 3. Retry Automático de Subscriptions com Erro

**Objetivo:** Tentar recriar subscriptions que falharam na conversão

**Implementação:**

```typescript
@Cron('0 3 * * *') // Diário às 03:00
async retryFailedConversions() {
  const failedSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'trialing',
      asaasCreationError: { not: null },
      trialEnd: { lt: addDays(new Date(), -7) }, // Expirado há >7 dias
    },
  })

  for (const subscription of failedSubscriptions) {
    // Tentar novamente...
  }
}
```

#### 4. Dashboard de Métricas Asaas

**Objetivo:** Visualizar métricas de integração no SuperAdmin

**Métricas:**
- Taxa de sucesso de webhooks (%)
- Tempo médio de sincronização
- Subscriptions com erro de sync
- Invoices sincronizadas vs não sincronizadas
- Conversões Trial → Active (taxa de sucesso)

**Localização:** `/superadmin/analytics/asaas`

#### 5. Suporte a Múltiplos Métodos de Pagamento

**Objetivo:** Permitir tenant escolher método de pagamento

**Métodos:**
- ✅ Boleto (implementado)
- 🔜 PIX
- 🔜 Cartão de Crédito

**Implementação:**

```typescript
// Adicionar campo em Subscription
model Subscription {
  preferredPaymentMethod AsaasBillingType @default(BOLETO)
}

// Usar no createSubscription
await asaasService.createSubscription({
  billingType: subscription.preferredPaymentMethod,
  // ...
})
```

#### 6. Split de Pagamento (Multi-beneficiário)

**Objetivo:** Dividir pagamento entre Rafa Labs e parceiros

**Use case:** Franquias, revendedores

**Documentação Asaas:** https://docs.asaas.com/docs/split-de-pagamento

---

## 📚 Referências

### Documentação Oficial Asaas

- **API Reference:** https://docs.asaas.com/reference/inicio
- **Guia de Cobranças:** https://docs.asaas.com/docs/guia-de-cobrancas
- **Assinaturas (Subscriptions):** https://docs.asaas.com/docs/assinaturas
- **Webhooks:** https://docs.asaas.com/docs/webhook-para-cobrancas
- **Eventos de Assinaturas:** https://docs.asaas.com/docs/eventos-para-assinaturas

### Código-Fonte Principal

| Arquivo | Descrição |
|---------|-----------|
| `apps/backend/src/superadmin/jobs/trial-to-active-conversion.job.ts` | Job de conversão Trial → Active (Fase 1) |
| `apps/backend/src/payments/webhooks.controller.ts` | Controller de webhooks (Fase 2) |
| `apps/backend/src/payments/jobs/asaas-sync.job.ts` | Job de sincronização bidirecional (Fase 3) |
| `apps/backend/src/payments/services/asaas.service.ts` | Client HTTP para API Asaas |
| `apps/backend/src/payments/services/invoice.service.ts` | Gerenciamento de invoices |
| `apps/backend/src/payments/gateways/payment-gateway.interface.ts` | Interfaces TypeScript |
| `apps/backend/prisma/schema/billing.prisma` | Schema de banco de dados |
| `apps/frontend/src/pages/superadmin/SystemSettings.tsx` | UI de trigger manual |

### Database Migrations

```bash
# Migration de campos Asaas em Subscriptions
apps/backend/prisma/migrations/20260126XXXXXX_add_asaas_fields/migration.sql

# Migration de URLs em Invoices
apps/backend/prisma/migrations/20260126194941_add_asaas_subscription_audit_fields/migration.sql

# Migration de Webhook Events
apps/backend/prisma/migrations/20260126XXXXXX_create_webhook_events/migration.sql
```

---

## 📝 Changelog da Integração

### [2026-01-27] - v1.0

**✨ Adicionado:**
- Fase 1: Trial → Active Conversion Job
- Fase 2: Webhook Integration
- Fase 3: Bidirectional Sync Job
- Fase 5: URL Fields (asaasInvoiceUrl, asaasBankSlipUrl)
- Frontend: Página de Configurações do Sistema
- Endpoint manual de trigger de sync

**🔧 Corrigido:**
- Timezone fix (America/Sao_Paulo)
- Webhook route (404 errors)
- Duplicate invoices (removida criação manual)
- Sync job fairness (processar TODOS os tenants)

**📝 Documentação:**
- CHANGELOG.md atualizado
- INTEGRACAO-ASAAS.md criado (este arquivo)

---

## 🤝 Suporte

**Contato Técnico:**
- Email: dev@rafalabs.com.br
- Documentação Interna: `/docs`
- Issues: GitHub (privado)

**Suporte Asaas:**
- Email: contato@asaas.com
- Chat: https://ajuda.asaas.com
- Telefone: (11) 4950-2915

---

**Desenvolvido com ❤️ por Rafa Labs Desenvolvimento e Tecnologia**
