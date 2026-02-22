# Módulo: Tenant Profile

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/tenant-profile`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/tenant-profile/tenant-profile.module.ts`
- Controllers:
  - `apps/backend/src/tenant-profile/tenant-profile.controller.ts`
- Services:
  - `apps/backend/src/tenant-profile/tenant-profile.service.ts`
- DTOs: 3 arquivo(s) em `apps/backend/src/tenant-profile/dto`

## Endpoints HTTP

### `tenant-profile.controller.ts`

- Base do controller: `'tenant-profile'`
- Rotas (decorators):
  - Linha 52:   @Post()
  - Linha 85:   @Get('me')
  - Linha 107:   @Get('completion-status')
  - Linha 133:   @Patch()
  - Linha 163:   @Delete()
- Segurança/autorização (decorators encontrados):
  - Linha 39: @ApiBearerAuth()
  - Linha 41: @UseGuards(JwtAuthGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/tenant-profile`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
