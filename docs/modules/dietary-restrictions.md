# Módulo: Dietary Restrictions

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/dietary-restrictions`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/dietary-restrictions/dietary-restrictions.module.ts`
- Controllers:
  - `apps/backend/src/dietary-restrictions/dietary-restrictions.controller.ts`
- Services:
  - `apps/backend/src/dietary-restrictions/dietary-restrictions.service.ts`
- DTOs: 3 arquivo(s) em `apps/backend/src/dietary-restrictions/dto`

## Endpoints HTTP

### `dietary-restrictions.controller.ts`

- Base do controller: `'dietary-restrictions'`
- Rotas (decorators):
  - Linha 43:   @Post()
  - Linha 61:   @Get('resident/:residentId')
  - Linha 76:   @Get(':id')
  - Linha 88:   @Patch(':id')
  - Linha 112:   @Delete(':id')
  - Linha 139:   @Get(':id/history')
  - Linha 155:   @Get(':id/history/:versionNumber')
- Segurança/autorização (decorators encontrados):
  - Linha 35: @ApiBearerAuth('JWT-auth')
  - Linha 36: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - Linha 44:   @RequirePermissions(PermissionType.CREATE_DIETARY_RESTRICTIONS)
  - Linha 62:   @RequirePermissions(PermissionType.VIEW_DIETARY_RESTRICTIONS)
  - Linha 77:   @RequirePermissions(PermissionType.VIEW_DIETARY_RESTRICTIONS)
  - Linha 89:   @RequirePermissions(PermissionType.UPDATE_DIETARY_RESTRICTIONS)
  - Linha 114:   @RequirePermissions(PermissionType.DELETE_DIETARY_RESTRICTIONS)
  - Linha 115:   @RequiresReauthentication()
  - Linha 116:   @UseGuards(JwtAuthGuard, PermissionsGuard, ReauthenticationGuard)
  - Linha 140:   @RequirePermissions(PermissionType.VIEW_DIETARY_RESTRICTIONS)
  - Linha 156:   @RequirePermissions(PermissionType.VIEW_DIETARY_RESTRICTIONS)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/dietary-restrictions`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
