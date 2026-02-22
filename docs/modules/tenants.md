# Módulo: Tenants

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/tenants`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/tenants/tenants.module.ts`
- Controllers:
  - `apps/backend/src/tenants/tenants.controller.ts`
- Services:
  - `apps/backend/src/tenants/tenant-cache.service.ts`
  - `apps/backend/src/tenants/tenants.service.ts`
- DTOs: 5 arquivo(s) em `apps/backend/src/tenants/dto`

## Endpoints HTTP

### `tenants.controller.ts`

- Base do controller: `'tenants'`
- Rotas (decorators):
  - Linha 47:   @Post('register')
  - Linha 60:   @Get('me')
  - Linha 73:   @Get('me/subscription')
  - Linha 86:   @Get('me/features')
  - Linha 119:   @Get()
  - Linha 137:   @Get(':id')
  - Linha 150:   @Patch(':id')
  - Linha 170:   @Delete(':id')
  - Linha 188:   @Post(':tenantId/users')
  - Linha 209:   @Get(':tenantId/users')
  - Linha 227:   @Delete(':tenantId/users/:userId')
- Segurança/autorização (decorators encontrados):
  - Linha 48:   @Public()
  - Linha 61:   @UseGuards(JwtAuthGuard)
  - Linha 62:   @ApiBearerAuth()
  - Linha 74:   @UseGuards(JwtAuthGuard)
  - Linha 75:   @ApiBearerAuth()
  - Linha 87:   @UseGuards(JwtAuthGuard)
  - Linha 88:   @ApiBearerAuth()
  - Linha 120:   @UseGuards(JwtAuthGuard, RolesGuard)
  - Linha 122:   @ApiBearerAuth()
  - Linha 138:   @UseGuards(JwtAuthGuard)
  - Linha 139:   @ApiBearerAuth()
  - Linha 151:   @UseGuards(JwtAuthGuard, RolesGuard)
  - Linha 154:   @ApiBearerAuth()
  - Linha 171:   @UseGuards(JwtAuthGuard, RolesGuard)
  - Linha 174:   @ApiBearerAuth()
  - Linha 189:   @UseGuards(JwtAuthGuard, RolesGuard)
  - Linha 192:   @ApiBearerAuth()
  - Linha 210:   @UseGuards(JwtAuthGuard)
  - Linha 211:   @ApiBearerAuth()
  - Linha 228:   @UseGuards(JwtAuthGuard, RolesGuard)
  - Linha 231:   @ApiBearerAuth()

## Veja também

- [`tenant-billing.md`](./tenant-billing.md) - visão de billing/plano por tenant.
- [`portal-superadmin.md`](./portal-superadmin.md) - visão funcional do portal administrativo global.

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/tenants`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
