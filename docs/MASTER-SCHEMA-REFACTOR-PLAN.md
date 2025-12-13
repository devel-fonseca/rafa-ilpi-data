# Plano Mestre: Refatoração do Schema - Versionamento + Auditoria + Criptografia

**Status:** 📋 Planejamento
**Data de Criação:** 11/12/2025
**Responsável:** Emanuel (Dr. E.) + Claude Sonnet 4.5

---

## 🎯 Contexto Estratégico

**Situação Atual:**
- ✅ Sistema em **pré-produção** (sem dados reais)
- ✅ Possibilidade de **recriar banco de dados** sem migração
- ❌ 73% dos módulos **sem versionamento** (11 de 15)
- ❌ 90% dos dados são **sensíveis** (LGPD Art. 5º, II) **sem criptografia**

**Oportunidade:**
Implementar **desde o início** uma arquitetura completa de:
1. **Versionamento completo** com histórico imutável
2. **Auditoria total** com rastreabilidade (quem, quando, por quê, o quê)
3. **Criptografia LGPD-compliant** para dados sensíveis de saúde

**Vantagem:** Evitar migração complexa, otimizar performance desde o início, compliance by design.

---

## 📋 Escopo da Refatoração

### Módulos a Refatorar (Prioridade 1)

| Módulo | Versionamento | Criptografia | Impacto | Estimativa |
|--------|---------------|--------------|---------|------------|
| **Resident** | ❌ Falta | ❌ Falta CPF, RG, CNS | CRÍTICO | 10-12h |
| **Prescription** | ❌ Falta | ❌ Falta notes | CRÍTICO | 10-12h |
| **Medication** | ❌ Falta | ❌ Falta instructions | CRÍTICO | 8-10h |
| **SOSMedication** | ❌ Falta | ❌ Falta instructions | CRÍTICO | 8-10h |
| **Vaccination** | ❌ Falta | ❌ OK | ALTO | 8-10h |
| **User** | ❌ Falta | ✅ OK (password já hash) | ALTO | 8-10h |
| **Allergy** | ❌ Falta | ❌ Falta allergen, reaction | ALTO | 6-8h |
| **Condition** | ❌ Falta | ❌ Falta name, icd10Code, notes | CRÍTICO | 6-8h |
| **DietaryRestriction** | ❌ Falta | ❌ Falta restriction, reason | MÉDIO | 6-8h |
| **ClinicalProfile** | ❌ Falta | ❌ Falta chronicDiseases | MÉDIO | 6-8h |
| **VitalSign** | ❌ Falta | ⚠️ Opcional | BAIXO | 4-6h |

**Total Estimado:** 80-102 horas (2-2,5 semanas de trabalho dedicado)

---

## 🏗️ Arquitetura Unificada

### 1. Padrão de Auditoria Básica (TODOS os modelos)

```prisma
model <Entity> {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid

  // ... campos de negócio ...

  // AUDITORIA BÁSICA (OBRIGATÓRIA)
  versionNumber Int      @default(1)

  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)

  createdBy String  @db.Uuid
  updatedBy String? @db.Uuid

  // RELAÇÕES
  tenant        Tenant           @relation(fields: [tenantId], references: [id])
  createdByUser User             @relation("<Entity>CreatedBy", fields: [createdBy], references: [id])
  updatedByUser User?            @relation("<Entity>UpdatedBy", fields: [updatedBy], references: [id])
  history       <Entity>History[]

  @@index([tenantId, deletedAt])
  @@map("<entity>_table")
}
```

### 2. Tabela de Histórico (TODOS os modelos críticos)

```prisma
model <Entity>History {
  id            String   @id @default(uuid()) @db.Uuid
  <entity>Id    String   @db.Uuid
  tenantId      String   @db.Uuid
  versionNumber Int

  // SNAPSHOTS JSON (dados já criptografados)
  previousData  Json?
  newData       Json?
  changedFields String[] @default([])

  // AUDITORIA DA ALTERAÇÃO
  changeType    ChangeType
  changeReason  String  @db.Text

  changedBy     String  @db.Uuid
  changedByName String  @db.VarChar(255)
  changedAt     DateTime @default(now()) @db.Timestamptz(3)

  // METADADOS TÉCNICOS
  ipAddress     String? @db.VarChar(45)
  userAgent     String? @db.Text

  // RELAÇÕES
  <entity>      <Entity> @relation(fields: [<entity>Id], references: [id], onDelete: Cascade)
  tenant        Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  changedByUser User     @relation(fields: [changedBy], references: [id])

  @@index([<entity>Id, versionNumber])
  @@index([tenantId, changedAt(sort: Desc)])
  @@index([changedBy])
  @@map("<entity>_history")
}

enum ChangeType {
  CREATE
  UPDATE
  DELETE
}
```

