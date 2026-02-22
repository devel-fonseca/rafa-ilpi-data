# Módulo: Institutional Events

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/institutional-events`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/institutional-events/institutional-events.module.ts`
- Controllers:
  - `apps/backend/src/institutional-events/institutional-events.controller.ts`
- Services:
  - `apps/backend/src/institutional-events/institutional-events.service.ts`
- DTOs: 4 arquivo(s) em `apps/backend/src/institutional-events/dto`

## Endpoints HTTP

### `institutional-events.controller.ts`

- Base do controller: `'institutional-events'`
- Rotas (decorators):
  - Linha 50:   @Post()
  - Linha 63:   @Get()
  - Linha 112:   @Get('expiring-documents')
  - Linha 120:   @Get(':id')
  - Linha 130:   @Patch(':id')
  - Linha 145:   @Patch(':id/complete')
  - Linha 159:   @Delete(':id')
- Segurança/autorização (decorators encontrados):
  - Linha 40: @ApiBearerAuth()
  - Linha 42: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
  - Linha 51:   @RequirePermissions(PermissionType.CREATE_INSTITUTIONAL_EVENTS)
  - Linha 64:   @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_EVENTS)
  - Linha 113:   @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_EVENTS)
  - Linha 121:   @RequirePermissions(PermissionType.VIEW_INSTITUTIONAL_EVENTS)
  - Linha 131:   @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_EVENTS)
  - Linha 146:   @RequirePermissions(PermissionType.UPDATE_INSTITUTIONAL_EVENTS)
  - Linha 160:   @RequirePermissions(PermissionType.DELETE_INSTITUTIONAL_EVENTS)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/institutional-events`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
