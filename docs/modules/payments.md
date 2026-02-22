# Módulo: Payments

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/payments`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/payments/payments.module.ts`
- Controllers:
  - `apps/backend/src/payments/webhooks.controller.ts`
- Services:
  - `apps/backend/src/payments/services/asaas.service.ts`
  - `apps/backend/src/payments/services/invoice.service.ts`
  - `apps/backend/src/payments/services/payment-analytics.service.ts`
  - `apps/backend/src/payments/services/payment.service.ts`
- DTOs: 2 arquivo(s) em `apps/backend/src/payments/dto`
- Decorators:
  - `apps/backend/src/payments/decorators/retry.decorator.ts`

## Endpoints HTTP

### `webhooks.controller.ts`

- Base do controller: `'webhooks'`
- Rotas (decorators):
  - Linha 26:   @Post('asaas')

## Veja também

- [`tenant-billing.md`](./tenant-billing.md) - ciclo de cobrança no contexto de tenant.
- [`portal-superadmin.md`](./portal-superadmin.md) - visão operacional de pagamentos no portal.

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/payments`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
