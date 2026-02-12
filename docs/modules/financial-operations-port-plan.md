# Plano de Portabilidade - Módulo Financeiro Operacional (Tenant)

## 1. Objetivo
Portar o módulo de **Financeiro Operacional da ILPI** (transações, categorias, contas, conciliação e analytics operacionais) para o projeto atual, sem conflitar com o módulo de **billing SaaS** (superadmin/assinaturas/faturas da plataforma).

## 2. Escopo e Não-Escopo
### Escopo
- Backend tenant para financeiro operacional.
- Frontend tenant para operação financeira.
- RBAC por cargos ILPI.
- Jobs operacionais (vencimento e recorrência).
- Seeds iniciais por tenant (categorias e métodos de pagamento operacionais).

### Não-Escopo
- Alterações no billing SaaS (`Invoice`, `Subscription`, rotas `/superadmin/*`, `/admin/invoices`).
- Migração de regras comerciais do portal superadmin.

## 3. Princípios Arquiteturais Obrigatórios
### Multi-tenancy
- Todos os dados operacionais financeiros ficam no **schema do tenant**.
- Serviços usam `tenantContext.client` (request-scoped).
- Nunca depender de `tenantId` vindo do frontend para isolamento.
- Rotas e queries seguem padrão dos módulos tenant existentes.

Referências:
- `docs/architecture/multi-tenancy.md`
- `docs/modules/tenant-schema-cache.md`

### Data/Hora (timezone-safe)
- Data civil (emissão, vencimento, competência, pagamento): `DateTime @db.Date`.
- Momento exato (createdAt/updatedAt/auditoria): `DateTime @db.Timestamptz(3)`.
- Se houver horário local explícito no futuro: `HH:mm` + `tenant.timezone`.
- Proibido `new Date().toISOString().slice(0, 10)` para regras de dia civil.

Referência:
- `docs/standards/DATETIME_STANDARD.md`

## 4. Mapeamento de Domínio (Protótipo -> Projeto Atual)
### Protótipo (Express/Knex)
- `financial_categories`
- `payment_methods`
- `bank_accounts`
- `financial_transactions`
- `bank_reconciliations`
- views analíticas

### Projeto Atual (Nest/Prisma modular)
Criar módulo `financial-operations` em tenant backend com modelos equivalentes em Prisma:
- `FinancialCategory`
- `FinancialPaymentMethod`
- `FinancialBankAccount`
- `FinancialTransaction`
- `FinancialReconciliation`
- `FinancialReconciliationItem`

Observação de nomenclatura:
- Prefixo `Financial*` evita colisão semântica com `PaymentMethod` de billing SaaS.

