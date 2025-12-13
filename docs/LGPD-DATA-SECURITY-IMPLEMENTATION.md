# Plano de Implementação: Segurança de Dados e Conformidade LGPD

**Status:** 📋 Planejamento
**Data de Criação:** 11/12/2025
**Responsável:** Emanuel (Dr. E.) + Claude Sonnet 4.5

---

## 📜 Base Legal

### Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)

**Artigos Aplicáveis ao Rafa ILPI:**

- **Art. 5º, II** - Dado sensível: dado pessoal sobre origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato ou a organização de caráter religioso, filosófico ou político, **dado referente à saúde ou à vida sexual**, dado genético ou biométrico, quando vinculado a uma pessoa natural.

- **Art. 6º** - Princípios da proteção de dados:
  - **Segurança**: utilização de medidas técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados
  - **Prevenção**: adoção de medidas para prevenir a ocorrência de danos
  - **Responsabilização e prestação de contas (accountability)**: demonstração da adoção de medidas eficazes e capazes de comprovar a observância da lei

- **Art. 11** - Tratamento de dados sensíveis **somente** mediante:
  - Consentimento específico e destacado (presente nos termos de uso)
  - Tutela da saúde, exclusivamente, em procedimento realizado por profissionais de saúde
  - Cumprimento de obrigação legal ou regulatória

- **Art. 46** - Medidas de segurança, técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou qualquer forma de tratamento inadequado ou ilícito

- **Art. 48** - Comunicação à ANPD e ao titular em caso de incidente de segurança

**Regulamentações Específicas para Saúde:**

- **RDC 502/2021 ANVISA** - Art. 33: Registro completo de informações de saúde dos residentes
- **Resolução CFM 1.821/2007** - Prontuário eletrônico e segurança da informação
- **Lei do Prontuário Eletrônico (Lei nº 13.787/2018)** - Privacidade e segurança de registros médicos

---

## 🎯 Objetivo do Documento

Este documento estabelece:

1. **Mapeamento completo** dos dados sensíveis no Rafa ILPI
2. **Classificação de risco** por tipo de dado
3. **Arquitetura de segurança** com criptografia em múltiplas camadas
4. **Plano de implementação técnica** com estimativas de tempo
5. **Tabela de conformidade** campo → tipo → base legal → proteção
6. **Template para Política de Privacidade**

---

## 📊 Classificação de Dados no Rafa ILPI

### 1. Dados Sensíveis de Saúde (Art. 5º, II LGPD)

**⚠️ CRIPTOGRAFIA OBRIGATÓRIA - PRIORIDADE CRÍTICA**

#### 1.1 Dados Clínicos (Prontuário Eletrônico)

| Campo/Tabela | Modelo Prisma | Tipo de Dado | Risco | Base Legal |
|--------------|---------------|--------------|-------|------------|
| **Diagnósticos** | `Condition.name`, `Condition.icd10Code` | Saúde | CRÍTICO | Art. 11, II |
| **Hipóteses diagnósticas** | `Condition.notes` | Saúde | CRÍTICO | Art. 11, II |
| **Evoluções clínicas** | `ClinicalNote.subjective`, `ClinicalNote.objective`, `ClinicalNote.assessment`, `ClinicalNote.plan` | Saúde | CRÍTICO | Art. 11, II |
| **Prescrições médicas** | `Prescription.*`, `Medication.*`, `SOSMedication.*` | Saúde | CRÍTICO | Art. 11, II + Portaria 344/1998 |
| **Medicamentos em uso** | `Medication.name`, `Medication.dose`, `Medication.frequency` | Saúde | CRÍTICO | Art. 11, II |
| **Alergias** | `Allergy.allergen`, `Allergy.reaction`, `Allergy.severity` | Saúde | CRÍTICO | Art. 11, II |
| **Sinais vitais** | `VitalSign.systolicBP`, `VitalSign.heartRate`, `VitalSign.temperature`, etc. | Saúde | ALTO | Art. 11, II |
| **Administração de medicamentos** | `MedicationAdministration.*`, `SOSAdministration.*` | Saúde | CRÍTICO | Art. 11, II |
| **Restrições alimentares** | `DietaryRestriction.restriction`, `DietaryRestriction.reason` | Saúde | ALTO | Art. 11, II |
| **Perfil clínico** | `ClinicalProfile.chronicDiseases`, `ClinicalProfile.comorbidities` | Saúde | CRÍTICO | Art. 11, II |
| **Vacinação** | `Vaccination.vaccineName`, `Vaccination.batchNumber` | Saúde | ALTO | Art. 11, II + RDC 502/2021 |

