# Módulo: Digitalização de Contratos de Prestação de Serviços

**Status:** ✅ Implementado
**Versão:** 1.0.0
**Última atualização:** 13/01/2026

## Visão Geral

Sistema completo de digitalização e armazenamento de contratos físicos entre ILPI e residentes, com processamento automático de documentos (imagem→PDF), carimbo institucional para autenticação digital, e armazenamento criptografado com metadados (vigência, valor, vencimento).

## Funcionalidades Principais

- ✅ **Upload de documentos físicos**: JPEG, PNG, WEBP, PDF (até 10MB)
- ✅ **Conversão automática**: Imagem → PDF A4 com qualidade preservada
- ✅ **Carimbo institucional**: Validação digital com dados da ILPI, usuário, hash SHA-256 e token público
- ✅ **Armazenamento dual**: Arquivo original + PDF processado (criptografia SSE-C)
- ✅ **Versionamento completo**: Substituição de contratos com histórico auditado
- ✅ **Status automático**: VIGENTE, VENCENDO_EM_30_DIAS, VENCIDO
- ✅ **Validação pública**: Endpoint para verificar autenticidade por hash
- ✅ **Metadados completos**: Número contrato, vigência, valor mensalidade, dia vencimento, assinantes

## Arquitetura

### Backend
- **Controller:** [apps/backend/src/resident-contracts/resident-contracts.controller.ts](../../apps/backend/src/resident-contracts/resident-contracts.controller.ts)
- **Service:** [apps/backend/src/resident-contracts/resident-contracts.service.ts](../../apps/backend/src/resident-contracts/resident-contracts.service.ts)
- **File Processing:** [apps/backend/src/resident-contracts/file-processing.service.ts](../../apps/backend/src/resident-contracts/file-processing.service.ts)
- **Module:** [apps/backend/src/resident-contracts/resident-contracts.module.ts](../../apps/backend/src/resident-contracts/resident-contracts.module.ts)
- **DTOs:** [apps/backend/src/resident-contracts/dto/](../../apps/backend/src/resident-contracts/dto/)
- **Migration:** `20260113111215_add_resident_contracts_digitalization`

### Dependências
- **sharp**: Processamento de imagens (conversão PNG, otimização)
- **pdf-lib**: Manipulação de PDFs (criação, incorporação de imagens, adição de texto)
- **crypto**: Cálculo de hash SHA-256 para integridade

## Modelos de Dados

### ResidentContract (Contrato)

```prisma
model ResidentContract {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  residentId String @db.Uuid

  // Metadados do contrato
  contractNumber String   @db.VarChar(100) // Ex: CONT-2025-001
  startDate      DateTime @db.Date         // Início da vigência
  endDate        DateTime @db.Date         // Fim da vigência
  monthlyAmount  Decimal  @db.Decimal(10, 2) // Valor da mensalidade
  dueDay         Int                       // Dia de vencimento (1-28)
  status         ContractDocumentStatus    // VIGENTE, VENCENDO_EM_30_DIAS, VENCIDO

  // Campos de reajuste
  adjustmentIndex    String?   @db.VarChar(50) // INPC, IGP-M, etc.
  adjustmentRate     Decimal?  @db.Decimal(5, 2) // Percentual do último reajuste
  lastAdjustmentDate DateTime? @db.Date

  // Assinantes (array JSON)
  signatories Json // [{ name, cpf?, role: 'RESIDENTE' | 'RESPONSAVEL_LEGAL' | 'TESTEMUNHA' | 'ILPI' }]

  // Arquivo ORIGINAL (antes do processamento)
  originalFileUrl      String // tenants/{tenantId}/contracts-original/{residentId}/{uuid.ext}
  originalFileKey      String
  originalFileName     String
  originalFileSize     Int
  originalFileMimeType String @db.VarChar(100)
  originalFileHash     String @db.VarChar(64) // SHA-256

  // Arquivo PROCESSADO (PDF final com carimbo)
  processedFileUrl  String // tenants/{tenantId}/contracts/{residentId}/{uuid.pdf}
  processedFileKey  String
  processedFileName String
  processedFileSize Int
  processedFileHash String @db.VarChar(64) // SHA-256 (mostrado no carimbo)

  notes String? @db.Text

  // Versionamento e substituição
  version      Int       @default(1)
  replacedById String?   @db.Uuid
  replacedAt   DateTime? @db.Timestamptz(3)

  // Auditoria
  uploadedBy String    @db.Uuid
  createdAt  DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt  DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt  DateTime? @db.Timestamptz(3)

  // Relações
  tenant     Tenant            @relation(fields: [tenantId], references: [id])
  resident   Resident          @relation(fields: [residentId], references: [id])
  uploader   User              @relation(fields: [uploadedBy], references: [id])
  replacedBy ResidentContract? @relation(fields: [replacedById], references: [id])
  history    ContractHistory[]

  @@unique([tenantId, contractNumber])
  @@index([tenantId, residentId])
  @@index([processedFileHash]) // Para validação pública
}
```

