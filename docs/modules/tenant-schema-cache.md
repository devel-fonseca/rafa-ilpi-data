# Tenant Schema Cache

## Visão Geral

Sistema de cache Redis para resolver `tenantId → schemaName` em arquitetura multi-tenant PostgreSQL com schema-per-tenant.

**Problema eliminado:**
```sql
-- Esta query executava em TODA request autenticada (centenas/milhares por minuto)
SELECT schemaName FROM public.tenants WHERE id = ?
```

**Solução:**
- Cache Redis com TTL de ~30 minutos (27-33min com jitter)
- Hit rate esperado: >95% em produção
- Fallback automático para DB se Redis cair
- Proteção contra thundering herd em cache misses

---

## Arquitetura

### Fluxo de Operação

```
┌─────────────────────────────────────────────────────────────┐
│ HTTP Request (JWT com tenantId)                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ TenantContextService.initialize(tenantId)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ TenantSchemaCacheService.getSchemaName(tenantId)            │
│                                                             │
│  1. Check Redis: GET {env}:tenant:schema:{tenantId}        │
│     ├─ HIT  → return schemaName (metrics.hits++)           │
│     └─ MISS → continue (metrics.misses++)                  │
│                                                             │
│  2. Check in-flight promises (thundering herd protection)  │
│     ├─ EXISTS → await existing promise                     │
│     └─ NONE   → create new promise                         │
│                                                             │
│  3. Query DB: SELECT schemaName FROM tenants WHERE id = ?  │
│                                                             │
│  4. Save to Redis with jittered TTL (27-33min)             │
│     SET {env}:tenant:schema:{tenantId} = schemaName        │
│     EXPIRE ttl_with_jitter                                 │
│                                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ PrismaService.getTenantClient(schemaName)                   │
│ - Retorna Prisma Client configurado para o schema          │
└─────────────────────────────────────────────────────────────┘
```

### Cache-Aside Pattern

```typescript
async getSchemaName(tenantId: string): Promise<string> {
  // 1. Tentar cache (Redis)
  const cached = await redis.get(key)
  if (cached) return cached  // ✅ HIT

  // 2. Cache MISS - buscar do source of truth (PostgreSQL)
  const schemaName = await db.query(...)

  // 3. Populuar cache para próximas requests
  await redis.set(key, schemaName, ttl)

  return schemaName
}
```

---

## Melhorias de Produção

### 1. Namespace por Ambiente

**Problema:** Staging e Produção compartilhando mesmo Redis podem ter colisão de chaves.

**Solução:**
```typescript
// Constructor
const env = process.env.NODE_ENV || 'development'
this.CACHE_PREFIX = `${env}:tenant:schema:`

// Chaves geradas:
// - development:tenant:schema:{tenantId}
// - staging:tenant:schema:{tenantId}
// - production:tenant:schema:{tenantId}
```

**Benefício:** Isolamento completo entre ambientes.

---

### 2. Proteção Thundering Herd

**Problema:** Deploy/flush do cache → 1000 requests simultâneas → 1000 queries idênticas ao DB.

**Solução:** In-flight promises Map
```typescript
private readonly inFlightPromises = new Map<string, Promise<string>>()

async getSchemaName(tenantId: string): Promise<string> {
  // Cache miss detectado

  // Verificar se já existe promise em andamento para este tenant
  const existingPromise = this.inFlightPromises.get(tenantId)
  if (existingPromise) {
    // ✅ Aguardar promise existente (evita query duplicada)
    return existingPromise
  }

  // Criar nova promise e registrar
  const promise = this.fetchAndCache(tenantId)
  this.inFlightPromises.set(tenantId, promise)

  // Limpar quando terminar
  promise.finally(() => this.inFlightPromises.delete(tenantId))

  return promise
}
```

**Cenário:**
- 100 requests chegam ao mesmo tempo para tenant X
- Cache miss (deploy recente)
- Primeira request cria promise e faz query
- 99 requests seguintes **aguardam** a mesma promise
- **Resultado:** 1 query ao DB ao invés de 100

