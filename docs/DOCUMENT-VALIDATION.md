# Sistema de Validação Pública de Documentos

**Data:** 20/01/2026
**Responsável:** Emanuel (Dr. E.)
**Status:** ✅ Implementado e em Produção

---

## 🎯 Visão Geral

O Sistema de Validação Pública permite que **qualquer pessoa** (auditores, fiscais, familiares, juízes) verifique a **autenticidade e integridade** de documentos processados pelo Rafa ILPI, **sem necessidade de login**.

### Princípios Fundamentais

> "Documentos oficiais devem poder ser verificados publicamente de forma simples, transparente e segura."

**Garantias:**
- ✅ **Integridade criptográfica**: Hash SHA-256 garante que o documento não foi alterado
- ✅ **Rastreabilidade**: Identificação do profissional que processou o documento
- ✅ **Transparência**: Informações da instituição (nome, CNPJ) claramente exibidas
- ✅ **Acessibilidade**: Página HTML responsiva, sem necessidade de login
- ✅ **Multi-tenant**: Busca automática em todos os tenants do sistema

---

## 📐 Arquitetura

### Fluxo de Validação

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PROCESSAMENTO DE DOCUMENTO                                   │
│    ├─ Upload do arquivo (PDF)                                   │
│    ├─ Processamento com FileProcessingService                   │
│    ├─ Geração de hash SHA-256 (original + processado)           │
│    ├─ Criação de token público (UUID)                           │
│    └─ Carimbo institucional com URL de validação                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. ARMAZENAMENTO                                                │
│    ├─ Arquivo original: MinIO (uploads/{tenantId}/...)          │
│    ├─ Arquivo processado: MinIO (processed/{tenantId}/...)      │
│    └─ Metadados: PostgreSQL (resident_contracts, vaccinations)  │
│        ├─ publicToken (UUID único)                              │
│        ├─ originalFileHash (SHA-256)                            │
│        ├─ processedFileHash (SHA-256)                           │
│        └─ uploadedBy (userId)                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. VALIDAÇÃO PÚBLICA (SEM AUTENTICAÇÃO)                         │
│    ├─ Acesso: GET /api/validar/:publicToken                     │
│    ├─ ValidationService busca cross-tenant:                     │
│    │   ├─ Vaccinations (todos os schemas de tenant)             │
│    │   └─ ResidentContracts (todos os schemas de tenant)        │
│    ├─ JOIN com users e user_profiles do schema do tenant        │
│    ├─ Retorna HTML com informações:                             │
│    │   ├─ Tipo de documento                                     │
│    │   ├─ Instituição (nome + CNPJ)                             │
│    │   ├─ Validado por (nome + cargo profissional)              │
│    │   ├─ Data de processamento                                 │
│    │   └─ Hashes SHA-256 (original + processado)                │
│    └─ Design system Rafa ILPI (responsivo)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Tipos de Documentos Suportados

### 1. **Contratos de Residência** (`resident_contracts`)

**Schema:** `{tenant_schema}.resident_contracts`

**Campos Relevantes:**
```typescript
{
  publicToken: string;           // UUID para validação pública
  originalFileHash: string;      // SHA-256 do arquivo original
  processedFileHash: string;     // SHA-256 do PDF processado
  uploadedBy: string;            // userId (FK para users do tenant)
  createdAt: DateTime;           // Data de processamento
  signatories: JsonValue;        // Metadados dos signatários
}
```

**Busca Cross-Tenant:**
```sql
SELECT
  c.id::text,
  c."publicToken"::text,
  c."originalFileHash",
  c."processedFileHash",
  c.signatories,
  c."uploadedBy"::text,
  u.name AS "uploaderName",
  up."positionCode",
  up."registrationType",
  up."registrationNumber",
  up."registrationState",
  c."createdAt",
  t.name AS "tenantName",
  t.cnpj AS "tenantCnpj"
FROM "{schema_name}".resident_contracts c
JOIN "{schema_name}".residents r ON r.id = c."residentId"
JOIN public.tenants t ON t.id = r."tenantId"
LEFT JOIN "{schema_name}".users u ON u.id = c."uploadedBy"
LEFT JOIN "{schema_name}".user_profiles up ON up."userId" = u.id
WHERE c."publicToken" = $1
```

