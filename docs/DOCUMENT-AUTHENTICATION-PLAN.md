# Plano: Sistema de Autenticação de Documentos (Externos + Internos)

**Data:** 15/12/2025
**Responsável:** Emanuel (Dr. E.)
**Objetivo:** Implementar sistema de autenticação institucional para documentos externos E internos com carimbo visual padronizado

---

## 🎯 Visão Geral

Criar infraestrutura de autenticação de documentos que garanta:
- **Integridade:** Hash SHA-256 + Timestamp confiável
- **Rastreabilidade:** Usuário + Profissão + Registro profissional
- **Uniformidade:** Dois padrões de carimbo (Externo vs Interno)
- **Compliance:** LGPD + ANVISA + auditoria forense

### Princípio Fundamental
> "Todo PDF que sai do sistema e pode ser mostrado a terceiros deve 'falar por si'."

---

## 📋 Classificação dos Documentos

### 🔵 TIPO 1 - Documentos EXTERNOS (upload de terceiros)
**Origem:** Laboratórios, clínicas, outros médicos

**Exemplos:**
- Documentos pessoais (RG, CPF, CNS, certidões)
- Comprovantes de residência
- Documentos do responsável legal
- Prescrições de médicos externos
- Laudos de laboratórios externos
- Exames de terceiros
- Atestados médicos externos

**Tratamento:**
1. Upload do arquivo original (PDF ou imagem)
2. Conversão para páginas digitais (preservando proporção)
3. Montagem de PDF institucional A4
4. **Carimbo Tipo A** (Documento coletado)
5. Hash SHA-256 do PDF final
6. Storage no MinIO com SSE-C
7. Metadados no banco

### 🟢 TIPO 2 - Documentos INTERNOS OFICIAIS (gerados no sistema)
**Origem:** Profissionais da ILPI usando sistema Rafa

**Exemplos:**
- Prescrições médicas internas
- Clinical Notes / Evoluções SOAP
- POPs (Procedimentos Operacionais Padrão)
- Requisições de exame
- Relatórios multiprofissionais
- Planos de cuidado
- Avaliações técnicas

**Tratamento:**
1. Geração de PDF no backend (ou processamento do PDF do frontend)
2. **Carimbo Tipo B** (Documento gerado eletronicamente)
3. Hash SHA-256 do PDF final
4. Storage no MinIO com SSE-C
5. Metadados no banco

### ⚪ TIPO 3 - Documentos OPERACIONAIS (sem carimbo)
**Origem:** Rascunhos, previews, trabalho interno

**Exemplos:**
- Rascunhos de documentos
- Pré-visualizações
- Exportações para conferência interna

**Tratamento:**
- Apenas metadados no banco
- Sem carimbo visual
- **NÃO devem ser apresentados como documentos oficiais**

---

## 🏷️ Dois Padrões de Carimbo

### Carimbo Tipo A - DOCUMENTOS EXTERNOS

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Documento coletado e validado eletronicamente por
Maria Santos – Enfermeira (COREN/SP 12345),
em 15/12/2025, às 14:30:22 (UTC-3).
Tipo: Exame Laboratorial | Detalhes: Clínica Pró Saúde
Hash SHA-256: 9f2c...ab78
ILPI Santa Clara | CNPJ: 12.345.678/0001-90
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Linguagem-chave:** "coletado e validado eletronicamente"

⚠️ **Nota Jurídica:** O termo "validado" (em vez de "assinado") evita interpretação de que o profissional está assumindo autoria do conteúdo do documento externo. O profissional apenas atesta o ato de coleta/registro no sistema.

### Carimbo Tipo B - DOCUMENTOS INTERNOS

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Documento gerado eletronicamente no Sistema Rafa ILPI por
Dr. João Silva – Médico (CRM/SP 12345),
em 15/12/2025, às 14:30:22 (UTC-3).
Hash SHA-256: 9f2c...ab78
ILPI Santa Clara | CNPJ: 12.345.678/0001-90
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Linguagem-chave:** "gerado eletronicamente no Sistema Rafa ILPI"

