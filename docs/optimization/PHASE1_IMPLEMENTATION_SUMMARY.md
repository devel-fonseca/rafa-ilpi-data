# Otimizações de Performance - Fase 1: Foundation and Quick Wins

**Data:** 30/12/2025
**Status:** ✅ **CONCLUÍDA**
**Duração:** 1 dia
**Impacto:** Alto (queries de listagem e validação)

---

## 📊 Resumo Executivo

A Fase 1 focou em **ganhos rápidos** e **fundação para otimizações futuras**, implementando:

1. **PaginationHelper** - Utilitário robusto para paginação offset-based
2. **QueryLoggerMiddleware** - Identificação automática de queries lentas
3. **19 Índices Compostos** - Otimização de queries com múltiplos filtros
4. **Otimizações de Select** - Redução de bytes transferidos em validações

---

## 🎯 Resultados Alcançados

### ✅ Implementações Completas

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| **PaginationHelper** | `src/common/utils/pagination.helper.ts` | Utility para paginação Asaas-compliant |
| **QueryLoggerMiddleware** | `src/prisma/middleware/query-logger.middleware.ts` | Middleware de logging de queries lentas |
| **Composite Indexes** | Migration `20251230130205` | 19 índices compostos em 3 domínios |
| **ResidentsService** | `src/residents/residents.service.ts` | 4 queries otimizadas com select |

### 📈 Impacto Esperado

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Queries de listagem** (P50) | Baseline | -30% a -40% | Índices compostos |
| **Queries de listagem** (P95) | Baseline | -40% a -50% | Índices compostos |
| **Queries de validação** | 100% | 10-30% | -70% a -90% bytes |
| **Total de índices** | 246 | 265 | +19 (+7.7%) |

---

## 🔧 Detalhamento Técnico

### 1. PaginationHelper Utility

**Arquivo:** `apps/backend/src/common/utils/pagination.helper.ts`

**Funcionalidades:**
- `toPrismaParams(pagination)` - Converte DTO para `{ skip, take }`
- `paginate(data, total, pagination)` - Cria resposta paginada com metadata
- `execute(findMany, count, pagination)` - Executa query + count em paralelo
- `isValidOffset(offset, total)` - Valida offset
- `getLastPageOffset(total, limit)` - Calcula offset da última página

**Exemplo de Uso:**

```typescript
// Antes (manual)
const residents = await prisma.resident.findMany({
  skip: offset,
  take: limit,
})
const total = await prisma.resident.count()

// Depois (automático com execução paralela)
const response = await PaginationHelper.execute(
  async (params) => prisma.resident.findMany({ where: { tenantId }, ...params }),
  async () => prisma.resident.count({ where: { tenantId } }),
  { offset: 0, limit: 10 }
)
```

**Benefícios:**
- Execução paralela de `findMany` + `count` (reduz latência)
- Código consistente em todos os endpoints
- Metadata Asaas-compliant (`hasMore`, `totalCount`)

---

### 2. QueryLoggerMiddleware

**Arquivo:** `apps/backend/src/prisma/middleware/query-logger.middleware.ts`

**Configuração:**
- Threshold: `SLOW_QUERY_THRESHOLD_MS` (padrão: 100ms)
- Logs coloridos:
  - 🐌 **Warning** (>100ms): query lenta
  - 🔴 **Critical** (>1000ms): query crítica
- Em desenvolvimento: loga args completos da query

**Exemplo de Log:**

```
[PrismaQueryLogger] 🐌 Slow query detected {
  model: 'Resident',
  action: 'findMany',
  duration: '127ms',
  threshold: '100ms'
}
```

**Integração:**
- Registrado em `PrismaService` (client principal + tenant clients)
- Funciona automaticamente em todas as queries
- Permite identificar bottlenecks em produção

---

### 3. Índices Compostos (19 novos)

**Migration:** `20251230130205_add_composite_indexes_phase1`

#### 3.1 Medications (6 índices)

```sql
-- Prescrições ativas do residente
CREATE INDEX "prescriptions_tenantId_residentId_isActive_idx"
ON "prescriptions"("tenantId", "residentId", "isActive");

-- Prescrições próximas do vencimento
CREATE INDEX "prescriptions_tenantId_isActive_validUntil_idx"
ON "prescriptions"("tenantId", "isActive", "validUntil");

-- Medicamentos ativos de uma prescrição
CREATE INDEX "medications_prescriptionId_deletedAt_idx"
ON "medications"("prescriptionId", "deletedAt");

-- Medicamentos vigentes de uma prescrição
CREATE INDEX "medications_prescriptionId_startDate_endDate_idx"
ON "medications"("prescriptionId", "startDate", "endDate");

-- Administrações pendentes do dia (tenant)
CREATE INDEX "medication_administrations_tenantId_date_wasAdministered_idx"
ON "medication_administrations"("tenantId", "date", "wasAdministered");

-- Administrações pendentes do residente
CREATE INDEX "medication_administrations_residentId_date_wasAdministered_idx"
ON "medication_administrations"("residentId", "date", "wasAdministered");
```