#### 1.2 Registros de Cuidados e Intercorrências

| Campo/Tabela | Modelo Prisma | Tipo de Dado | Risco | Base Legal |
|--------------|---------------|--------------|-------|------------|
| **Registros diários** | `DailyRecord.data` (JSON com observações clínicas) | Saúde | CRÍTICO | Art. 11, II |
| **Quedas e eventos adversos** | `DailyRecord` tipo `QUEDA`, `INTERCORRENCIA` | Saúde | CRÍTICO | Art. 11, II |
| **Observações de enfermagem** | `DailyRecord.observations` | Saúde | ALTO | Art. 11, II |
| **Plano de cuidado individual** | Futuro: `CarePlan.*` | Saúde | CRÍTICO | Art. 11, II |

#### 1.3 Documentos Médicos Anexados

| Campo/Tabela | Modelo Prisma | Tipo de Dado | Risco | Base Legal |
|--------------|---------------|--------------|-------|------------|
| **Laudos médicos** | `TenantDocument` tipo `CLINICAL` | Saúde | CRÍTICO | Art. 11, II |
| **Exames laboratoriais** | `TenantDocument` tipo `CLINICAL` | Saúde | CRÍTICO | Art. 11, II |
| **Receitas médicas** | `Prescription.prescriptionImageUrl` (storage) | Saúde | CRÍTICO | Art. 11, II + Portaria 344/1998 |
| **Comprovantes de vacinação** | `Vaccination.certificateUrl` (storage) | Saúde | ALTO | Art. 11, II |
| **Relatórios clínicos** | `TenantDocument` tipo `CLINICAL` | Saúde | CRÍTICO | Art. 11, II |

**Total de modelos com dados sensíveis de saúde: 15+**

---

### 2. Dados Biométricos e Imagens (Art. 5º, II LGPD)

**⚠️ CRIPTOGRAFIA OBRIGATÓRIA - PRIORIDADE CRÍTICA**

| Campo/Tabela | Modelo Prisma | Tipo de Dado | Risco | Base Legal |
|--------------|---------------|--------------|-------|------------|
| **Foto do residente** | `Resident.photoUrl` (storage) | Biométrico | ALTO | Art. 5º, II |
| **Assinaturas digitalizadas** | Futuros: `Signature.*` (storage) | Biométrico | ALTO | Art. 5º, II |
| **Imagens clínicas** | `TenantDocument` tipo `CLINICAL` (storage) | Saúde + Biométrico | CRÍTICO | Art. 5º, II |

---

### 3. Dados de Identificação Civil (Alto Risco)

**⚠️ CRIPTOGRAFIA FORTEMENTE RECOMENDADA - PRIORIDADE ALTA**

| Campo/Tabela | Modelo Prisma | Tipo de Dado | Risco | Base Legal |
|--------------|---------------|--------------|-------|------------|
| **CPF** | `Resident.cpf` | Identificação | CRÍTICO | Art. 46 |
| **RG** | `Resident.rg` | Identificação | ALTO | Art. 46 |
| **CNS (Cartão SUS)** | `Resident.cnsNumber` | Identificação + Saúde | CRÍTICO | Art. 46 |
| **Certidões** | `TenantDocument` tipo `PERSONAL` (storage) | Identificação | ALTO | Art. 46 |
| **Documentos do responsável** | `Resident.legalGuardian`, `Resident.legalGuardianDocument` | Identificação | ALTO | Art. 46 |
| **Decisões judiciais** | `TenantDocument` tipo `LEGAL` (storage) | Identificação | CRÍTICO | Art. 46 |
| **Contratos** | `TenantDocument` tipo `CONTRACT` (storage) | Identificação | ALTO | Art. 46 |

---

### 4. Dados Financeiros (Alto Risco)

**⚠️ CRIPTOGRAFIA FORTEMENTE RECOMENDADA - PRIORIDADE ALTA**

