# Módulo: Resident Health

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/resident-health`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/resident-health/resident-health.module.ts`
- Controllers:
  - `apps/backend/src/resident-health/resident-health.controller.ts`
- Services:
  - `apps/backend/src/resident-health/resident-health.service.ts`
- DTOs: 4 arquivo(s) em `apps/backend/src/resident-health/dto`

## Endpoints HTTP

### `resident-health.controller.ts`

- Base do controller: `'resident-health'`
- Rotas (decorators):
  - Linha 52:   @Get(':residentId/summary')
  - Linha 74:   @Get(':residentId/blood-type')
  - Linha 84:   @Post('blood-type')
  - Linha 103:   @Patch('blood-type/:id')
  - Linha 125:   @Get(':residentId/anthropometry')
  - Linha 150:   @Get(':residentId/anthropometry/latest')
  - Linha 161:   @Post('anthropometry')
  - Linha 179:   @Patch('anthropometry/:id')
  - Linha 197:   @Delete('anthropometry/:id')
  - Linha 224:   @Get(':residentId/dependency-assessments')
  - Linha 238:   @Get(':residentId/dependency-assessments/current')
  - Linha 252:   @Post('dependency-assessments')
  - Linha 271:   @Patch('dependency-assessments/:id')
- Segurança/autorização (decorators encontrados):
  - Linha 41: @ApiBearerAuth('JWT-auth')
  - Linha 42: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - Linha 53:   @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  - Linha 75:   @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  - Linha 85:   @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  - Linha 104:   @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  - Linha 126:   @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  - Linha 151:   @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  - Linha 162:   @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  - Linha 180:   @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  - Linha 199:   @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  - Linha 225:   @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  - Linha 239:   @RequirePermissions(PermissionType.VIEW_CLINICAL_PROFILE)
  - Linha 253:   @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)
  - Linha 272:   @RequirePermissions(PermissionType.UPDATE_CLINICAL_PROFILE)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/resident-health`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