**Queries Otimizadas:**
- Listar prescrições ativas de um residente
- Alertas de prescrições próximas do vencimento
- Checklist de administrações pendentes do dia
- Histórico de administrações de um residente

#### 3.2 Notifications (5 índices)

```sql
-- Notificações não lidas do usuário
CREATE INDEX "notifications_userId_read_createdAt_idx"
ON "notifications"("userId", "read", "createdAt" DESC);

-- Notificações por tipo (ex: MEDICATION_DUE)
CREATE INDEX "notifications_tenantId_type_read_idx"
ON "notifications"("tenantId", "type", "read");

-- Notificações de uma entidade específica
CREATE INDEX "notifications_entityType_entityId_idx"
ON "notifications"("entityType", "entityId");

-- Alertas não lidos do tenant
CREATE INDEX "system_alerts_tenantId_read_createdAt_idx"
ON "system_alerts"("tenantId", "read", "createdAt" DESC);

-- Alertas não lidos por tipo
CREATE INDEX "system_alerts_type_read_createdAt_idx"
ON "system_alerts"("type", "read", "createdAt" DESC);
```

**Queries Otimizadas:**
- Badge de notificações não lidas
- Feed de notificações por tipo
- Notificações relacionadas a uma prescrição/residente

#### 3.3 Daily Records (8 índices)

```sql
-- Registros por tipo (ex: ALIMENTACAO do dia)
CREATE INDEX "daily_records_tenantId_type_date_idx"
ON "daily_records"("tenantId", "type", "date" DESC);

-- Registros do residente por tipo
CREATE INDEX "daily_records_residentId_type_date_idx"
ON "daily_records"("residentId", "type", "date" DESC);

-- Registros ativos do dia
CREATE INDEX "daily_records_tenantId_date_deletedAt_idx"
ON "daily_records"("tenantId", "date", "deletedAt");

-- Configurações ativas do residente por tipo
CREATE INDEX "resident_schedule_configs_residentId_recordType_isActive_idx"
ON "resident_schedule_configs"("residentId", "recordType", "isActive");

-- Configurações ativas do tenant por tipo
CREATE INDEX "resident_schedule_configs_tenantId_recordType_isActive_idx"
ON "resident_schedule_configs"("tenantId", "recordType", "isActive");

-- Eventos pendentes do dia
CREATE INDEX "resident_scheduled_events_tenantId_status_scheduledDate_idx"
ON "resident_scheduled_events"("tenantId", "status", "scheduledDate");

-- Eventos pendentes do residente
CREATE INDEX "resident_scheduled_events_residentId_status_scheduledDate_idx"
ON "resident_scheduled_events"("residentId", "status", "scheduledDate");

-- Eventos por tipo (ex: VACINACAO)
CREATE INDEX "resident_scheduled_events_tenantId_eventType_scheduledDate_idx"
ON "resident_scheduled_events"("tenantId", "eventType", "scheduledDate");
```

**Queries Otimizadas:**
- Dashboard de registros do dia por tipo
- Agenda de eventos pendentes
- Checklist de configurações ativas

---

### 4. Otimizações no ResidentsService

**Arquivo:** `apps/backend/src/residents/residents.service.ts`

#### Queries Otimizadas (4)

| Query | Antes | Depois | Redução |
|-------|-------|--------|---------|
| Validação de bed | 30+ campos | 4 campos (`id, code, status, roomId`) | ~90% |
| Validação de room | 30+ campos | 1 campo (`id`) | ~95% |
| Validação de CPF | 30+ campos | 1 campo (`id`) | ~95% |
| Histórico de residente | 30+ campos | 6 campos (`id, fullName, cpf, versionNumber, status, deletedAt`) | ~80% |

**Exemplo de Otimização:**