---

### 3. TTL com Jitter

**Problema:** Warm-up aquece 100 tenants → todos expiram em exatamente 30min → rajada de 100 queries.

**Solução:** Variação aleatória de ±10%
```typescript
private getTTLWithJitter(): number {
  const jitter = 1 + (Math.random() * 2 - 1) * 0.1  // ±10%
  return Math.floor(30 * 60 * jitter)
}

// Resultado: TTL varia entre 27min e 33min
// - Tenant A: expira em 27min
// - Tenant B: expira em 31min
// - Tenant C: expira em 29min
// → Expiração distribuída ao longo de 6 minutos
```

**Benefício:** Carga distribuída uniformemente, evita picos.

---

### 4. Modo Degradado (Graceful Degradation)

**Problema:** Redis cair → aplicação para de funcionar.

**Solução:** Try-catch em TODAS operações Redis + fallback para DB
```typescript
async getSchemaName(tenantId: string): Promise<string> {
  try {
    // Tentar Redis
    const cached = await this.cacheService.get<string>(cacheKey)
    if (cached) return cached
  } catch (error) {
    this.metrics.errors++
    this.logger.warn('Redis error - fallback para DB')
    // ⚠️ NÃO propagar erro - continuar com fallback
    return this.fetchFromDatabase(tenantId)
  }

  // Cache miss normal (Redis está OK)
  return this.fetchAndCache(tenantId)
}
```

**Garantia:** Se Redis cair:
- ✅ Aplicação continua funcionando (queries vão para DB)
- ✅ Performance degrada mas não quebra
- ✅ Quando Redis voltar, cache é repopulado automaticamente

---

### 5. Métricas de Observabilidade

**Métricas expostas:**
```typescript
interface Metrics {
  hits: number           // Quantas vezes encontrou no cache
  misses: number         // Quantas vezes precisou buscar do DB
  errors: number         // Quantas falhas do Redis
  dbFallbacks: number    // Quantas vezes usou fallback direto
  hitRate: string        // Taxa de acerto (ex: "96.5%")
  totalOperations: number
}
```

**API:**
```typescript
// Obter métricas
const metrics = tenantSchemaCache.getMetrics()
console.log(metrics)
// {
//   hits: 9500,
//   misses: 350,
//   errors: 2,
//   dbFallbacks: 2,
//   hitRate: "96.45%",
//   totalOperations: 9850
// }

// Log periódico (health check ou cron)
tenantSchemaCache.logMetrics()

// Reset (após coleta)
tenantSchemaCache.resetMetrics()
```

**Alertas sugeridos:**
- `hitRate < 90%` → Investigar TTL muito baixo ou flushes excessivos
- `errors > 100/min` → Redis está instável
- `dbFallbacks > 50/min` → Redis pode estar fora do ar

---

### 6. Audit Log

**Invalidações são logadas:**
```typescript
await tenantSchemaCache.invalidate(tenantId, 'Schema migration completed')

// Log estruturado:
// {
//   level: 'log',
//   message: '🗑️ Cache invalidado: production:tenant:schema:abc-123',
//   tenantId: 'abc-123',
//   reason: 'Schema migration completed',
//   timestamp: '2026-01-31T...'
// }
```

**Casos de uso:**
- `invalidate(tenantId, 'Schema name changed')` - tenant mudou schemaName (raro)
- `invalidate(tenantId, 'Tenant deactivated')` - tenant foi desativado
- `invalidate(tenantId, 'Manual flush by admin')` - debug/troubleshooting
- `clear('Post-deployment cache refresh')` - após deploy com mudanças em schemas

---

## API Reference

### getSchemaName(tenantId)

Resolve tenantId → schemaName com cache.

```typescript
const schemaName = await tenantSchemaCache.getSchemaName('abc-123')
// Retorna: 'tenant_acme_corp_xyz'
```

**Flow:**
1. Check Redis (hit? return)
2. Check in-flight promises (existe? aguarda)
3. Query DB + save to cache
4. Return schemaName