### 2. **Comprovantes de Vacinação** (`vaccinations`)

**Schema:** `{tenant_schema}.vaccinations`

**Campos Relevantes:**
```typescript
{
  publicToken: string;           // UUID para validação pública
  originalFileHash: string;      // SHA-256 do arquivo original
  processedFileHash: string;     // SHA-256 do PDF processado
  uploadedBy: string;            // userId (FK para users do tenant)
  createdAt: DateTime;           // Data de processamento
  vaccineName: string;           // Nome da vacina
  applicationDate: DateTime;     // Data de aplicação
}
```

**Busca Cross-Tenant:**
```sql
SELECT
  v.id::text,
  v."publicToken"::text,
  v."originalFileHash",
  v."processedFileHash",
  v."vaccineName",
  v."applicationDate",
  v."uploadedBy"::text,
  u.name AS "uploaderName",
  up."positionCode",
  up."registrationType",
  up."registrationNumber",
  up."registrationState",
  v."createdAt",
  t.name AS "tenantName",
  t.cnpj AS "tenantCnpj"
FROM "{schema_name}".vaccinations v
JOIN "{schema_name}".residents r ON r.id = v."residentId"
JOIN public.tenants t ON t.id = r."tenantId"
LEFT JOIN "{schema_name}".users u ON u.id = v."uploadedBy"
LEFT JOIN "{schema_name}".user_profiles up ON up."userId" = u.id
WHERE v."publicToken" = $1
```

---

## 🏗️ Estrutura de Módulos

### Backend

```
apps/backend/src/
├── validation/
│   ├── validation.module.ts              # Módulo NestJS
│   ├── validation.controller.ts          # Controller público (sem auth)
│   ├── validation.service.ts             # Lógica de busca cross-tenant
│   └── dto/
│       └── public-document-validation.dto.ts
│
├── files/
│   ├── file-processing.service.ts        # Processamento de PDF + carimbo
│   └── interfaces/
│       └── stamp-metadata.interface.ts   # Metadados para carimbo
│
├── resident-contracts/
│   └── resident-contracts.service.ts     # Integração com FileProcessingService
│
└── vaccinations/
    └── vaccinations.service.ts           # Integração com FileProcessingService
```

### Frontend

**Nota:** Atualmente, a validação é uma **página HTML pura** renderizada no backend. Não há componentes React para validação pública.

**Acesso:** `https://rafa-ilpi.rafalabs.com.br/api/validar/{publicToken}`

---

## 🔧 Implementação Técnica

### 1. ValidationModule

**Arquivo:** `apps/backend/src/validation/validation.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';

@Module({
  controllers: [ValidationController],
  providers: [ValidationService],
})
export class ValidationModule {}
```

**Registrado em:** `apps/backend/src/app.module.ts`

```typescript
@Module({
  imports: [
    // ... outros módulos
    ValidationModule, // ← Validação pública de documentos
  ],
})
export class AppModule {}
```

---

### 2. ValidationController

**Arquivo:** `apps/backend/src/validation/validation.controller.ts`

**Responsabilidades:**
- ✅ Endpoint público **SEM autenticação** (`@Public()`)
- ✅ Renderização de HTML responsivo com design system Rafa ILPI
- ✅ Tratamento de erros (404, 500)
- ✅ Formatação de datas em português (PT-BR)
- ✅ Exibição de badges visuais (✅ Válido / ❌ Inválido)

**Principais Métodos:**

#### `GET /api/validar/:token` - Validar Documento

```typescript
@Get(':token')
@Public() // Decorator para bypass de JWT authentication
async validateDocument(@Param('token') token: string, @Res() res: Response) {
  try {
    const result = await this.validationService.validatePublicDocument(token);

    if (!result.valid) {
      return res.status(404).send(this.renderNotFoundPage());
    }

    return res.send(this.renderSuccessPage(result));
  } catch (error) {
    return res.status(500).send(this.renderErrorPage(error.message));
  }
}
```

**Design System:**

```css
:root {
  --primary: hsl(210, 90%, 45%);           /* Azul Rafa ILPI */
  --secondary: hsl(174, 55%, 38%);         /* Verde-azulado */
  --success: hsl(158, 60%, 34%);           /* Verde sucesso */
  --danger: hsl(0, 72%, 48%);              /* Vermelho erro */
  --muted: hsl(210, 40%, 96%);             /* Cinza claro */
  --foreground: hsl(222, 47%, 11%);        /* Texto escuro */
}
```