---

## 🛠️ Stack Tecnológica

### Bibliotecas a Instalar

```bash
cd apps/backend
npm install pdf-lib@1.17.1 --save
npm install canvas@2.11.2 --save
npm install @types/pdfjs-dist@2.10.378 --save-dev
```

### Já Instaladas
- ✅ Sharp (processamento de imagens)
- ✅ Multer (upload de arquivos)
- ✅ crypto (Node.js nativo - hash SHA-256)

---

## 📊 Schema do Banco de Dados

### Nova Tabela: `DocumentSignature`

```prisma
model DocumentSignature {
  id                    String   @id @default(uuid())
  tenantId              String
  documentId            String   @unique // FK

  // Tipo de documento (para determinar o carimbo)
  documentType          DocumentType // EXTERNAL | INTERNAL_OFFICIAL | INTERNAL_DRAFT

  // Metadados de autenticação
  sha256Hash            String   // Hash do PDF final
  originalFileName      String   // Nome do arquivo original
  originalFileExtension String   // Ex: "pdf", "jpg", "png"
  pageCount             Int      // Número de páginas no documento final

  // Carimbo institucional
  stampedBy             String   // userId
  stampedAt             DateTime @default(now())
  institutionName       String   // Nome da ILPI
  institutionCnpj       String   // CNPJ da ILPI
  userFullName          String   // Nome completo do profissional
  userRole              String   // Ex: "Enfermeira", "Médico"
  userRegistry          String?  // Ex: "COREN/SP 12345" (opcional)

  // Metadados opcionais (para documentos externos)
  documentCategory      String?  // Ex: "Exame Laboratorial"
  documentDetails       String?  // Ex: "Clínica Pró Saúde"

  // Relações
  tenant                Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user                  User     @relation(fields: [stampedBy], references: [id])

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId])
  @@index([sha256Hash])
  @@map("document_signatures")
}

enum DocumentType {
  EXTERNAL           // Upload de terceiros (Carimbo Tipo A)
  INTERNAL_OFFICIAL  // Gerado no sistema, oficial (Carimbo Tipo B)
  INTERNAL_DRAFT     // Rascunho/preview (sem carimbo)
}
```

### Alterações em Tabelas Existentes

**ResidentDocument:**
```prisma
model ResidentDocument {
  // ... campos existentes ...

  // Nova relação
  signature DocumentSignature? // Relação 1:1

  // Flag para indicar tipo
  documentType DocumentType @default(EXTERNAL)
}
```

**ClinicalNoteDocument:**
```prisma
model ClinicalNoteDocument {
  // ... campos existentes ...

  // Nova relação
  signature DocumentSignature? // Relação 1:1

  // Flag para indicar tipo
  documentType DocumentType @default(INTERNAL_OFFICIAL)
}
```

---

## 🔧 Estrutura de Módulos

```
apps/backend/src/
├── document-authentication/
│   ├── document-authentication.module.ts
│   ├── document-authentication.service.ts
│   ├── services/
│   │   ├── pdf-converter.service.ts        # Converte PDF → Imagens
│   │   ├── image-processor.service.ts      # Processa imagens (Sharp)
│   │   ├── institutional-stamp.service.ts  # Gera DOIS tipos de carimbo
│   │   ├── pdf-builder.service.ts          # Monta PDF final
│   │   └── hash-generator.service.ts       # SHA-256
│   ├── dto/
│   │   ├── authenticate-document.dto.ts
│   │   └── verify-signature.dto.ts
│   ├── enums/
│   │   └── document-type.enum.ts
│   └── interfaces/
│       ├── stamp-config.interface.ts
│       └── document-page.interface.ts
```

---

## 📐 Arquitetura de Serviços

### 1. DocumentAuthenticationService (Orquestrador)

