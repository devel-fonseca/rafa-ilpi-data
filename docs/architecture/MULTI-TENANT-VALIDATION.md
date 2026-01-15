# Ferramentas de Validação - Arquitetura Multi-Tenant

Guia completo das ferramentas implementadas para prevenir e detectar violações da arquitetura multi-tenant (schema isolation).

---

## 📋 Visão Geral

A arquitetura multi-tenant com **schema isolation** exige cuidado para evitar violações onde código acessa dados de tenant via schema errado. Este documento descreve as 3 camadas de proteção implementadas:

1. **ESLint Rules** - Prevenção em tempo de desenvolvimento
2. **Runtime Monitoring** - Detecção em DEV/TEST
3. **E2E Tests** - Validação automatizada

---

## 1. ESLint Rules (Tempo de Desenvolvimento)

### O que detecta

Uso incorreto de `this.prisma.<tenantModel>` em services, indicando acesso a TENANT table via public client.

### Modelos monitorados

- `user`, `resident`, `bed`, `room`, `building`, `floor`, `medication`, `clinicalProfile`

### Como usar

```bash
# Lint de todo o projeto
npm run lint

# Lint de arquivo específico
npx eslint src/beds/beds.service.ts

# Autofix (quando possível)
npm run lint -- --fix
```

### Exemplo de erro

```typescript
// ❌ ERRADO - ESLint vai alertar
async findAll() {
  return this.prisma.resident.findMany(); // VIOLAÇÃO!
}
```

```
error: ❌ VIOLAÇÃO MULTI-TENANT: this.prisma.resident é proibido (Resident é TENANT table).
Use this.tenantContext.client.resident. Ver docs/architecture/multi-tenancy.md
```

### Como corrigir

```typescript
// ✅ CORRETO
async findAll() {
  return this.tenantContext.client.resident.findMany();
}
```

### Configuração

Arquivo: [`apps/backend/.eslintrc.js`](../../.eslintrc.js)

Para adicionar novos models ao monitoramento, edite a seção `no-restricted-syntax` com novo selector:

```javascript
{
  selector: "MemberExpression[object.type='MemberExpression'][object.object.type='ThisExpression'][object.property.name='prisma'][property.name='novoModel']",
  message: '❌ VIOLAÇÃO MULTI-TENANT: this.prisma.novoModel é proibido...',
}
```

---

## 2. Runtime Monitoring (DEV/TEST)

### O que detecta

**Em runtime**, monitora queries Prisma e detecta 3 tipos de violações:

1. **WHERE tenantId em TENANT table** (código legado não refatorado)
2. **Queries lentas** em TENANT tables (possível schema errado)
3. **Cross-schema JOINs** via `include` (PostgreSQL não suporta)

### Como funciona

Middleware Prisma que intercepta todas as queries e analisa padrões suspeitos.

**Habilitado automaticamente em:**
- `NODE_ENV=development` ✅
- `NODE_ENV=test` ✅
- `NODE_ENV=production` ❌ (desabilitado por performance)

### Logs gerados

#### Exemplo 1: WHERE tenantId em TENANT table

```
[WARN] PrismaQueryMonitor ⚠️ [ARQUITETURA] Query com WHERE tenantId em TENANT table "Resident".
Isto indica código legado que não foi refatorado para schema isolation.
{
  model: 'Resident',
  action: 'findMany',
  hasWhereClause: true,
  tenantIdInWhere: '550e8400-e29b-41d4-a716-446655440000',
  stack: '...' // Stack trace parcial
}
```

#### Exemplo 2: Cross-schema JOIN

```
[ERROR] PrismaQueryMonitor 🚨 [CROSS-SCHEMA] Possível JOIN cross-schema detectado!
Model "ServiceContract" (PUBLIC) tentando incluir "creator" (provavelmente TENANT).
PostgreSQL não suporta JOINs cross-schema via Prisma.
{
  model: 'ServiceContract',
  relation: 'creator',
  recommendation: 'Remova o include e faça query separada usando getTenantClient()'
}
```

#### Exemplo 3: Query lenta suspeita

```
[WARN] PrismaQueryMonitor ⚠️ [PERFORMANCE] Query lenta (537ms) em TENANT table "Resident".
Pode indicar busca em schema errado ou falta de índice.
{
  model: 'Resident',
  action: 'findMany',
  duration: 537
}
```

### Como revisar logs

```bash
# Logs em tempo real (desenvolvimento)
npm run start:dev

# Filtrar apenas alertas multi-tenant
npm run start:dev 2>&1 | grep "ARQUITETURA\|CROSS-SCHEMA\|PERFORMANCE"

# Logs de testes E2E
npm run test:e2e 2>&1 | grep PrismaQueryMonitor
```

### Configuração

Arquivo: [`apps/backend/src/prisma/prisma-query-logger.middleware.ts`](../src/prisma/prisma-query-logger.middleware.ts)

Middleware registrado automaticamente em [`prisma.service.ts`](../src/prisma/prisma.service.ts):

```typescript
private registerMultiTenantMonitorMiddleware(): void {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    this.$use(async (params, next) => {
      return this.multiTenantQueryLogger.middleware(params, next);
    });
  }
}
```

---

## 3. E2E Tests (Validação Automatizada)

### O que testa

Isolamento completo de dados entre tenants, incluindo:

- ✅ Dados de Tenant 1 invisíveis para Tenant 2
- ✅ Mesmo email pode existir em tenants diferentes
- ✅ Schemas PostgreSQL existem e estão isolados
- ✅ Queries não contêm `WHERE tenantId` em TENANT tables
- ✅ Performance mantida (schema isolation não degrada)

