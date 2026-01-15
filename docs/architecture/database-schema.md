# Estrutura do Banco de Dados

**Versão:** 5.22.0 (Prisma)
**Última atualização:** 15/01/2026

## Visão Geral

O sistema Rafa ILPI utiliza **PostgreSQL 16** com **Prisma ORM 5** em arquitetura **multi-tenant com schema isolation**. Cada tenant (ILPI) possui um schema PostgreSQL dedicado, garantindo isolamento físico completo dos dados.

### Características Principais

- ✅ **Schema-per-tenant:** Isolamento físico de dados
- ✅ **9 tabelas SHARED** no schema `public`
- ✅ **66+ tabelas ISOLATED** em cada schema de tenant
- ✅ **UUID v4** como chave primária
- ✅ **Soft Delete** com campo `deletedAt`
- ✅ **Auditoria** com `createdBy`, `updatedBy`, timestamps
- ✅ **Timestamps UTC** com precisão de milissegundos

---

## Arquitetura Multi-Tenant

### Schema `public` (SHARED - 9 tabelas)

Dados globais do sistema SaaS, compartilhados entre todos os tenants:

#### Tabelas de Negócio SaaS

1. **`tenants`** - Registro de ILPIs cadastradas
   - `id` (UUID, PK)
   - `name` - Nome da ILPI
   - `slug` - Identificador único (URL-friendly)
   - `cnpj` - CNPJ único
   - `schemaName` - Nome do schema PostgreSQL (ex: `tenant_boavida_abc123`)
   - `status` - Status da assinatura (`active`, `suspended`, `cancelled`)
   - `timezone` - Fuso horário (padrão: `America/Sao_Paulo`)
   - `createdAt`, `deletedAt`

2. **`plans`** - Planos de assinatura disponíveis
   - `id` (UUID, PK)
   - `name` - Nome do plano
   - `type` - Tipo (`free`, `starter`, `professional`, `enterprise`)
   - `maxResidents` - Limite de residentes
   - `maxUsers` - Limite de usuários
   - `priceMonthly` - Valor mensal (Decimal)
   - `features` - JSON com features habilitadas

3. **`subscriptions`** - Assinaturas ativas
   - `id` (UUID, PK)
   - `tenantId` - FK para `tenants`
   - `planId` - FK para `plans`
   - `status` - Status (`active`, `cancelled`, `expired`)
   - `startDate`, `endDate`
   - `autoRenew` - Renovação automática

4. **`service_contracts`** - Contratos de adesão
   - `id` (UUID, PK)
   - `tenantId` - FK para `tenants`
   - `version` - Versão do contrato
   - `content` - Conteúdo em HTML/Markdown
   - `signedAt` - Data de assinatura

5. **`contract_acceptances`** - Registros de aceite jurídico
   - `id` (UUID, PK)
   - `contractId` - FK para `service_contracts`
   - `tenantId` - FK para `tenants`
   - `acceptedBy` - Responsável legal
   - `acceptedAt` - Timestamp do aceite
   - `ipAddress` - IP de onde foi aceito

#### Tabelas de Comunicação

6. **`email_templates`** - Templates de email globais
   - `id` (UUID, PK)
   - `name` - Identificador único
   - `description` - Descrição do template
   - `category` - Categoria (ex: `onboarding`, `notifications`)

7. **`email_template_versions`** - Versionamento de templates
   - `id` (UUID, PK)
   - `templateId` - FK para `email_templates`
   - `version` - Número da versão
   - `subject`, `htmlContent`, `textContent`
   - `variables` - JSON com variáveis disponíveis

8. **`tenant_messages`** - Mensagens broadcast do sistema
   - `id` (UUID, PK)
   - `title`, `content`
   - `type` - Tipo (`info`, `warning`, `maintenance`)
   - `targetTenants` - Array de tenant IDs (null = todos)
   - `publishedAt`, `expiresAt`

#### Tabelas de Integração

9. **`webhook_events`** - Eventos de integração externa
   - `id` (UUID, PK)
   - `tenantId` - FK para `tenants` (pode ser null para eventos globais)
   - `provider` - Provedor (ex: `stripe`, `asaas`)
   - `eventType` - Tipo do evento
   - `payload` - JSON com dados do webhook
   - `processedAt`

