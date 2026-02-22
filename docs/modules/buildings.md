# Módulo: Buildings

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/buildings`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/buildings/buildings.module.ts`
- Controllers:
  - `apps/backend/src/buildings/buildings.controller.ts`
- Services:
  - `apps/backend/src/buildings/buildings.service.ts`
- DTOs: 5 arquivo(s) em `apps/backend/src/buildings/dto`

## Endpoints HTTP

### `buildings.controller.ts`

- Base do controller: `'buildings'`
- Rotas (decorators):
  - Linha 29:   @Post()
  - Linha 38:   @Get()
  - Linha 47:   @Get('stats/summary')
  - Linha 53:   @Get(':id')
  - Linha 61:   @Patch(':id')
  - Linha 71:   @Delete(':id')
  - Linha 80:   @Post('structure')
- Segurança/autorização (decorators encontrados):
  - Linha 23: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
  - Linha 30:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 39:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 48:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 54:   @RequirePermissions(PermissionType.VIEW_BEDS)
  - Linha 62:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 72:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)
  - Linha 81:   @RequirePermissions(PermissionType.MANAGE_INFRASTRUCTURE)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/buildings`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
