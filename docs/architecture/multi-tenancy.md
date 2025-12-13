# Arquitetura Multi-Tenancy

**Versão:** 1.0.0
**Última atualização:** 11/12/2025

## Visão Geral

O sistema Rafa ILPI Data implementa multi-tenancy completo onde cada ILPI (tenant) possui seus dados completamente isolados.

## Modelo de Isolamento

### Nível de Banco de Dados

**Shared Database, Shared Schema** com filtro obrigatório por `tenantId`:

```prisma
model Tenant {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @db.VarChar(255)
  cnpj        String   @unique @db.VarChar(18)
  // ... outros campos
  residents   Resident[]
  users       User[]
  documents   TenantDocument[]
  // ... todas as entidades relacionadas
}
```

### Regras de Isolamento

1. **Todos os modelos** possuem campo `tenantId` obrigatório
2. **Todas as queries** filtram por `tenantId`
3. **Validações** garantem que entidades relacionadas pertencem ao mesmo tenant
4. **JWT** contém `tenantId` para contexto automático

### Exemplo de Query Segura

```typescript
// ❌ ERRADO - Sem filtro de tenant
const records = await prisma.dailyRecord.findMany({
  where: { residentId }
})

// ✅ CORRETO - Com filtro de tenant
const records = await prisma.dailyRecord.findMany({
  where: {
    tenantId,  // OBRIGATÓRIO
    residentId,
    deletedAt: null
  }
})
```

## Referências

- [Schema do Banco](database-schema.md)
- [Sistema de Autenticação](authentication.md)
