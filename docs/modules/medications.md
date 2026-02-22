# Módulo: Medications

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/medications`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/medications/medications.module.ts`
- Controllers:
  - `apps/backend/src/medications/medications.controller.ts`
- Services:
  - `apps/backend/src/medications/medication-locks.service.ts`
  - `apps/backend/src/medications/medications.service.ts`
- DTOs: não aplicável

## Endpoints HTTP

### `medications.controller.ts`

- Base do controller: `'medications'`
- Rotas (decorators):
  - Linha 51:   @Patch(':id')
  - Linha 79:   @Delete(':id')
  - Linha 107:   @Get(':id/history')
  - Linha 124:   @Get(':id/history/:versionNumber')
  - Linha 150:   @Post('lock')
  - Linha 187:   @Post('unlock')
  - Linha 211:   @Get('check-lock')
- Segurança/autorização (decorators encontrados):
  - Linha 38: @ApiBearerAuth()
  - Linha 40: @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/medications`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
