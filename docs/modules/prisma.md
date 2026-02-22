# Módulo: Prisma

**Status:** ✅ Implementado  
**Última atualização:** 22/02/2026  
**Diretório:** `apps/backend/src/prisma`

## Visão Geral

Módulo global de acesso a dados com Prisma, responsável por:

- conexão com o schema `public` (dados compartilhados);
- criação/caching de clients por schema de tenant;
- inicialização de contexto multi-tenant por request;
- middlewares transversais (log de query, criptografia, sincronização de CPF, monitoramento arquitetural em DEV/TEST).

## Arquivos Principais

- `apps/backend/src/prisma/prisma.module.ts`
  - Módulo `@Global()`, exporta `PrismaService` e `TenantContextService`.
- `apps/backend/src/prisma/prisma.service.ts`
  - Estende `PrismaClient`;
  - mantém `tenantClients: Map<string, PrismaClient>`;
  - implementa `getTenantClient(schemaName)`, `createTenantSchema(schemaName)`, `deleteTenantSchema(schemaName)`;
  - registra middlewares do Prisma para cliente `public` e clientes de tenant.
- `apps/backend/src/prisma/tenant-context.service.ts`
  - Scope `REQUEST`;
  - resolve `tenantId -> schemaName` via `TenantSchemaCacheService`;
  - expõe:
    - `client` (tenant-specific schema),
    - `publicClient` (schema `public`),
    - `tenantId`.

## Prisma Schema Modularizado

A fonte de verdade do schema é:

- `apps/backend/prisma/schema/` (pasta modular com múltiplos `.prisma`);
- arquivo base: `apps/backend/prisma/schema/_base.prisma`.

O backend está configurado para usar a pasta modular diretamente:

- `apps/backend/package.json` -> `"prisma.schema": "prisma/schema"`.

### Sobre `schema-merged.prisma`

- No estado atual do projeto, `schema-merged.prisma` **não é fonte de verdade**.
- Se existir em ambiente local, deve ser tratado apenas como artefato temporário de compatibilidade/ferramenta.
- As operações oficiais (`generate`, `migrate`, `deploy`) devem usar `--schema prisma/schema`.

## Fluxo Multi-Tenant de Dados

1. Request autenticada chega com `tenantId` no JWT.
2. Interceptor inicializa `TenantContextService`.
3. `TenantContextService` resolve `schemaName` (cache + fallback).
4. `PrismaService.getTenantClient(schemaName)` retorna client do schema do tenant.
5. Serviços usam:
   - `tenantContext.client` para tabelas do tenant;
   - `tenantContext.publicClient` para tabelas globais (`public`).

## Operação (Comandos)

```bash
# Gerar Prisma Client (schema modular)
npx prisma generate --schema prisma/schema

# Aplicar migrations no schema public
npx prisma migrate deploy --schema prisma/schema

# Sincronizar migrations em schemas tenant ativos
npm run tenants:sync-schemas
```

## Regras e Cuidados

- Não usar filtro manual `tenantId` em tabelas tenant-specific quando a query já é executada no schema do tenant.
- Não usar schema consolidado manual como entrada principal do Prisma.
- Toda mudança de schema deve ser validada para:
  - `public` (migrate deploy),
  - tenants ativos (`tenants:sync-schemas`).

## Endpoints HTTP

Este módulo não expõe endpoints HTTP diretamente.
