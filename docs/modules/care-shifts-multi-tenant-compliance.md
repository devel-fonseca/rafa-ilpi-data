# Conformidade Multi-Tenant - Módulo Care Shifts

> **Documento complementar (não canônico)**
> Referência principal de implementação:
> - [care-shifts](./care-shifts.md)
> Uso: relatório de validação arquitetural multi-tenant específico do módulo.

**Módulo:** Escala de Cuidados (Care Shifts)
**Data de Validação:** 22/01/2026
**Status:** ✅ CONFORME

---

## 📋 Resumo Executivo

O módulo **Care Shifts** (Escala de Cuidados) foi auditado e está **100% conforme** com as regras de arquitetura multi-tenant definidas em:
- [MULTI-TENANT-ISOLATION.md](../architecture/MULTI-TENANT-ISOLATION.md)
- [MULTI-TENANT-VALIDATION.md](../architecture/MULTI-TENANT-VALIDATION.md)
- [multi-tenancy.md](../architecture/multi-tenancy.md)

---

## ✅ Verificações Realizadas

### 1. RED Rule #1: Acesso via Client Correto

**Regra:** TENANT tables devem ser acessadas via `tenantContext.client`, nunca via `this.prisma`

**Resultado:** ✅ CONFORME

**Verificação:**
```bash
grep -r "this\.prisma\.(shiftTemplate|team|shift|weeklySchedulePattern)" src/care-shifts/
# Resultado: Nenhuma ocorrência encontrada
```

**Todos os services utilizam corretamente:**
```typescript
// ✅ CORRETO - Padrão usado em todos os services
this.tenantContext.client.shiftTemplate.findMany(...)
this.tenantContext.client.team.findMany(...)
this.tenantContext.client.shift.findMany(...)
this.tenantContext.client.weeklySchedulePattern.findMany(...)
```

---

### 2. RED Rule #2: Sem tenantId como Parâmetro

**Regra:** Métodos públicos não devem receber `tenantId` como parâmetro (exceto CRON jobs)

**Resultado:** ✅ CONFORME

**Verificação:**
- ✅ ShiftTemplatesService: Nenhum método recebe `tenantId`
- ✅ WeeklyScheduleService: Nenhum método recebe `tenantId`
- ✅ TeamsService: Nenhum método recebe `tenantId`
- ✅ CareShiftsService: Nenhum método recebe `tenantId`
- ✅ RDCCalculationService: Nenhum método recebe `tenantId`
- ✅ CareShiftsCron: Método `executeManualGeneration(tenantId?)` é **exceção válida** (itera sobre múltiplos tenants)

**Exceção válida (Padrão 2 - CRON jobs):**
```typescript
// ✅ PERMITIDO - Método que itera sobre múltiplos tenants
async executeManualGeneration(tenantId?: string): Promise<...> {
  const tenants = await this.prisma.tenant.findMany({ where });

  for (const tenant of tenants) {
    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
    // Processa cada tenant...
  }
}
```

---

### 3. RED Rule #3: Sem Mistura de Clients

**Regra:** Não misturar `public client` com `tenant client` em JOINs/includes cross-schema

**Resultado:** ✅ CONFORME

**Estratégia adotada:** Queries separadas + JOIN em memória

**Exemplo (ShiftTemplatesService):**
```typescript
async findAll() {
  // Query 1: Buscar templates no schema do tenant
  const templates = await this.tenantContext.client.shiftTemplate.findMany({
    where: { isActive: true },
  });

  // Query 2: Buscar configs do tenant separadamente
  const configs = await this.tenantContext.client.tenantShiftConfig.findMany({
    where: { tenantId: this.tenantContext.tenantId, deletedAt: null },
  });

  // JOIN em memória (não via Prisma include)
  const configMap = new Map(configs.map((c) => [c.shiftTemplateId, c]));

  return templates.map((template) => {
    const tenantConfig = configMap.get(template.id) || null;
    return { ...template, tenantConfig };
  });
}
```

**Justificativa técnica:**
- ❌ Evita `include: { tenantConfigs: {...} }` que causava erros de JOIN em multi-tenancy
- ✅ Queries separadas são mais robustas para schemas dinâmicos
- ✅ JOIN em memória com Map é eficiente e explícito
- ✅ Facilita debugging e auditoria de acesso aos dados

---

## 📊 Tabelas do Módulo

Todas as tabelas abaixo estão **no schema do tenant** (TENANT-SCOPED):

| Tabela | Localização | Acesso Correto |
|--------|-------------|----------------|
| `shift_templates` | `tenant_{slug}` | ✅ `tenantContext.client` |
| `tenant_shift_configs` | `tenant_{slug}` | ✅ `tenantContext.client` |
| `teams` | `tenant_{slug}` | ✅ `tenantContext.client` |
| `team_members` | `tenant_{slug}` | ✅ `tenantContext.client` |
| `weekly_schedule_patterns` | `tenant_{slug}` | ✅ `tenantContext.client` |
| `weekly_schedule_pattern_assignments` | `tenant_{slug}` | ✅ `tenantContext.client` |
| `shifts` | `tenant_{slug}` | ✅ `tenantContext.client` |
| `shift_substitutions` | `tenant_{slug}` | ✅ `tenantContext.client` |

**Observação importante:**
- Os comentários no Prisma schema dizem `"Tabela SHARED (public schema)"` para `ShiftTemplate` e `TenantShiftConfig`
- **ISTO ESTÁ INCORRETO** - Estas tabelas **estão no schema do tenant**, não no public
- ✅ O código implementado está correto (`tenantContext.client`)
- ⚠️ Os comentários devem ser atualizados para evitar confusão

