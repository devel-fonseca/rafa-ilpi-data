# Módulo: Conditions

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/conditions`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/conditions/conditions.module.ts`
- Controllers:
  - `apps/backend/src/conditions/conditions.controller.ts`
- Services:
  - `apps/backend/src/conditions/conditions.service.ts`
- DTOs: 4 arquivo(s) em `apps/backend/src/conditions/dto`

## Endpoints HTTP

### `conditions.controller.ts`

- Base do controller: `'conditions'`
- Rotas (decorators):
  - Linha 41:   @Post()
  - Linha 50:   @Get('resident/:residentId')
  - Linha 61:   @Get(':id')
  - Linha 70:   @Patch(':id')
  - Linha 88:   @Delete(':id')
  - Linha 110:   @Get(':id/history')
  - Linha 126:   @Get(':id/history/:versionNumber')
- Segurança/autorização (decorators encontrados):
  - Linha 35: @ApiBearerAuth('JWT-auth')
  - Linha 36: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - Linha 42:   @RequirePermissions(PermissionType.CREATE_CONDITIONS)
  - Linha 51:   @RequirePermissions(PermissionType.VIEW_CONDITIONS)
  - Linha 62:   @RequirePermissions(PermissionType.VIEW_CONDITIONS)
  - Linha 71:   @RequirePermissions(PermissionType.UPDATE_CONDITIONS)
  - Linha 90:   @RequirePermissions(PermissionType.DELETE_CONDITIONS)
  - Linha 91:   @RequiresReauthentication()
  - Linha 92:   @UseGuards(JwtAuthGuard, PermissionsGuard, ReauthenticationGuard)
  - Linha 111:   @RequirePermissions(PermissionType.VIEW_CONDITIONS)
  - Linha 127:   @RequirePermissions(PermissionType.VIEW_CONDITIONS)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/conditions`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