### ContractHistory (Histórico de Auditoria)

```prisma
model ContractHistory {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @db.Uuid
  contractId String @db.Uuid

  action ContractHistoryAction // CREATED, UPDATED, REPLACED, DELETED
  reason String?               @db.Text // Motivo (obrigatório para REPLACED)

  previousData Json? // Snapshot anterior
  newData      Json? // Snapshot novo
  changedFields String[] @default([]) // Campos alterados

  changedBy String   @db.Uuid
  changedAt DateTime @default(now()) @db.Timestamptz(3)

  @@index([tenantId, contractId])
}
```

### Enums

```prisma
enum ContractDocumentStatus {
  VIGENTE
  VENCENDO_EM_30_DIAS
  VENCIDO
}

enum ContractHistoryAction {
  CREATED
  UPDATED
  REPLACED
  DELETED
}

enum SignatoryRole {
  RESIDENTE
  RESPONSAVEL_LEGAL
  RESPONSAVEL_CONTRATUAL
  TESTEMUNHA
  ILPI
}
```

## Processamento de Arquivos

### Fluxo de Conversão (Imagem → PDF)

1. **Calcular hash SHA-256** do arquivo original
2. **Converter para PNG** (qualidade máxima, SEM redimensionar)
3. **Criar PDF A4** (595x842 pontos)
4. **Incorporar imagem** na resolução original
5. **Escalar SOMENTE se necessário** para caber na área útil: 515x712pt
   - Margens: 40pt topo, 40pt laterais, 90pt rodapé (para carimbo)
6. **Alinhar ao topo** com margens seguras
7. **Salvar PDF temporário** para calcular hash final
8. **RECARREGAR PDF** (pdf-lib não permite modificar após save)
9. **Adicionar carimbo no rodapé** (não sobrepõe conteúdo)
10. **Retornar PDF final + hashes**

### Carimbo Institucional

**Formato (4 linhas, fonte Helvetica 7pt):**

```
ILPI: [Nome] | CNPJ: [CNPJ]
Validado por: [Nome] - [Cargo] ([Registro]) | [dd/mm/yyyy hh:mm:ss] (UTC-3)
SHA-256: [16 chars iniciais]...[16 chars finais]
Validar: https://rafa-ilpi.rafalabs.com.br/validar/{publicToken}
```

**Características:**
- ✅ Posição: 50pt do fundo, 50pt da esquerda
- ✅ Cor: Cinza escuro (RGB 0.3, 0.3, 0.3)
- ✅ Texto sanitizado (apenas ASCII - compatibilidade Helvetica)
- ✅ Hash truncado para legibilidade (16+...+16)
- ✅ URL de validação pública com token

### Tratamento de PDFs Existentes

**Fluxo para PDFs enviados:**
1. Calcular hash do original
2. Carregar PDF com `PDFDocument.load()`
3. Salvar temporário para calcular hash final
4. **RECARREGAR PDF** (limitação do pdf-lib)
5. Adicionar carimbo em **todas as páginas**
6. Salvar PDF final

**Fallback para PDFs corrompidos:**
- Criar PDF novo com aviso de reconstrução
- Incluir hash do arquivo original
- Adicionar carimbo institucional

## Endpoints da API

