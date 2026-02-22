# Módulo: Terms Of Service

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/terms-of-service`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/terms-of-service/terms-of-service.module.ts`
- Controllers:
  - `apps/backend/src/terms-of-service/terms-of-service.controller.ts`
- Services:
  - `apps/backend/src/terms-of-service/terms-of-service.service.ts`
- DTOs: 5 arquivo(s) em `apps/backend/src/terms-of-service/dto`

## Endpoints HTTP

### `terms-of-service.controller.ts`

- Base do controller: `'terms-of-service'`
- Rotas (decorators):
  - Linha 36:   @Get('active')
  - Linha 45:   @Post('render')
  - Linha 53:   @Post('accept/prepare')
  - Linha 69:   @Post()
  - Linha 81:   @Get()
  - Linha 93:   @Get('next-version')
  - Linha 109:   @Get(':id')
  - Linha 118:   @Patch(':id')
  - Linha 127:   @Post(':id/publish')
  - Linha 143:   @Delete(':id')
  - Linha 153:   @Get(':id/acceptances')
- Segurança/autorização (decorators encontrados):
  - Linha 35:   @Public()
  - Linha 44:   @Public()
  - Linha 52:   @Public()
  - Linha 67:   @UseGuards(JwtAuthGuard, SuperAdminGuard)
  - Linha 68:   @ApiBearerAuth()
  - Linha 79:   @UseGuards(JwtAuthGuard, SuperAdminGuard)
  - Linha 80:   @ApiBearerAuth()
  - Linha 91:   @UseGuards(JwtAuthGuard, SuperAdminGuard)
  - Linha 92:   @ApiBearerAuth()
  - Linha 107:   @UseGuards(JwtAuthGuard, SuperAdminGuard)
  - Linha 108:   @ApiBearerAuth()
  - Linha 116:   @UseGuards(JwtAuthGuard, SuperAdminGuard)
  - Linha 117:   @ApiBearerAuth()
  - Linha 125:   @UseGuards(JwtAuthGuard, SuperAdminGuard)
  - Linha 126:   @ApiBearerAuth()
  - Linha 140:   @UseGuards(JwtAuthGuard, SuperAdminGuard, ReauthenticationGuard)
  - Linha 141:   @RequiresReauthentication()
  - Linha 142:   @ApiBearerAuth()
  - Linha 151:   @UseGuards(JwtAuthGuard, SuperAdminGuard)
  - Linha 152:   @ApiBearerAuth()

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/terms-of-service`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
