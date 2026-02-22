# Módulo: Email Templates

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/email-templates`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/email-templates/email-templates.module.ts`
- Controllers:
  - `apps/backend/src/email-templates/email-templates.controller.ts`
- Services:
  - `apps/backend/src/email-templates/email-templates.service.ts`
- DTOs: 5 arquivo(s) em `apps/backend/src/email-templates/dto`

## Endpoints HTTP

### `email-templates.controller.ts`

- Base do controller: `'email-templates'`
- Rotas (decorators):
  - Linha 28:   @Get()
  - Linha 33:   @Get(':id')
  - Linha 38:   @Post()
  - Linha 43:   @Put(':id')
  - Linha 48:   @Delete(':id')
  - Linha 54:   @Get(':id/versions')
  - Linha 59:   @Post(':id/rollback/:versionId')
  - Linha 67:   @Post('preview')
  - Linha 73:   @Post(':id/test-send')
- Segurança/autorização (decorators encontrados):
  - Linha 23: @UseGuards(JwtAuthGuard, RolesGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/email-templates`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