**Componentes Visuais:**
- **Header:** Logo "RAFA ILPI" com fundo azul primário
- **Badge:** Status de validação (✅ Documento Válido / ❌ Não Encontrado)
- **Info Grid:** Informações organizadas com border-left colorida
- **Hash Section:** Seção destacada com hashes SHA-256 em fonte monospace
- **Footer:** Token de validação + créditos

---

### 3. ValidationService

**Arquivo:** `apps/backend/src/validation/validation.service.ts`

**Responsabilidades:**
- ✅ Busca cross-tenant (consulta todos os schemas de tenants)
- ✅ Query SQL raw com `$queryRawUnsafe` (necessário para dynamic schema)
- ✅ Fallback entre vaccinations → resident_contracts
- ✅ Mapeamento de `PositionCode` (ENUM) para nomes legíveis
- ✅ Construção de resposta padronizada (`PublicDocumentValidationDto`)

**Principais Métodos:**

#### `validatePublicDocument(token: string)`

```typescript
async validatePublicDocument(
  token: string,
): Promise<PublicDocumentValidationDto> {
  // 1. Buscar todos os tenants ativos
  const tenants = await this.prisma.tenant.findMany({
    select: { id: true, schema: true },
  });

  // 2. Buscar em vaccinations primeiro (mais comum)
  for (const tenant of tenants) {
    const vaccination = await this.findVaccinationByToken(token, tenant.schema);
    if (vaccination) {
      return this.buildVaccinationResponse(vaccination);
    }
  }

  // 3. Fallback: buscar em resident_contracts
  for (const tenant of tenants) {
    const contract = await this.findContractByToken(token, tenant.schema);
    if (contract) {
      return this.buildContractResponse(contract);
    }
  }

  // 4. Não encontrado
  return { valid: false };
}
```

#### `findVaccinationByToken(token: string, schema: string)`

```typescript
private async findVaccinationByToken(
  token: string,
  schema_name: string,
): Promise<VaccinationResult | null> {
  try {
    const result = await this.prisma.$queryRawUnsafe<VaccinationResult[]>(`
      SELECT
        v.id::text,
        v."publicToken"::text,
        v."originalFileHash",
        v."processedFileHash",
        v."vaccineName",
        v."applicationDate",
        v."uploadedBy"::text,
        u.name AS "uploaderName",
        u.role AS "uploaderRole",
        up."positionCode",
        up."registrationType",
        up."registrationNumber",
        up."registrationState",
        v."createdAt",
        t.id::text AS "tenantId",
        t.name AS "tenantName",
        t.cnpj AS "tenantCnpj",
        '${schema_name}' AS schema
      FROM "${schema_name}".vaccinations v
      JOIN "${schema_name}".residents r ON r.id = v."residentId"
      JOIN public.tenants t ON t.id = r."tenantId"
      LEFT JOIN "${schema_name}".users u ON u.id = v."uploadedBy"
      LEFT JOIN "${schema_name}".user_profiles up ON up."userId" = u.id
      WHERE v."publicToken" = $1
      LIMIT 1
    `, token);

    return result[0] || null;
  } catch (error) {
    this.logger.error(`Schema ${schema_name} - vaccination error: ${error.message}`, error.stack);
    return null;
  }
}
```

#### `mapPositionCodeToLabel(positionCode: string)`

**Problema:** O banco armazena `positionCode` como ENUM em formato SCREAMING_SNAKE_CASE (ex: `TECHNICAL_MANAGER`).

**Solução:** Mapeamento manual para nomes legíveis em português.