---

### Schemas por Tenant (ISOLATED - 66+ tabelas)

Cada tenant possui um schema nomeado como `tenant_{slug}_{hash}` contendo **TODAS** as tabelas operacionais e assistenciais.

#### 1. Usuários e Perfis

**`users`** - Usuários do tenant
- `id` (UUID, PK)
- `tenantId` (UUID) - Referência (mantido para integridade)
- `email` (UNIQUE no schema)
- `password` - Hash bcrypt
- `role` - Role básico (`ADMIN`, `MANAGER`, `USER`, `VIEWER`)
- `status` - Status (`active`, `inactive`, `suspended`)
- `createdAt`, `updatedAt`, `deletedAt`

**`user_profiles`** - Perfis estendidos
- `id` (UUID, PK)
- `userId` (UUID, FK) - Referência para `users`
- `name`, `cpf`, `phone`
- `positionCode` - Cargo profissional (enum)
- `professionalRegistration` - Registro profissional (CRM, COREN, etc)
- `preferences` - JSON com preferências do usuário

**`user_permissions`** - Permissões customizadas
- `id` (UUID, PK)
- `userId` (UUID, FK)
- `permissionType` - Tipo de permissão (enum extenso)
- `grantedBy` - Quem concedeu
- `grantedAt`

#### 2. Residentes

**`residents`** - Dados cadastrais dos residentes
- `id` (UUID, PK)
- `nome`, `cpf`, `rg`
- `dataNascimento`, `sexo`
- `naturalidade`, `nacionalidade`
- `estadoCivil`, `escolaridade`
- `profissao`, `religiao`
- `status` - Status (`ativo`, `transferido`, `falecido`, `evadido`)
- `dataAdmissao`, `dataSaida`
- `createdAt`, `updatedAt`, `deletedAt`

**`resident_history`** - Versionamento de dados
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `changes` - JSON com diff das mudanças
- `changedBy`, `changedAt`

**`resident_emails`** - Emails adicionais de residentes
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `email`, `type` - Tipo (`personal`, `family`, `other`)

**`resident_contracts`** - Contratos de residência
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `contractNumber`
- `startDate`, `endDate`
- `monthlyValue` - Decimal
- `paymentDay` - Dia do vencimento
- `status` - Status (`active`, `cancelled`, `expired`)
- `digitalSignatureUrl` - URL do documento assinado

#### 3. Estrutura Física

**`buildings`** - Prédios/Blocos
- `id` (UUID, PK)
- `name`, `code`
- `address` - Endereço completo (opcional)

**`floors`** - Andares
- `id` (UUID, PK)
- `buildingId` (UUID, FK)
- `name`, `level` - Número do andar

**`rooms`** - Quartos
- `id` (UUID, PK)
- `floorId` (UUID, FK)
- `name`, `code`
- `capacity` - Capacidade máxima
- `roomType` - Tipo (`individual`, `duplo`, `coletivo`)

**`beds`** - Leitos
- `id` (UUID, PK)
- `roomId` (UUID, FK)
- `code` - Código único do leito
- `status` - Status (`disponivel`, `ocupado`, `manutencao`, `reservado`)
- `occupiedBy` - FK para `residents` (nullable)

**`bed_status_history`** - Histórico de mudanças de status
- `id` (UUID, PK)
- `bedId` (UUID, FK)
- `previousStatus`, `newStatus`
- `previousResident`, `newResident` - FKs para `residents`
- `reason` - Motivo da mudança
- `changedBy`, `changedAt`

#### 4. Saúde e Prontuário

**`clinical_profiles`** - Perfil clínico do residente
- `id` (UUID, PK)
- `residentId` (UUID, FK, UNIQUE)
- `bloodType` - Tipo sanguíneo
- `allergies` - Text (lista de alergias)
- `chronicDiseases` - Text (doenças crônicas)
- `emergencyContact` - JSON com contatos de emergência

