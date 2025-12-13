# Módulo: Documentos Institucionais

**Status:** ✅ Implementado
**Versão:** 2.0.0
**Última atualização:** 09/12/2025

## Visão Geral

Sistema de gerenciamento de documentos institucionais com upload S3/MinIO, versionamento automático, alertas configuráveis de vencimento e auditoria completa de alterações.

## Funcionalidades Principais

- ✅ **9 tipos de documentos**: CNPJ, Estatuto, Licenças, Alvarás, Certificados, etc.
- ✅ **Upload para S3/MinIO**: Armazenamento seguro de PDFs
- ✅ **Versionamento automático**: Rastreamento de substituições
- ✅ **Alertas configuráveis**: Janelas customizáveis por tipo (90, 60, 30, 15, 7 dias)
- ✅ **Auditoria completa**: Histórico com snapshots JSON
- ✅ **Metadados enriquecidos**: Número, entidade emissora, tags
- ✅ **Preview em modal**: Visualização de PDFs inline
- ✅ **Edição de metadados**: Sem necessidade de re-upload

## Arquitetura

### Backend
- **Controller:** [apps/backend/src/institutional-profile/institutional-profile.controller.ts](../../apps/backend/src/institutional-profile/institutional-profile.controller.ts)
- **Service:** [apps/backend/src/institutional-profile/institutional-profile.service.ts](../../apps/backend/src/institutional-profile/institutional-profile.service.ts)
- **Config:** [apps/backend/src/institutional-profile/config/document-requirements.config.ts](../../apps/backend/src/institutional-profile/config/document-requirements.config.ts)
- **Migration:** `20251129030423_add_resident_documents_table`

### Frontend
- **Página:** [apps/frontend/src/pages/institutional-profile/DocumentsTab.tsx](../../apps/frontend/src/pages/institutional-profile/DocumentsTab.tsx)
- **API:** [apps/frontend/src/api/institutional-profile.api.ts](../../apps/frontend/src/api/institutional-profile.api.ts)

## Tipos de Documentos

1. **CNPJ** - Cadastro Nacional da Pessoa Jurídica
2. **ESTATUTO** - Estatuto Social
3. **CONTRATO_SOCIAL** - Contrato Social
4. **LIC_SANITARIA** - Licença Sanitária
5. **ALVARA_USO** - Alvará de Uso e Funcionamento
6. **CNES** - Cadastro Nacional de Estabelecimentos de Saúde
7. **CMI** - Certificado de Regularidade do INSS
8. **CERTIFICADO_BOMBEIROS** - Certificado do Corpo de Bombeiros
9. **OUTROS** - Outros documentos

## Janelas de Alerta

Configuração customizável por tipo de documento em [document-requirements.config.ts](../../apps/backend/src/institutional-profile/config/document-requirements.config.ts):

```typescript
DOCUMENT_ALERT_WINDOWS = {
  CNPJ: [90, 60, 30, 15, 7],           // 5 alertas
  LIC_SANITARIA: [90, 60, 30, 15, 7],  // Críticos
  ALVARA_USO: [90, 60, 30, 15, 7],
  ESTATUTO: [60, 30, 15, 7],           // Importantes
  CONTRATO_SOCIAL: [60, 30, 15, 7],
  CMI: [30, 15, 7],                    // Secundários
  OUTROS: [30, 15, 7],
  // DEFAULT: [30, 15, 7]
}
```

## Modelo de Dados

### TenantDocument

```prisma
model TenantDocument {
  id            String          @id @default(uuid()) @db.Uuid
  tenantId      String          @db.Uuid
  type          DocumentType
  title         String          @db.VarChar(255)
  documentNumber String?        @db.VarChar(100)
  issuerEntity  String?         @db.VarChar(200)
  tags          String[]
  fileUrl       String          @db.Text
  fileKey       String          @db.Text
  filename      String          @db.VarChar(255)
  issueDate     DateTime?       @db.Timestamptz(3)
  expiryDate    DateTime?       @db.Timestamptz(3)
  notes         String?         @db.Text

  // Versionamento
  version       Int             @default(1)
  replacedById  String?         @db.Uuid
  replacedAt    DateTime?       @db.Timestamptz(3)

  // Audit
  uploadedBy    String          @db.Uuid
  createdAt     DateTime        @default(now()) @db.Timestamptz(3)
  updatedAt     DateTime        @updatedAt @db.Timestamptz(3)
  deletedAt     DateTime?       @db.Timestamptz(3)

  // Relações
  replacedBy    TenantDocument? @relation("DocumentReplacement")
  replaces      TenantDocument[] @relation("DocumentReplacement")
  history       DocumentHistory[]
}
```

### DocumentHistory

```prisma
model DocumentHistory {
  id             String          @id @default(uuid()) @db.Uuid
  tenantId       String          @db.Uuid
  documentId     String          @db.Uuid
  action         DocumentAction  // CREATED, UPDATED, REPLACED, DELETED
  reason         String?         @db.Text
  previousData   Json?
  newData        Json?
  changedFields  String[]
  changedBy      String          @db.Uuid
  changedAt      DateTime        @default(now()) @db.Timestamptz(3)
}
```

## Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/institutional-profile/documents` | Upload documento |
| GET | `/api/institutional-profile/documents` | Listar documentos |
| GET | `/api/institutional-profile/documents/:id` | Buscar por ID |
| PATCH | `/api/institutional-profile/documents/:id/metadata` | Editar metadados |
| POST | `/api/institutional-profile/documents/:id/replace` | Substituir arquivo |
| DELETE | `/api/institutional-profile/documents/:id` | Soft delete |

## Cron Job de Notificações

Arquivo: [apps/backend/src/notifications/notifications.cron.ts](../../apps/backend/src/notifications/notifications.cron.ts)

- **Execução:** Diária às 08:00 (BRT)
- **Alertas de vencimento:** Verifica janelas configuradas
- **Alertas de vencidos:** Notifica documentos expirados
- **Prevenção de duplicatas:** Verifica últimas 48h + metadata JSON
- **Labels amigáveis**: "Alvará de Uso e Funcionamento" em vez de "ALVARA_USO"

## Referências

- [CHANGELOG - 2025-12-09](../../CHANGELOG.md#2025-12-09---sistema-avançado-de-versionamento-e-alertas-para-documentos)
- [CHANGELOG - 2025-11-29](../../CHANGELOG.md#2025-11-29---módulo-de-documentos-institucionais-com-upload-s3)
- [Arquitetura de Storage](../architecture/file-storage.md)
- [Sistema de Notificações](notifications.md)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