```typescript
private mapPositionCodeToLabel(positionCode: string | null): string | null {
  if (!positionCode) return null;

  const positionMap: Record<string, string> = {
    ADMINISTRATOR: 'Administrador',
    TECHNICAL_MANAGER: 'Responsável Técnico',
    NURSING_COORDINATOR: 'Coordenador de Enfermagem',
    NURSE: 'Enfermeiro',
    NURSING_TECHNICIAN: 'Técnico de Enfermagem',
    NURSING_ASSISTANT: 'Auxiliar de Enfermagem',
    DOCTOR: 'Médico',
    PSYCHOLOGIST: 'Psicólogo',
    SOCIAL_WORKER: 'Assistente Social',
    PHYSIOTHERAPIST: 'Fisioterapeuta',
    NUTRITIONIST: 'Nutricionista',
    SPEECH_THERAPIST: 'Fonoaudiólogo',
    OCCUPATIONAL_THERAPIST: 'Terapeuta Ocupacional',
    CAREGIVER: 'Cuidador de Idosos',
    ADMINISTRATIVE: 'Administrativo',
    ADMINISTRATIVE_ASSISTANT: 'Assistente Administrativo',
    OTHER: 'Outros',
  };

  return positionMap[positionCode] || positionCode;
}
```

**Hierarquia de Fallback para "Função":**
```typescript
const validatorRole = this.mapPositionCodeToLabel(contract.positionCode)  // 1º: Cargo profissional
  || contract.uploaderRole                                                 // 2º: Role técnico (ADMIN, USER)
  || 'Não informado';                                                      // 3º: Fallback
```

---

### 4. FileProcessingService

**Arquivo:** `apps/backend/src/files/file-processing.service.ts`

**Responsabilidades:**
- ✅ Processamento de PDF com pdf-lib
- ✅ Geração de carimbo institucional (rodapé em todas as páginas)
- ✅ Cálculo de hash SHA-256 (original + processado)
- ✅ Criação de token público (UUID v4)
- ✅ Upload para MinIO (processado)

**Método Principal:**

```typescript
async processPdfWithStamp(
  fileBuffer: Buffer,
  metadata: StampMetadata,
): Promise<ProcessedPdfResult> {
  // 1. Carregar PDF original
  const pdfDoc = await PDFDocument.load(fileBuffer);

  // 2. Gerar token público
  const publicToken = randomUUID();

  // 3. Calcular hash do arquivo original
  const originalHash = createHash('sha256').update(fileBuffer).digest('hex');

  // 4. Adicionar carimbo em todas as páginas
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const page of pages) {
    await this.addInstitutionalStamp(page, font, metadata, publicToken);
  }

  // 5. Salvar PDF processado
  const processedBytes = await pdfDoc.save();
  const processedBuffer = Buffer.from(processedBytes);

  // 6. Calcular hash do arquivo processado
  const processedHash = createHash('sha256').update(processedBuffer).digest('hex');

  // 7. Upload para MinIO
  const processedUrl = await this.filesService.uploadFile(
    processedBuffer,
    'processed',
    metadata.tenantId,
    { fileName: `${metadata.fileName}_processed.pdf` }
  );

  return {
    publicToken,
    originalFileHash: originalHash,
    processedFileHash: processedHash,
    processedFileUrl: processedUrl,
    processedFileBuffer: processedBuffer,
  };
}
```

**Carimbo Institucional:**

```typescript
private async addInstitutionalStamp(
  page: PDFPage,
  font: PDFFont,
  metadata: StampMetadata,
  publicToken: string,
): Promise<void> {
  const { width, height } = page.getSize();
  const fontSize = 8;
  const lineHeight = 12;
  const margin = 40;

  // Linhas do carimbo
  const lines = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `Documento processado eletronicamente por ${metadata.uploaderName}`,
    `${metadata.institutionName} | CNPJ: ${metadata.institutionCnpj}`,
    `Processado em: ${metadata.processedAt}`,
    `Validar: https://rafa-ilpi.rafalabs.com.br/api/validar/${publicToken}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ];

  // Desenhar linhas do rodapé
  let y = margin;
  for (const line of lines) {
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    y += lineHeight;
  }
}
```

---

## 📊 Modelo de Dados

### Schema: `tenant_{schema}.vaccinations`

```prisma
model Vaccination {
  // ... campos existentes

  // Processamento de arquivo
  originalFile           String?       // URL do arquivo original no MinIO
  originalFileName       String?       // Nome original do arquivo
  originalFileHash       String?       // SHA-256 do arquivo original
  originalFileSize       Int?          // Tamanho em bytes

  processedFile          String?       // URL do PDF processado no MinIO
  processedFileHash      String?       // SHA-256 do PDF processado

  publicToken            String?       @unique // Token para validação pública

  processingStatus       ProcessingStatus?  // PENDING | PROCESSING | COMPLETED | FAILED
  processingError        String?       // Mensagem de erro se falhar

  uploadedBy             String?       // userId (FK)
  uploadedByUser         User?         @relation(fields: [uploadedBy], references: [id])

  @@index([publicToken])
}

enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### Schema: `tenant_{schema}.resident_contracts`

```prisma
model ResidentContract {
  // ... campos existentes

  // Processamento de arquivo
  publicToken            String        @unique  // Token para validação pública
  originalFileHash       String                 // SHA-256 do arquivo original
  processedFileHash      String                 // SHA-256 do PDF processado

  uploadedBy             String        // userId (FK)
  uploadedByUser         User          @relation(fields: [uploadedBy], references: [id])

  @@index([publicToken])
}
```

---

## 🔒 Segurança e Compliance

### 1. **Isolamento Multi-tenant**

**Problema:** Query SQL raw pode acessar schemas de outros tenants.

**Solução:**
- ✅ Sempre usar schema do próprio tenant (`"${schema_name}".table`)
- ✅ JOIN com `public.tenants` para validar ownership
- ✅ NUNCA expor dados sensíveis de residentes na validação pública

```typescript
// ✅ CORRETO: Usa schema do tenant
JOIN "${schema_name}".users u ON u.id = v."uploadedBy"

// ❌ ERRADO: Usaria schema público (dados misturados)
JOIN public.users u ON u.id = v."uploadedBy"
```

### 2. **Autenticação Pública**

**Decorator `@Public()`:**

```typescript
@Get(':token')
@Public() // ← Bypassa JwtAuthGuard global
async validateDocument(@Param('token') token: string) {
  // ... endpoint público sem JWT
}
```

**Implementação no AppModule:**

```typescript
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // ← Guard global
    },
  ],
})
export class AppModule {}
```

**Decorator @Public() no Guard:**

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) return true; // ← Permite acesso sem JWT
    return super.canActivate(context);
  }
}
```

### 3. **Hash SHA-256**

**Integridade Criptográfica:**

```typescript
import { createHash } from 'crypto';

function calculateSHA256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
```

**Dois Hashes Armazenados:**
- `originalFileHash`: Hash do arquivo enviado pelo usuário
- `processedFileHash`: Hash do PDF final com carimbo institucional

**Propósito:**
- ✅ Detectar adulteração do arquivo
- ✅ Garantir que o PDF processado corresponde ao original
- ✅ Auditoria forense em caso de disputas legais

### 4. **Dados Expostos vs. Dados Sensíveis**

**✅ Informações PÚBLICAS (exibidas na validação):**
- Tipo de documento (Contrato, Vacinação)
- Nome da instituição (ILPI)
- CNPJ da instituição
- Nome completo do profissional que processou
- Cargo profissional (Responsável Técnico, Enfermeiro, etc.)
- Registro profissional (COREN, CRM, etc.)
- Data de processamento
- Hashes SHA-256

**❌ Informações SENSÍVEIS (NUNCA expor):**
- Nome do residente
- Dados pessoais do residente (CPF, RG, CNS)
- Conteúdo do contrato (cláusulas, valores)
- Dados médicos (diagnósticos, prescrições)
- ID interno do residente
- ID interno do tenant

---

## 📋 Casos de Uso

### Caso 1: Validar Comprovante de Vacinação

**Cenário:** Familiar recebe comprovante de vacinação em PDF e quer verificar autenticidade.

**Fluxo:**
1. Familiar abre o PDF processado
2. Vê carimbo institucional no rodapé com URL: `https://rafa-ilpi.rafalabs.com.br/api/validar/abc-123...`
3. Acessa a URL em qualquer navegador (mobile ou desktop)
4. Sistema busca em todos os tenants e encontra o documento
5. Página HTML exibe:
   - ✅ Badge "Documento Válido"
   - Tipo: "Comprovante de Vacinação"
   - Vacina: "COVID-19 - 1ª Dose"
   - Instituição: "ILPI Santa Clara | CNPJ: 12.345.678/0001-90"
   - Validado por: "Maria Santos - Enfermeira (COREN/SP 12345)"
   - Data de processamento: "15 de janeiro de 2026 às 14:30"
   - Hashes SHA-256 (original + processado)

### Caso 2: Validar Contrato de Residência

**Cenário:** Auditor fiscal da ANVISA quer verificar autenticidade de contrato.