```typescript
export class DocumentAuthenticationService {
  async authenticateExternalDocument(
    fileBuffer: Buffer,
    metadata: AuthenticateDocumentDto,
    user: User,
    tenant: Tenant,
  ): Promise<AuthenticatedDocument> {
    // 1. Converter arquivo para imagens (PDF ou imagem)
    const pages = await this.convertToPages(fileBuffer, metadata.fileExtension);

    // 2. Processar cada página (fit A4, preservar proporção)
    const processedPages = await this.imageProcessor.processPages(pages);

    // 3. Montar PDF com Carimbo Tipo A
    const stampConfig = this.buildExternalStampConfig(user, tenant, metadata);
    const pdfBuffer = await this.pdfBuilder.buildAuthenticatedPdf(
      processedPages,
      stampConfig,
      'EXTERNAL',
    );

    // 4. Calcular hash SHA-256
    const hash = this.hashGenerator.calculateSHA256(pdfBuffer);

    // 5. Upload para MinIO
    const fileUrl = await this.filesService.uploadFile(
      pdfBuffer,
      'documents',
      tenant.id,
      { fileName: `${metadata.id}.pdf` },
    );

    // 6. Salvar metadados
    const signature = await this.prisma.documentSignature.create({
      data: {
        tenantId: tenant.id,
        documentId: metadata.documentId,
        documentType: 'EXTERNAL',
        sha256Hash: hash,
        stampedBy: user.id,
        // ... outros campos
      },
    });

    return { fileUrl, signature };
  }

  async authenticateInternalDocument(
    pdfBuffer: Buffer,
    metadata: AuthenticateDocumentDto,
    user: User,
    tenant: Tenant,
  ): Promise<AuthenticatedDocument> {
    // Similar, mas usa Carimbo Tipo B
    // ...
  }
}
```

### 2. PdfConverterService (usa pdf-lib + canvas)

```typescript
export class PdfConverterService {
  async convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const images: Buffer[] = [];

    for (let i = 0; i < pages.length; i++) {
      // Renderizar página como imagem usando canvas
      const page = pages[i];
      const { width, height } = page.getSize();

      // Criar canvas e renderizar
      const canvas = createCanvas(width * 2, height * 2); // 2x para qualidade
      const context = canvas.getContext('2d');

      // Renderizar PDF no canvas
      // ... (lógica de renderização)

      images.push(canvas.toBuffer('image/png'));
    }

    return images;
  }
}
```

### 3. ImageProcessorService (usa Sharp)

```typescript
export class ImageProcessorService {
  private readonly A4_WIDTH_PX = 2480;  // A4 em 300 DPI
  private readonly A4_HEIGHT_PX = 3508;
  private readonly MARGIN_PX = 100;
  private readonly FOOTER_HEIGHT_PX = 200; // Espaço para carimbo

  async fitImageToA4(imageBuffer: Buffer): Promise<Buffer> {
    const maxWidth = this.A4_WIDTH_PX - (2 * this.MARGIN_PX);
    const maxHeight = this.A4_HEIGHT_PX - (2 * this.MARGIN_PX) - this.FOOTER_HEIGHT_PX;

    // Redimensionar preservando proporção
    const resized = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',              // NUNCA corta
        withoutEnlargement: true,   // Não aumenta se menor
      })
      .toBuffer();

    // Centralizar na página A4
    const { width, height } = await sharp(resized).metadata();
    const x = Math.floor((this.A4_WIDTH_PX - width!) / 2);
    const y = Math.floor((this.A4_HEIGHT_PX - this.FOOTER_HEIGHT_PX - height!) / 2);

    return sharp({
      create: {
        width: this.A4_WIDTH_PX,
        height: this.A4_HEIGHT_PX,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([{ input: resized, top: y, left: x }])
      .png()
      .toBuffer();
  }
}
```

### 4. InstitutionalStampService (gera DOIS tipos)

