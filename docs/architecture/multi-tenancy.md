# Arquitetura Multi-Tenancy - Schema Isolation

**Versão:** 2.0.0
**Última atualização:** 14/01/2026

## Visão Geral

O sistema Rafa ILPI implementa **isolamento físico completo de dados** usando **PostgreSQL schema-per-tenant**. Cada tenant (ILPI) possui um schema dedicado no banco de dados, garantindo:

- ✅ **Isolamento físico**: Dados de um tenant não podem ser acessados por outro
- ✅ **Segurança**: Impossibilidade de vazamento de dados cross-tenant
- ✅ **Performance**: Queries otimizadas sem filtros `WHERE tenantId`
- ✅ **Escalabilidade**: Schemas independentes facilitam backups e migrations seletivos
- ✅ **Compliance**: Atende requisitos RDC 502/2021 e LGPD para isolamento de dados

---

## Estrutura de Schemas PostgreSQL

### Schema `public` (SHARED)

Contém 9 tabelas compartilhadas entre todos os tenants:

- `tenants` - Registro de ILPIs cadastradas
- `plans` - Planos SaaS disponíveis
- `subscriptions` - Assinaturas ativas
- `service_contracts` - Contratos de adesão
- `contract_acceptances` - Registros de aceite jurídico
- `email_templates` / `email_template_versions` - Templates globais
- `tenant_messages` - Mensagens broadcast
- `webhook_events` - Eventos de integração

### Schemas por Tenant (ISOLATED)

Cada tenant possui um schema nomeado como `tenant_{slug}_{hash}`, contendo 66+ tabelas:

**Tabelas principais:**

- `users`, `user_profiles` - Usuários e perfis
- `residents`, `resident_history` - Residentes e versionamento
- `beds`, `rooms`, `floors`, `buildings` - Estrutura física
- `medications`, `prescriptions` - Medicações
- `clinical_profiles`, `clinical_notes` - Prontuários
- `vital_signs`, `daily_records` - Registros clínicos
- `audit_logs` - Auditoria isolada por tenant

---

## Padrões de Acesso aos Dados

### 1. TenantContextService (REQUEST Scope)

**Uso:** Services com scope REQUEST (maioria dos cases)

```typescript
import { Injectable, Scope } from "@nestjs/common";
import { TenantContextService } from "../prisma/tenant-context.service";

@Injectable({ scope: Scope.REQUEST })
export class ResidentsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async findAll() {
    // ✅ Usa automaticamente o schema do tenant
    return this.tenantContext.client.resident.findMany({
      where: { deletedAt: null }, // ✅ SEM filtro tenantId!
    });
  }
}
```

**Vantagens:**

- ✅ Client do tenant injetado automaticamente
- ✅ Impossível acessar dados de outro tenant
- ✅ Código mais limpo e seguro

---

### 2. Manual getTenantClient() (Services SHARED)

**Uso:** Services que gerenciam múltiplos tenants

```typescript
@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async addUserToTenant(tenantId: string, addUserDto: AddUserDto) {
    // STEP 1: Buscar tenant (SHARED table)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { schemaName: true },
    });

    // STEP 2: Obter client do tenant
    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);

    // STEP 3: Criar user no schema do tenant
    return tenantClient.user.create({
      data: { ...addUserDto, tenantId },
    });
  }
}
```

---

### 3. UNION ALL Query (Singleton Services)

**Uso:** Services singleton que precisam buscar user apenas com userId

```typescript
@Injectable()
export class PermissionsCacheService {
  async fetchUserPermissions(userId: string) {
    // Buscar em TODOS os tenant schemas via UNION ALL
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { schemaName: true },
    });

    const unionQuery = tenants
      .map(
        (t) =>
          `SELECT id, tenant_id as "tenantId" FROM "${t.schemaName}".users
         WHERE id = $1 AND deleted_at IS NULL`,
      )
      .join(" UNION ALL ");

    const results = await this.prisma.$queryRawUnsafe(unionQuery, userId);
    // ... usar tenant client para dados completos
  }
}
```