**`clinical_notes`** - Evoluções clínicas (SOAP)
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `date` - Data da evolução
- `type` - Tipo (`daily`, `medical`, `nursing`, `psychology`)
- `authorId` (UUID, FK) - Quem registrou
- `subjective`, `objective`, `assessment`, `plan` - Campos SOAP

**`clinical_note_documents`** - Documentos Tiptap anexos
- `id` (UUID, PK)
- `clinicalNoteId` (UUID, FK)
- `content` - JSON Tiptap
- `attachments` - Array de URLs

**`vital_signs`** - Sinais vitais
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `recordedAt` - Timestamp
- `systolicBP`, `diastolicBP` - Pressão arterial
- `heartRate`, `respiratoryRate`, `temperature`, `oxygenSaturation`
- `recordedBy` (UUID, FK)

**`daily_records`** - Registros diários
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `date` - Data do registro
- `shift` - Turno (`morning`, `afternoon`, `night`)
- `sleep`, `appetite`, `hydration`, `evacuation`, `hygiene`
- `observations` - Text
- `recordedBy` (UUID, FK)

**`daily_record_history`** - Histórico de alterações
- `id` (UUID, PK)
- `dailyRecordId` (UUID, FK)
- `changes` - JSON diff
- `changedBy`, `changedAt`

**`vaccinations`** - Vacinações
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `vaccineName`, `dose`, `manufacturer`, `batchNumber`
- `appliedAt`, `appliedBy`
- `certificateUrl` - URL do certificado

#### 5. Medicações

**`medications`** - Medicamentos cadastrados
- `id` (UUID, PK)
- `name` - Nome comercial/genérico
- `activeIngredient` - Princípio ativo
- `dosageForm` - Forma farmacêutica (comprimido, xarope, etc)
- `concentration` - Concentração (ex: "500mg")

**`prescriptions`** - Prescrições médicas
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `prescribedBy` - Nome do médico
- `crm` - Registro médico
- `prescribedAt` - Data da prescrição
- `validUntil` - Validade
- `status` - Status (`active`, `expired`, `cancelled`)

**`medication_prescriptions`** - Pivot prescrição-medicamento
- `id` (UUID, PK)
- `prescriptionId` (UUID, FK)
- `medicationId` (UUID, FK)
- `dosage` - Dosagem (ex: "1 comprimido")
- `frequency` - Frequência (ex: "3x ao dia")
- `administrationTimes` - Array de horários (ex: ["08:00", "14:00", "20:00"])
- `instructions` - Instruções adicionais

**`medication_administrations`** - Registros de administração
- `id` (UUID, PK)
- `medicationPrescriptionId` (UUID, FK)
- `scheduledAt` - Horário agendado
- `administeredAt` - Horário real de administração
- `status` - Status (`administered`, `missed`, `refused`, `cancelled`)
- `administeredBy` (UUID, FK)
- `observations` - Observações

**`sos_medications`** - Medicações SOS (se necessário)
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `medicationName`, `dosage`, `indication`
- `maxDailyDoses` - Máximo por dia
- `minimumInterval` - Intervalo mínimo (em horas)
- `validUntil`

#### 6. Eventos e Agenda

**`resident_scheduled_events`** - Eventos agendados
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `eventType` - Tipo (enum: `MEDICAL_APPOINTMENT`, `VACCINATION`, `EXAM`, `THERAPY`, `ACTIVITY`)
- `title`, `description`
- `scheduledDate`, `scheduledTime`
- `location` - Local (texto ou JSON)
- `status` - Status (`SCHEDULED`, `COMPLETED`, `CANCELLED`, `MISSED`)
- `completedAt`, `completedBy`

**`institutional_events`** - Eventos institucionais
- `id` (UUID, PK)
- `title`, `description`
- `eventType` - Tipo (`MEETING`, `TRAINING`, `CELEBRATION`, `MAINTENANCE`)
- `startDate`, `endDate`
- `targetAudience` - Público-alvo (array)
- `createdBy`

#### 7. Documentos

**`tenant_documents`** - Documentos institucionais
- `id` (UUID, PK)
- `categoryId` (UUID, FK, nullable)
- `title`, `description`
- `fileUrl` - URL no storage
- `fileType` - MIME type
- `fileSize` - Tamanho em bytes
- `uploadedBy`, `uploadedAt`
- `expiresAt` - Data de validade (para docs que expiram)