```typescript
// Antes (traz TODOS os 30+ campos do Resident)
const existingCpf = await this.prisma.resident.findFirst({
  where: {
    tenantId,
    cpf: createResidentDto.cpf,
    deletedAt: null,
  },
})

// Depois (traz apenas ID)
const existingCpf = await this.prisma.resident.findFirst({
  where: {
    tenantId,
    cpf: createResidentDto.cpf,
    deletedAt: null,
  },
  select: { id: true }, // Otimização: apenas ID para validação
})
```

**Impacto:**
- Redução de **70-90%** nos bytes transferidos por validação
- Menor carga no PostgreSQL (menos campos processados)
- Queries mais rápidas (menos dados serializados/deserializados)

---

## 🔍 Validações Executadas

### Prisma

```bash
✅ npx prisma format    # Sintaxe validada
✅ npx prisma validate  # Relações preservadas
✅ npx prisma generate  # Client regenerado
```

### TypeScript

```bash
✅ npx tsc --noEmit      # 0 erros no residents.service.ts
✅ Total de erros: 10    # Todos pre-existentes (mjml, billing)
```

### Migration

```bash
✅ Migration 20251230130205_add_composite_indexes_phase1 aplicada
✅ 19 índices criados no PostgreSQL
✅ 0 breaking changes
```

---

## 📁 Arquivos Modificados

### Criados (3)

1. `apps/backend/src/common/utils/pagination.helper.ts` (120 linhas)
2. `apps/backend/src/prisma/middleware/query-logger.middleware.ts` (65 linhas)
3. `apps/backend/prisma/migrations/20251230130205_add_composite_indexes_phase1/migration.sql` (57 linhas)

### Modificados (4)

1. `apps/backend/src/prisma/prisma.service.ts`
   - Importado `queryLoggerMiddleware`
   - Registrado em client principal (linha 18)
   - Registrado em tenant clients (linha 93)

2. `apps/backend/prisma/schema/medications.prisma`
   - +6 índices compostos

3. `apps/backend/prisma/schema/notifications.prisma`
   - +5 índices compostos

4. `apps/backend/prisma/schema/daily-records.prisma`
   - +8 índices compostos

5. `apps/backend/src/residents/residents.service.ts`
   - 4 queries otimizadas com `select` específico

---

## 📚 Documentação Criada/Atualizada

1. `CHANGELOG.md` - Entrada completa da Fase 1
2. `TODO.md` - Seção de Performance atualizada com 3 fases
3. `docs/optimization/QUERY_PERFORMANCE_ANALYSIS.md` - Análise completa (já existia)
4. `docs/optimization/PHASE1_IMPLEMENTATION_SUMMARY.md` - Este documento

---

## 🚀 Próximos Passos (Fase 2)

**Tema:** Cache & Denormalization
**Prazo:** 1-2 semanas
**Prioridade:** Média

### Implementações Planejadas

1. **CacheService com Redis**
   - Implementar abstração sobre Redis
   - Configurar TTL e invalidação

2. **Cache de Tenant**
   - Cachear lookup de tenant (usado em toda request JWT)
   - Invalidar ao atualizar tenant

3. **Cache de UserPermissions**
   - Cachear permissões do usuário
   - Invalidar ao alterar perfil/permissões

4. **Denormalização de Bed/Room**
   - Adicionar `bedNumber`, `roomName` em `Resident`
   - Criar middleware de sincronização automática

5. **Testes de Performance**
   - Medir impacto real dos índices em produção
   - Ajustar thresholds do QueryLoggerMiddleware

---

## 📊 Métricas de Sucesso (a monitorar)

| Métrica | Como Medir | Meta |
|---------|------------|------|
| P50 queries listagem | QueryLoggerMiddleware | -30% vs baseline |
| P95 queries listagem | QueryLoggerMiddleware | -50% vs baseline |
| P99 queries listagem | QueryLoggerMiddleware | -60% vs baseline |
| Queries >100ms | Logs do middleware | <5% do total |
| Queries >1s | Logs do middleware | <0.1% do total |
| Bytes transferidos (validação) | Network profiling | -70% vs baseline |

---

## 🎉 Conclusão

A **Fase 1** foi concluída com sucesso, estabelecendo uma **base sólida** para otimizações futuras:

✅ **19 índices compostos** otimizam queries mais frequentes
✅ **QueryLoggerMiddleware** permite monitoramento contínuo
✅ **PaginationHelper** garante consistência e performance
✅ **Select otimizados** reduzem drasticamente bytes transferidos

**Próximo passo:** Implementar **Fase 2** (Cache & Denormalization) para ganhos ainda maiores em queries de leitura.

---

**Implementado por:** Claude Sonnet 4.5
**Data:** 30/12/2025
**Versão:** 1.0