### Matriz de Mapeamento de Campos (MVP)
| Protótipo | Campo protótipo | Projeto atual | Campo atual | Estratégia |
|---|---|---|---|---|
| `financial_categories` | `organization_id` | `FinancialCategory` | `tenantId` | Renomear (`organization` -> `tenant`) |
| `financial_categories` | `category_type` (`income/expense`) | `FinancialCategory` | `type` (`INCOME/EXPENSE`) | Transformar valor para enum UPPER_SNAKE |
| `financial_categories` | `parent_category_id` | `FinancialCategory` | `parentCategoryId` | Direto |
| `payment_methods` | `organization_id` | `FinancialPaymentMethod` | `tenantId` | Renomear |
| `payment_methods` | `requires_manual_confirmation` | `FinancialPaymentMethod` | `requiresManualConfirmation` | Direto |
| `payment_methods` | `allows_installments` | `FinancialPaymentMethod` | `allowsInstallments` | Direto |
| `bank_accounts` | `organization_id` | `FinancialBankAccount` | `tenantId` | Renomear |
| `bank_accounts` | `account_type` (`checking/savings/payment`) | `FinancialBankAccount` | `accountType` (`CHECKING/SAVINGS/PAYMENT`) | Transformar enum |
| `financial_transactions` | `organization_id` | `FinancialTransaction` | `tenantId` | Renomear |
| `financial_transactions` | `transaction_type` (`income/expense`) | `FinancialTransaction` | `type` (`INCOME/EXPENSE`) | Transformar enum |
| `financial_transactions` | `contract_id` | `FinancialTransaction` | `residentContractId` | Renomear para domínio atual |
| `financial_transactions` | `resident_id` | `FinancialTransaction` | `residentId` | Direto |
| `financial_transactions` | `issue_date`/`due_date`/`payment_date` | `FinancialTransaction` | `issueDate`/`dueDate`/`paymentDate` | Direto (DATE) |
| `financial_transactions` | `competence_month` | `FinancialTransaction` | `competenceMonth` | Direto (DATE no 1º dia do mês) |
| `financial_transactions` | `status` (`pending/paid/...`) | `FinancialTransaction` | `status` (`PENDING/PAID/...`) | Transformar enum |
| `bank_reconciliations` | `organization_id` | `FinancialReconciliation` | `tenantId` | Renomear |
| `bank_reconciliations` | `status` (`pending/in_progress/...`) | `FinancialReconciliation` | `status` (`PENDING/IN_PROGRESS/...`) | Transformar enum |
| `transaction_reconciliation_items` | `reconciliation_id` | `FinancialReconciliationItem` | `reconciliationId` | Direto |
| `transaction_reconciliation_items` | `transaction_id` | `FinancialReconciliationItem` | `transactionId` | Direto |

### Diferenças intencionais nesta portabilidade
- Não reutilizar tabelas de billing SaaS (`Invoice`, `Payment`, `Subscription`).
- `tenantId` segue o padrão atual do projeto (isolamento por schema de tenant).
- `netAmount` e `difference` calculados na camada de aplicação (tradeoff MVP): simplifica migração inicial e evita dependência imediata de colunas geradas SQL; podemos migrar para generated columns em fase de otimização.

## 5. Modelo de Dados Proposto (tenant schema)
### FinancialCategory
- `id`, `tenantId`, `name`, `description`, `type` (`INCOME|EXPENSE`), `parentCategoryId`, `isActive`, timestamps.
- Índices: `(tenantId, type, isActive)`, `(tenantId, parentCategoryId)`.

### FinancialPaymentMethod
- `id`, `tenantId`, `name`, `isActive`, `requiresReference`, timestamps.
- Índices: `(tenantId, isActive)`.

### FinancialBankAccount
- `id`, `tenantId`, `bankName`, `accountName`, `branch`, `accountNumberMasked`, `initialBalance`, `currentBalance`, `isActive`, timestamps.
- Índices: `(tenantId, isActive)`.

### FinancialTransaction
- `id`, `tenantId`, `type`, `status`, `categoryId`, `residentId?`, `residentContractId?`, `bankAccountId?`, `paymentMethodId?`.
- `issueDate` (`@db.Date`), `dueDate` (`@db.Date`), `paymentDate?` (`@db.Date`), `competenceMonth` (`@db.Date`).
- `amount`, `discountAmount`, `lateFeeAmount`, `netAmount`.
- `description`, `notes`, `isAutoGenerated`, `generationSource`, timestamps.
- Índices:
  - `(tenantId, status, dueDate)`
  - `(tenantId, competenceMonth, type)`
  - `(tenantId, residentId)`
  - `(tenantId, residentContractId)`

### FinancialReconciliation / FinancialReconciliationItem
- Entidades para fechamento de período e vinculação de transações reconciliadas.

## 6. Permissões e Cargos (RBAC)
Adicionar permissões granulares no `PermissionType`:
- `VIEW_FINANCIAL_OPERATIONS`
- `MANAGE_FINANCIAL_CATEGORIES`
- `MANAGE_FINANCIAL_TRANSACTIONS`
- `MANAGE_FINANCIAL_ACCOUNTS`
- `MANAGE_FINANCIAL_RECONCILIATION`
- `VIEW_FINANCIAL_DASHBOARD`