```typescript
export class InstitutionalStampService {
  async addStampToPage(
    page: PDFPage,
    stampConfig: StampConfig,
    stampType: 'EXTERNAL' | 'INTERNAL_OFFICIAL',
  ): Promise<void> {
    const { width, height } = page.getSize();
    const font = await page.doc.embedFont(StandardFonts.Helvetica);
    const fontSize = 7;
    const lineHeight = 10;
    const margin = 40;
    const footerY = margin;

    let lines: string[];

    if (stampType === 'EXTERNAL') {
      // Carimbo Tipo A
      lines = [
        `Documento coletado e assinado eletronicamente por`,
        `${stampConfig.userFullName} – ${stampConfig.userRole}${stampConfig.userRegistry ? ' (' + stampConfig.userRegistry + ')' : ''},`,
        `em ${stampConfig.formattedTimestamp} (UTC-3).`,
        `Tipo: ${stampConfig.documentCategory}${stampConfig.documentDetails ? ' | Detalhes: ' + stampConfig.documentDetails : ''}`,
        `Hash SHA-256: ${stampConfig.hashPreview}`,
        `${stampConfig.institutionName} | CNPJ: ${stampConfig.institutionCnpj}`,
      ];
    } else {
      // Carimbo Tipo B
      lines = [
        `Documento gerado eletronicamente no Sistema Rafa ILPI por`,
        `${stampConfig.userFullName} – ${stampConfig.userRole}${stampConfig.userRegistry ? ' (' + stampConfig.userRegistry + ')' : ''},`,
        `em ${stampConfig.formattedTimestamp} (UTC-3).`,
        `Hash SHA-256: ${stampConfig.hashPreview}`,
        `${stampConfig.institutionName} | CNPJ: ${stampConfig.institutionCnpj}`,
      ];
    }

    // Desenhar linha separadora
    page.drawLine({
      start: { x: margin, y: footerY + (lines.length * lineHeight) + 5 },
      end: { x: width - margin, y: footerY + (lines.length * lineHeight) + 5 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Desenhar linhas do carimbo
    let currentY = footerY;
    for (const line of lines.reverse()) {
      page.drawText(line, {
        x: margin,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(0.3, 0.3, 0.3), // Cinza escuro
      });
      currentY += lineHeight;
    }
  }
}
```

---

## 🔄 Fluxo de Implementação

### FASE 1: Setup e Infraestrutura (4-6h)
- [ ] Instalar dependências (pdf-lib, canvas)
- [ ] Criar migration para `DocumentSignature` e enum `DocumentType`
- [ ] Criar módulo `DocumentAuthenticationModule`
- [ ] Configurar imports e exports

### FASE 2: Serviços Base (6-8h)
- [ ] Implementar `HashGeneratorService` (SHA-256)
- [ ] Implementar `PdfConverterService` (PDF → Imagens)
- [ ] Implementar `ImageProcessorService` (redimensionamento Sharp)
- [ ] Testes unitários dos serviços

### FASE 3: Carimbo Institucional (4-6h)
- [ ] Implementar `InstitutionalStampService`
- [ ] Suporte para Carimbo Tipo A (EXTERNAL)
- [ ] Suporte para Carimbo Tipo B (INTERNAL_OFFICIAL)
- [ ] Testes visuais dos carimbos

### FASE 4: PDF Builder (4-5h)
- [ ] Implementar `PdfBuilderService`
- [ ] Montagem de PDF A4 com páginas centralizadas
- [ ] Aplicação de carimbo em todas as páginas
- [ ] Testes end-to-end do pipeline completo

### FASE 5: Integração com ResidentDocuments (3-4h)
- [ ] Atualizar `ResidentDocumentsService`
- [ ] Chamar `DocumentAuthenticationService` no upload
- [ ] Adicionar campo `documentType` ao DTO
- [ ] Endpoint `POST /documents/:id/authenticate`
- [ ] Endpoint `GET /documents/:id/verify`

### FASE 6: Integração com Clinical Notes (3-4h)
- [ ] Atualizar `ClinicalNotesService`
- [ ] Processar PDFs anexados com Carimbo Tipo B
- [ ] Manter compatibilidade com PDFs existentes

### FASE 7: Integração com POPs (2-3h)
- [ ] Atualizar serviço de POPs
- [ ] Aplicar Carimbo Tipo B nos PDFs gerados
- [ ] Verificar compatibilidade

