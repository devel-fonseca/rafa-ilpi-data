# Módulo: Email Logs

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/email-logs`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/email-logs/email-logs.module.ts`
- Controllers:
  - `apps/backend/src/email-logs/email-logs.controller.ts`
- Services:
  - `apps/backend/src/email-logs/email-logs.service.ts`
- DTOs: não aplicável

## Endpoints HTTP

### `email-logs.controller.ts`

- Base do controller: `'email-logs'`
- Rotas (decorators):
  - Linha 18:   @Get()
  - Linha 46:   @Get(':id')
  - Linha 56:   @Get('stats/summary')
- Segurança/autorização (decorators encontrados):
  - Linha 10: @UseGuards(JwtAuthGuard, RolesGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/email-logs`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