---

### 4. Arquitetura Híbrida (SUPERADMIN + Tenants)

**Uso:** AuthService que gerencia SUPERADMIN (public) e users de tenants

```typescript
async login(loginDto: LoginDto) {
  // STEP 1: Buscar SUPERADMIN em public schema
  const superAdminUsers = await this.prisma.user.findMany({
    where: { email, tenantId: null }, // ✅ SUPERADMIN
  });

  // STEP 2: Buscar users de tenants
  const tenants = await this.prisma.tenant.findMany({ /* */ });
  const tenantUsers = await Promise.all(
    tenants.map(t => {
      const client = this.prisma.getTenantClient(t.schemaName);
      return client.user.findFirst({ where: { email } });
    })
  );

  // STEP 3: Combinar resultados
  const users = [...superAdminUsers, ...tenantUsers];
}
```

---

## Regras Arquiteturais (3 RED Rules)

### ❌ RED 1: Acessar TENANT table via public client

```typescript
// ❌ ERRADO
const users = await this.prisma.user.findMany({
  where: { tenantId }, // RED FLAG!
});

// ✅ CORRETO
const users = await this.tenantContext.client.user.findMany({
  where: { deletedAt: null },
});
```

### ❌ RED 2: Método público com parâmetro tenantId

```typescript
// ❌ ERRADO
async findAll(tenantId: string) { }

// ✅ CORRETO
async findAll() {
  const tenantId = this.tenantContext.tenantId; // Se precisar
}
```

### ❌ RED 3: JOIN cross-schema via Prisma

```typescript
// ❌ ERRADO - ServiceContract (public) + User (tenant)
const contract = await this.prisma.serviceContract.findUnique({
  include: { creator: true }, // ❌ Cross-schema!
});

// ✅ CORRETO - Query separada
const contract = await this.prisma.serviceContract.findUnique({
  /* */
});
// Se precisar: buscar creator manualmente via tenant client
```

---

## Criação de Novo Tenant

### Fluxo Automático

1. `POST /auth/register-tenant`
2. Sistema cria schema PostgreSQL: `CREATE SCHEMA tenant_{slug}_{hash}`
3. Migrations aplicadas automaticamente no schema do tenant
4. Tenant pronto para uso

### Implementação

```typescript
private async createTenantSchema(schemaName: string): Promise<void> {
  await this.prisma.$executeRawUnsafe(
    `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`
  );

  const tenantUrl = `${DATABASE_URL}?schema=${schemaName}`;
  execSync(`DATABASE_URL="${tenantUrl}" npx prisma migrate deploy`);
}
```

---

## Aplicação de Migrations em Tenant Schemas

### ⚠️ IMPORTANTE: Prisma Migrate Deploy

Em arquiteturas multi-tenant com schema isolation, **não basta rodar `prisma migrate deploy` apenas uma vez**. O comando deve ser executado **para cada schema de tenant** individualmente.

#### Por que?

Quando você cria/modifica modelos Prisma que são TENANT-SCOPED:

1. **Enums do Prisma** geram tipos PostgreSQL específicos por schema (ex: `tenant_X."ScheduledEventStatus"`)
2. **Migrations** criam tabelas, colunas, índices e **tipos enum** no schema alvo
3. Se você rodar `prisma migrate deploy` apenas no schema público, **os tenant schemas não recebem as migrations**

#### Sintoma do Problema

```text
ERROR: type "tenant_xxx.NomeDoEnum" does not exist
```

Isso ocorre quando você tenta usar um enum em queries via `getTenantClient()`, mas o tipo enum não foi criado no schema do tenant.

### Script Automático: `apply-tenant-migrations.ts`

O projeto inclui um script que aplica migrations em todos os tenant schemas automaticamente:

```bash
# Aplicar migrations em TODOS os tenants ativos
node apps/backend/scripts/apply-tenant-migrations.ts

# Aplicar migrations em um tenant específico
node apps/backend/scripts/apply-tenant-migrations.ts --schema=tenant_nome_abc123
```

