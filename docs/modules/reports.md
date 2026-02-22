# Módulo: Reports

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/reports`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/reports/reports.module.ts`
- Controllers:
  - `apps/backend/src/reports/reports.controller.ts`
- Services:
  - `apps/backend/src/reports/reports.service.ts`
- DTOs: 5 arquivo(s) em `apps/backend/src/reports/dto`

## Endpoints HTTP

### `reports.controller.ts`

- Base do controller: `'reports'`
- Rotas (decorators):
  - Linha 26:   @Get('daily')
  - Linha 81:   @Get('residents')
  - Linha 100:   @Get('resident-care-summary/:residentId')
  - Linha 118:   @Get('shift-history/:shiftId')
  - Linha 138:   @Get('institutional/resident-profile')
- Segurança/autorização (decorators encontrados):
  - Linha 19: @ApiBearerAuth()
  - Linha 20: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
  - Linha 27:   @RequirePermissions(PermissionType.VIEW_REPORTS)
  - Linha 82:   @RequirePermissions(PermissionType.VIEW_REPORTS)
  - Linha 101:   @RequirePermissions(PermissionType.VIEW_REPORTS)
  - Linha 119:   @RequirePermissions(PermissionType.VIEW_REPORTS)
  - Linha 139:   @RequirePermissions(PermissionType.VIEW_REPORTS)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/reports`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