### Como executar

```bash
# Executar todos os testes E2E
npm run test:e2e

# Executar apenas testes de isolamento multi-tenant
npm run test:e2e -- multi-tenant-isolation
```

### Arquivo

[`apps/backend/test/e2e/multi-tenant-isolation.e2e-spec.ts`](../../test/e2e/multi-tenant-isolation.e2e-spec.ts)

### Exemplo de teste

```typescript
it('Tenant 1 NÃO deve ver residente do Tenant 2', async () => {
  // Criar residente no Tenant 1
  await request(app).post('/residents')
    .set('Authorization', `Bearer ${user1Token}`)
    .send({ name: 'João Silva', ... });

  // Criar residente no Tenant 2
  await request(app).post('/residents')
    .set('Authorization', `Bearer ${user2Token}`)
    .send({ name: 'Maria Souza', ... });

  // Tenant 1 busca residentes (deve ver apenas João)
  const response = await request(app).get('/residents')
    .set('Authorization', `Bearer ${user1Token}`);

  expect(response.body.data).toHaveLength(1);
  expect(response.body.data[0].name).toBe('João Silva');
  expect(response.body.data.find(r => r.name === 'Maria Souza')).toBeUndefined();
});
```

---

## 4. Checklist de Validação Manual

Use este checklist ao criar/refatorar services:

### Para Services REQUEST-scoped (maioria)

- [ ] Injeta `TenantContextService` no construtor
- [ ] Usa `this.tenantContext.client.<model>` para TENANT tables
- [ ] Usa `this.prisma.<model>` apenas para SHARED tables (Tenant, Plan, etc.)
- [ ] **NÃO** tem parâmetro `tenantId` em métodos públicos
- [ ] **NÃO** usa `where: { tenantId }` em queries de TENANT tables
- [ ] ESLint não reporta violações
- [ ] Testes E2E passam

### Para Services SHARED (poucos casos)

- [ ] Busca `schemaName` via `this.prisma.tenant.findUnique()`
- [ ] Usa `this.prisma.getTenantClient(schemaName)` explicitamente
- [ ] Documenta que é service SHARED (comentário no topo do arquivo)
- [ ] Evita `include` cross-schema (public ↔ tenant)

---

## 5. Comandos Úteis

```bash
# Validar ESLint em todo o projeto
npm run lint

# Executar testes E2E de isolamento
npm run test:e2e -- multi-tenant-isolation

# Iniciar backend em modo dev (com logs de monitoramento)
npm run start:dev

# Buscar todas as ocorrências de "WHERE tenantId" no código
grep -r "where.*tenantId" src/ --include="*.ts"

# Buscar uso incorreto de this.prisma.<model> (deve retornar 0 ou apenas SHARED models)
grep -rE "this\.prisma\.(user|resident|bed|room|building|floor)" src/ --include="*.ts" | grep -v ".spec.ts"

# Verificar schemas PostgreSQL existentes
docker exec rafa-ilpi-postgres psql -U rafa_user -d rafa_ilpi -c "\dn"

# Listar tabelas em schema específico
docker exec rafa-ilpi-postgres psql -U rafa_user -d rafa_ilpi -c "\dt tenant_abc123.*"
```

---

## 6. Troubleshooting

### ESLint não detecta violação

**Problema:** Código com `this.prisma.resident` mas ESLint não alerta.

**Solução:**
1. Verificar se model está na lista de selectors (`.eslintrc.js`)
2. Executar `npm run lint` (não apenas salvar no VS Code)
3. Verificar se arquivo não está em `ignorePatterns`

### Logs de monitoramento não aparecem

**Problema:** Backend rodando mas sem logs `[PrismaQueryMonitor]`.

**Solução:**
1. Verificar `NODE_ENV`: deve ser `development` ou `test`
2. Verificar nível de log em `prisma.service.ts`
3. Executar com `npm run start:dev` (não `npm run start`)

### Testes E2E falhando

**Problema:** Testes de isolamento falham com "relation not found".

**Solução:**
1. Aplicar migrations: `npm run prisma:migrate`
2. Sincronizar schemas de tenants: `npm run tenants:sync-schemas`
3. Limpar banco de teste: `npm run test:e2e -- --forceExit`

---

## 7. Próximos Passos

**Após implementar correções:**

1. Execute validação completa:
   ```bash
   npm run lint
   npm run test:e2e
   npm run start:dev # Revisar logs por 5 minutos
   ```

2. Busque violações restantes:
   ```bash
   grep -r "where.*tenantId" src/ --include="*.ts" | wc -l
   # Objetivo: 0 (ou apenas casos específicos documentados)
   ```

3. Documente exceções (se houver):
   - Adicionar comentário explicativo no código
   - Listar no `docs/architecture/multi-tenancy.md`

4. Configure CI/CD:
   ```yaml
   # .github/workflows/ci.yml
   - name: Lint (inclui multi-tenant rules)
     run: npm run lint
   - name: E2E Tests (inclui isolamento)
     run: npm run test:e2e
   ```

---

## 8. Referências

- **Documentação Arquitetura:** [`docs/architecture/multi-tenancy.md`](../../docs/architecture/multi-tenancy.md)
- **Padrões de Acesso:** 4 patterns documentados (TenantContext, getTenantClient, UNION ALL, Hybrid)
- **3 RED Rules:** Violações críticas que **NUNCA** devem ocorrer
- **Prisma Multi-Tenancy:** https://www.prisma.io/docs/guides/database/multi-tenancy

---

**Última atualização:** 14/01/2026
**Versão:** 1.0.0