**Fluxo:**
1. Auditor recebe contrato assinado em PDF
2. Vê carimbo institucional no rodapé
3. Acessa URL de validação
4. Sistema valida e exibe:
   - ✅ Badge "Documento Válido"
   - Tipo: "Contrato de Residência"
   - Instituição: "TELE ENGENHARIA LTDA | CNPJ: 51.482.599/0001-88"
   - Validado por: "Dagny Taggart - Responsável Técnico"
   - Data de processamento: "19 de janeiro de 2026 às 23:27"
   - Hashes SHA-256
5. Auditor pode comparar hash exibido com hash do PDF recebido para garantir integridade

### Caso 3: Documento Adulterado

**Cenário:** Alguém tenta alterar um documento processado.

**Fluxo:**
1. Pessoa edita PDF processado (alterando valores ou texto)
2. Hash SHA-256 do arquivo modificado NÃO corresponde ao hash registrado
3. Ao acessar URL de validação, sistema ainda mostra documento original como válido
4. **Problema detectado:** Hash do arquivo recebido ≠ Hash exibido no sistema
5. Auditor identifica adulteração

**Nota:** Atualmente, o sistema **não valida o arquivo enviado** - apenas exibe os hashes registrados. Para detecção automática de adulteração, seria necessário implementar upload do PDF na página de validação.

### Caso 4: Token Inexistente

**Cenário:** Alguém tenta acessar URL com token inválido.

**Fluxo:**
1. Acesso: `https://rafa-ilpi.rafalabs.com.br/api/validar/token-falso-123`
2. Sistema busca em todos os schemas de tenants
3. Nenhum documento encontrado
4. Retorna página HTML com:
   - ❌ Badge "Documento Não Encontrado"
   - Mensagem: "Não foi possível validar este documento"
   - Status HTTP: 404

---

## 🧪 Testes

### Teste 1: Validação de Vacinação (Happy Path)

**Setup:**
```typescript
// 1. Criar tenant com schema
const tenant = await prisma.tenant.create({
  data: {
    name: 'ILPI Teste',
    cnpj: '12.345.678/0001-90',
    schema: 'tenant_ilpi_teste_abc123',
  },
});

// 2. Criar usuário com perfil profissional
const user = await prisma.user.create({
  data: {
    name: 'Maria Santos',
    email: 'maria@ilpi.com',
    role: 'USER',
  },
});

await prisma.userProfile.create({
  data: {
    userId: user.id,
    positionCode: 'NURSE',
    registrationType: 'COREN',
    registrationNumber: '12345',
    registrationState: 'SP',
  },
});

// 3. Criar vacinação com publicToken
const vaccination = await prisma.vaccination.create({
  data: {
    residentId: resident.id,
    vaccineName: 'COVID-19 - 1ª Dose',
    applicationDate: new Date(),
    uploadedBy: user.id,
    publicToken: 'test-token-12345',
    originalFileHash: 'abc123...',
    processedFileHash: 'def456...',
    processingStatus: 'COMPLETED',
  },
});
```

**Teste:**
```typescript
const response = await request(app.getHttpServer())
  .get('/api/validar/test-token-12345')
  .expect(200);

expect(response.text).toContain('Documento Válido');
expect(response.text).toContain('COVID-19 - 1ª Dose');
expect(response.text).toContain('Maria Santos');
expect(response.text).toContain('Enfermeiro'); // Mapeamento de NURSE
expect(response.text).toContain('COREN/SP 12345');
```

### Teste 2: Validação de Contrato

**Setup:**
```typescript
const contract = await prisma.residentContract.create({
  data: {
    residentId: resident.id,
    uploadedBy: user.id,
    publicToken: 'contract-token-abc',
    originalFileHash: 'hash-original-123',
    processedFileHash: 'hash-processed-456',
    signatories: { resident: 'João Silva', responsible: 'Maria Silva' },
  },
});
```

**Teste:**
```typescript
const response = await request(app.getHttpServer())
  .get('/api/validar/contract-token-abc')
  .expect(200);

expect(response.text).toContain('Contrato de Residência');
expect(response.text).toContain('hash-original-123');
expect(response.text).toContain('hash-processed-456');
```

### Teste 3: Token Não Encontrado

