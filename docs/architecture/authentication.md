# Sistema de Autenticação

**Versão:** 1.0.0
**Última atualização:** 11/12/2025

## Visão Geral

Autenticação JWT com refresh tokens e permissões baseadas em cargos (RBAC).

## Fluxo de Autenticação

```
1. POST /auth/login { email, password }
   ↓
2. Validação de credenciais (bcrypt)
   ↓
3. Geração de tokens:
   - accessToken (15min)
   - refreshToken (7d)
   ↓
4. Resposta: { user, accessToken, refreshToken }
   ↓
5. Frontend armazena em localStorage
   ↓
6. Requests com header: Authorization: Bearer {accessToken}
   ↓
7. Refresh: POST /auth/refresh { refreshToken }
```

## Payload do JWT

```typescript
{
  sub: userId,
  email: string,
  tenantId: string,
  positionCode: PositionCode,
  iat: number,
  exp: number
}
```

## Guards

- `JwtAuthGuard` - Validação de token
- `PermissionsGuard` - Validação de permissões por cargo

## Referências

- [Sistema de Permissões](../modules/permissions.md)
- [Multi-Tenancy](multi-tenancy.md)
