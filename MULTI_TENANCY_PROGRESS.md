# 🚀 Multi-Tenancy Refactoring - Progress Tracker

**Projeto:** Rafa ILPI Data
**Objetivo:** Implementar arquitetura schema-per-tenant completa
**Início:** 2026-01-14
**Status Geral:** 🟡 Em Planejamento

---

## 📊 Visão Geral do Progresso

| Fase | Status | Progresso | Tarefas |
|------|--------|-----------|---------|
| FASE 1: Preparação Schema Prisma | ⏳ Pendente | 0/4 | Adicionar diretivas @@map |
| FASE 2: Limpar Banco de Dados | ⏳ Pendente | 0/4 | Drop schemas e truncate |
| FASE 3: Script Migrations Tenant | ⏳ Pendente | 0/2 | Criar script automático |
| FASE 4: Refatorar TenantsService | ⏳ Pendente | 0/1 | Remover SQL hardcoded |
| FASE 5: Camada Abstração Tenant | ⏳ Pendente | 0/3 | TenantContextService |
| FASE 6: Refatorar Services (Exemplo) | ⏳ Pendente | 0/2 | BedsService padrão |
| FASE 7: Refatorar TODOS Services | ⏳ Pendente | 0/56 | 56 services + controllers |
| FASE 8: Corrigir Erro 500 | ⏳ Pendente | 0/2 | Movimentações Recentes |
| FASE 9: Validação Inicialização | ⏳ Pendente | 0/2 | Health checks |
| FASE 10: Testes e Validação | ⏳ Pendente | 0/8 | Checklist validação |
| FASE 11: Deploy e Documentação | ⏳ Pendente | 0/2 | Scripts e docs |

**Legenda:** ⏳ Pendente | 🔄 Em Progresso | ✅ Concluído | ❌ Bloqueado

---

## FASE 1: Preparação do Schema Prisma

### 1.1 Adicionar Diretivas @@map nos Models SHARED
- [x] `apps/backend/prisma/schema/tenant.prisma` (Plan, Tenant, Subscription)
- [x] `apps/backend/prisma/schema/contracts.prisma` (ServiceContract)
- [x] `apps/backend/prisma/schema/communication.prisma` (EmailTemplate, EmailTemplateVersion, TenantMessage)
- [x] `apps/backend/prisma/schema/billing.prisma` (WebhookEvent, Invoice, Payment, UsageMetrics)

**Total:** 9/9 models SHARED configurados ✅

### 1.2 Confirmar @@map nos Models TENANT-SPECIFIC
- [x] `apps/backend/prisma/schema/residents.prisma`
- [x] `apps/backend/prisma/schema/infrastructure.prisma`
- [x] `apps/backend/prisma/schema/auth.prisma`
- [x] `apps/backend/prisma/schema/medications.prisma`
- [x] `apps/backend/prisma/schema/clinical-profiles.prisma`
- [x] `apps/backend/prisma/schema/vital-signs.prisma`
- [x] `apps/backend/prisma/schema/vaccinations.prisma`
- [x] `apps/backend/prisma/schema/clinical-notes.prisma`
- [x] `apps/backend/prisma/schema/daily-records.prisma`
- [x] `apps/backend/prisma/schema/notifications.prisma`
- [x] `apps/backend/prisma/schema/messages.prisma`
- [x] `apps/backend/prisma/schema/documents.prisma`
- [x] `apps/backend/prisma/schema/resident-contracts.prisma`
- [x] `apps/backend/prisma/schema/pops.prisma`
- [x] `apps/backend/prisma/schema/institutional-events.prisma`
- [x] `apps/backend/prisma/schema/audit.prisma`
- [x] `apps/backend/prisma/schema/permissions.prisma`
- [x] Demais 7 arquivos de schema

**Total:** 24/24 arquivos revisados ✅
**Confirmado:** 77 models com 129 ocorrências de @@map

### 1.3 Criar Migration (PULADA - Não Necessária)
- [x] ~~Criar nova migration~~ - Vamos usar as 83 migrations existentes
- [x] Migrations já aplicadas no public, serão reaplicadas após limpar banco
- [x] Schema modularizado está correto (`prismaSchemaFolder` ativo)
- [x] Última migration: `20260114005913_add_bed_status_history`

**Status FASE 1:** ✅ Concluída (Sub-tarefa 1.3 não necessária)

---

## FASE 2: Limpar Banco de Dados