**`resident_documents`** - Documentos dos residentes
- `id` (UUID, PK)
- `residentId` (UUID, FK)
- `documentType` - Tipo (enum extenso)
- `title`, `details`
- `fileUrl`, `fileType`, `fileSize`
- `uploadedBy`, `uploadedAt`

**`document_categories`** - Categorias de documentos
- `id` (UUID, PK)
- `name`, `description`
- `parentCategoryId` (UUID, FK, nullable) - Hierarquia

**`document_history`** - Histórico de documentos
- `id` (UUID, PK)
- `documentId` (UUID, FK)
- `action` - Ação (`uploaded`, `updated`, `deleted`, `viewed`)
- `performedBy`, `performedAt`

#### 8. POPs (Procedimentos Operacionais Padrão)

**`pops`** - POPs do tenant
- `id` (UUID, PK)
- `code` - Código único (ex: "POP-001")
- `title`, `objective`
- `content` - Conteúdo em JSON (Tiptap)
- `categoryId` (UUID, FK, nullable)
- `status` - Status (`draft`, `published`, `archived`)
- `version` - Número da versão
- `requiresReview` - Flag para revisão periódica
- `reviewFrequency` - Frequência de revisão (em dias)
- `lastReviewedAt`, `nextReviewDate`
- `createdBy`, `approvedBy`

**`pop_categories`** - Categorias de POPs
- `id` (UUID, PK)
- `name`, `description`, `color`

**`pop_templates`** - Templates de POPs
- `id` (UUID, PK)
- `name`, `description`
- `templateContent` - JSON Tiptap

#### 9. Sistema

**`notifications`** - Notificações do tenant
- `id` (UUID, PK)
- `userId` (UUID, FK) - Destinatário
- `title`, `message`
- `type` - Tipo (`info`, `warning`, `error`, `success`)
- `entityType` - Tipo de entidade relacionada (ex: `RESIDENT`, `MEDICATION`)
- `entityId` - ID da entidade
- `isRead` - Lida ou não
- `readAt`
- `createdAt`

**`audit_logs`** - Auditoria isolada por tenant
- `id` (UUID, PK)
- `userId` (UUID, FK) - Quem realizou a ação
- `entityType` - Tipo de entidade (ex: `RESIDENT`, `MEDICATION`)
- `entityId` - ID da entidade
- `action` - Ação (`CREATE`, `UPDATE`, `DELETE`, `VIEW`)
- `changes` - JSON com diff das mudanças
- `ipAddress`, `userAgent`
- `createdAt`

**`tenant_profile`** - Perfil institucional do tenant
- `id` (UUID, PK)
- `tenantId` (UUID, UNIQUE) - Referência
- `legalNature` - Natureza jurídica (enum)
- `foundationDate` - Data de fundação
- `capacityDeclarada`, `capacityLicensed` - Capacidades
- `logoUrl` - URL do logo
- `website`, `socialMedia` - JSON
- `createdAt`, `updatedAt`, `deletedAt`

---

## Convenções e Padrões

### Tipos de Dados

- **IDs:** `UUID v4` via `@db.Uuid`
- **Timestamps:** `DateTime` com `@db.Timestamptz(3)` (UTC, precisão de milissegundos)
- **Decimals:** `Decimal` com `@db.Decimal(10, 2)` para valores monetários
- **Enums:** TypeScript enums mapeados para `VARCHAR` no banco
- **JSON:** Campos flexíveis com `Json` do Prisma

### Soft Delete

Todas as entidades principais possuem campo `deletedAt`:
```prisma
deletedAt DateTime? @db.Timestamptz(3)
```

Queries devem sempre filtrar por `deletedAt: null` (exceto quando usando `TenantContextService` que já gerencia isso).

### Auditoria

Campos padrão de auditoria:
```prisma
createdBy  String   @db.Uuid
updatedBy  String?  @db.Uuid
createdAt  DateTime @default(now()) @db.Timestamptz(3)
updatedAt  DateTime @updatedAt @db.Timestamptz(3)
deletedAt  DateTime? @db.Timestamptz(3)
```