### FASE 8: Frontend (4-5h)
- [ ] Adicionar indicador visual "Autenticado" nos documentos
- [ ] Botão "Verificar Autenticidade"
- [ ] Modal de visualização de assinatura digital
- [ ] Badge diferenciando EXTERNAL vs INTERNAL_OFFICIAL

### FASE 9: Testes e Validação (3-4h)
- [ ] Testes E2E de autenticação de documentos
- [ ] Testes de verificação de integridade
- [ ] Testes de isolamento multi-tenant
- [ ] Validação de performance (upload de PDFs grandes)

### FASE 10: Documentação (2-3h)
- [ ] Criar `docs/modules/document-authentication.md`
- [ ] Atualizar `CHANGELOG.md`
- [ ] Documentar diferença entre Carimbo Tipo A e B

---

## ⏱️ Estimativa Total

**36-51 horas de desenvolvimento** (5-7 dias úteis em jornada de 6-8h/dia)

---

## 🔒 Segurança e Compliance

### Hash SHA-256
```typescript
import { createHash } from 'crypto';

function calculateSHA256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
```

### Verificação de Integridade
```typescript
async verifyDocumentIntegrity(documentId: string): Promise<boolean> {
  const signature = await this.prisma.documentSignature.findUnique({
    where: { documentId },
  });

  if (!signature) return false;

  // Baixar arquivo do MinIO
  const fileBuffer = await this.filesService.downloadFile(signature.filePath);

  // Recalcular hash
  const calculatedHash = calculateSHA256(fileBuffer);

  // Comparar com hash registrado
  return calculatedHash === signature.sha256Hash;
}
```

---

## 📝 Endpoints da API

### POST `/documents/:documentId/authenticate`
Autentica um documento já enviado.

**Request:**
```json
{
  "documentType": "EXTERNAL",
  "documentCategory": "Exame Laboratorial",
  "documentDetails": "Clínica Pró Saúde"
}
```

**Response:**
```json
{
  "success": true,
  "signature": {
    "id": "uuid",
    "sha256Hash": "9f2c...ab78",
    "pageCount": 3,
    "stampedAt": "2025-12-15T21:14:22.000Z",
    "stampedBy": "Dr. João Silva"
  }
}
```

### GET `/documents/:documentId/verify`
Verifica integridade de um documento autenticado.

**Response:**
```json
{
  "isValid": true,
  "signature": {
    "stampedBy": "Maria Santos - Enfermeira",
    "stampedAt": "2025-12-15T21:14:22.000Z",
    "sha256Hash": "9f2c...ab78",
    "documentType": "EXTERNAL",
    "institutionName": "ILPI Santa Clara"
  }
}
```

---

## 🧪 Casos de Teste

### Teste 1: Upload de PDF Externo (5 páginas)
- Input: PDF com 5 páginas (exame laboratorial)
- Validação:
  - ✅ Todas as 5 páginas preservadas
  - ✅ Carimbo Tipo A em todas as páginas
  - ✅ Hash SHA-256 correto
  - ✅ Timestamp UTC-3

### Teste 2: Upload de Imagem JPG
- Input: Foto de receita médica (JPG 4032x3024)
- Validação:
  - ✅ Convertida para PDF A4
  - ✅ Proporção preservada (sem distorção)
  - ✅ Centralizada na página
  - ✅ Carimbo Tipo A legível

### Teste 3: Clinical Note Interna
- Input: PDF de evolução SOAP gerado no sistema
- Validação:
  - ✅ Carimbo Tipo B aplicado
  - ✅ Linguagem "gerado eletronicamente"
  - ✅ Hash correto

### Teste 4: Verificação de Integridade
- Input: Documento autenticado existente
- Validação:
  - ✅ Hash SHA-256 corresponde ao arquivo
  - ✅ Metadados corretos

### Teste 5: Multi-tenant Isolation
- Input: Dois documentos de tenants diferentes
- Validação:
  - ✅ Acesso restrito por tenant
  - ✅ CNPJ correto no carimbo
  - ✅ Chaves de criptografia isoladas