---

## 🔒 Services Validados

### 1. ShiftTemplatesService
- ✅ Scope: `REQUEST`
- ✅ Injeta: `TenantContextService`
- ✅ Acesso: `tenantContext.client.shiftTemplate`
- ✅ Sem parâmetros `tenantId`
- ✅ Queries separadas para evitar cross-schema JOIN

### 2. WeeklyScheduleService
- ✅ Scope: `REQUEST`
- ✅ Injeta: `TenantContextService`
- ✅ Acesso: `tenantContext.client.weeklySchedulePattern`
- ✅ Sem parâmetros `tenantId`
- ✅ Validações verificam apenas dados do tenant atual

### 3. TeamsService
- ✅ Scope: `REQUEST`
- ✅ Injeta: `TenantContextService`
- ✅ Acesso: `tenantContext.client.team`
- ✅ Sem parâmetros `tenantId`
- ✅ Enriquecimento com dados de User via query separada

### 4. CareShiftsService
- ✅ Scope: `REQUEST`
- ✅ Injeta: `TenantContextService`
- ✅ Acesso: `tenantContext.client.shift`
- ✅ Sem parâmetros `tenantId`
- ✅ Queries com filtros por data/turno/equipe

### 5. RDCCalculationService
- ✅ Scope: `REQUEST`
- ✅ Injeta: `TenantContextService`
- ✅ Acesso: `tenantContext.client.resident`, `tenantContext.client.shift`
- ✅ Sem parâmetros `tenantId`
- ✅ Cálculos isolados por tenant

### 6. CareShiftsCron (Exceção)
- ✅ Scope: `DEFAULT` (não REQUEST-scoped)
- ✅ Injeta: `PrismaService`
- ✅ Padrão 2: Itera sobre múltiplos tenants
- ✅ Usa `getTenantClient(schemaName)` corretamente
- ✅ Método `executeManualGeneration(tenantId?)` é válido para testes

---

## 🎯 Boas Práticas Aplicadas

### 1. Queries Separadas ao Invés de Include

**Problema:** Prisma `include` com relações causa erros em multi-tenancy
**Solução:** Queries separadas + JOIN em memória

```typescript
// ❌ ANTES (causava erros)
const templates = await this.tenantContext.client.shiftTemplate.findMany({
  include: {
    tenantConfigs: {
      where: { tenantId: this.tenantContext.tenantId },
    },
  },
});

// ✅ DEPOIS (robusto e funcional)
const templates = await this.tenantContext.client.shiftTemplate.findMany({});
const configs = await this.tenantContext.client.tenantShiftConfig.findMany({
  where: { tenantId: this.tenantContext.tenantId },
});

const configMap = new Map(configs.map((c) => [c.shiftTemplateId, c]));
return templates.map((t) => ({ ...t, config: configMap.get(t.id) }));
```

### 2. Uso Consistente de tenantContext.tenantId

Quando é necessário o ID do tenant (ex: para filtros ou validações):

```typescript
// ✅ CORRETO
const tenantId = this.tenantContext.tenantId;

// Usar em filtros WHERE
where: {
  tenantId,
  deletedAt: null,
}
```

### 3. Try-Catch com Logging em Operações Críticas

```typescript
async findAll() {
  try {
    const templates = await this.tenantContext.client.shiftTemplate.findMany({...});
    // ... processamento
    return results;
  } catch (error) {
    console.error('Erro ao buscar shift templates:', error);
    throw error;
  }
}
```

---

## 📝 Recomendações para Manutenção

### 1. Atualizar Comentários no Prisma Schema

**Arquivo:** `apps/backend/prisma/schema/care-shifts.prisma`

**Alterar:**
```prisma
// ShiftTemplate: Turnos fixos pré-configurados (5 turnos)
// Tabela SHARED (public schema) - read-only para usuários  ❌ INCORRETO
model ShiftTemplate {
  ...
}
```

**Para:**
```prisma
// ShiftTemplate: Turnos fixos pré-configurados (5 turnos)
// Tabela TENANT-SCOPED (schema do tenant) - cada tenant tem seus próprios turnos
model ShiftTemplate {
  ...
}
```

### 2. Manter Padrão de Queries Separadas

Sempre que precisar relacionar dados:
1. Faça queries separadas
2. Use `Map` para JOIN em memória
3. Retorne objeto combinado

### 3. Validar com ESLint

Executar periodicamente:
```bash
npm run lint -- apps/backend/src/care-shifts/
npm run lint -- apps/backend/src/shift-templates/
npm run lint -- apps/backend/src/weekly-schedule/
npm run lint -- apps/backend/src/teams/
```

### 4. Adicionar Testes E2E de Isolamento

Criar testes que validem:
- ✅ Tenant A não vê turnos/equipes do Tenant B
- ✅ Padrões semanais isolados por tenant
- ✅ RDC calculation usa apenas residentes do tenant

---

## ✅ Conclusão

O módulo **Care Shifts** está **100% conforme** com as regras de multi-tenancy do projeto. Todas as 3 RED Rules são respeitadas:

1. ✅ Usa `tenantContext.client` para TENANT tables
2. ✅ Não recebe `tenantId` como parâmetro (exceto CRON jobs)
3. ✅ Não mistura public client com tenant client

**Próximos passos:**
- [ ] Atualizar comentários no Prisma schema (care-shifts.prisma)
- [ ] Adicionar testes E2E de isolamento multi-tenant
- [ ] Documentar padrão de queries separadas no guia de desenvolvimento

---

**Última validação:** 22/01/2026
**Próxima revisão:** Após adicionar novos services ao módulo
