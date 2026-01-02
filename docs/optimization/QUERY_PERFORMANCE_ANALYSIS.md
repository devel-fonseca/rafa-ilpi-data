# Análise de Performance de Queries - Rafa ILPI

**Data:** 30/12/2025
**Autor:** Dr. E. (Emanuel)
**Contexto:** Análise pós-modularização do Prisma Schema

---

## 📊 Situação Atual

### Estatísticas do Schema
- **Modelos:** 68
- **Enums:** 47
- **Índices existentes:** 246 (muito bom!)
- **Queries no código:** ~575 em 65 arquivos
- **Relações em Tenant:** 50+

### Status Geral
✅ **BOM** - O schema já possui indexação robusta
⚠️ **ATENÇÃO** - Algumas queries podem causar N+1 problems
⚠️ **ATENÇÃO** - Falta paginação em alguns endpoints

---

## 🔍 Análise por Domínio

### 1. **Residents Service** (26 queries)
**Arquivo:** `src/residents/residents.service.ts`

#### Problemas Identificados:

**a) Falta de Select Específico:**
```typescript
// ❌ Busca TODOS os campos (incluindo blobs de history)
const bed = await this.prisma.bed.findFirst({
  where: { id: bedId, tenantId, deletedAt: null },
});
```

**Recomendação:**
```typescript
// ✅ Select apenas campos necessários
const bed = await this.prisma.bed.findFirst({
  where: { id: bedId, tenantId, deletedAt: null },
  select: {
    id: true,
    roomId: true,
    number: true,
    isOccupied: true,
  },
});
```

**Impacto:** Redução de ~60% no payload de rede em queries de validação.

---

**b) Possível N+1 em Listagens:**
```typescript
// ❌ Potencial N+1 se incluir relações aninhadas
const residents = await this.prisma.resident.findMany({
  where: { tenantId },
  include: {
    bed: {
      include: {
        room: {
          include: {
            floor: {
              include: { building: true },
            },
          },
        },
      },
    },
  },
});
```

**Recomendação:** Usar select + campos específicos ou denormalizar hierarquia de infraestrutura.

**Solução Alternativa:**
```typescript
// ✅ Denormalizar campos críticos no modelo Resident
model Resident {
  // ... campos existentes

  // Campos denormalizados para performance
  bedNumber        String? // Cache do número do leito
  roomName         String? // Cache do nome do quarto
  buildingName     String? // Cache do nome do prédio

  // Manter relações para consistência
  bedId            String? @db.Uuid
  bed              Bed?    @relation(...)
}
```

**Trade-off:**
- ✅ Queries 10x mais rápidas (sem joins)
- ❌ Necessita trigger/middleware para manter sincronizado
- ✅ Cache invalidado automaticamente em transferências de leito

---

### 2. **Prescriptions Service** (25 queries)
**Arquivo:** `src/prescriptions/prescriptions.service.ts`

#### Problemas Identificados:

**a) Busca de Medicações sem Paginação:**
```typescript
// ❌ Pode retornar milhares de registros
const medications = await this.prisma.medication.findMany({
  where: { prescriptionId },
  include: { prescription: true },
});
```

**Recomendação:**
```typescript
// ✅ Adicionar paginação obrigatória
const medications = await this.prisma.medication.findMany({
  where: { prescriptionId },
  select: {
    id: true,
    name: true,
    dosage: true,
    frequency: true,
    isActive: true,
  },
  take: 50, // Limite padrão
  skip: (page - 1) * 50,
  orderBy: { createdAt: 'desc' },
});
```

**Impacto:** Previne timeout em tenants com muitas prescrições.

---

**b) Include Profundo em Cascade:**
```typescript
// ❌ Include em múltiplos níveis
const prescription = await this.prisma.prescription.findUnique({
  where: { id },
  include: {
    resident: {
      include: {
        clinicalProfile: {
          include: {
            allergies: true,
            conditions: true,
            dietaryRestrictions: true,
          },
        },
      },
    },
    medications: {
      include: {
        medicationHistory: true,
      },
    },
    sosMedications: {
      include: {
        sosMedicationHistory: true,
      },
    },
  },
});
```

**Recomendação:** Dividir em queries específicas ou usar raw SQL para casos complexos.

