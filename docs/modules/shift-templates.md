# Módulo: Shift Templates

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/shift-templates`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/shift-templates/shift-templates.module.ts`
- Controllers:
  - `apps/backend/src/shift-templates/shift-templates.controller.ts`
- Services:
  - `apps/backend/src/shift-templates/shift-templates.service.ts`
- DTOs: 2 arquivo(s) em `apps/backend/src/shift-templates/dto`

## Endpoints HTTP

### `shift-templates.controller.ts`

- Base do controller: `'shift-templates'`
- Rotas (decorators):
  - Linha 37:   @Get()
  - Linha 55:   @Get('enabled')
  - Linha 73:   @Get(':id')
  - Linha 98:   @Patch(':id/tenant-config')
- Segurança/autorização (decorators encontrados):
  - Linha 28: @ApiBearerAuth()
  - Linha 29: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/shift-templates`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
