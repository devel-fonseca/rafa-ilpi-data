# Módulo: Admin

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/admin`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/admin/admin.module.ts`
- Controllers:
  - `apps/backend/src/admin/admin.controller.ts`
- Services: nenhum service dedicado neste módulo
- DTOs: não aplicável

## Endpoints HTTP

### `admin.controller.ts`

- Base do controller: `'admin'`
- Rotas (decorators):
  - Linha 63:   @Get('plans/available')
  - Linha 99:   @Get('plans/compare/:targetPlanId')
  - Linha 137:   @Post('subscription/upgrade')
  - Linha 217:   @Get('invoices')
  - Linha 260:   @Get('invoices/:id')
  - Linha 292:   @Patch('subscription/payment-method')
  - Linha 345:   @Patch('subscription/billing-cycle')
  - Linha 403:   @Post('subscription/cancel-trial')
  - Linha 458:   @Get('contracts/active/:planId')
  - Linha 473:   @Post('contracts/accept')
  - Linha 545:   @Get('subscription/change-history')
- Segurança/autorização (decorators encontrados):
  - Linha 36: @UseGuards(JwtAuthGuard, RolesGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/admin`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