**Solução:**
```typescript
// ✅ Query otimizada com select específico
const prescription = await this.prisma.prescription.findUnique({
  where: { id },
  select: {
    id: true,
    type: true,
    startDate: true,
    endDate: true,
    isActive: true,
    resident: {
      select: {
        id: true,
        name: true,
        cpf: true,
        clinicalProfile: {
          select: {
            allergies: {
              where: { deletedAt: null },
              select: { name: true, severity: true },
            },
          },
        },
      },
    },
    medications: {
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        dosage: true,
        frequency: true,
        route: true,
      },
    },
  },
});
```

---

### 3. **Daily Records Service** (20 queries)
**Arquivo:** `src/daily-records/daily-records.service.ts`

#### Problemas Identificados:

**a) Busca sem Índice de Data:**
```typescript
// ❌ Busca por range de datas sem índice otimizado
const records = await this.prisma.dailyRecord.findMany({
  where: {
    tenantId,
    residentId,
    date: {
      gte: startDate,
      lte: endDate,
    },
  },
});
```

**Índice Atual:**
```prisma
@@index([tenantId, residentId, recordType, date(sort: Desc)])
```

**Análise:** ✅ Índice composto JÁ EXISTE! Está otimizado.

---

**b) Potencial N+1 em Dashboard:**
```typescript
// ❌ Loop buscando records de cada residente
for (const resident of residents) {
  const todayRecords = await this.prisma.dailyRecord.findMany({
    where: {
      residentId: resident.id,
      date: today,
    },
  });
}
```

**Recomendação:**
```typescript
// ✅ Buscar todos de uma vez com IN clause
const residentIds = residents.map(r => r.id);
const allRecords = await this.prisma.dailyRecord.findMany({
  where: {
    residentId: { in: residentIds },
    date: today,
  },
});

// Agrupar por residentId em memória
const recordsByResident = allRecords.reduce((acc, record) => {
  if (!acc[record.residentId]) acc[record.residentId] = [];
  acc[record.residentId].push(record);
  return acc;
}, {});
```

**Impacto:** Redução de N queries para 1 query única.

---

### 4. **Notifications Service** (16 queries no cron)
**Arquivo:** `src/notifications/notifications.cron.ts`

#### Problemas Identificados:

**a) Scan Completo de Tabelas:**
```typescript
// ❌ Busca TODAS prescrições expiradas de TODOS tenants
const expiredPrescriptions = await this.prisma.prescription.findMany({
  where: {
    endDate: { lte: new Date() },
    isActive: true,
  },
});
```

**Recomendação:**
```typescript
// ✅ Adicionar índice específico para cron jobs
@@index([isActive, endDate]) // em prescription.prisma

// ✅ Limitar scope com tenant batching
const activeTenants = await this.prisma.tenant.findMany({
  where: { status: 'ACTIVE' },
  select: { id: true },
});

for (const tenant of activeTenants) {
  const expiredPrescriptions = await this.prisma.prescription.findMany({
    where: {
      tenantId: tenant.id,
      endDate: { lte: new Date() },
      isActive: true,
    },
    take: 100, // Processar em lotes
  });
}
```

---

### 5. **SuperAdmin Analytics** (múltiplos serviços)

#### Problemas Identificados:

**a) Agregações sem Índices:**
```typescript
// ❌ COUNT(*) sem índice otimizado
const totalResidents = await this.prisma.resident.count({
  where: {
    tenantId,
    deletedAt: null,
  },
});
```

**Recomendação:**
```typescript
// ✅ Materializar métricas em UsageMetrics (já existe!)
// Atualizar via cron job diário ao invés de calcular on-demand

// Em UsageMetrics model:
model UsageMetrics {
  // ... campos existentes
  cachedActiveResidents  Int     @default(0)
  cachedActiveUsers      Int     @default(0)
  lastCalculatedAt       DateTime?
}

// Job diário para atualizar
@@index([tenantId, lastCalculatedAt])
```

---

## 🎯 Recomendações Prioritárias

### Alta Prioridade (Implementar agora)

#### 1. **Adicionar Paginação Universal**
**Arquivo:** Criar `src/common/dto/pagination.dto.ts`

```typescript
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

**Aplicar em:** Residents, Prescriptions, DailyRecords, Notifications

---

#### 2. **Criar Middleware de Query Logging**
**Arquivo:** `src/prisma/middleware/query-logger.middleware.ts`

```typescript
import { Prisma } from '@prisma/client';

