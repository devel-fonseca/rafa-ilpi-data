# Módulo: Sos Medications

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/sos-medications`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/sos-medications/sos-medications.module.ts`
- Controllers:
  - `apps/backend/src/sos-medications/sos-medications.controller.ts`
- Services:
  - `apps/backend/src/sos-medications/sos-medications.service.ts`
- DTOs: 2 arquivo(s) em `apps/backend/src/sos-medications/dto`

## Endpoints HTTP

### `sos-medications.controller.ts`

- Base do controller: `'sos-medications'`
- Rotas (decorators):
  - Linha 45:   @Patch(':id')
  - Linha 76:   @Delete(':id')
  - Linha 110:   @Get(':id/history')
  - Linha 130:   @Get(':id/history/:versionNumber')
- Segurança/autorização (decorators encontrados):
  - Linha 33: @ApiBearerAuth()
  - Linha 35: @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/sos-medications`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
