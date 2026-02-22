# Módulo: Resident Documents

**Status:** ✅ Implementado
**Última atualização:** 22/02/2026
**Diretório:** `apps/backend/src/resident-documents`

## Visão Geral

Documentação técnica gerada a partir da implementação atual do módulo no backend NestJS.

## Arquivos Principais

- Module: `apps/backend/src/resident-documents/resident-documents.module.ts`
- Controllers:
  - `apps/backend/src/resident-documents/resident-documents.controller.ts`
- Services:
  - `apps/backend/src/resident-documents/resident-documents.service.ts`
- DTOs: 2 arquivo(s) em `apps/backend/src/resident-documents/dto`

## Endpoints HTTP

### `resident-documents.controller.ts`

- Base do controller: `'residents/:residentId/documents'`
- Rotas (decorators):
  - Linha 39:   @Get()
  - Linha 56:   @Get(':id')
  - Linha 73:   @Post()
  - Linha 136:   @Patch(':id')
  - Linha 154:   @Patch(':id/file')
  - Linha 193:   @Delete(':id')
- Segurança/autorização (decorators encontrados):
  - Linha 29: @ApiBearerAuth()
  - Linha 31: @UseGuards(JwtAuthGuard)

## Veja também

- [`documents.md`](./documents.md) - fluxo institucional completo de documentos.
- [`files.md`](./files.md) - upload/download e processamento de arquivos.

## Observações

- Esta documentação é um espelho do estado atual do código em `apps/backend/src/resident-documents`.
- Para regras de negócio detalhadas, consultar services e DTOs listados acima.