#### Como Funciona

```typescript
// 1. Buscar todos os tenants ativos
const tenants = await prisma.tenant.findMany({
  where: { deletedAt: null },
  select: { schemaName: true },
});

// 2. Para cada tenant, criar schema (se não existir)
await prisma.$executeRawUnsafe(
  `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`
);

// 3. Executar prisma migrate deploy com DATABASE_URL específica
const tenantUrl = `${DATABASE_URL}?schema=${schemaName}`;
execSync(`DATABASE_URL="${tenantUrl}" npx prisma migrate deploy`, {
  env: { ...process.env, DATABASE_URL: tenantUrl },
});
```

#### Quando Executar

Execute o script **sempre que**:

- ✅ Criar um novo modelo Prisma TENANT-SCOPED
- ✅ Adicionar/modificar enums em modelos TENANT-SCOPED
- ✅ Criar novas migrations que afetam tenant schemas
- ✅ Após clonar o repositório e criar tenants manualmente
- ✅ Após restaurar backup do banco de dados

#### Integração com CI/CD

```yaml
# .github/workflows/deploy.yml
- name: Apply tenant migrations
  run: node apps/backend/scripts/apply-tenant-migrations.ts
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Scripts Úteis

```bash
# Sincronizar migrations em todos os tenants
node apps/backend/scripts/apply-tenant-migrations.ts

# Sincronizar um tenant específico
node apps/backend/scripts/apply-tenant-migrations.ts --schema=tenant_nome_abc123

# Validar integridade dos schemas
curl http://localhost:3000/health

# Listar schemas existentes (SQL)
SELECT schema_name FROM information_schema.schemata
WHERE schema_name LIKE 'tenant_%';

# Verificar enums criados em um schema
SELECT typname FROM pg_type
WHERE typnamespace = (
  SELECT oid FROM pg_namespace WHERE nspname = 'tenant_nome_abc123'
) AND typtype = 'e';
```

---

## Testes de Isolamento

Ver: `apps/backend/test/e2e/multi-tenant-isolation.e2e-spec.ts`

**Validações cobertas:**

- ✅ Dados de um tenant não são visíveis para outro
- ✅ Mesmo email pode existir em tenants diferentes
- ✅ Queries não contêm filtro `WHERE tenantId`
- ✅ JOINs cross-schema são bloqueados
- ✅ Schemas PostgreSQL existem e estão isolados

---

## Troubleshooting

### "Schema não encontrado"

```sql
-- Verificar se schema existe
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'tenant_abc123';

-- Recriar se necessário
npm run tenants:sync-schemas
```

### "Dados vazando entre tenants"

```typescript
// ❌ Usando public client (ERRADO)
await this.prisma.resident.findMany({ where: { tenantId } });

