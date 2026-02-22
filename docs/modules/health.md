# Módulo: Health

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/health`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/health/health.module.ts`
- Controllers:
  - `apps/backend/src/health/health.controller.ts`
- Services: nenhum service dedicado neste módulo
- DTOs: não aplicável

## Endpoints HTTP

### `health.controller.ts`

- Base do controller: `'health'`
- Rotas (decorators):
  - Linha 14:   @Get()
  - Linha 43:   @Get('tenant-schemas')
- Segurança/autorização (decorators encontrados):
  - Linha 13:   @Public()
  - Linha 42:   @Public()

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/health`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