### 2.1 Backup Preventivo (Opcional)
- [ ] Executar: `docker exec rafa-ilpi-postgres pg_dump -U rafa_user rafa_ilpi > backup_antes_refatoracao.sql`

### 2.2 Drop de Todos os Schemas de Tenant
- [ ] Drop: `tenant_banco_do_brasil_sa_d9138b`
- [ ] Drop: `tenant_petroleo_brasileiro_s_a_petrobras_214ae9`
- [ ] Drop: `ilpi_teste_sp`
- [ ] Drop: `ilpi_teste_manaus`

### 2.3 Limpar Tabelas do Public (ou Recriar Banco)
- [ ] **Opção A:** TRUNCATE nas 66 tabelas que vão para tenant schemas
- [ ] **Opção B (Recomendada):** DROP DATABASE + CREATE DATABASE

### 2.4 Aplicar Migrations no Public
- [ ] Executar: `npx prisma migrate deploy`
- [ ] Executar: `npx prisma db seed`
- [ ] Verificar que apenas 9 tabelas SHARED existem em public

**Status FASE 2:** ⏳ Pendente (0/4 sub-tarefas)

---

## FASE 3: Script de Migrations para Tenant Schemas

### 3.1 Criar Script `apply-tenant-migrations.ts`
- [ ] Criar arquivo: `apps/backend/scripts/apply-tenant-migrations.ts`
- [ ] Implementar função `applyMigrationsToTenant(schemaName)`
- [ ] Implementar loop para todos os tenants ativos
- [ ] Adicionar logs detalhados e tratamento de erros

### 3.2 Adicionar Scripts ao package.json
- [ ] Adicionar: `"tenants:sync-schemas": "ts-node scripts/apply-tenant-migrations.ts"`
- [ ] Adicionar: `"tenants:sync-single": "ts-node scripts/apply-tenant-migrations.ts --schema"`

**Status FASE 3:** ⏳ Pendente (0/2 sub-tarefas)

---

## FASE 4: Refatorar TenantsService

### 4.1 Atualizar Método `createTenantSchema`
- [ ] Ler: `apps/backend/src/tenants/tenants.service.ts` (linhas 695-861)
- [ ] Remover: Todo o SQL hardcoded
- [ ] Implementar: Chamada para `execSync` com migrations via script
- [ ] Testar: Criar novo tenant e verificar schema criado

**Status FASE 4:** ⏳ Pendente (0/1 sub-tarefa)

---

## FASE 5: Criar Camada de Abstração para Tenant Client

### 5.1 Criar TenantContextService
- [ ] Criar: `apps/backend/src/prisma/tenant-context.service.ts`
- [ ] Implementar: Service com `scope: Scope.REQUEST`
- [ ] Implementar: Método `initialize(tenantId: string)`
- [ ] Implementar: Getters `client`, `tenantId`, `publicClient`

### 5.2 Criar TenantContextInterceptor
- [ ] Criar: `apps/backend/src/common/interceptors/tenant-context.interceptor.ts`
- [ ] Implementar: Interceptor que inicializa contexto do tenant
- [ ] Implementar: Extração de `tenantId` do `request.user`

### 5.3 Registrar Interceptor Globalmente
- [ ] Editar: `apps/backend/src/app.module.ts`
- [ ] Adicionar: `TenantContextService` como provider
- [ ] Registrar: `TenantContextInterceptor` como `APP_INTERCEPTOR`

**Status FASE 5:** ⏳ Pendente (0/3 sub-tarefas)

---

## FASE 6: Refatorar Services (Exemplo com BedsService)

### 6.1 Refatorar BedsService como Padrão
- [ ] Editar: `apps/backend/src/beds/beds.service.ts`
- [ ] Injetar: `TenantContextService` no construtor
- [ ] Refatorar: Todos os métodos para usar `this.tenantContext.client`
- [ ] Remover: Todos os filtros `where: {tenantId}`
- [ ] Remover: Parâmetros `tenantId` dos métodos

### 6.2 Atualizar BedsController
- [ ] Editar: `apps/backend/src/beds/beds.controller.ts`
- [ ] Remover: Parâmetros `tenantId` das rotas
- [ ] Testar: Endpoints funcionando com novo padrão

**Status FASE 6:** ⏳ Pendente (0/2 sub-tarefas)

---

## FASE 7: Refatorar TODOS os Services

### Services a Refatorar (56 total)