```typescript
const response = await request(app.getHttpServer())
  .get('/api/validar/token-inexistente')
  .expect(404);

expect(response.text).toContain('Documento Não Encontrado');
```

### Teste 4: Mapeamento de PositionCode

```typescript
describe('mapPositionCodeToLabel', () => {
  it('deve mapear TECHNICAL_MANAGER para Responsável Técnico', () => {
    const result = service['mapPositionCodeToLabel']('TECHNICAL_MANAGER');
    expect(result).toBe('Responsável Técnico');
  });

  it('deve mapear NURSE para Enfermeiro', () => {
    const result = service['mapPositionCodeToLabel']('NURSE');
    expect(result).toBe('Enfermeiro');
  });

  it('deve retornar null para positionCode null', () => {
    const result = service['mapPositionCodeToLabel'](null);
    expect(result).toBeNull();
  });

  it('deve retornar o valor original se não encontrado no mapa', () => {
    const result = service['mapPositionCodeToLabel']('UNKNOWN_CODE');
    expect(result).toBe('UNKNOWN_CODE');
  });
});
```

### Teste 5: Cross-Tenant Search

**Setup:** Criar 3 tenants com schemas diferentes

```typescript
const tenants = [
  { schema: 'tenant_ilpi_a_123', name: 'ILPI A' },
  { schema: 'tenant_ilpi_b_456', name: 'ILPI B' },
  { schema: 'tenant_ilpi_c_789', name: 'ILPI C' },
];

// Criar vacinação apenas no tenant B
await prisma.$queryRawUnsafe(`
  INSERT INTO "tenant_ilpi_b_456".vaccinations (...)
  VALUES (..., 'cross-tenant-token-xyz', ...)
`);
```

**Teste:**
```typescript
const response = await request(app.getHttpServer())
  .get('/api/validar/cross-tenant-token-xyz')
  .expect(200);

// Deve encontrar mesmo estando no tenant B
expect(response.text).toContain('ILPI B');
```

---

## 🚀 Como Adicionar Novo Tipo de Documento

### Passo 1: Adicionar Campos ao Schema

```prisma
model NovoTipoDocumento {
  id                     String   @id @default(uuid())

  // ... campos específicos do documento

  // Campos obrigatórios para validação pública
  publicToken            String   @unique
  originalFileHash       String
  processedFileHash      String
  uploadedBy             String

  // Relações
  tenant                 Tenant   @relation(...)
  uploadedByUser         User     @relation(fields: [uploadedBy], references: [id])

  @@index([publicToken])
}
```

### Passo 2: Criar Interface no ValidationService

```typescript
interface NovoTipoResult {
  id: string;
  publicToken: string;
  originalFileHash: string;
  processedFileHash: string;
  uploadedBy: string | null;
  uploaderName: string | null;
  positionCode: string | null;
  // ... campos específicos
  tenantName: string;
  tenantCnpj: string;
  schema: string;
}
```

### Passo 3: Adicionar Query no ValidationService

```typescript
private async findNovoTipoByToken(
  token: string,
  schema_name: string,
): Promise<NovoTipoResult | null> {
  try {
    const result = await this.prisma.$queryRawUnsafe<NovoTipoResult[]>(`
      SELECT
        n.id::text,
        n."publicToken"::text,
        n."originalFileHash",
        n."processedFileHash",
        -- ... campos específicos
        u.name AS "uploaderName",
        up."positionCode",
        t.name AS "tenantName",
        t.cnpj AS "tenantCnpj",
        '${schema_name}' AS schema
      FROM "${schema_name}".novo_tipo_documento n
      JOIN public.tenants t ON t.id = n."tenantId"
      LEFT JOIN "${schema_name}".users u ON u.id = n."uploadedBy"
      LEFT JOIN "${schema_name}".user_profiles up ON up."userId" = u.id
      WHERE n."publicToken" = $1
      LIMIT 1
    `, token);

    return result[0] || null;
  } catch (error) {
    this.logger.error(`Schema ${schema_name} - novo tipo error: ${error.message}`);
    return null;
  }
}
```

### Passo 4: Adicionar Response Builder

