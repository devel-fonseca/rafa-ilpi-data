# Módulo: Superadmin

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/superadmin`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/superadmin/superadmin.module.ts`
- Controllers:
  - `apps/backend/src/superadmin/superadmin.controller.ts`
- Services:
  - `apps/backend/src/superadmin/services/alerts.service.ts`
  - `apps/backend/src/superadmin/services/backup-admin.service.ts`
  - `apps/backend/src/superadmin/services/collections.service.ts`
  - `apps/backend/src/superadmin/services/metrics.service.ts`
  - `apps/backend/src/superadmin/services/plans-admin.service.ts`
  - `apps/backend/src/superadmin/services/subscription-admin.service.ts`
  - `apps/backend/src/superadmin/services/tenant-admin.service.ts`
- DTOs: 10 arquivo(s) em `apps/backend/src/superadmin/dto`
- Guards:
  - `apps/backend/src/superadmin/guards/superadmin.guard.ts`

## Endpoints HTTP

### `superadmin.controller.ts`

- Base do controller: `'superadmin'`
- Rotas (decorators):
  - Linha 98:   @Get('metrics/overview')
  - Linha 112:   @Get('metrics/revenue')
  - Linha 127:   @Get('metrics/tenants')
  - Linha 139:   @Get('metrics/trends')
  - Linha 153:   @Post('backups/full')
  - Linha 167:   @Post('backups/tenant/:tenantId')
  - Linha 181:   @Get('backups')
  - Linha 210:   @Get('backups/:id/download')
  - Linha 228:   @Post('backups/:id/restore-full')
  - Linha 242:   @Post('backups/:id/restore-tenant')
  - Linha 260:   @Get('tenants')
  - Linha 284:   @Get('tenants/:id')
  - Linha 293:   @Patch('tenants/:id')
  - Linha 303:   @Patch('tenants/:id/customize-limits')
  - Linha 326:   @Get('tenants/:id/effective-limits')
  - Linha 346:   @Post('tenants/:id/suspend')
  - Linha 355:   @Post('tenants/:id/reactivate')
  - Linha 364:   @Delete('tenants/:id')
  - Linha 373:   @Get('tenants/:id/stats')
  - Linha 386:   @Post('tenants/:tenantId/change-plan')
  - Linha 395:   @Post('subscriptions/:id/extend')
  - Linha 404:   @Post('subscriptions/:id/cancel')
  - Linha 413:   @Post('subscriptions/:id/reactivate')
  - Linha 422:   @Get('tenants/:tenantId/subscriptions/history')
  - Linha 431:   @Get('subscriptions/:id')
  - Linha 440:   @Post('subscriptions/:id/apply-discount')
  - Linha 449:   @Post('subscriptions/:id/apply-custom-price')
  - Linha 458:   @Delete('subscriptions/:id/discount')
  - Linha 471:   @Post('plans')
  - Linha 480:   @Get('plans')
  - Linha 489:   @Get('plans/:id')
  - Linha 498:   @Patch('plans/:id')
  - Linha 507:   @Post('plans/:id/toggle-popular')
  - Linha 516:   @Post('plans/:id/toggle-active')
  - Linha 525:   @Get('plans/:id/stats')
  - Linha 538:   @Get('invoices')
  - Linha 557:   @Get('invoices/:id')
  - Linha 566:   @Post('invoices')
  - Linha 575:   @Post('invoices/:id/sync')
  - Linha 584:   @Delete('invoices/:id')
  - Linha 593:   @Get('tenants/:tenantId/invoices')
  - Linha 616:   @Get('analytics/financial')
  - Linha 647:   @Get('analytics/mrr-breakdown')
  - Linha 666:   @Get('analytics/overdue/summary')
  - Linha 702:   @Get('analytics/overdue/tenants')
  - Linha 727:   @Get('analytics/overdue/trends')
  - Linha 752:   @Get('alerts')
  - Linha 779:   @Get('alerts/unread-count')
  - Linha 792:   @Patch('alerts/:id/read')
  - Linha 801:   @Post('alerts/mark-all-read')
  - Linha 810:   @Delete('alerts/:id')
  - Linha 824:   @Get('contracts')
  - Linha 837:   @Get('contracts/:id')
  - Linha 847:   @Post('contracts')
  - Linha 860:   @Patch('contracts/:id')
  - Linha 873:   @Post('contracts/:id/publish')
  - Linha 887:   @Delete('contracts/:id')
  - Linha 897:   @Get('contracts/:id/acceptances')
  - Linha 906:   @Get('tenants/:id/contract-acceptance')
  - Linha 915:   @Get('tenants/:id/privacy-policy-acceptance')
  - Linha 979:   @Get('terms-of-service')
  - Linha 991:   @Get('terms-of-service/:id')
  - Linha 1000:   @Post('terms-of-service')
  - Linha 1012:   @Patch('terms-of-service/:id')
  - Linha 1024:   @Post('terms-of-service/:id/publish')
  - Linha 1037:   @Delete('terms-of-service/:id')
  - Linha 1046:   @Get('terms-of-service/:id/acceptances')
  - Linha 1055:   @Get('tenants/:id/terms-of-service-acceptance')
  - Linha 1070:   @Post('collections/send-reminder')
  - Linha 1081:   @Post('collections/suspend-tenant')
  - Linha 1101:   @Post('collections/renegotiate')
  - Linha 1125:   @Post('jobs/trial-expiration-alerts')
  - Linha 1151:   @Post('jobs/trial-conversion')
  - Linha 1177:   @Post('jobs/asaas-sync')
- Segurança/autorização (decorators encontrados):
  - Linha 64: @UseGuards(JwtAuthGuard, SuperAdminGuard)

## Veja também

- [`portal-superadmin.md`](./portal-superadmin.md) - guia funcional e fluxos de operação do portal.
- [`tenant-billing.md`](./tenant-billing.md) - detalhes de billing, planos e assinaturas.
- [`terms-of-service.md`](./terms-of-service.md) e [`privacy-policy.md`](./privacy-policy.md) - gestão de documentos legais.

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/superadmin`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