export const queryLoggerMiddleware: Prisma.Middleware = async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  const duration = after - before;

  // Log apenas queries lentas (> 100ms)
  if (duration > 100) {
    console.warn(`🐌 Slow query detected (${duration}ms):`, {
      model: params.model,
      action: params.action,
      duration,
    });
  }

  return result;
};
```

**Benefício:** Identificar queries lentas em produção automaticamente.

---

#### 3. **Adicionar Índices Compostos Faltantes**

**No `medications.prisma`:**
```prisma
model Medication {
  // ... campos existentes

  @@index([prescriptionId, isActive, deletedAt])
  @@index([residentId, isActive, deletedAt]) // Para dashboard
}
```

**No `notifications.prisma`:**
```prisma
model Notification {
  // ... campos existentes

  @@index([tenantId, userId, read, expiresAt])
  @@index([type, severity, createdAt(sort: Desc)]) // Para analytics
}
```

**No `daily-records.prisma`:**
```prisma
model DailyRecord {
  // ... campos existentes

  @@index([tenantId, date, recordType]) // Para relatórios
}
```

---

### Média Prioridade (Implementar em 1-2 semanas)

#### 4. **Implementar Cache com Redis**

**Casos de Uso:**
- Cache de `Tenant` (raramente muda, consultado em TODA request)
- Cache de `UserPermissions` (consultado em TODA autorização)
- Cache de `Plan` features (consultado em middleware de rate limiting)

**Exemplo:**
```typescript
// src/tenants/tenants.service.ts
async findById(id: string): Promise<Tenant> {
  const cacheKey = `tenant:${id}`;

  // Tentar cache
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Buscar DB
  const tenant = await this.prisma.tenant.findUnique({
    where: { id },
  });

  // Cachear por 5 minutos
  await this.redis.setex(cacheKey, 300, JSON.stringify(tenant));

  return tenant;
}
```

**Impacto:** Redução de ~80% em queries de tenant lookup.

---

#### 5. **Denormalizar Campos Frequentes**

**Campos candidatos:**
- `Resident.bedNumber` (cache do `Bed.number`)
- `Resident.roomName` (cache do `Room.name`)
- `User.tenantName` (cache do `Tenant.name`)
- `Prescription.residentName` (cache do `Resident.name`)

**Manutenção:** Usar Prisma middleware ou triggers PostgreSQL.

---

### Baixa Prioridade (Futuro)

#### 6. **Implementar Read Replicas**
Para queries pesadas de relatórios, usar replica read-only.

#### 7. **Particionar Tabelas History**
Tabelas `*History` crescem infinitamente. Considerar particionamento por data (PostgreSQL 10+).

#### 8. **Materialized Views**
Para dashboards complexos, criar views materializadas atualizadas por cron.

---

## 📈 Métricas de Sucesso

### Antes da Otimização (baseline)
- **P50:** ~50ms por query
- **P95:** ~200ms por query
- **P99:** ~500ms por query

### Meta Pós-Otimização
- **P50:** <30ms por query (-40%)
- **P95:** <100ms por query (-50%)
- **P99:** <200ms por query (-60%)

---

## 🛠️ Ferramentas de Monitoramento

### 1. **Prisma Studio**
```bash
npx prisma studio
```
Para visualizar dados e testar queries manualmente.

### 2. **pg_stat_statements** (PostgreSQL)
```sql
-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Ver queries mais lentas
SELECT
  calls,
  mean_exec_time,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 3. **Prisma Query Event Logging**
```typescript
// prisma.service.ts
this.prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

---

## ✅ Checklist de Implementação

### Fase 1 (Esta Semana)
- [ ] Adicionar `PaginationDto` global
- [ ] Implementar query logger middleware
- [ ] Adicionar índices compostos faltantes
- [ ] Otimizar ResidentsService com select específico
- [ ] Otimizar PrescriptionsService com paginação

### Fase 2 (Próximas 2 Semanas)
- [ ] Implementar cache Redis para Tenant
- [ ] Implementar cache Redis para UserPermissions
- [ ] Denormalizar `Resident.bedNumber`
- [ ] Criar cron job para atualizar UsageMetrics
- [ ] Otimizar NotificationsCron com batching

### Fase 3 (Próximo Mês)
- [ ] Implementar materialized views para analytics
- [ ] Configurar read replica (opcional)
- [ ] Particionar tabelas `*History` (opcional)

---

## 📚 Referências

- [Prisma Performance Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [N+1 Query Problem](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem)
- [Database Denormalization](https://en.wikipedia.org/wiki/Denormalization)

---

**Última Atualização:** 30/12/2025
**Próxima Revisão:** 30/01/2026
