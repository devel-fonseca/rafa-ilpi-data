# Módulo: Audit

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/audit`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/audit/audit.module.ts`
- Controllers:
  - `apps/backend/src/audit/audit.controller.ts`
- Services:
  - `apps/backend/src/audit/audit.service.ts`
- DTOs: não aplicável
- Decorators:
  - `apps/backend/src/audit/audit.decorator.ts`

## Endpoints HTTP

### `audit.controller.ts`

- Base do controller: `'audit'`
- Rotas (decorators):
  - Linha 17:   @Get('recent')
  - Linha 34:   @Get('logs')
  - Linha 65:   @Get('stats')
- Segurança/autorização (decorators encontrados):
  - Linha 9: @UseGuards(JwtAuthGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/audit`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
