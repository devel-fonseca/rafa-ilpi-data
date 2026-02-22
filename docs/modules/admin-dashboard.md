# Módulo: Admin Dashboard

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/admin-dashboard`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/admin-dashboard/admin-dashboard.module.ts`
- Controllers:
  - `apps/backend/src/admin-dashboard/admin-dashboard.controller.ts`
- Services:
  - `apps/backend/src/admin-dashboard/admin-dashboard.service.ts`
- DTOs: 6 arquivo(s) em `apps/backend/src/admin-dashboard/dto`

## Endpoints HTTP

### `admin-dashboard.controller.ts`

- Base do controller: `'admin-dashboard'`
- Rotas (decorators):
  - Linha 32:   @Get('overview')
  - Linha 49:   @Get('daily-summary')
  - Linha 67:   @Get('residents-growth')
  - Linha 85:   @Get('medications-history')
  - Linha 103:   @Get('mandatory-records-history')
  - Linha 121:   @Get('scheduled-records-history')
  - Linha 139:   @Get('occupancy-rate')
- Segurança/autorização (decorators encontrados):
  - Linha 25: @ApiBearerAuth()
  - Linha 27: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - Linha 33:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 50:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 68:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 86:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 104:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 122:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 140:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/admin-dashboard`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