---

## 📚 Arquivos Críticos a Modificar

### Backend
1. `apps/backend/prisma/schema.prisma` - Adicionar `DocumentSignature` e enum
2. `apps/backend/src/document-authentication/` - Novo módulo completo
3. `apps/backend/src/resident-documents/resident-documents.service.ts` - Integrar autenticação
4. `apps/backend/src/clinical-notes/clinical-notes.service.ts` - Integrar carimbo
5. `apps/backend/src/pops/pops.service.ts` - Integrar carimbo

### Frontend
1. `apps/frontend/src/components/residents/ResidentDocuments.tsx` - Indicador visual
2. `apps/frontend/src/components/DocumentSignatureBadge.tsx` - Novo componente
3. `apps/frontend/src/components/VerifyDocumentModal.tsx` - Novo modal

---

## ⚠️ Ajustes Críticos (Revisão Dr. E.)

### AJUSTE 1: Termo "validado" em vez de "assinado" (EXTERNO)
✅ **JÁ APLICADO** - Carimbo Tipo A usa "validado" para evitar interpretação de autoria do conteúdo externo.

### AJUSTE 2: Hash só entra no carimbo DEPOIS do PDF existir

**Problema:** Hash aparece no carimbo, mas hash é calculado DO PDF completo (incluindo carimbo).

**Solução Técnica:**

```typescript
async buildAuthenticatedPdf(pages, stampConfig, stampType): Promise<Buffer> {
  // ETAPA 1: Montar PDF com placeholder para hash
  const pdfWithPlaceholder = await this.buildPdfWithHashPlaceholder(pages, stampConfig, stampType);

  // ETAPA 2: Calcular hash do PDF com placeholder
  const finalHash = calculateSHA256(pdfWithPlaceholder);

  // ETAPA 3: Substituir placeholder pelo hash real
  const finalPdf = this.replacePlaceholderWithHash(pdfWithPlaceholder, finalHash);

  return finalPdf;
}
```

⚠️ **Alternativa mais simples (recomendada):**
- Hash no carimbo é do **conteúdo original** (antes do carimbo)
- PDF final tem hash diferente (inclui carimbo)
- Registrar AMBOS os hashes no banco:
  - `originalContentHash` - hash do conteúdo original
  - `finalPdfHash` - hash do PDF autenticado completo

### AJUSTE 3: PDF → Imagens → PDF só quando necessário

**Problema atual no plano:** Sempre converte PDF para imagens.

**Correção:**

```typescript
async convertToPages(fileBuffer: Buffer, fileExtension: string): Promise<Buffer[]> {
  if (fileExtension === 'pdf') {
    // Tentar importar páginas PDF diretamente (preserva texto)
    try {
      return await this.importPdfPagesDirect(fileBuffer);
    } catch (error) {
      // Fallback: renderizar como imagens
      return await this.convertPdfToImages(fileBuffer);
    }
  } else {
    // Imagens: processar com Sharp
    return [fileBuffer];
  }
}

async importPdfPagesDirect(pdfBuffer: Buffer): Promise<Buffer[]> {
  const { PDFDocument } = await import('pdf-lib');
  const srcDoc = await PDFDocument.load(pdfBuffer);
  const pages: Buffer[] = [];

  for (let i = 0; i < srcDoc.getPageCount(); i++) {
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
    newDoc.addPage(copiedPage);
    pages.push(Buffer.from(await newDoc.save()));
  }

  return pages;
}
```

**Benefícios:**
- ✅ Preserva texto (copy/paste funciona)
- ✅ Menor tamanho de arquivo
- ✅ Melhor performance
- ✅ Qualidade original mantida

### AJUSTE 4: userRole e userRegistry como snapshot imutável

**Problema:** Se campos vierem da tabela `User` dinamicamente, valores podem mudar no futuro.

**Solução no Schema:**