### 3. Criptografia via Prisma Middleware

**Campos Sensíveis a Criptografar:**

```typescript
const ENCRYPTED_FIELDS = {
  // PRIORIDADE 1 - Saúde
  Resident: ['cpf', 'rg', 'cnsNumber'],
  Condition: ['name', 'icd10Code', 'notes'],
  Allergy: ['allergen', 'reaction'],
  DietaryRestriction: ['restriction', 'reason'],
  ClinicalNote: ['subjective', 'objective', 'assessment', 'plan'], // Já implementado
  ClinicalProfile: ['chronicDiseases', 'comorbidities'],
  Prescription: ['notes'],
  Medication: ['instructions'],
  SOSMedication: ['instructions'],
  DailyRecord: ['observations'], // JSON field - Já implementado

  // PRIORIDADE 2 - Opcional
  VitalSign: [], // Geralmente não precisa
  Vaccination: [], // Dados não são tão sensíveis quanto prontuário
};
```

**Middleware Prisma:**

```typescript
// Já documentado em LGPD-DATA-SECURITY-IMPLEMENTATION.md
// Criptografia transparente com AES-256-GCM
// Chave derivada por tenant para isolamento
```

### 4. Storage Criptografado (MinIO)

**Arquivos que DEVEM ser criptografados:**

- ✅ Receitas médicas (`Prescription.prescriptionImageUrl`)
- ✅ Comprovantes de vacinação (`Vaccination.certificateUrl`)
- ✅ Documentos pessoais (RG, CPF, certidões)
- ✅ Documentos clínicos (laudos, exames)
- ✅ Contratos e termos
- ✅ Fotos dos residentes (`Resident.photoUrl`)

**Solução:** Server-Side Encryption (SSE) no MinIO

```yaml
# docker-compose.yml
minio:
  environment:
    MINIO_SERVER_SIDE_ENCRYPTION: "on"
    MINIO_KMS_SECRET_KEY: "${MINIO_KMS_KEY}"
```

---

## 📝 Plano de Implementação Unificado

### SPRINT 1 - Fundação (Semana 1)

**Objetivo:** Setup inicial de criptografia + primeiro módulo (Resident)

#### Dia 1-2: Setup de Infraestrutura (8h)

- [ ] **Configurar criptografia de storage** (3h)
  - Gerar master key para MinIO
  - Habilitar SSE no docker-compose
  - Testar upload/download criptografado

- [ ] **Implementar Prisma Middleware** (5h)
  - Criar `FieldEncryption` class (AES-256-GCM)
  - Criar `createEncryptionMiddleware()`
  - Configurar `ENCRYPTED_FIELDS`
  - Testes unitários de encrypt/decrypt
  - Integrar no `PrismaService`

#### Dia 3-5: Resident + ResidentHistory (12h)

- [ ] **Migration Prisma** (3h)
  - Adicionar campos: `versionNumber`, `createdBy`, `updatedBy`
  - Criar modelo `ResidentHistory`
  - Criar enum `ChangeType`
  - Rodar migration

- [ ] **Service com versionamento** (4h)
  - Refatorar `create()` para incluir `createdBy`
  - Refatorar `update()` com transação + history
  - Refatorar `remove()` com soft delete + history
  - Criar `getHistory(id)` endpoint

- [ ] **DTO com changeReason** (1h)
  - Adicionar `changeReason` em `UpdateResidentDto`
  - Validações (`@MinLength(10)`)

- [ ] **Frontend** (3h)
  - Adicionar campo `changeReason` no formulário
  - Criar componente `ResidentHistory` (timeline)
  - Testar fluxo completo

