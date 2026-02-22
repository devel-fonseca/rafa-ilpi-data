# Módulo: Beds

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/beds`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/beds/beds.module.ts`
- Controllers:
  - `apps/backend/src/beds/beds.controller.ts`
- Services:
  - `apps/backend/src/beds/beds.service.ts`
- DTOs: 6 arquivo(s) em `apps/backend/src/beds/dto`

## Endpoints HTTP

### `beds.controller.ts`

- Base do controller: `'beds'`
- Rotas (decorators):
  - Linha 32:   @Post()
  - Linha 42:   @Get()
  - Linha 59:   @Get('stats/occupancy')
  - Linha 66:   @Get('map/full')
  - Linha 75:   @Get('status-history')
  - Linha 90:   @Get(':id')
  - Linha 97:   @Patch(':id')
  - Linha 108:   @Delete(':id')
  - Linha 116:   @Post(':id/reserve')
  - Linha 129:   @Post(':id/block')
  - Linha 142:   @Post(':id/release')
- Segurança/autorização (decorators encontrados):
  - Linha 27: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
  - Linha 34:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 44:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 61:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 68:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 77:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 92:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 99:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 110:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 118:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 131:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 144:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/beds`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
