# Módulo: Tenant Messages

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/tenant-messages`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/tenant-messages/tenant-messages.module.ts`
- Controllers:
  - `apps/backend/src/tenant-messages/tenant-messages.controller.ts`
- Services:
  - `apps/backend/src/tenant-messages/tenant-messages.service.ts`
- DTOs: 3 arquivo(s) em `apps/backend/src/tenant-messages/dto`

## Endpoints HTTP

### `tenant-messages.controller.ts`

- Base do controller: `'tenant-messages'`
- Rotas (decorators):
  - Linha 30:   @Post()
  - Linha 40:   @Get()
  - Linha 58:   @Get(':id')
  - Linha 68:   @Put(':id')
  - Linha 78:   @Delete(':id')
  - Linha 89:   @Post(':id/send')
- Segurança/autorização (decorators encontrados):
  - Linha 22: @UseGuards(JwtAuthGuard, RolesGuard)

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/tenant-messages`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