| Campo/Tabela | Modelo Prisma | Tipo de Dado | Risco | Base Legal |
|--------------|---------------|--------------|-------|------------|
| **Informações de cobrança** | Futuro: `Billing.*` | Financeiro | ALTO | Art. 46 |
| **Contratos de prestação** | `TenantDocument` tipo `CONTRACT` | Financeiro | ALTO | Art. 46 |
| **Comprovantes de pagamento** | Futuro: `Payment.*` (storage) | Financeiro | ALTO | Art. 46 |

---

### 5. Dados Administrativos (Segurança Padrão)

**✅ CONTROLE DE ACESSO + LOGS - SEM CRIPTOGRAFIA DE CAMPO**

| Campo/Tabela | Modelo Prisma | Tipo de Dado | Risco | Base Legal |
|--------------|---------------|--------------|-------|------------|
| **Nome do residente** | `Resident.fullName` | Identificação | MÉDIO | Art. 7º, I (consentimento) |
| **Data de nascimento** | `Resident.birthDate` | Identificação | MÉDIO | Art. 7º, I |
| **Sexo** | `Resident.gender` | Identificação | BAIXO | Art. 7º, I |
| **Grau de dependência** | `Resident.dependencyLevel` | Classificação | MÉDIO | Art. 7º, I |
| **Quarto/leito** | `Resident.roomNumber`, `Resident.bedNumber` | Administrativo | BAIXO | Art. 7º, I |
| **Data de admissão** | `Resident.admissionDate` | Administrativo | BAIXO | Art. 7º, I |
| **Status** | `Resident.status` | Administrativo | MÉDIO | Art. 7º, I |

**⚠️ ATENÇÃO:** Se qualquer dado administrativo for usado em contexto clínico (ex: "Residente do quarto 10 teve queda"), ele passa a integrar dado sensível.

---

### 6. Dados de Usuários do Sistema (Equipe)

**⚠️ CRIPTOGRAFIA SELETIVA**

| Campo/Tabela | Modelo Prisma | Tipo de Dado | Risco | Proteção |
|--------------|---------------|--------------|-------|----------|
| **Senha** | `User.password` | Credencial | CRÍTICO | Hash bcrypt (já implementado) |
| **Token de autenticação** | JWT (memória/cache) | Credencial | CRÍTICO | Criptografia + expiração curta |
| **Logs de acesso a prontuários** | `AuditLog` | Auditoria | ALTO | Criptografia recomendada |
| **Nome do usuário** | `User.fullName` | Identificação | BAIXO | Controle de acesso |
| **Email** | `User.email` | Identificação | MÉDIO | Controle de acesso |
| **Cargo** | `User.positionCode` | Administrativo | BAIXO | Controle de acesso |

---

## 🔐 Arquitetura de Segurança - 3 Camadas

### Camada 1: Criptografia em Trânsito (Transport Layer)

**Status Atual:** ✅ JÁ IMPLEMENTADO

