# Módulo: Rooms

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/rooms`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/rooms/rooms.module.ts`
- Controllers:
  - `apps/backend/src/rooms/rooms.controller.ts`
- Services:
  - `apps/backend/src/rooms/rooms.service.ts`
- DTOs: 3 arquivo(s) em `apps/backend/src/rooms/dto`

## Endpoints HTTP

### `rooms.controller.ts`

- Base do controller: `'rooms'`
- Rotas (decorators):
  - Linha 29:   @Post()
  - Linha 38:   @Get()
  - Linha 52:   @Get(':id')
  - Linha 58:   @Patch(':id')
  - Linha 68:   @Delete(':id')
- Segurança/autorização (decorators encontrados):
  - Linha 23: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
  - Linha 30:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 39:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 53:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 59:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 69:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/rooms`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
