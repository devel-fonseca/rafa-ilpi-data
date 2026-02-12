# Módulo: Financeiro Operacional

**Status:** ✅ Implementado (MVP + fechamento + razão bancário)
**Versão:** 1.0.0
**Última atualização:** 12/02/2026

## Visão Geral

Módulo tenant para gestão financeira operacional da ILPI, separado do billing SaaS da plataforma.

Escopo operacional:
- Categorias financeiras
- Transações (receita/despesa)
- Métodos de pagamento
- Contas bancárias
- Razão bancário (ledger)
- Fechamento de período (antiga “conciliação”)

Fora do escopo deste módulo:
- `Invoice`, `Subscription`, `Payment` do portal superadmin

## Arquitetura

### Backend
- Module: `apps/backend/src/financial-operations/financial-operations.module.ts`
- Controllers:
  - `financial-categories.controller.ts`
  - `financial-transactions.controller.ts`
  - `financial-payment-methods.controller.ts`
  - `financial-accounts.controller.ts`
  - `financial-reconciliations.controller.ts`
  - `financial-reference-data.controller.ts`
- Services:
  - `financial-categories.service.ts`
  - `financial-transactions.service.ts`
  - `financial-payment-methods.service.ts`
  - `financial-accounts.service.ts`
  - `financial-reconciliations.service.ts`
  - `financial-contract-transactions.service.ts`

### Frontend
- Página principal: `apps/frontend/src/pages/financial/FinancialOperationsPage.tsx`
- API client: `apps/frontend/src/api/financial-operations.api.ts`
- Hooks: `apps/frontend/src/hooks/useFinancialOperations.ts`

### Prisma (tenant)
- Schema: `apps/backend/prisma/schema/financial-operations.prisma`
- Tabelas:
  - `financial_categories`
  - `financial_payment_methods`
  - `financial_bank_accounts`
  - `financial_transactions`
  - `financial_bank_account_ledger`
  - `financial_reconciliations`
  - `financial_reconciliation_items`

## Permissões (RBAC)

Permissões usadas:
- `VIEW_FINANCIAL_OPERATIONS`
- `MANAGE_FINANCIAL_CATEGORIES`
- `MANAGE_FINANCIAL_TRANSACTIONS`
- `MANAGE_FINANCIAL_ACCOUNTS`
- `MANAGE_FINANCIAL_RECONCILIATION`
- `VIEW_FINANCIAL_DASHBOARD`

Referências:
- `apps/backend/src/permissions/position-profiles.config.ts`
- `apps/frontend/src/hooks/usePermissions.ts`

## Endpoints principais

### Categorias
- `POST /api/financial/categories`
- `GET /api/financial/categories`
- `GET /api/financial/categories/:id`
- `PATCH /api/financial/categories/:id`
- `DELETE /api/financial/categories/:id`

### Transações
- `POST /api/financial/transactions`
- `GET /api/financial/transactions`
- `GET /api/financial/transactions/:id`
- `PATCH /api/financial/transactions/:id`
- `POST /api/financial/transactions/:id/mark-paid`
- `POST /api/financial/transactions/:id/cancel`
- `POST /api/financial/transactions/generate-from-contracts`

### Métodos de pagamento
- `GET /api/financial/payment-methods`
- `GET /api/financial/payment-methods/:id`
- `POST /api/financial/payment-methods`
- `PATCH /api/financial/payment-methods/:id`

### Contas bancárias
- `GET /api/financial/accounts`
- `GET /api/financial/accounts/:id`
- `GET /api/financial/accounts/:id/statement`
- `POST /api/financial/accounts`
- `PATCH /api/financial/accounts/:id`

### Fechamento
- `GET /api/financial/reconciliations`
- `GET /api/financial/reconciliations/unreconciled-paid`
- `GET /api/financial/reconciliations/:id`
- `POST /api/financial/reconciliations`

### Dados de referência
- `GET /api/financial/reference-data/payment-methods`
- `GET /api/financial/reference-data/bank-accounts`

## Regras de negócio

### Baixa manual (pagamento)
- Status `PAID` não pode ser definido no `create`/`update` direto.
- Pagamento é confirmado via `POST /transactions/:id/mark-paid`.
- Ao confirmar pagamento, o módulo:
  - atualiza status/data de pagamento
  - aplica impacto na conta bancária
  - grava lançamento no razão (`financial_bank_account_ledger`)

### Cancelamento
- Cancelar transação paga reverte impacto no saldo da conta e grava lançamento de reversão no razão.

### Fechamento
- Fechamento compara saldo informado x saldo calculado no período.
- Fórmula de diferença:
  - `difference = closingBalance - systemBalance`
  - `systemBalance = openingBalance + entradas - saídas`
- Se `difference = 0`: `RECONCILED`
- Se `difference != 0`: `DISCREPANCY`

### Datas e timezone
- Campos de data civil usam `@db.Date` e são enviados para Prisma como `Date` com horário fixo (12:00) para evitar deslocamento de timezone.
- Padrão alinhado com `docs/standards/DATETIME_STANDARD.md`.

## Operação e scripts

### Migrações principais
- `20260212064000_add_financial_operations`
- `20260212123000_add_financial_account_ledger`
- `20260212173000_add_unique_contract_competence_generation`

### Seed
- Script: `apps/backend/prisma/seeds/financial-operations.seed.ts`
- Comando:
```bash
cd apps/backend
npm run prisma:seed:financial-operations
```

### Backfill do razão
- Script: `apps/backend/scripts/backfill-financial-ledger.ts`
- Comandos:
```bash
cd apps/backend
npm run financial:backfill-ledger -- --dry-run
npm run financial:backfill-ledger
```

### Reconstrução de razão por conta
- Script: `apps/backend/scripts/rebuild-financial-ledger-account.ts`
- Comando:
```bash
cd apps/backend
npm run financial:rebuild-ledger-account -- --schema=<schema_tenant> --accountId=<uuid> --openingBalance=<valor>
```

## Fluxo recomendado de uso (curto)

1. Cadastrar categorias (ou usar seed).
2. Cadastrar métodos de pagamento.
3. Cadastrar conta bancária com saldo inicial.
4. Lançar transações.
5. Confirmar pagamentos (baixa manual).
6. Gerar fechamento por período para validar divergências.
7. Consultar extrato da conta (razão bancário).

## Observações de UX já aplicadas

- Terminologia principal da aba: **Fechamento** (em vez de “Conciliação”).
- Bloco de suporte com **pagas sem fechamento** antes da geração do fechamento.
- Mensagens e microcopy em pt-BR no módulo.

## Limitações conhecidas (estado atual)

- Confirmação de pagamento é apenas manual (automação futura).
- Juros/multa em `%` na transação já existe com cálculo automático no formulário, mas sem regras de cálculo temporal avançadas (pró-rata/ao dia) no backend.
- Fechamento não substitui conciliação bancária automatizada por extrato OFX/API bancária (futuro).