- **HTTPS/TLS 1.3** em todas as comunicações frontend ↔ backend
- **Certificado SSL** válido (Let's Encrypt ou similar)
- **HSTS (HTTP Strict Transport Security)** habilitado
- **Secure WebSocket (WSS)** para notificações em tempo real (se houver)

**Conformidade:** Art. 46 LGPD ✓

---

### Camada 2: Criptografia em Repouso - Storage (MinIO/S3)

**Status Atual:** ❌ NÃO IMPLEMENTADO

**Arquivos que DEVEM ser criptografados:**

- Receitas médicas (`Prescription.prescriptionImageUrl`)
- Comprovantes de vacinação (`Vaccination.certificateUrl`)
- Documentos pessoais (RG, CPF, certidões)
- Documentos clínicos (laudos, exames)
- Contratos e termos assinados
- Fotos dos residentes (`Resident.photoUrl`)

**Solução Técnica:**

#### Opção 1: Server-Side Encryption (SSE) no MinIO

```yaml
# MinIO com criptografia automática
# docker-compose.yml
minio:
  environment:
    MINIO_SERVER_SIDE_ENCRYPTION: "on"
    MINIO_KMS_SECRET_KEY: "${MINIO_KMS_KEY}" # 256-bit key
```

**Características:**
- ✅ Criptografia transparente (AES-256)
- ✅ Chave gerenciada pelo MinIO
- ✅ Zero impacto no código da aplicação
- ❌ Chave única para todo o bucket

#### Opção 2: Client-Side Encryption (CSE) na Aplicação

```typescript
// Backend - Criptografar antes de enviar ao MinIO
import { createCipheriv, randomBytes } from 'crypto';

async function uploadEncryptedFile(file: Buffer, tenantId: string) {
  // 1. Gerar chave única por tenant (derivada de master key)
  const tenantKey = deriveKeyFromMasterKey(tenantId);

  // 2. Gerar IV aleatório
  const iv = randomBytes(16);

  // 3. Criptografar arquivo
  const cipher = createCipheriv('aes-256-gcm', tenantKey, iv);
  const encryptedFile = Buffer.concat([
    cipher.update(file),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  // 4. Upload para MinIO
  const fileName = `${tenantId}/${randomUUID()}.enc`;
  await minioClient.putObject(bucketName, fileName, encryptedFile);

  // 5. Armazenar IV no banco (necessário para decrypt)
  return { fileName, iv: iv.toString('hex') };
}
```

**Características:**
- ✅ Chave única por tenant (isolamento total)
- ✅ Controle total sobre criptografia
- ✅ MinIO nunca vê dados descriptografados
- ❌ Requer refatoração de código
- ❌ Precisa armazenar IVs no banco

**Recomendação:** Começar com **SSE (Opção 1)** para implementação rápida, migrar para **CSE (Opção 2)** se necessário compliance mais rigoroso.

---

### Camada 3: Criptografia em Repouso - Database (PostgreSQL)

**Status Atual:** ❌ NÃO IMPLEMENTADO

#### 3.1. Criptografia Transparente de Dados (TDE) - PostgreSQL

**Nível 1: Criptografia de disco (File System)**

```bash
# PostgreSQL com encryption at rest
# Usar LUKS ou dm-crypt no volume do banco

# /etc/crypttab
pgdata UUID=xxxxx none luks
```

**Características:**
- ✅ Criptografia transparente
- ✅ Zero impacto no código
- ✅ Protege contra roubo de disco físico
- ❌ NÃO protege contra dump/backup não criptografado
- ❌ NÃO protege contra acesso com credenciais válidas

**Recomendação:** Implementar como baseline mínimo.

---

#### 3.2. Criptografia em Nível de Campo (Field-Level Encryption)

**Solução Recomendada: Prisma Middleware + crypto**

```typescript
// prisma/middleware/encryption.middleware.ts
import { Prisma } from '@prisma/client';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Campos que DEVEM ser criptografados
const ENCRYPTED_FIELDS = {
  Resident: ['cpf', 'rg', 'cnsNumber'],
  Condition: ['name', 'icd10Code', 'notes'],
  Allergy: ['allergen', 'reaction'],
  ClinicalNote: ['subjective', 'objective', 'assessment', 'plan'],
  DailyRecord: ['observations'], // JSON field
  Prescription: ['notes'],
  Medication: ['instructions'],
  // ... outros modelos
};

class FieldEncryption {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  private ivLength = 16;
  private saltLength = 64;
  private tagLength = 16;

  private getMasterKey(): Buffer {
    const key = process.env.ENCRYPTION_MASTER_KEY;
    if (!key) throw new Error('ENCRYPTION_MASTER_KEY not set');
    return Buffer.from(key, 'hex'); // 64 hex chars = 32 bytes
  }

  // Derivar chave específica do tenant (isolamento)
  private deriveKey(tenantId: string, salt: Buffer): Buffer {
    const masterKey = this.getMasterKey();
    return scryptSync(`${masterKey.toString('hex')}:${tenantId}`, salt, this.keyLength);
  }

  encrypt(plaintext: string, tenantId: string): string {
    if (!plaintext) return plaintext;

    // 1. Gerar salt e IV aleatórios
    const salt = randomBytes(this.saltLength);
    const iv = randomBytes(this.ivLength);

    // 2. Derivar chave do tenant
    const key = this.deriveKey(tenantId, salt);

    // 3. Criptografar
    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // 4. Obter authentication tag
    const tag = cipher.getAuthTag();

    // 5. Formato: salt:iv:tag:encrypted (tudo em hex)
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':');
  }

  decrypt(ciphertext: string, tenantId: string): string {
    if (!ciphertext || !ciphertext.includes(':')) return ciphertext;

    try {
      // 1. Parse formato salt:iv:tag:encrypted
      const [saltHex, ivHex, tagHex, encryptedHex] = ciphertext.split(':');
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      // 2. Derivar mesma chave
      const key = this.deriveKey(tenantId, salt);

      // 3. Descriptografar
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      return ciphertext; // Retornar original em caso de erro
    }
  }
}

// Middleware Prisma
export function createEncryptionMiddleware() {
  const encryption = new FieldEncryption();

  return async (params: Prisma.MiddlewareParams, next: any) => {
    const model = params.model as string;
    const action = params.action;

    // Obter tenantId do contexto (deve ser passado em todas as queries)
    const tenantId = params.args?.tenantId || params.args?.data?.tenantId;
    if (!tenantId) return next(params);

    // ENCRYPT antes de escrever no banco
    if (['create', 'update', 'upsert'].includes(action)) {
      const fieldsToEncrypt = ENCRYPTED_FIELDS[model];
      if (fieldsToEncrypt && params.args.data) {
        for (const field of fieldsToEncrypt) {
          if (params.args.data[field]) {
            params.args.data[field] = encryption.encrypt(
              params.args.data[field],
              tenantId
            );
          }
        }
      }
    }

    // Executar query
    const result = await next(params);

    // DECRYPT após ler do banco
    if (['findUnique', 'findFirst', 'findMany'].includes(action)) {
      const fieldsToDecrypt = ENCRYPTED_FIELDS[model];
      if (fieldsToDecrypt) {
        const decrypt = (record: any) => {
          if (!record) return record;
          for (const field of fieldsToDecrypt) {
            if (record[field]) {
              record[field] = encryption.decrypt(record[field], tenantId);
            }
          }
          return record;
        };

        if (Array.isArray(result)) {
          return result.map(decrypt);
        } else {
          return decrypt(result);
        }
      }
    }

    return result;
  };
}
```

**Uso no PrismaClient:**

```typescript
// prisma/prisma.service.ts
import { createEncryptionMiddleware } from './middleware/encryption.middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Registrar middleware de criptografia
    this.$use(createEncryptionMiddleware());

    await this.$connect();
  }
}
```

**Características:**
- ✅ Criptografia transparente em nível de aplicação
- ✅ Chave derivada por tenant (isolamento total)
- ✅ AES-256-GCM (autenticado)
- ✅ Zero mudança no código de negócio
- ✅ Protege contra dump de banco
- ✅ Protege contra acesso direto ao banco
- ❌ Performance overhead (~5-10%)
- ❌ Campos criptografados não podem ser indexados
- ❌ Não permite busca LIKE/ILIKE em campos criptografados

**Mitigações de Performance:**
- Criptografar apenas campos sensíveis
- Manter índices em campos não-criptografados (ex: `Resident.id`, `Resident.fullName`)
- Cache de chaves derivadas (evitar recalcular scrypt a cada operação)

---

## 🔑 Gerenciamento de Chaves (Key Management)

### Master Key

**Geração:**
```bash
# Gerar master key de 256 bits (64 chars hex)
openssl rand -hex 32
# Output: a1b2c3d4e5f6...
```

**Armazenamento:**

**❌ NÃO FAZER:**
```bash
# .env
ENCRYPTION_MASTER_KEY=a1b2c3d4e5f6...
```

**✅ FAZER:**

1. **Ambiente Local (dev):**
```bash
# .env.local (não commitar)
ENCRYPTION_MASTER_KEY=dev_key_only_for_testing_32chars...
```

2. **Produção:**
```bash
# Usar secrets manager da cloud
# AWS Secrets Manager
# Azure Key Vault
# Google Cloud Secret Manager
# Ou variável de ambiente do container (Docker Swarm secrets, Kubernetes secrets)
```

**Rotação de Chaves:**
- Master key deve ser rotacionada anualmente ou em caso de comprometimento
- Implementar versionamento de chaves (keyId) para re-criptografia gradual

---

## 📋 Tabela de Conformidade LGPD

### Template para Política de Privacidade

| Dado | Campo Técnico | Categoria LGPD | Base Legal | Finalidade | Prazo de Retenção | Medidas de Segurança |
|------|---------------|----------------|------------|------------|-------------------|----------------------|
| Diagnósticos médicos | `Condition.name` | Dado sensível de saúde (Art. 5º, II) | Art. 11, II - Tutela da saúde | Prestação de cuidados de saúde ao residente | Permanente (prontuário legal) | Criptografia AES-256-GCM, controle de acesso por perfil, logs de auditoria |
| Evoluções clínicas | `ClinicalNote.*` | Dado sensível de saúde (Art. 5º, II) | Art. 11, II - Tutela da saúde | Registro de evolução do quadro de saúde | Permanente (prontuário legal) | Criptografia AES-256-GCM, versionamento imutável, assinatura digital (futuro) |
| Prescrições médicas | `Prescription.*` | Dado sensível de saúde (Art. 5º, II) | Art. 11, II + Portaria SVS/MS 344/1998 | Administração segura de medicamentos | Permanente (prontuário legal) | Criptografia AES-256-GCM, controle de acesso restrito, anexo de receita criptografado |
| CPF | `Resident.cpf` | Dado pessoal de identificação | Art. 7º, I (consentimento) | Identificação única do residente | Até 5 anos após término do serviço | Criptografia AES-256-GCM, acesso restrito por permissão |
| Foto do residente | `Resident.photoUrl` (storage) | Dado biométrico (Art. 5º, II) | Art. 11, I (consentimento específico) | Identificação visual para segurança e cuidados | Enquanto residente ativo + 5 anos | Criptografia de storage (SSE/CSE), controle de acesso |
| Receitas médicas (PDF) | `Prescription.prescriptionImageUrl` (storage) | Dado sensível de saúde (Art. 5º, II) | Art. 11, II + Portaria 344/1998 | Comprovação de prescrição médica | Permanente (prontuário legal) | Criptografia de storage, acesso auditado |
| Sinais vitais | `VitalSign.*` | Dado sensível de saúde (Art. 5º, II) | Art. 11, II - Tutela da saúde | Monitoramento de saúde | Permanente (prontuário legal) | Criptografia AES-256-GCM (opcional), controle de acesso |
| Nome do residente | `Resident.fullName` | Dado pessoal | Art. 7º, I (consentimento) | Identificação e prestação de serviços | Enquanto residente ativo + 5 anos | Controle de acesso por perfil, logs de auditoria |
| Logs de acesso | `AuditLog.*` | Dado de auditoria | Art. 46 - Accountability | Rastreabilidade de acessos | 5 anos | Criptografia recomendada, acesso restrito a admin |

**Nota:** Esta tabela deve ser mantida atualizada e serve como base para o **Relatório de Impacto à Proteção de Dados (RIPD)** e para a **Política de Privacidade** do Rafa ILPI.

---

## 📝 Plano de Implementação

### FASE 1 - Fundação de Segurança (Semana 1-2)

**Estimativa:** 12-16 horas

#### 1.1. Setup de Criptografia de Storage (MinIO)

- [ ] **Habilitar SSE no MinIO** (2h)
  - Gerar master key segura
  - Configurar `docker-compose.yml` com encryption
  - Testar upload/download de arquivos criptografados
  - Documentar processo de rotação de chaves

- [ ] **Migração de arquivos existentes** (4-6h)
  - Script para re-upload de arquivos com criptografia
  - Validar integridade após migração
  - Backup antes de migração

#### 1.2. Implementar Prisma Middleware de Criptografia

- [ ] **Criar middleware de criptografia** (4-6h)
  - Implementar `FieldEncryption` class
  - Implementar `createEncryptionMiddleware()`
  - Configurar `ENCRYPTED_FIELDS` por modelo
  - Testes unitários de encrypt/decrypt

- [ ] **Integrar middleware no PrismaService** (1h)
  - Registrar middleware
  - Passar `tenantId` em todas as queries (refatoração necessária)
  - Validar em dev

- [ ] **Configurar gerenciamento de chaves** (1-2h)
  - Gerar master key segura
  - Configurar secrets manager (produção)
  - Documentar processo de rotação

---

### FASE 2 - Criptografia de Modelos Críticos (Semana 3-4)

**Estimativa:** 20-24 horas

#### 2.1. Módulos de Saúde (P1)

- [ ] **Resident** (3-4h)
  - Criptografar: `cpf`, `rg`, `cnsNumber`
  - Testar busca por CPF (descriptografar para comparação)
  - Migração de dados existentes

- [ ] **ClinicalNote** (3-4h)
  - Criptografar: `subjective`, `objective`, `assessment`, `plan`
  - Validar histórico (snapshots criptografados)
  - Testar geração de PDF

- [ ] **Condition** (2-3h)
  - Criptografar: `name`, `icd10Code`, `notes`
  - Validar busca textual (limitações)

- [ ] **Allergy** (2-3h)
  - Criptografar: `allergen`, `reaction`
  - Validar exibição no prontuário

- [ ] **Prescription + Medication** (4-5h)
  - Criptografar: `notes` (Prescription), `instructions` (Medication)
  - Validar administração de medicamentos
  - Testar dupla checagem

- [ ] **DailyRecord** (4-5h)
  - Criptografar: `observations`, `data` (JSON fields)
  - Validar histórico versionado
  - Testar busca textual (será limitada)

#### 2.2. Testes e Validação (2-3h)

- [ ] Testes E2E de criptografia
- [ ] Validação de performance (overhead aceitável?)
- [ ] Auditoria de logs (não vazar dados criptografados)

---

### FASE 3 - Modelos Secundários (Semana 5)

**Estimativa:** 8-12 horas

- [ ] **DietaryRestriction** (2h)
- [ ] **VitalSign** (opcional) (2h)
- [ ] **ClinicalProfile** (2-3h)
- [ ] **AuditLog** (criptografar campos sensíveis) (2-3h)

---

### FASE 4 - Documentação e Compliance (Semana 6)

**Estimativa:** 8-10 horas

- [ ] **Política de Privacidade atualizada** (3-4h)
  - Usar tabela de conformidade como base
  - Redigir seções LGPD-compliant
  - Revisar com jurídico

- [ ] **RIPD - Relatório de Impacto** (3-4h)
  - Mapear todos os dados tratados
  - Avaliar riscos e mitigações
  - Documentar medidas de segurança

- [ ] **Documentação técnica** (2h)
  - Atualizar `docs/architecture/data-security.md`
  - Documentar processo de criptografia
  - Guia de gerenciamento de chaves

---

## ⚖️ Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Perda da master key | CRÍTICO | BAIXO | Backup seguro em cofre físico + secrets manager + procedimento de rotação documentado |
| Performance degradada | ALTO | MÉDIO | Criptografar apenas campos sensíveis + cache de chaves derivadas + testes de carga |
| Busca textual limitada | MÉDIO | ALTO | Manter campos indexáveis não-criptografados (ex: `fullName`) + busca por hash para CPF |
| Migração de dados falhar | ALTO | BAIXO | Backup completo antes de migração + script testado em staging + rollback plan |
| Compliance insuficiente | CRÍTICO | BAIXO | Revisão jurídica do RIPD + auditoria externa + treinamento da equipe |
| Vazamento de chaves em logs | ALTO | MÉDIO | Nunca logar dados descriptografados + sanitização de logs + monitoramento |

---

## ✅ Critérios de Aceitação

### Técnicos

- [ ] Todos os campos sensíveis listados estão criptografados
- [ ] Master key armazenada de forma segura (secrets manager)
- [ ] Middleware Prisma funciona em todos os modelos
- [ ] Performance overhead < 10% em queries críticas
- [ ] Migração de dados existentes completa e validada
- [ ] Testes E2E cobrindo criptografia
- [ ] Storage (MinIO) com SSE habilitado
- [ ] Arquivos sensíveis criptografados (receitas, documentos)

### Conformidade LGPD

- [ ] Tabela de conformidade completa (todos os campos mapeados)
- [ ] Política de Privacidade atualizada e publicada
- [ ] RIPD redigido e revisado
- [ ] Consentimento específico para dados sensíveis (termo de uso)
- [ ] Logs de acesso a prontuários funcionando
- [ ] Processo de exclusão de dados documentado (direito de eliminação)
- [ ] Procedimento de incidente de segurança documentado (Art. 48)

### Auditoria

- [ ] Todos os acessos a dados sensíveis são logados
- [ ] Logs incluem: quem, quando, o quê, de onde (IP)
- [ ] Relatório de acessos pode ser gerado por residente
- [ ] Sistema capaz de demonstrar conformidade (accountability)

---

## 📊 Estimativa Total

| Fase | Descrição | Horas | Semanas |
|------|-----------|-------|---------|
| Fase 1 | Fundação (Storage + Middleware) | 12-16h | 1-2 |
| Fase 2 | Modelos Críticos | 20-24h | 3-4 |
| Fase 3 | Modelos Secundários | 8-12h | 5 |
| Fase 4 | Documentação e Compliance | 8-10h | 6 |
| **TOTAL** | | **48-62h** | **6 semanas** |

---

## 📚 Referências Legais

- [LGPD - Lei nº 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Guia de Boas Práticas LGPD - ANPD](https://www.gov.br/anpd/pt-br)
- [RDC 502/2021 ANVISA - ILPIs](https://www.in.gov.br/en/web/dou/-/resolucao-rdc-n-502-de-27-de-maio-de-2021-322764248)
- [Resolução CFM 1.821/2007 - Prontuário Eletrônico](https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2007/1821)
- [Portaria SVS/MS nº 344/1998 - Medicamentos Controlados](https://bvsms.saude.gov.br/bvs/saudelegis/svs/1998/prt0344_12_05_1998_rep.html)
- [OWASP - Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST SP 800-57 - Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

---

## 🎯 Texto para Política de Privacidade (Template)

```markdown
### 5. SEGURANÇA E PROTEÇÃO DE DADOS

O Rafa ILPI adota medidas técnicas e administrativas rigorosas para proteger os dados pessoais e sensíveis dos residentes, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e regulamentações específicas da área da saúde.

#### 5.1. Dados Sensíveis de Saúde

Conforme o Art. 5º, II da LGPD, todos os dados referentes à saúde dos residentes são considerados dados sensíveis e recebem tratamento especial de segurança, incluindo:

- **Diagnósticos médicos, evoluções clínicas e prescrições**: Armazenados com criptografia AES-256-GCM em nível de campo
- **Prontuário eletrônico completo**: Histórico versionado e imutável com rastreabilidade de alterações
- **Documentos médicos anexados** (receitas, laudos, exames): Criptografia de storage com chave gerenciada de forma segura
- **Sinais vitais e registros de cuidados diários**: Controle de acesso restrito por perfil profissional

#### 5.2. Dados de Identificação Civil

Documentos pessoais como CPF, RG, Cartão SUS, certidões e contratos são armazenados com criptografia reforçada e acesso auditado.

#### 5.3. Medidas de Segurança Implementadas

- **Criptografia em trânsito**: HTTPS/TLS 1.3 em todas as comunicações
- **Criptografia em repouso**: AES-256-GCM para campos sensíveis no banco de dados e storage
- **Controle de acesso por perfil**: Permissões granulares baseadas em cargo (RBAC)
- **Logs de auditoria**: Rastreamento de todos os acessos a prontuários (quem, quando, o quê)
- **Autenticação forte**: Senhas com hash bcrypt + tokens JWT com expiração curta
- **Segregação por tenant**: Isolamento total de dados entre instituições (multi-tenancy)

#### 5.4. Base Legal para Tratamento de Dados Sensíveis

O tratamento de dados sensíveis de saúde ocorre com fundamento no Art. 11, II da LGPD (tutela da saúde), combinado com:

- Consentimento específico e destacado do residente ou responsável legal
- Cumprimento de obrigação legal (RDC 502/2021 ANVISA, Portaria SVS/MS 344/1998)
- Execução de contrato de prestação de serviços de cuidados de longa duração

#### 5.5. Incidentes de Segurança

Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, o Rafa ILPI se compromete a:

- Comunicar a ANPD (Autoridade Nacional de Proteção de Dados) em prazo adequado
- Notificar os titulares afetados sobre a natureza do incidente e medidas tomadas
- Adotar medidas para reverter ou mitigar efeitos negativos

#### 5.6. Prazo de Retenção

Dados clínicos (prontuário eletrônico) são mantidos permanentemente, conforme legislação específica da área da saúde. Dados administrativos e de identificação são mantidos por até 5 anos após o término do serviço, salvo obrigação legal de retenção por prazo superior.
```

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
**Última atualização:** 11/12/2025