```typescript
private buildNovoTipoResponse(
  documento: NovoTipoResult,
): PublicDocumentValidationDto {
  const validatorRole = this.mapPositionCodeToLabel(documento.positionCode)
    || documento.uploaderRole
    || 'Não informado';

  return {
    valid: true,
    documentType: 'novo_tipo',
    documentInfo: {
      processedAt: documento.createdAt.toISOString(),
      validatedBy: documento.uploaderName || 'Usuário não disponível',
      validatorRole,
      institutionName: documento.tenantName,
      institutionCnpj: documento.tenantCnpj,
      hashOriginal: documento.originalFileHash,
      hashFinal: documento.processedFileHash,
      // ... metadados específicos
    },
    publicToken: documento.publicToken,
    consultedAt: new Date().toISOString(),
  };
}
```

### Passo 5: Adicionar ao Fluxo de Validação

```typescript
async validatePublicDocument(token: string): Promise<PublicDocumentValidationDto> {
  const tenants = await this.prisma.tenant.findMany({
    select: { id: true, schema: true },
  });

  // Buscar em vaccinations
  for (const tenant of tenants) {
    const vaccination = await this.findVaccinationByToken(token, tenant.schema);
    if (vaccination) return this.buildVaccinationResponse(vaccination);
  }

  // Buscar em contracts
  for (const tenant of tenants) {
    const contract = await this.findContractByToken(token, tenant.schema);
    if (contract) return this.buildContractResponse(contract);
  }

  // ✨ NOVO: Buscar em novo_tipo_documento
  for (const tenant of tenants) {
    const novoTipo = await this.findNovoTipoByToken(token, tenant.schema);
    if (novoTipo) return this.buildNovoTipoResponse(novoTipo);
  }

  return { valid: false };
}
```

### Passo 6: Atualizar HTML no Controller (opcional)

Se o novo tipo de documento tiver campos específicos para exibir:

```typescript
private renderSuccessPage(result: PublicDocumentValidationDto): string {
  // ... código existente

  let specificFields = '';
  if (result.documentType === 'novo_tipo') {
    specificFields = `
      <div class="info-item">
        <div class="info-label">Campo Específico</div>
        <div class="info-value">${result.documentInfo.metadata.campoEspecifico}</div>
      </div>
    `;
  }

  // ... resto do template HTML
}
```

---

## 📚 Referências

### Documentos Relacionados
- [DOCUMENT-AUTHENTICATION-PLAN.md](./DOCUMENT-AUTHENTICATION-PLAN.md) - Plano original de autenticação (mais abrangente)
- [DATETIME-STANDARD.md](./DATETIME-STANDARD.md) - Padrões de data/hora
- [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) - Estrutura do banco de dados

### Bibliotecas Utilizadas
- [pdf-lib](https://pdf-lib.js.org/) - Manipulação de PDFs
- [crypto (Node.js)](https://nodejs.org/api/crypto.html) - Hash SHA-256
- [Prisma](https://www.prisma.io/) - ORM e raw queries

### Padrões e Compliance
- [LGPD Art. 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) - Lei Geral de Proteção de Dados
- [ANVISA RDC 502/2021](https://www.gov.br/anvisa/pt-br) - Regulamentação de ILPIs
- [PJe - Processo Judicial Eletrônico](https://www.cnj.jus.br/sistemas/pje/) - Inspiração para validação pública

---

## 🔄 Próximos Passos

### FASE 2: Melhorias Planejadas

1. **Upload de PDF para Verificação Automática**
   - Permitir upload de arquivo na página de validação
   - Calcular hash do arquivo enviado
   - Comparar automaticamente com hash registrado
   - Exibir badge "✅ Íntegro" ou "⚠️ Adulterado"

2. **QR Code no Carimbo Institucional**
   - Adicionar QR code no rodapé do PDF
   - QR code aponta para URL de validação
   - Facilita acesso mobile (câmera do celular)

3. **API REST para Validação Programática**
   ```typescript
   GET /api/validar/:token/json
   // Retorna JSON ao invés de HTML
   ```

4. **Histórico de Consultas**
   - Registrar acessos à página de validação (auditoria)
   - Data/hora da consulta
   - IP do consulente (opcional, LGPD-compliant)

5. **Multilíngue**
   - Suporte para inglês e espanhol
   - Detecção automática do idioma do navegador

6. **Notificações de Validação**
   - Email/SMS quando documento é validado externamente
   - Dashboard com métricas de validações públicas

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
**Data de Implementação:** 19-20/01/2026
**Status:** ✅ Em Produção