**Throws:** `Error` se tenant não existir no DB.

---

### invalidate(tenantId, reason?)

Invalida cache de tenant específico.

```typescript
await tenantSchemaCache.invalidate(
  'abc-123',
  'Schema renamed during migration'
)
```

**Quando usar:**
- Tenant mudou schemaName (MUITO raro)
- Tenant foi removido/desativado
- Debug: forçar re-fetch do DB

---

### clear(reason?)

Limpa TODO o cache de schemas.

```typescript
await tenantSchemaCache.clear('Post-deployment refresh')
```

**⚠️ Cuidado:** Próximas N requests terão cache miss (mas thundering herd protection evita rajada).

**Quando usar:**
- Após deploy com alterações em múltiplos tenants
- Troubleshooting: suspeita de dados stale generalizados
- Pré-warm-up: `clear()` + `warmUpAll()`

---

### warmUp(tenantId)

Pre-aquece cache para tenant específico.

```typescript
await tenantSchemaCache.warmUp('abc-123')
```

**Útil:** Após criar novo tenant ou antes de tráfego esperado.

---

### warmUpAll()

Pre-aquece cache para TODOS tenants ativos.

```typescript
await tenantSchemaCache.warmUpAll()
```

**Cenários:**
- Após deploy (reduz misses iniciais)
- Após restart do Redis
- Após flush manual (`clear()`)

**⚠️ Atenção:**
- Usa TTL com jitter (evita expiração em massa)
- Loga erros individuais mas não para se alguns falharem

---

### getMetrics()

Retorna métricas de observabilidade.

```typescript
const metrics = tenantSchemaCache.getMetrics()
console.log(metrics)
// {
//   hits: 10000,
//   misses: 500,
//   errors: 0,
//   dbFallbacks: 0,
//   hitRate: "95.24%",
//   totalOperations: 10500
// }
```

---

### logMetrics()

Loga métricas via Logger (Winston).

```typescript
tenantSchemaCache.logMetrics()
// Output: 📊 Cache metrics: { hits: 10000, misses: 500, ... }
```

**Integração sugerida:**
- Health check endpoint: `/health` retorna `getMetrics()`
- Cron job: a cada 5 minutos chama `logMetrics()` + coleta para Prometheus/Datadog
- Dashboard: gráfico de `hitRate` ao longo do tempo

---

### resetMetrics()

Reseta contadores (útil após coleta).

```typescript
tenantSchemaCache.resetMetrics()
```

---

## Performance

### Benchmarks Estimados

**Sem cache (query DB):**
- Latência: ~10-20ms por request
- Throughput: ~1000 req/s (limitado por pool de conexões DB)
- DB load: Alto (query constante)

**Com cache (Redis hit):**
- Latência: ~1-2ms por request
- Throughput: ~10.000 req/s (limitado por rede Redis)
- DB load: Mínimo (~5% do tráfego, apenas misses)

**Ganho:**
- **10x** redução de latência
- **10x** aumento de throughput
- **95%** redução de carga no DB

---

## Configuração

### Variáveis de Ambiente

```bash
# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password  # Opcional

# Node environment (afeta namespace)
NODE_ENV=production  # ou staging, development
```

### TTL Configuration

Ajustar no código se necessário:

```typescript
// TenantSchemaCacheService.ts
private readonly CACHE_TTL = 30 * 60       // Base: 30 minutos
private readonly CACHE_TTL_JITTER = 0.1    // ±10% variação
```

**Considerações:**
- **TTL muito baixo** (<5min): Muitos misses, carga no DB
- **TTL muito alto** (>60min): Dados podem ficar stale se tenant mudar
- **Recomendado:** 20-30 minutos com jitter

---

## Troubleshooting

### Hit Rate Baixo (<90%)

**Sintomas:** Métricas mostram `hitRate < 90%`

**Causas possíveis:**
1. TTL muito baixo → Aumentar `CACHE_TTL`
2. Flushes frequentes → Revisar quem está chamando `clear()`
3. Tráfego distribuído entre muitos tenants → Normal se tiver 1000+ tenants

