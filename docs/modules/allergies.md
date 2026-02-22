# Módulo: Allergies

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/allergies`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/allergies/allergies.module.ts`
- Controllers:
  - `apps/backend/src/allergies/allergies.controller.ts`
- Services:
  - `apps/backend/src/allergies/allergies.service.ts`
- DTOs: 4 arquivo(s) em `apps/backend/src/allergies/dto`

## Endpoints HTTP

### `allergies.controller.ts`

- Base do controller: `'allergies'`
- Rotas (decorators):
  - Linha 41:   @Post()
  - Linha 50:   @Get('resident/:residentId')
  - Linha 61:   @Get(':id')
  - Linha 70:   @Patch(':id')
  - Linha 83:   @Delete(':id')
  - Linha 105:   @Get(':id/history')
  - Linha 121:   @Get(':id/history/:versionNumber')
- Segurança/autorização (decorators encontrados):
  - Linha 35: @ApiBearerAuth('JWT-auth')
  - Linha 36: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - Linha 42:   @RequirePermissions(PermissionType.CREATE_ALLERGIES)
  - Linha 51:   @RequirePermissions(PermissionType.VIEW_ALLERGIES)
  - Linha 62:   @RequirePermissions(PermissionType.VIEW_ALLERGIES)
  - Linha 71:   @RequirePermissions(PermissionType.UPDATE_ALLERGIES)
  - Linha 85:   @RequirePermissions(PermissionType.DELETE_ALLERGIES)
  - Linha 86:   @RequiresReauthentication()
  - Linha 87:   @UseGuards(JwtAuthGuard, PermissionsGuard, ReauthenticationGuard)
  - Linha 106:   @RequirePermissions(PermissionType.VIEW_ALLERGIES)
  - Linha 122:   @RequirePermissions(PermissionType.VIEW_ALLERGIES)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/allergies`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
