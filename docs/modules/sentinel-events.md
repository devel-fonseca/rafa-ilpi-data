# Módulo: Sentinel Events

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/sentinel-events`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/sentinel-events/sentinel-events.module.ts`
- Controllers:
  - `apps/backend/src/sentinel-events/sentinel-events.controller.ts`
- Services:
  - `apps/backend/src/sentinel-events/sentinel-events.service.ts`
- DTOs: 3 arquivo(s) em `apps/backend/src/sentinel-events/dto`

## Endpoints HTTP

### `sentinel-events.controller.ts`

- Base do controller: `'sentinel-events'`
- Rotas (decorators):
  - Linha 38:   @Get()
  - Linha 55:   @Patch(':id')
- Segurança/autorização (decorators encontrados):
  - Linha 30: @ApiBearerAuth()
  - Linha 32: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
  - Linha 39:   @RequirePermissions(PermissionType.VIEW_SENTINEL_EVENTS)
  - Linha 56:   @RequirePermissions(PermissionType.VIEW_SENTINEL_EVENTS)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/sentinel-events`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
