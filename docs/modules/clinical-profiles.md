# Módulo: Clinical Profiles

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/clinical-profiles`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/clinical-profiles/clinical-profiles.module.ts`
- Controllers:
  - `apps/backend/src/clinical-profiles/clinical-profiles.controller.ts`
- Services:
  - `apps/backend/src/clinical-profiles/clinical-profiles.service.ts`
- DTOs: 3 arquivo(s) em `apps/backend/src/clinical-profiles/dto`

## Endpoints HTTP

### `clinical-profiles.controller.ts`

- Base do controller: `'clinical-profiles'`
- Rotas (decorators):
  - Linha 43:   @Post()
  - Linha 63:   @Get('resident/:residentId')
  - Linha 81:   @Get(':id')
  - Linha 90:   @Patch(':id')
  - Linha 115:   @Delete(':id')
  - Linha 140:   @Get(':id/history')
  - Linha 156:   @Get(':id/history/:versionNumber')
- Segurança/autorização (decorators encontrados):
  - Linha 34: @ApiBearerAuth('JWT-auth')
  - Linha 35: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - Linha 44:   @RequirePermissions(PermissionType.CREATE_CLINICAL_PROFILE)
  - Linha 64:   @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  - Linha 82:   @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  - Linha 91:   @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  - Linha 117:   @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  - Linha 141:   @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  - Linha 157:   @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/clinical-profiles`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