### Relacionamentos

- **Foreign Keys:** Sempre nomeadas com sufixo `Id` (ex: `residentId`, `tenantId`)
- **Relações 1:N:** Campo FK na tabela "many"
- **Relações N:M:** Tabela pivot com sufixo ou padrão descritivo (ex: `medication_prescriptions`)
- **Cascade:** Configurado no Prisma schema com `onDelete` e `onUpdate`

---

## Migrations

### Estrutura

**Pasta:** `apps/backend/prisma/migrations/`

Migrations são aplicadas:
- **Schema `public`:** Via `prisma migrate deploy` (padrão)
- **Schemas de tenants:** Via script `npm run tenants:sync-schemas`

### Migrations Principais (Recentes)

- `20260113133816_add_responsavel_contratual_signatory_role` - Adiciona role de responsável contratual
- `20260113111215_add_resident_contracts_digitalization` - Digitalização de contratos
- `20260112233948_add_resident_emails_and_origin_field` - Emails de residentes
- `20251208110650_add_clinical_note_documents` - Documentos Tiptap
- `20251206122043_add_notifications_system` - Sistema de notificações
- `20251202221041_add_ilpi_permissions_system` - Sistema de permissões granulares

### Criando Nova Migration

```bash
# Editar schema.prisma
cd apps/backend

# Criar migration (aplica apenas em public)
npx prisma migrate dev --name descricao_da_mudanca

# Sincronizar com todos os tenant schemas
npm run tenants:sync-schemas
```

---

## Índices e Performance

### Índices Automáticos

Prisma cria índices automaticamente para:
- Chaves primárias (UUID)
- Foreign keys
- Campos marcados como `@unique`

### Índices Customizados

Índices compostos para queries frequentes:
```prisma
@@index([residentId, deletedAt]) // Buscar por residente excluindo deletados
@@index([date, shift])            // Daily records por data e turno
@@index([status, createdAt])      // Listar por status ordenado
```

### Otimizações

- **Particionamento:** Considerado para tabelas de auditoria (futuro)
- **Vacuum:** Executado semanalmente via cron
- **Analyze:** Executado após migrations grandes

---

## Backups

### Estratégia

1. **Backup completo diário** (00:00 UTC)
   - Todos os schemas (public + tenants)
   - Retenção: 30 dias

2. **Backup incremental** (a cada 6h)
   - Apenas mudanças recentes
   - Retenção: 7 dias

3. **Backup por tenant** (sob demanda)
   ```bash
   pg_dump -n tenant_abc123 > backup_tenant.sql
   ```

### Restore

```bash
# Restore completo
psql -d rafa_ilpi < backup_completo.sql

# Restore de um tenant específico
psql -d rafa_ilpi < backup_tenant_abc123.sql
```

---

## Diagrama ER (Resumido)

```
public (SHARED)
├── tenants (1) ──────┐
├── plans (1)          │
├── subscriptions (N) ─┘
└── ...

tenant_abc123 (ISOLATED)
├── users (N)
├── residents (N) ────────┐
│   ├── clinical_profiles (1:1)
│   ├── vital_signs (N)
│   ├── daily_records (N)
│   ├── prescriptions (N) ──┐
│   │   └── medication_prescriptions (N:M) ── medications (N)
│   ├── resident_scheduled_events (N)
│   ├── resident_documents (N)
│   └── vaccinations (N)
├── beds (N) ─────────┘ (occupiedBy)
│   └── rooms (N)
│       └── floors (N)
│           └── buildings (N)
├── pops (N)
├── notifications (N)
└── audit_logs (N)
```

---

## Referências

- **Schema Prisma:** [apps/backend/prisma/schema.prisma](../../apps/backend/prisma/schema.prisma)
- **Arquitetura Multi-Tenant:** [multi-tenancy.md](./multi-tenancy.md)
- **Isolamento de Dados:** [MULTI-TENANT-ISOLATION.md](./MULTI-TENANT-ISOLATION.md)
- **Migrations:** [apps/backend/prisma/migrations/](../../apps/backend/prisma/migrations/)

---

**Última atualização:** 15/01/2026
**Mantido por:** Dr. Emanuel