- [ ] **Testes** (1h)
  - Testes unitários de versionamento
  - Teste E2E de criação → edição → histórico

**Entregável:** Resident 100% completo (versionamento + criptografia)

---

### SPRINT 2 - Módulos de Prescrição (Semana 2)

**Objetivo:** Prescription, Medication, SOSMedication

#### Dia 6-7: Prescription + PrescriptionHistory (10h)

- [ ] Migration + History model (3h)
- [ ] Service com versionamento (4h)
- [ ] Frontend (campo changeReason) (2h)
- [ ] Testes (1h)

#### Dia 8: Medication + MedicationHistory (8h)

- [ ] Migration + History model (2h)
- [ ] Service com versionamento (3h)
- [ ] Frontend (2h)
- [ ] Testes (1h)

#### Dia 9: SOSMedication + SOSMedicationHistory (8h)

- [ ] Migration + History model (2h)
- [ ] Service com versionamento (3h)
- [ ] Frontend (2h)
- [ ] Testes (1h)

**Entregável:** Módulo de prescrições 100% completo

---

### SPRINT 3 - Módulos de Saúde (Semana 3)

**Objetivo:** Vaccination, Allergy, Condition, DietaryRestriction

#### Dia 10: Vaccination + VaccinationHistory (8h)

- [ ] Migration + History (2h)
- [ ] Service (3h)
- [ ] Frontend (2h)
- [ ] Testes (1h)

#### Dia 11: Allergy + AllergyHistory (6h)

- [ ] Migration + History (2h)
- [ ] Service (2h)
- [ ] Frontend (1h)
- [ ] Testes (1h)

#### Dia 12: Condition + ConditionHistory (6h)

- [ ] Migration + History (2h)
- [ ] Service (2h)
- [ ] Frontend (1h)
- [ ] Testes (1h)

#### Dia 13: DietaryRestriction + DietaryRestrictionHistory (6h)

- [ ] Migration + History (2h)
- [ ] Service (2h)
- [ ] Frontend (1h)
- [ ] Testes (1h)

**Entregável:** Módulos de saúde principais completos

---

### SPRINT 4 - Finalização e Documentação (Semana 4)

**Objetivo:** User, ClinicalProfile, VitalSign (opcional), Documentação

#### Dia 14: User + UserHistory (8h)

- [ ] Migration + History (2h)
- [ ] Service (3h)
- [ ] Frontend (2h)
- [ ] Testes (1h)

#### Dia 15: ClinicalProfile + ClinicalProfileHistory (6h)

- [ ] Migration + History (2h)
- [ ] Service (2h)
- [ ] Frontend (1h)
- [ ] Testes (1h)

#### Dia 16 (Opcional): VitalSign + VitalSignHistory (4h)

- [ ] Migration + History (1h)
- [ ] Service (2h)
- [ ] Testes (1h)

#### Dia 17-18: Documentação LGPD (10h)

- [ ] **Tabela de Conformidade completa** (3h)
  - Mapear todos os campos sensíveis
  - Preencher: dado → categoria → base legal → medidas de segurança

- [ ] **Política de Privacidade** (4h)
  - Redigir seções LGPD-compliant
  - Usar template fornecido
  - Revisar com jurídico (externo)

- [ ] **RIPD - Relatório de Impacto** (3h)
  - Avaliar riscos de cada tipo de dado
  - Documentar medidas de mitigação
  - Evidências de accountability

#### Dia 19: Testes Finais e Deploy (8h)

- [ ] **Testes de integração completos** (3h)
  - Fluxo completo: criar → editar → histórico → criptografia
  - Validar performance (overhead < 10%)

- [ ] **Validação de segurança** (2h)
  - Tentar acessar dados sem permissão
  - Validar criptografia em banco (inspecionar diretamente)
  - Validar storage criptografado

- [ ] **Deploy em staging** (2h)
  - Configurar secrets manager
  - Deploy com docker-compose atualizado
  - Smoke tests

- [ ] **Documentação técnica final** (1h)
  - Atualizar README
  - Atualizar docs/architecture/
  - Criar guia de deploy seguro

**Entregável:** Sistema 100% LGPD-compliant e auditável

---

## 📊 Checklist Consolidado

### Por Módulo (Repetir para cada um)

#### Backend

