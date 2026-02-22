# Módulo: Teams

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/teams`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/teams/teams.module.ts`
- Controllers:
  - `apps/backend/src/teams/teams.controller.ts`
- Services:
  - `apps/backend/src/teams/teams.service.ts`
- DTOs: 5 arquivo(s) em `apps/backend/src/teams/dto`

## Endpoints HTTP

### `teams.controller.ts`

- Base do controller: `'teams'`
- Rotas (decorators):
  - Linha 45:   @Post()
  - Linha 64:   @Get()
  - Linha 79:   @Get(':id')
  - Linha 102:   @Patch(':id')
  - Linha 133:   @Delete(':id')
  - Linha 162:   @Post(':id/members')
  - Linha 198:   @Delete(':id/members/:userId')
- Segurança/autorização (decorators encontrados):
  - Linha 38: @ApiBearerAuth()
  - Linha 39: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/teams`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
