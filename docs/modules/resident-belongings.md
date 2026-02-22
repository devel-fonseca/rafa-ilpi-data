# Módulo: Resident Belongings

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/resident-belongings`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/resident-belongings/resident-belongings.module.ts`
- Controllers:
  - `apps/backend/src/resident-belongings/belonging-terms.controller.ts`
  - `apps/backend/src/resident-belongings/resident-belongings.controller.ts`
- Services:
  - `apps/backend/src/resident-belongings/belonging-terms.service.ts`
  - `apps/backend/src/resident-belongings/resident-belongings.service.ts`
- DTOs: 7 arquivo(s) em `apps/backend/src/resident-belongings/dto`

## Endpoints HTTP

### `belonging-terms.controller.ts`

- Base do controller: `'residents/:residentId/belonging-terms'`
- Rotas (decorators):
  - Linha 56:   @Post('generate')
  - Linha 78:   @Get()
  - Linha 100:   @Get(':id')
  - Linha 117:   @Get(':id/print')
  - Linha 134:   @Post(':id/upload-signed')
  - Linha 164:   @Post(':id/cancel')
- Segurança/autorização (decorators encontrados):
  - Linha 46: @ApiBearerAuth()
  - Linha 48: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - Linha 57:   @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  - Linha 79:   @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  - Linha 101:   @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  - Linha 118:   @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  - Linha 135:   @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  - Linha 165:   @RequirePermissions(PermissionType.UPDATE_RESIDENTS)

### `resident-belongings.controller.ts`

- Base do controller: `'residents/:residentId/belongings'`
- Rotas (decorators):
  - Linha 66:   @Post()
  - Linha 87:   @Get()
  - Linha 106:   @Get('stats')
  - Linha 122:   @Get(':id')
  - Linha 139:   @Get(':id/history')
  - Linha 156:   @Patch(':id')
  - Linha 179:   @Patch(':id/status')
  - Linha 202:   @Post(':id/photo')
  - Linha 232:   @Delete(':id')
- Segurança/autorização (decorators encontrados):
  - Linha 56: @ApiBearerAuth()
  - Linha 58: @UseGuards(JwtAuthGuard, PermissionsGuard)
  - Linha 67:   @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  - Linha 88:   @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  - Linha 107:   @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  - Linha 123:   @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  - Linha 140:   @RequirePermissions(PermissionType.VIEW_RESIDENTS)
  - Linha 157:   @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  - Linha 180:   @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  - Linha 203:   @RequirePermissions(PermissionType.UPDATE_RESIDENTS)
  - Linha 233:   @RequirePermissions(PermissionType.UPDATE_RESIDENTS)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/resident-belongings`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