### CRUD Básico

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/api/residents/:residentId/contracts` | CREATE_CONTRACTS | Upload de contrato |
| GET | `/api/resident-contracts` | VIEW_CONTRACTS | Listar com filtros |
| GET | `/api/residents/:residentId/contracts/:id` | VIEW_CONTRACTS | Buscar por ID |
| PATCH | `/api/residents/:residentId/contracts/:id` | UPDATE_CONTRACTS | Atualizar metadados |
| DELETE | `/api/residents/:residentId/contracts/:id` | DELETE_CONTRACTS | Soft delete |

### Gestão de Arquivos

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| POST | `/api/residents/:residentId/contracts/:id/replace-file` | REPLACE_CONTRACTS | Substituir arquivo (nova versão) |
| GET | `/api/resident-contracts/:id/history` | VIEW_CONTRACTS | Histórico de alterações |

### Validação Pública

| Método | Rota | Permissão | Descrição |
|--------|------|-----------|-----------|
| GET | `/api/contracts/validate/:publicToken` | Público | Validar por token |
| POST | `/api/contracts/validate` | Público | Validar por hash SHA-256 |

## Regras de Negócio

### Cálculo de Status Automático

| Status | Condição |
|--------|----------|
| `VIGENTE` | `endDate` > hoje + 30 dias |
| `VENCENDO_EM_30_DIAS` | 0 ≤ dias até `endDate` ≤ 30 |
| `VENCIDO` | `endDate` < hoje |

### Versionamento de Contratos

**Ao substituir arquivo:**
1. ✅ Criar novo registro com `version = versionAnterior + 1`
2. ✅ Marcar contrato anterior: `replacedById`, `replacedAt`
3. ✅ **NÃO deletar** arquivos antigos do MinIO (manter histórico)
4. ✅ Criar registro em `ContractHistory` com `action=REPLACED` e `reason` obrigatório

### Segurança

**Criptografia:**
- ✅ SSE-C (Server-Side Encryption with Customer Key)
- ✅ Categoria `contracts` e `contracts-original` configuradas no FilesService
- ✅ Chaves gerenciadas pelo backend

**Validação:**
- ✅ Arquivo máximo: 10MB
- ✅ Formatos aceitos: JPEG, PNG, WEBP, PDF
- ✅ TenantId validado em todas operações
- ✅ Soft delete (campo `deletedAt`)

**Integridade:**
- ✅ Hash SHA-256 do original (rastreabilidade)
- ✅ Hash SHA-256 do PDF final (validação pública)
- ✅ Token público UUID (não expõe ID interno)

## Estrutura de Armazenamento

### MinIO/S3 Paths

```
rafa-ilpi-files/
├── tenants/{tenantId}/
│   ├── contracts-original/
│   │   └── {residentId}/
│   │       └── {uuid}.{ext}          # Arquivo original (imagem ou PDF)
│   └── contracts/
│       └── {residentId}/
│           └── {uuid}.pdf             # PDF processado com carimbo
```

### URLs Assinadas

- ✅ Geradas pelo `FilesService.getFileUrl()`
- ✅ Validade: 60 minutos (padrão)
- ✅ Cache: 50 minutos (evita regeneração frequente)

## Limitação Técnica do pdf-lib

**Problema descoberto:**
Após chamar `pdfDoc.save()`, o documento fica "congelado" e não aceita mais modificações (ex: `drawText()`).

**Solução implementada:**
1. Salvar PDF temporário para calcular hash
2. **Recarregar com `PDFDocument.load(pdfBytes)`**
3. Adicionar carimbo no documento recarregado
4. Salvar PDF final

**Afeta:**
- ✅ `processImage()` - linha 115-120
- ✅ `processPdf()` - linha 164-171
- ✅ `rebuildPdfFromImages()` - linha 324-326

## Qualidade de Imagem

**Estratégia:** Preservar resolução original sem redimensionamento forçado.

**Processamento:**
```typescript
// Apenas converte para PNG (qualidade 100%)
// SEM redimensionar - preserva 100% da resolução
sharp(buffer).png({ compressionLevel: 6, quality: 100 })
```

**Escalonamento:**
```typescript
// Calcula escala SOMENTE para caber na área útil do PDF
const scale = Math.min(
  maxWidth / imgWidth,   // 515pt
  maxHeight / imgHeight  // 712pt
)
```

**Vantagens:**
- ✅ Imagens pequenas não são degradadas
- ✅ PDFs podem ser ampliados sem perda
- ✅ Tamanho otimizado via compressão PNG
- ✅ Escalonamento não-destrutivo no PDF

## Integração com Prontuário

**Tab "Contratos" no ResidentMedicalRecord:**
- ✅ Lista de contratos ativos e versões anteriores
- ✅ Status visual (VIGENTE/VENCENDO/VENCIDO)
- ✅ Valor da mensalidade e dia de vencimento
- ✅ Download de arquivo original e PDF processado
- ✅ Histórico de alterações (auditoria)
- ✅ Ações: Visualizar, Substituir, Excluir

## Referências

- [CHANGELOG - 2026-01-13](../../CHANGELOG.md#2026-01-13---digitalização-de-contratos)
- [Módulo de Residentes](residents.md) - Integração com prontuário
- [Documentação de File Storage](../architecture/file-storage.md) - Criptografia SSE-C

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