#### Infraestrutura (5 services)
- [ ] `apps/backend/src/beds/beds.service.ts` ✅ (já feito na Fase 6)
- [ ] `apps/backend/src/rooms/rooms.service.ts`
- [ ] `apps/backend/src/buildings/buildings.service.ts`
- [ ] `apps/backend/src/floors/floors.service.ts`
- [ ] `apps/backend/src/equipment/equipment.service.ts`

#### Residentes e Clínica (15 services)
- [ ] `apps/backend/src/residents/residents.service.ts`
- [ ] `apps/backend/src/medications/medications.service.ts`
- [ ] `apps/backend/src/clinical-profiles/clinical-profiles.service.ts`
- [ ] `apps/backend/src/clinical-notes/clinical-notes.service.ts`
- [ ] `apps/backend/src/daily-records/daily-records.service.ts`
- [ ] `apps/backend/src/vital-signs/vital-signs.service.ts`
- [ ] `apps/backend/src/vaccinations/vaccinations.service.ts`
- [ ] `apps/backend/src/allergies/allergies.service.ts`
- [ ] `apps/backend/src/medical-history/medical-history.service.ts`
- [ ] `apps/backend/src/prescriptions/prescriptions.service.ts`
- [ ] `apps/backend/src/exams/exams.service.ts`
- [ ] `apps/backend/src/appointments/appointments.service.ts`
- [ ] `apps/backend/src/procedures/procedures.service.ts`
- [ ] `apps/backend/src/diagnoses/diagnoses.service.ts`
- [ ] `apps/backend/src/hospitalization/hospitalization.service.ts`

#### Comunicação e Documentos (8 services)
- [ ] `apps/backend/src/notifications/notifications.service.ts`
- [ ] `apps/backend/src/messages/messages.service.ts`
- [ ] `apps/backend/src/documents/documents.service.ts`
- [ ] `apps/backend/src/attachments/attachments.service.ts`
- [ ] `apps/backend/src/communications/communications.service.ts`
- [ ] `apps/backend/src/emails/emails.service.ts`
- [ ] `apps/backend/src/sms/sms.service.ts`
- [ ] `apps/backend/src/push-notifications/push-notifications.service.ts`

#### Contratos e Administrativo (10 services)
- [ ] `apps/backend/src/resident-contracts/resident-contracts.service.ts`
- [ ] `apps/backend/src/pops/pops.service.ts`
- [ ] `apps/backend/src/institutional-events/institutional-events.service.ts`
- [ ] `apps/backend/src/schedules/schedules.service.ts`
- [ ] `apps/backend/src/activities/activities.service.ts`
- [ ] `apps/backend/src/meals/meals.service.ts`
- [ ] `apps/backend/src/inventory/inventory.service.ts`
- [ ] `apps/backend/src/suppliers/suppliers.service.ts`
- [ ] `apps/backend/src/purchases/purchases.service.ts`
- [ ] `apps/backend/src/maintenance/maintenance.service.ts`

#### Usuários e Segurança (8 services)
- [ ] `apps/backend/src/auth/users.service.ts`
- [ ] `apps/backend/src/permissions/permissions.service.ts`
- [ ] `apps/backend/src/roles/roles.service.ts`
- [ ] `apps/backend/src/audit/audit.service.ts`
- [ ] `apps/backend/src/access-logs/access-logs.service.ts`
- [ ] `apps/backend/src/sessions/sessions.service.ts`
- [ ] `apps/backend/src/two-factor-auth/two-factor-auth.service.ts`
- [ ] `apps/backend/src/password-reset/password-reset.service.ts`

#### Relatórios e Analytics (5 services)
- [ ] `apps/backend/src/reports/reports.service.ts`
- [ ] `apps/backend/src/analytics/analytics.service.ts`
- [ ] `apps/backend/src/dashboards/dashboards.service.ts`
- [ ] `apps/backend/src/metrics/metrics.service.ts`
- [ ] `apps/backend/src/exports/exports.service.ts`

#### Outros (5 services)
- [ ] `apps/backend/src/integrations/integrations.service.ts`
- [ ] `apps/backend/src/webhooks/webhooks.service.ts`
- [ ] `apps/backend/src/queue/queue.service.ts`
- [ ] `apps/backend/src/cache/cache.service.ts`
- [ ] `apps/backend/src/search/search.service.ts`