```prisma
model DocumentSignature {
  // ... campos existentes ...

  // Snapshot imutável do usuário no momento do carimbo
  userFullName          String   // Cópia, não referência
  userRole              String   // Cópia, não referência
  userRegistry          String?  // Cópia, não referência

  // Relação apenas para auditoria
  stampedBy             String   // userId
  user                  User     @relation(fields: [stampedBy], references: [id])
}
```

**Implementação no serviço:**

```typescript
const signature = await this.prisma.documentSignature.create({
  data: {
    // Snapshot no momento do carimbo (IMUTÁVEL)
    userFullName: user.fullName,
    userRole: user.position?.name || 'Profissional',
    userRegistry: user.professionalRegistry || null,

    // Referência para auditoria
    stampedBy: user.id,

    // ... outros campos
  },
});
```

⚠️ **CRÍTICO:** Esses campos NUNCA devem ser atualizados automaticamente se o User mudar.

### AJUSTE 5: Validador Público (FASE 2)

**Problema:** Plano não menciona validação pública de documentos.

**Adição ao plano:**

#### FASE 11 (futura): Validação Pública de Documentos

**Objetivo:** Permitir verificação de autenticidade sem login.

**Implementação:**

1. **Gerar token público ao criar assinatura:**

```prisma
model DocumentSignature {
  // ... campos existentes ...

  publicVerificationToken   String   @unique // UUID público
  publicVerificationUrl     String?  // URL completa
}
```

2. **Endpoint público:**

```typescript
// GET /public/verify/:token (SEM autenticação)
@Get('public/verify/:token')
@Public() // Decorator para bypass de auth
async verifyPublicDocument(@Param('token') token: string) {
  const signature = await this.prisma.documentSignature.findUnique({
    where: { publicVerificationToken: token },
    include: {
      tenant: { select: { name: true, cnpj: true } },
    },
  });

  if (!signature) {
    throw new NotFoundException('Documento não encontrado');
  }

  // Baixar PDF e verificar hash
  const pdfBuffer = await this.filesService.downloadFile(signature.filePath);
  const currentHash = calculateSHA256(pdfBuffer);
  const isValid = currentHash === signature.sha256Hash;

  return {
    isValid,
    documentType: signature.documentType,
    stampedAt: signature.stampedAt,
    stampedBy: signature.userFullName,
    userRole: signature.userRole,
    institutionName: signature.tenant.name,
    institutionCnpj: signature.tenant.cnpj,
    // NÃO retornar dados sensíveis (residentId, etc)
  };
}
```

3. **QR Code no PDF (opcional):**

Adicionar QR Code no carimbo apontando para URL de verificação:

```
https://sistema.rafalabs.com.br/public/verify/abc123...
```

4. **Página pública de verificação:**

Frontend público (sem login) para mostrar status de autenticidade:

```tsx
// apps/frontend/src/pages/public/VerifyDocument.tsx
export function VerifyDocument() {
  const { token } = useParams();
  const { data, isLoading } = useQuery(['verify', token], () =>
    api.get(`/public/verify/${token}`)
  );

  return (
    <div>
      <h1>Verificação de Autenticidade</h1>
      {data?.isValid ? (
        <div className="success">
          ✅ Documento autêntico
          <p>Gerado por: {data.stampedBy} - {data.userRole}</p>
          <p>Instituição: {data.institutionName}</p>
          <p>Data: {data.stampedAt}</p>
        </div>
      ) : (
        <div className="error">
          ❌ Documento não encontrado ou adulterado
        </div>
      )}
    </div>
  );
}
```

**Benefícios:**
- ✅ Qualquer pessoa pode verificar autenticidade (auditores, fiscais, juízes)
- ✅ Não precisa de login
- ✅ Padrão similar ao PJe do Judiciário
- ✅ QR Code facilita acesso mobile

---

## 🔗 Referências

- [pdf-lib Documentation](https://pdf-lib.js.org/)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [LGPD Art. 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [PJe - Processo Judicial Eletrônico](https://www.cnj.jus.br/sistemas/pje/)

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
**Data:** 15/12/2025
**Status:** 📋 Plano Revisado - Pronto para Implementação
