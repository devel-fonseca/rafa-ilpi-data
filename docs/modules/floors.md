# Módulo: Floors

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/floors`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/floors/floors.module.ts`
- Controllers:
  - `apps/backend/src/floors/floors.controller.ts`
- Services:
  - `apps/backend/src/floors/floors.service.ts`
- DTOs: 3 arquivo(s) em `apps/backend/src/floors/dto`

## Endpoints HTTP

### `floors.controller.ts`

- Base do controller: `'floors'`
- Rotas (decorators):
  - Linha 29:   @Post()
  - Linha 38:   @Get()
  - Linha 52:   @Get('stats/summary')
  - Linha 58:   @Get(':id')
  - Linha 64:   @Patch(':id')
  - Linha 74:   @Delete(':id')
- Segurança/autorização (decorators encontrados):
  - Linha 23: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
  - Linha 30:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 39:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 53:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 59:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 65:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 75:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/floors`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
