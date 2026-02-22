# Módulo: Plans

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/plans`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/plans/plans.module.ts`
- Controllers:
  - `apps/backend/src/plans/plans.controller.ts`
- Services:
  - `apps/backend/src/plans/plans.service.ts`
- DTOs: não aplicável

## Endpoints HTTP

### `plans.controller.ts`

- Base do controller: `'plans'`
- Rotas (decorators):
  - Linha 11:   @Get()
  - Linha 22:   @Get(':id')
  - Linha 34:   @Get('compare/:currentId/:targetId')
- Segurança/autorização (decorators encontrados):
  - Linha 12:   @Public()
  - Linha 23:   @Public()
  - Linha 35:   @Public()

## Veja também

- [`tenant-billing.md`](./tenant-billing.md) - regras de cobrança e plano aplicadas no tenant.
- [`portal-superadmin.md`](./portal-superadmin.md) - gestão administrativa de planos no portal.

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/plans`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
