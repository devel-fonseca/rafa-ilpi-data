# Módulo: Compliance Assessments

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/compliance-assessments`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/compliance-assessments/compliance-assessments.module.ts`
- Controllers:
  - `apps/backend/src/compliance-assessments/compliance-assessments.controller.ts`
- Services:
  - `apps/backend/src/compliance-assessments/compliance-assessments.service.ts`
- DTOs: 6 arquivo(s) em `apps/backend/src/compliance-assessments/dto`

## Endpoints HTTP

### `compliance-assessments.controller.ts`

- Base do controller: `'compliance-assessments'`
- Rotas (decorators):
  - Linha 53:   @Get('questions')
  - Linha 74:   @Post()
  - Linha 100:   @Get()
  - Linha 121:   @Get(':id')
  - Linha 149:   @Post(':id/responses')
  - Linha 180:   @Post(':id/complete')
  - Linha 209:   @Get(':id/report')
  - Linha 237:   @Get(':id/pdf')
  - Linha 275:   @Get('history/comparison')
  - Linha 300:   @Delete(':id')
- Segurança/autorização (decorators encontrados):
  - Linha 41: @ApiBearerAuth()
  - Linha 43: @UseGuards(JwtAuthGuard, PermissionsGuard, FeatureGuard)
  - Linha 54:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 75:   @RequirePermissions(PermissionType.MANAGE_COMPLIANCE_ASSESSMENT)
  - Linha 101:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 122:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 150:   @RequirePermissions(PermissionType.MANAGE_COMPLIANCE_ASSESSMENT)
  - Linha 181:   @RequirePermissions(PermissionType.MANAGE_COMPLIANCE_ASSESSMENT)
  - Linha 210:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 238:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 276:   @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  - Linha 301:   @RequirePermissions(PermissionType.MANAGE_COMPLIANCE_ASSESSMENT)

## Veja também

- [`compliance-assessment.md`](./compliance-assessment.md) - visão funcional detalhada do fluxo de avaliação.
- [`compliance.md`](./compliance.md) - documentação complementar de conformidade institucional.

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/compliance-assessments`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