- [ ] **1. Migration Prisma**
  - [ ] Adicionar `versionNumber`, `createdBy`, `updatedBy`
  - [ ] Criar modelo `<Entity>History`
  - [ ] Adicionar relações (User, History)
  - [ ] Rodar `npx prisma migrate dev`

- [ ] **2. Adicionar campos criptografados em `ENCRYPTED_FIELDS`**
  - [ ] Configurar middleware Prisma

- [ ] **3. Service**
  - [ ] `create()` com `createdBy`
  - [ ] `update()` com transação + history + changeReason
  - [ ] `remove()` com soft delete + history + changeReason
  - [ ] `getHistory(id)`

- [ ] **4. DTO**
  - [ ] `changeReason` obrigatório em Update/Delete
  - [ ] Validações (`@MinLength(10)`)

- [ ] **5. Controller**
  - [ ] Endpoint `GET /:id/history`

- [ ] **6. Testes**
  - [ ] Teste de versionamento
  - [ ] Teste de criptografia
  - [ ] Teste E2E

#### Frontend

- [ ] **7. Formulário**
  - [ ] Campo `changeReason` (textarea obrigatório)
  - [ ] Validação cliente (min 10 chars)

- [ ] **8. API**
  - [ ] `update<Entity>()` com `changeReason`
  - [ ] `get<Entity>History(id)`

- [ ] **9. Histórico**
  - [ ] Componente `<EntityHistory>` (timeline)
  - [ ] Tab "Histórico" nos detalhes

#### Documentação

- [ ] **10. Atualizar `docs/modules/<module>.md`**
  - [ ] Seção "Versionamento e Auditoria"
  - [ ] Seção "Segurança e Criptografia"
  - [ ] Campos criptografados listados

---

## 🎯 Entregas Finais

### 1. Schema Prisma Refatorado

**Modelos com versionamento completo:**
- ✅ DailyRecord (já existe)
- ✅ ClinicalNote (já existe)
- ✅ Pop (já existe)
- ✅ TenantDocument (já existe)
- ✅ Resident (novo)
- ✅ Prescription (novo)
- ✅ Medication (novo)
- ✅ SOSMedication (novo)
- ✅ Vaccination (novo)
- ✅ User (novo)
- ✅ Allergy (novo)
- ✅ Condition (novo)
- ✅ DietaryRestriction (novo)
- ✅ ClinicalProfile (novo)
- ⚠️ VitalSign (opcional)

**Total:** 15 modelos versionados (100%)

### 2. Criptografia Implementada

**Campos criptografados:**
- ✅ Todos os dados sensíveis de saúde (Art. 5º, II LGPD)
- ✅ CPF, RG, CNS (identificação civil)
- ✅ Storage (MinIO) com SSE

**Middleware Prisma:**
- ✅ Criptografia transparente AES-256-GCM
- ✅ Chave derivada por tenant
- ✅ Performance otimizada (cache de chaves)

### 3. Documentação LGPD

- ✅ **Tabela de Conformidade** completa (campo → tipo → base legal → proteção)
- ✅ **Política de Privacidade** atualizada
- ✅ **RIPD** redigido
- ✅ **Documentação técnica** de segurança

### 4. Auditoria Total

- ✅ Todos os acessos a prontuários logados
- ✅ Histórico imutável de alterações
- ✅ Campo `changeReason` obrigatório
- ✅ Rastreabilidade: quem, quando, por quê, o quê

---

