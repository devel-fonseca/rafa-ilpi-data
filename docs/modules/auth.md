# Módulo: Auth

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/auth`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/auth/auth.module.ts`
- Controllers:
  - `apps/backend/src/auth/auth.controller.ts`
  - `apps/backend/src/auth/users.controller.ts`
- Services:
  - `apps/backend/src/auth/auth.service.ts`
  - `apps/backend/src/auth/jwt-cache.service.ts`
  - `apps/backend/src/auth/users.service.ts`
- DTOs: 11 arquivo(s) em `apps/backend/src/auth/dto`
- Guards:
  - `apps/backend/src/auth/guards/jwt-auth.guard.ts`
  - `apps/backend/src/auth/guards/reauthentication.guard.ts`
  - `apps/backend/src/auth/guards/roles.guard.ts`
- Decorators:
  - `apps/backend/src/auth/decorators/current-user.decorator.ts`
  - `apps/backend/src/auth/decorators/public.decorator.ts`
  - `apps/backend/src/auth/decorators/requires-reauthentication.decorator.ts`
  - `apps/backend/src/auth/decorators/roles.decorator.ts`

## Endpoints HTTP

### `auth.controller.ts`

- Base do controller: `'auth'`
- Rotas (decorators):
  - Linha 52:   @Post('login')
  - Linha 81:   @Post('select-tenant')
  - Linha 103:   @Post('refresh')
  - Linha 126:   @Post('logout')
  - Linha 150:   @Post('logout-expired')
  - Linha 173:   @Post('forgot-password')
  - Linha 201:   @Post('reset-password')
  - Linha 222:   @Post('me')
  - Linha 264:   @Post('reauthenticate')
- Segurança/autorização (decorators encontrados):
  - Linha 51:   @Public()
  - Linha 80:   @Public()
  - Linha 102:   @Public()
  - Linha 124:   @ApiBearerAuth('JWT-auth')
  - Linha 125:   @UseGuards(JwtAuthGuard)
  - Linha 172:   @Public()
  - Linha 200:   @Public()
  - Linha 220:   @ApiBearerAuth('JWT-auth')
  - Linha 221:   @UseGuards(JwtAuthGuard)
  - Linha 262:   @ApiBearerAuth('JWT-auth')
  - Linha 263:   @UseGuards(JwtAuthGuard)

### `users.controller.ts`

- Base do controller: `'users'`
- Rotas (decorators):
  - Linha 33:   @Get('stats/count')
  - Linha 44:   @Patch(':id')
  - Linha 65:   @Delete(':id')
  - Linha 89:   @Get(':id/history')
  - Linha 101:   @Get(':id/history/:version')
  - Linha 120:   @Patch(':id/change-password')
  - Linha 144:   @Get(':id/sessions')
  - Linha 163:   @Delete(':id/sessions/:sessionId')
  - Linha 184:   @Delete(':id/sessions')
  - Linha 202:   @Get(':id/access-logs')
- Segurança/autorização (decorators encontrados):
  - Linha 27: @ApiBearerAuth()
  - Linha 29: @UseGuards(JwtAuthGuard)
  - Linha 66:   @RequiresReauthentication()
  - Linha 67:   @UseGuards(JwtAuthGuard, ReauthenticationGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/auth`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
