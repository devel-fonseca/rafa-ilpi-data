# Módulo: Files

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/files`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/files/files.module.ts`
- Controllers:
  - `apps/backend/src/files/files.controller.ts`
- Services:
  - `apps/backend/src/files/file-processing.service.ts`
  - `apps/backend/src/files/files.service.ts`
- DTOs: 1 arquivo(s) em `apps/backend/src/files/dto`

## Endpoints HTTP

### `files.controller.ts`

- Base do controller: `'files'`
- Rotas (decorators):
  - Linha 66:   @Post('upload')
  - Linha 132:   @Get('download/*')
  - Linha 172:   @Get('list')
  - Linha 203:   @Delete('*')
- Segurança/autorização (decorators encontrados):
  - Linha 33: @ApiBearerAuth('JWT-auth')
  - Linha 34: @UseGuards(JwtAuthGuard)

## Veja também

- [`documents.md`](./documents.md) - visão funcional consolidada do módulo de documentos.
- [`resident-documents.md`](./resident-documents.md) - documentos vinculados ao prontuário/residente.

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/files`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