## 📐 Arquitetura Final

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  - Formulários com changeReason obrigatório                 │
│  - Componentes de histórico (timeline)                      │
│  - Permissões RBAC (PermissionGate)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/TLS 1.3
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS)                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Controllers + DTOs (changeReason obrigatório)      │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │  Services (lógica de versionamento + transações)    │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │  Prisma Middleware (criptografia transparente)      │   │
│  │  - AES-256-GCM                                       │   │
│  │  - Chave derivada por tenant                         │   │
│  │  - Encrypt antes de write                            │   │
│  │  - Decrypt após read                                 │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   PostgreSQL     │          │   MinIO (S3)     │
│                  │          │                  │
│ - Dados          │          │ - Arquivos       │
│   criptografados │          │   criptografados │
│ - Histórico      │          │   (SSE)          │
│   imutável       │          │                  │
│ - Soft delete    │          │ - Receitas       │
│                  │          │ - Laudos         │
│                  │          │ - Fotos          │
└──────────────────┘          └──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    CONFORMIDADE LGPD                         │
│                                                               │
│  ✅ Criptografia em trânsito (HTTPS/TLS)                    │
│  ✅ Criptografia em repouso (database + storage)            │
│  ✅ Auditoria total (quem, quando, por quê, o quê)          │
│  ✅ Versionamento imutável (histórico completo)             │
│  ✅ Controle de acesso (RBAC granular)                      │
│  ✅ Segregação por tenant (isolamento total)                │
│  ✅ Logs de acesso a prontuários                            │
│  ✅ Accountability (demonstração de conformidade)           │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚖️ Conformidade Legal Garantida

### LGPD (Lei nº 13.709/2018)

- ✅ **Art. 5º, II** - Dados sensíveis de saúde criptografados
- ✅ **Art. 6º** - Princípios de segurança e prevenção
- ✅ **Art. 11** - Base legal para tratamento de dados sensíveis
- ✅ **Art. 46** - Medidas de segurança técnicas e administrativas
- ✅ **Art. 48** - Procedimento de incidente documentado

### RDC 502/2021 ANVISA

- ✅ **Art. 33** - Registro completo de informações de saúde
- ✅ Prontuário eletrônico versionado e imutável

### Resolução CFM 1.821/2007

- ✅ Prontuário eletrônico seguro
- ✅ Assinatura digital (futuro)

### Portaria SVS/MS 344/1998

- ✅ Receitas de medicamentos controlados criptografadas
- ✅ Histórico de prescrições auditável

---

## 📊 Estimativa Total Consolidada

| Sprint | Foco | Dias | Horas | Entregável |
|--------|------|------|-------|------------|
| Sprint 1 | Fundação + Resident | 5 | 20h | Resident completo + infra |
| Sprint 2 | Prescrições | 4 | 26h | Prescription, Medication, SOS |
| Sprint 3 | Saúde | 4 | 26h | Vaccination, Allergy, Condition, Dietary |
| Sprint 4 | Finalização | 6 | 30h | User, ClinicalProfile, Docs LGPD |
| **TOTAL** | | **19 dias** | **102h** | **Sistema 100% completo** |

**Cronograma:** 4 semanas (1 mês) de trabalho dedicado

---

## ✅ Critérios de Sucesso

### Técnicos

- [ ] 15 modelos com versionamento completo (100%)
- [ ] Todos os campos sensíveis criptografados
- [ ] Performance overhead < 10%
- [ ] Testes E2E passando (100% cobertura crítica)
- [ ] Storage criptografado (SSE habilitado)
- [ ] Master keys em secrets manager
- [ ] Zero dados legíveis em dump de banco

### Conformidade

- [ ] Tabela de conformidade LGPD completa
- [ ] Política de Privacidade publicada
- [ ] RIPD redigido e revisado
- [ ] Logs de auditoria funcionando
- [ ] Procedimento de incidente documentado
- [ ] Demonstração de accountability

### Negócio

- [ ] Sistema pode ser vendido com selo "LGPD-Compliant"
- [ ] Documentação técnica para certificações
- [ ] Argumentos jurídicos para compliance
- [ ] Diferencial competitivo no mercado

---

## 🚀 Próximos Passos Imediatos

### Opção 1: Começar Agora (Recomendado)

Podemos iniciar **imediatamente** pelo Sprint 1:
1. Setup de criptografia (infraestrutura)
2. Implementar Resident + ResidentHistory (modelo de referência)
3. Validar arquitetura antes de escalar para outros módulos

**Vantagem:** Validar solução técnica rapidamente

### Opção 2: Revisar e Ajustar

Você pode revisar este plano e sugerir ajustes:
- Priorizar módulos diferentes
- Ajustar estimativas
- Questionar decisões técnicas

### Opção 3: Documentação Adicional

Posso criar documentos complementares:
- Guia passo a passo de implementação de cada módulo
- Exemplos de código completos
- Scripts de testes

**O que você prefere fazer agora, Dr. E.?**

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
**Última atualização:** 11/12/2025
