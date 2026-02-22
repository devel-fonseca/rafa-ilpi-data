# Módulo: User Profiles

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/user-profiles`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/user-profiles/user-profiles.module.ts`
- Controllers:
  - `apps/backend/src/user-profiles/user-profiles.controller.ts`
- Services:
  - `apps/backend/src/user-profiles/user-profiles.service.ts`
- DTOs: 2 arquivo(s) em `apps/backend/src/user-profiles/dto`

## Endpoints HTTP

### `user-profiles.controller.ts`

- Base do controller: `'user-profiles'`
- Rotas (decorators):
  - Linha 45:   @Post(':userId')
  - Linha 67:   @Get('me')
  - Linha 85:   @Patch('me/avatar')
  - Linha 107:   @Delete('me/avatar')
  - Linha 126:   @Patch('me/preferences')
  - Linha 165:   @Get()
  - Linha 173:   @Get(':userId')
  - Linha 186:   @Patch(':userId')
  - Linha 209:   @Delete(':userId')
- Segurança/autorização (decorators encontrados):
  - Linha 38: @ApiBearerAuth()
  - Linha 40: @UseGuards(JwtAuthGuard, RolesGuard)

## Veja também

- [`user-management.md`](./user-management.md) - gestão completa de usuários, papéis e permissões.

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/user-profiles`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
