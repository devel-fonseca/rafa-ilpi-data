# Módulo: Institutional Profile

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/institutional-profile`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/institutional-profile/institutional-profile.module.ts`
- Controllers:
  - `apps/backend/src/institutional-profile/institutional-documents.controller.ts`
  - `apps/backend/src/institutional-profile/institutional-profile.controller.ts`
- Services:
  - `apps/backend/src/institutional-profile/institutional-profile.service.ts`
- DTOs: 8 arquivo(s) em `apps/backend/src/institutional-profile/dto`

## Endpoints HTTP

### `institutional-documents.controller.ts`

- Base do controller: `'institutional-documents'`
- Rotas (decorators):
  - Linha 45:   @Get()
  - Linha 62:   @Post('with-file-url')
  - Linha 81:   @Post()
  - Linha 118:   @Patch(':id')
  - Linha 132:   @Post(':id/file')
  - Linha 153:   @Delete(':id')
  - Linha 170:   @Get('compliance')
  - Linha 180:   @Get('requirements/:legalNature')
  - Linha 198:   @Get('all-document-types/:legalNature')
  - Linha 218:   @Post('update-statuses')
  - Linha 231:   @Get(':id')
- Segurança/autorização (decorators encontrados):
  - Linha 32: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
  - Linha 46:   @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  - Linha 63:   @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  - Linha 82:   @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  - Linha 119:   @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  - Linha 133:   @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  - Linha 154:   @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  - Linha 171:   @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  - Linha 181:   @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  - Linha 199:   @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)
  - Linha 219:   @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  - Linha 232:   @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_PROFILE)

### `institutional-profile.controller.ts`

- Base do controller: `'institutional-profile'`
- Rotas (decorators):
  - Linha 30:   @Get()
  - Linha 39:   @Post()
  - Linha 52:   @Post('logo')
- Segurança/autorização (decorators encontrados):
  - Linha 13: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - Linha 40:   @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)
  - Linha 53:   @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_PROFILE)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/institutional-profile`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
