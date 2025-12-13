# Arquitetura de Armazenamento de Arquivos

**Versão:** 1.0.0
**Última atualização:** 11/12/2025

## Visão Geral

Sistema de storage S3-compatible usando MinIO (desenvolvimento) e S3 (produção).

## Estrutura de Buckets

```
rafa-ilpi-data/
├── tenants/
│   └── {tenantId}/
│       ├── residents/
│       │   └── {residentId}/
│       │       ├── photo.jpg
│       │       └── documents/
│       ├── clinical-documents/
│       │   └── {residentId}/
│       │       └── {documentId}.pdf
│       ├── institutional-documents/
│       │   └── {documentId}.pdf
│       ├── vaccination-certificates/
│       │   └── {vaccinationId}.pdf
│       └── prescription-pdfs/
│           └── {prescriptionId}.pdf
```

## FilesService

**Arquivo:** `apps/backend/src/files/files.service.ts`

Métodos principais:
- `uploadFile(file, path)` - Upload genérico
- `getFileUrl(key)` - Gerar URL assinada
- `deleteFile(key)` - Deleção
- `listFiles(prefix)` - Listar por prefixo

## Referências

- [Variáveis de Ambiente](#) (TODO)