### Controllers a Atualizar (~30 controllers)
- [ ] Atualizar todos os controllers correspondentes aos services acima
- [ ] Remover parâmetros `tenantId` das rotas
- [ ] Verificar que `@CurrentUser()` ainda é usado quando necessário

**Status FASE 7:** ⏳ Pendente (0/86 sub-tarefas)

---

## FASE 8: Corrigir Erro 500 - Movimentações Recentes

### 8.1 Correção no Backend
- [ ] Verificar: `apps/backend/src/beds/beds.service.ts` método `getBedStatusHistory`
- [ ] Confirmar: Uso de `this.tenantContext.client.bedStatusHistory`
- [ ] Remover: Filtro `where: {tenantId}`

### 8.2 Verificar Frontend
- [ ] Confirmar: `apps/frontend/src/pages/beds-management/BedsManagementHub.tsx` (linha 360)
- [ ] Confirmar: Remoção de `entry.user.name` já aplicada

**Status FASE 8:** ⏳ Pendente (0/2 sub-tarefas)

---

## FASE 9: Adicionar Validação na Inicialização

### 9.1 Criar HealthCheck para Tenant Schemas
- [ ] Criar: `apps/backend/src/health/tenant-schemas.health.ts`
- [ ] Implementar: `TenantSchemasHealthIndicator`
- [ ] Implementar: Validação de existência de schemas
- [ ] Implementar: Validação de tabelas críticas (residents, beds, etc.)

### 9.2 Atualizar HealthController
- [ ] Editar: `apps/backend/src/health/health.controller.ts`
- [ ] Adicionar: Check de `tenant_schemas` ao health check

**Status FASE 9:** ⏳ Pendente (0/2 sub-tarefas)

---

## FASE 10: Testes e Validação

### 10.1 Validações de Estrutura
- [ ] ✅ Schema public tem apenas 9 tabelas (SHARED)
- [ ] ✅ Schemas de tenant têm 66+ tabelas (TENANT-SPECIFIC)
- [ ] ✅ Criar novo tenant aplica migrations automaticamente

### 10.2 Validações Funcionais
- [ ] ✅ Todos os endpoints de CRUD funcionam sem erro
- [ ] ✅ Card "Movimentações Recentes" carrega sem erro 500
- [ ] ✅ Transferências de leito registradas em `bed_status_history`

### 10.3 Validações Técnicas
- [ ] ✅ Health check `/health` retorna status OK
- [ ] ✅ Logs não mostram queries com `where: {tenantId}` em tabelas tenant

**Status FASE 10:** ⏳ Pendente (0/8 sub-tarefas)

---

## FASE 11: Deploy e Documentação

### 11.1 Criar Script de Deploy
- [ ] Criar: `apps/backend/scripts/deploy.sh`
- [ ] Implementar: Build da aplicação
- [ ] Implementar: Apply migrations no public
- [ ] Implementar: Sync de tenant schemas
- [ ] Implementar: Health check

### 11.2 Atualizar Documentação
- [ ] Criar/Atualizar: `docs/architecture/multi-tenancy.md`
- [ ] Documentar: Estrutura de schemas
- [ ] Documentar: Fluxo de criação de tenant
- [ ] Documentar: Padrões de acesso aos dados
- [ ] Documentar: Comandos úteis

**Status FASE 11:** ⏳ Pendente (0/2 sub-tarefas)

---

## 📝 Notas de Execução

### Sessão 2026-01-14
- ✅ Plano detalhado criado
- ✅ Checklist de progresso criado
- ⏳ Aguardando aprovação para iniciar Fase 1

### Decisões Importantes
1. **Dados:** Limpar tudo e recomeçar (ambiente dev)
2. **Código:** Refatorar 100% para usar `getTenantClient()`
3. **Migrations:** Script automático + hook de deploy
4. **Escopo:** Incluir correção do erro 500

### Riscos Identificados
- ⚠️ 56 services para refatorar (alto risco de esquecimento)
- ⚠️ Performance pode ser impactada (necessário benchmark)
- ⚠️ Migrations podem falhar em tenant (rollback automático necessário)

---

## 🎯 Próxima Ação

**FASE 1.1:** Adicionar diretivas `@@map` nos 9 models SHARED

**Comando para iniciar:**
```bash
# Ler primeiro arquivo
cat apps/backend/prisma/schema/tenant.prisma
```

---

**Última Atualização:** 2026-01-14
**Responsável:** Claude (Senior Full Stack Engineer)
**Aprovação Necessária:** Dr. E. (Emanuel)