// ✅ Usando tenant client (CORRETO)
await this.tenantContext.client.resident.findMany({
  /* */
});
```

---

## Performance

### Benchmarks (vs filtro tenantId)

| Operação         | Filtro tenantId | Schema Isolation | Melhoria |
| ---------------- | --------------- | ---------------- | -------- |
| SELECT residents | 12ms            | 8ms              | **33%**  |
| INSERT resident  | 15ms            | 10ms             | **33%**  |
| JOIN complex     | 45ms            | 30ms             | **33%**  |

---

## ⚠️ Violações Identificadas e Correções (19/01/2026)

Durante auditoria do schema Prisma, foram identificadas **3 violações** de arquitetura cross-schema:

### ❌ Violação 1: `BedStatusHistory`

**Problema:** Modelo TENANT-SCOPED com FK para `Tenant` (public schema)

```prisma
model BedStatusHistory {
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id]) // ❌ Cross-schema FK
}
```

**Motivo:** `BedStatusHistory` rastreia mudanças de status de leitos (infraestrutura do tenant), deve estar no schema tenant_xxx

**Correção:**

```prisma
model BedStatusHistory {
  tenantId String @db.Uuid // Stored for reference, no FK (cross-schema)
  bedId    String @db.Uuid

  bed Bed @relation(fields: [bedId], references: [id])
  // tenantId é derivável de bed.tenantId (hierarquia: Bed → Floor → Building → tenantId)
}
```

### ❌ Violação 2: `IncidentMonthlyIndicator`

**Problema:** Modelo TENANT-SCOPED com FK para `Tenant`

```prisma
model IncidentMonthlyIndicator {
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id]) // ❌ Cross-schema FK
}
```

**Motivo:** Indicadores mensais RDC 502/2021 são calculados a partir de `DailyRecord` (tenant-scoped), pertencem ao schema do tenant

**Correção:**

```prisma
model IncidentMonthlyIndicator {
  tenantId     String  @db.Uuid // Stored for reference, no FK (cross-schema)
  calculatedBy String? @db.Uuid // Stored for reference, no FK (cross-schema)

  // Sem FKs - tenantId e calculatedBy são apenas para auditoria/rastreamento
  // Relações não podem existir devido a cross-schema constraints
}
```

### ❌ Violação 3: `Room`

**Problema:** Modelo TENANT-SCOPED com FK para `Tenant`

```prisma
model Room {
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id]) // ❌ Cross-schema FK
}
```

**Motivo:** Quartos são infraestrutura física específica do tenant (tenant-scoped)

**Correção:**

```prisma
model Room {
  tenantId String @db.Uuid // Stored for reference, no FK (cross-schema)
  floorId  String @db.Uuid

  floor Floor @relation(fields: [floorId], references: [id])
  beds  Bed[]
  // tenantId é derivável de floor.tenantId (hierarquia: Room → Floor → Building → tenantId)
}
```

### Padrão Identificado

Todas as 3 violações seguem o mesmo padrão:

- **Modelos TENANT-SCOPED** (dados operacionais específicos do tenant)
- **FK direto para `Tenant`** no public schema
- **Cross-schema constraint** não permitido pelo PostgreSQL
- **tenantId derivável** de relações parent (ex: Bed → Floor → Building)

### Correção Aplicada

1. ✅ Remover `@relation` para `Tenant`
2. ✅ Manter `tenantId` como campo de referência (sem FK)
3. ✅ Adicionar comentário padrão: `// Stored for reference, no FK (cross-schema)`
4. ✅ Remover relações bidirecionais no modelo `Tenant`
5. ✅ Validar schema: `npx prisma validate`
6. ✅ Regenerar client: `npx prisma generate`

---

## Checklist de Implementação

Ao criar novo service que acessa dados de tenant:

- [ ] Service usa `@Injectable({ scope: Scope.REQUEST })`
- [ ] Injeta `TenantContextService` no construtor
- [ ] Usa `this.tenantContext.client.model` (NÃO `this.prisma.model`)
- [ ] **NÃO** passa `tenantId` como parâmetro
- [ ] **NÃO** usa filtro `where: { tenantId }`
- [ ] Testa isolamento com múltiplos tenants

**Ao criar novo modelo Prisma:**

- [ ] Definir se é SHARED (public) ou TENANT-SCOPED (tenant_xxx)
- [ ] Se TENANT-SCOPED: **NÃO** adicionar FK para `Tenant`
- [ ] Usar comentário: `tenantId String @db.Uuid // Stored for reference, no FK (cross-schema)`
- [ ] Validar com `npx prisma validate`

---

## Referências

- **Prisma Multi-Tenancy:** <https://www.prisma.io/docs/guides/database/multi-tenancy>
- **PostgreSQL Schemas:** <https://www.postgresql.org/docs/current/ddl-schemas.html>
- **RDC 502/2021 ANVISA:** Art. 62 (Proteção de dados pessoais)
- **LGPD:** Art. 46 (Tratamento de dados por controlador)

---

**Migração de v1 (Shared Schema) para v2 (Schema Isolation):** Ver `/docs/architecture/MULTI-TENANT-ISOLATION.md` para histórico detalhado.