### Distribuição inicial por cargo
- `ADMINISTRATOR`: todas as permissões financeiras operacionais.
- `TECHNICAL_MANAGER`: `VIEW_FINANCIAL_OPERATIONS`, `VIEW_FINANCIAL_DASHBOARD` (sem gestão financeira por padrão).
- `ADMINISTRATIVE`: `VIEW_FINANCIAL_OPERATIONS`, `MANAGE_FINANCIAL_TRANSACTIONS`, `VIEW_FINANCIAL_DASHBOARD`.
- `ADMINISTRATIVE_ASSISTANT`: `VIEW_FINANCIAL_OPERATIONS`, `VIEW_FINANCIAL_DASHBOARD`.

Nota: ajuste fino pode ser feito via `UserPermission` (override).

## 7. Backend - Módulos e Endpoints
Criar `apps/backend/src/financial-operations`:
- `financial-operations.module.ts`
- `controllers/financial-categories.controller.ts`
- `controllers/financial-transactions.controller.ts`
- `controllers/financial-accounts.controller.ts`
- `controllers/financial-dashboard.controller.ts`
- `services/*.service.ts`
- `dto/*.dto.ts`

### Rotas (tenant app)
- `GET/POST/PATCH/DELETE /financial/categories`
- `GET/POST/PATCH /financial/transactions`
- `POST /financial/transactions/:id/mark-paid`
- `POST /financial/transactions/:id/cancel`
- `GET/POST/PATCH /financial/accounts`
- `GET /financial/dashboard`
- `GET /financial/analytics/*` (fase 2)

### Regras
- Validar consistência de `type` da transação com categoria.
- Status workflow: `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`, `PARTIALLY_PAID`.
- Cálculo de `netAmount` centralizado no service.

## 8. Jobs/Cron e Performance
Implementação no scheduler do Nest (não node-cron externo):
- Job diário para marcar vencidas (`PENDING -> OVERDUE`) por tenant.
- Job mensal para recorrências (fase 2, idempotente por competência).

Otimizações:
- Batch por tenant (evitar N+1).
- Janelas de data com filtros indexados.
- Dedupe de processamento por chave `tenantId + competenceMonth + contractId`.
- Logs de métricas: processados, atualizados, ignorados, erros.

## 9. Frontend Tenant (operacional)
Adicionar seção `Financeiro` no app tenant (não superadmin):
- Dashboard financeiro operacional.
- Lista de transações com filtros.
- Formulário de transação.
- Gestão de categorias.
- Gestão de contas.

Padrões:
- Reusar layout, table, filtros e padrão visual já existentes.
- `tenantKey()` nas query keys do React Query.
- Labels em pt-BR.

## 10. Estratégia de Migração (incremental)
### Fase 1 (MVP seguro)
- Prisma + backend para categorias e transações.
- Tela de listagem + criação de transações.
- Permissões mínimas.

### Fase 2
- Contas bancárias + conciliação.
- Dashboard analítico completo.
- Jobs de recorrência.

### Fase 3
- Importação de dados legados (se necessário).
- Exportações e relatórios avançados.

## 11. Compatibilidade com Billing SaaS
Garantias:
- Nenhuma alteração em `apps/backend/src/payments/*`.
- Nenhuma alteração semântica em `Invoice`, `Payment`, `Subscription`.
- Rotas operacionais sob `/financial/*` e rotas SaaS continuam em `/admin/*` e `/superadmin/*`.

## 12. Critérios de Aceite
- Build backend/frontend sem erros.
- Isolamento multi-tenant validado (sem vazamento).
- Datas de vencimento/competência corretas em timezone do tenant.
- RBAC funcional por cargo.
- Sem regressão no billing SaaS.

## 13. Ordem de Execução Recomendada
1. Prisma models + migrations (tenant).
2. Permissões (`PermissionType` + `position-profiles`).
3. Backend controllers/services (MVP categorias/transações).
4. Frontend páginas MVP.
5. Cron jobs + métricas de execução.
6. Seeds e documentação final.