**Ação:**
```typescript
// Verificar distribuição
tenantSchemaCache.logMetrics()

// Analisar logs de invalidação
grep "Cache invalidado" backend.log
```

---

### Redis Está Fora

**Sintomas:** `errors` e `dbFallbacks` altos nas métricas

**Comportamento esperado:**
- ✅ Aplicação continua funcionando (modo degradado)
- ⚠️ Performance degrada (~10x mais lento)
- ⚠️ DB load aumenta (~20x mais queries)

**Ação:**
1. Verificar saúde do Redis: `redis-cli ping`
2. Checar logs: `grep "Redis error" backend.log`
3. Restart Redis: `systemctl restart redis`
4. Cache se repopula automaticamente quando Redis volta

---

### Thundering Herd em Produção

**Sintomas:** Spike de queries ao DB após deploy

**Validação:**
```sql
-- PostgreSQL: checar query activity
SELECT COUNT(*) FROM pg_stat_activity
WHERE query LIKE '%SELECT schemaName FROM public.tenants%';
```

**Ação:**
1. Verificar logs: Deve mostrar "Thundering herd protection" messages
2. Se não mostrar: Bug na implementação, escalar
3. Warm-up preventivo após deploys:
   ```bash
   curl -X POST /api/admin/cache/warm-up-all
   ```

---

## Integração com Health Check

```typescript
// health.controller.ts
@Get('health')
async getHealth() {
  const cacheMetrics = this.tenantSchemaCache.getMetrics()

  return {
    status: 'ok',
    cache: {
      ...cacheMetrics,
      healthy: parseFloat(cacheMetrics.hitRate) > 90
    }
  }
}
```

**Resposta:**
```json
{
  "status": "ok",
  "cache": {
    "hits": 10000,
    "misses": 500,
    "errors": 0,
    "dbFallbacks": 0,
    "hitRate": "95.24%",
    "totalOperations": 10500,
    "healthy": true
  }
}
```

---

## Monitoramento Sugerido

### Dashboards

**Gráficos recomendados:**
1. **Hit Rate (%)** - Linha temporal
   - Meta: >95%
   - Alerta: <90%

2. **Operations (req/min)** - Stacked area
   - Hits (verde)
   - Misses (amarelo)
   - Errors (vermelho)

3. **DB Fallbacks (count)** - Linha
   - Meta: 0
   - Alerta: >10/min

4. **Latency (p50, p95, p99)** - Múltiplas linhas
   - Cache hit: ~1-2ms
   - Cache miss: ~10-20ms

### Alertas

```yaml
# Prometheus/Datadog rules
alerts:
  - name: cache_hit_rate_low
    condition: cache_hit_rate < 90
    severity: warning

  - name: cache_errors_high
    condition: cache_errors > 100/min
    severity: critical

  - name: db_fallbacks_active
    condition: db_fallbacks > 10/min
    severity: warning
```

---

## Changelog

### 2026-01-31 - Production Hardening
- ✨ Namespace por ambiente (evita colisão staging/prod)
- ✨ Proteção thundering herd (in-flight promises)
- ✨ TTL com jitter (evita expiração em massa)
- ✨ Modo degradado (fallback se Redis cair)
- ✨ Métricas de observabilidade
- ✨ Audit log em invalidações
- 📝 `invalidate()` e `clear()` aceitam `reason` opcional

### 2026-01-30 - Initial Implementation
- ✨ Cache-aside pattern com Redis
- ✨ TTL de 30 minutos
- ✨ Métodos: `getSchemaName`, `invalidate`, `clear`, `warmUp`, `warmUpAll`
- 🎯 Eliminou query repetitiva em public.tenants

---

## Links Relacionados

- [Multi-Tenancy Architecture](../architecture/multi-tenancy.md)
- [Redis Cache Service](./cache-service.md)
- [Tenant Context Service](./tenant-context.md)
- [Performance Optimization](../optimization/)
