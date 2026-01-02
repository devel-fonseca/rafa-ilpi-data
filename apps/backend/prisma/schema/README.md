# Prisma Schema Modularizado

Este diretório contém o schema do Prisma dividido em múltiplos arquivos organizados por domínio funcional.

## 📋 Visão Geral

O schema foi modularizado utilizando a feature `prismaSchemaFolder` do Prisma (preview), que permite dividir um schema monolítico em arquivos menores e mais gerenciáveis, mantendo todas as funcionalidades e relações intactas.

### Estatísticas

- **Total de Arquivos:** 19
- **Total de Modelos:** 68
- **Total de Enums:** 47
- **Linhas (original):** 3.374 → distribuídas em arquivos modulares

---

## 🗂️ Estrutura de Arquivos

### 🔧 Configuração Base

#### `_base.prisma`
**Propósito:** Configuração central do Prisma
**Conteúdo:**
- Generator do Prisma Client
- Datasource do PostgreSQL
- Preview features (`postgresqlExtensions`, `prismaSchemaFolder`)

**Nota:** O underscore `_` garante que seja processado primeiro (ordem alfabética).

---

### 📊 Enums

#### `enums.prisma`
**Propósito:** Centralização de todos os enums do sistema
**Total:** 47 enums organizados em 8 categorias

**Categorias:**
1. **Negócio e Comercial** (7 enums)
   - `PlanType`, `BillingCycle`, `ContractStatus`, `InvoiceStatus`, `PaymentGateway`, `PaymentMethod`, `PaymentStatus`

2. **Permissões e Segurança** (5 enums)
   - `PermissionType` (37 permissões granulares), `PositionCode`, `RegistrationType`, `AccessAction`, `ChangeType`

3. **Tenant e Status** (2 enums)
   - `TenantStatus`, `LegalNature`

4. **Dados Demográficos** (3 enums)
   - `Gender`, `CivilStatus`, `BloodType`

5. **Registros Diários** (4 enums)
   - `RecordType`, `ScheduleFrequency`, `ScheduledEventType`, `ScheduledEventStatus`

6. **Medicações e Prescrições** (7 enums)
   - `PrescriptionType`, `AdministrationRoute`, `MedicationPresentation`, `NotificationType`, `ControlledClass`, `MedicationFrequency`, `SOSIndicationType`

7. **Saúde e Bem-estar** (4 enums)
   - `ClinicalProfession`, `AllergySeverity`, `RestrictionType`

8. **Documentação Institucional** (2 enums)
   - `DocumentStatus`, `DocumentAction`

9. **Notificações e Alertas** (5 enums)
   - `SystemNotificationType`, `NotificationCategory`, `NotificationSeverity`, `AlertType`, `AlertSeverity`

10. **POPs** (3 enums)
    - `PopStatus`, `PopCategory`, `PopAction`

11. **Comunicação e Email** (6 enums)
    - `EmailTemplateCategory`, `EmailStatus`, `MessageType`, `MessageStatus`, `MessageRecipientFilter`, `TenantMessageStatus`

---

### 🏢 Domínios de Negócio

#### `contracts.prisma`
**Domínio:** Contratos de Serviço SaaS
**Modelos:** 3
- `ServiceContract` - Templates versionados de contratos
- `ContractAcceptance` - Registro de aceites (prova jurídica)
- `PrivacyPolicyAcceptance` - Aceites LGPD com declarações

**Funcionalidades:**
- Versionamento de contratos
- Compliance jurídico e LGPD
- Rastreamento de aceites por tenant

---

#### `tenant.prisma`
**Domínio:** Núcleo Multi-Tenant
**Modelos:** 3
- `Plan` - Planos de assinatura (FREE, BÁSICO, PROFISSIONAL, ENTERPRISE)
- `Tenant` - Clínicas/Residências (hub central do sistema)
- `Subscription` - Assinaturas Stripe-style com integração Asaas

**Funcionalidades:**
- Multi-tenancy completo
- Gestão de planos e pricing
- Integração com gateway de pagamento Asaas
- Trial management com alertas configuráveis

**Nota:** `Tenant` é o modelo central com 50+ relações para todos os domínios.

---

#### `auth.prisma`
**Domínio:** Autenticação e Controle de Acesso
**Modelos:** 7
- `User` - Usuários do sistema (suporta SUPERADMIN com `tenantId` NULL)
- `RefreshToken` - Tokens JWT para refresh com rastreamento de sessão
- `PasswordResetToken` - Tokens para recuperação de senha
- `AccessLog` - Auditoria de login/logout/alterações de senha
- `UserHistory` - Versionamento completo de usuários (compliance LGPD)
- `UserProfile` - Perfil estendido com dados profissionais ILPI
- `UserPermission` - Permissões customizadas por usuário

**Funcionalidades:**
- Autenticação JWT
- Sistema de permissões granulares baseado em cargos ILPI
- Auditoria completa de acesso
- Versionamento imutável (LGPD)
- Rastreamento de sessões (IP, User Agent, dispositivo)

---

#### `residents.prisma`
**Domínio:** Residentes
**Modelos:** 3
- `Resident` - Dados demográficos completos do residente
- `ResidentHistory` - Versionamento de residentes (compliance LGPD)
- `ResidentDocument` - Documentos do residente (fotos, atestados, etc.)

**Funcionalidades:**
- Cadastro completo de residentes
- Versionamento de alterações
- Upload de documentos com metadados
- Soft delete

---

#### `clinical.prisma`
**Domínio:** Perfil Clínico
**Modelos:** 8
- `ClinicalProfile` - Perfil clínico consolidado do residente
- `ClinicalProfileHistory` - Histórico de alterações do perfil
- `Allergy` - Alergias com severidade
- `AllergyHistory` - Histórico de alergias
- `Condition` - Condições crônicas/pré-existentes
- `ConditionHistory` - Histórico de condições
- `DietaryRestriction` - Restrições alimentares (alergia, intolerância, disfagia, etc.)
- `DietaryRestrictionHistory` - Histórico de restrições

**Funcionalidades:**
- Gestão de condições de saúde
- Rastreamento de alergias e severidade
- Controle de restrições alimentares
- Versionamento completo de todos os dados clínicos

---

#### `daily-records.prisma`
**Domínio:** Registros Diários de Cuidados
**Modelos:** 4
- `DailyRecord` - Registros diários (higiene, alimentação, humor, etc.)
- `DailyRecordHistory` - Histórico de registros
- `ResidentScheduleConfig` - Configuração de agenda do residente
- `ResidentScheduledEvent` - Eventos agendados (vacina, consulta, exame, etc.)

**Funcionalidades:**
- Registro de cuidados diários (13 tipos)
- Agenda personalizada por residente
- Agendamento de eventos (vacinação, consulta, exame, procedimento)
- Rastreamento de status (agendado, concluído, cancelado, perdido)

---

#### `vital-signs.prisma`
**Domínio:** Sinais Vitais
**Modelos:** 2
- `VitalSign` - Sinais vitais (pressão, temperatura, glicose, etc.)
- `VitalSignHistory` - Histórico de sinais vitais

**Funcionalidades:**
- Monitoramento de sinais vitais
- Rastreamento de pressão arterial, temperatura, glicose, FC, FR, SpO2
- Versionamento de alterações
- Observações clínicas

---

#### `medications.prisma`
**Domínio:** Medicações e Prescrições
**Modelos:** 8
- `Prescription` - Prescrições médicas com validade
- `PrescriptionHistory` - Histórico de prescrições
- `Medication` - Medicamentos regulares prescritos
- `MedicationHistory` - Histórico de medicamentos
- `SOSMedication` - Medicamentos SOS (conforme necessário)
- `SOSMedicationHistory` - Histórico de medicamentos SOS
- `MedicationAdministration` - Registro de administração de medicamentos
- `SOSAdministration` - Registro de administração SOS

**Funcionalidades:**
- Gestão completa de prescrições
- Controle de medicamentos regulares e SOS
- Rastreamento de administração (horários, doses)
- Suporte a medicamentos controlados (BZD, psicotrópicos, opioides)
- Receituário especial (notificação amarela, azul, branca especial)
- Versionamento de todas as alterações

---

#### `vaccinations.prisma`
**Domínio:** Vacinações e Imunização
**Modelos:** 2
- `Vaccination` - Vacinas administradas
- `VaccinationHistory` - Histórico de vacinações

**Funcionalidades:**
- Registro de vacinas aplicadas
- Rastreamento de lotes e validade
- Versionamento de alterações
- Observações sobre reações

---

#### `clinical-notes.prisma`
**Domínio:** Evoluções Clínicas (SOAP)
**Modelos:** 3
- `ClinicalNote` - Evoluções clínicas multidisciplinares (formato SOAP)
- `ClinicalNoteHistory` - Histórico de evoluções
- `ClinicalNoteDocument` - Documentos anexados às evoluções

**Funcionalidades:**
- Evoluções multidisciplinares (Medicina, Enfermagem, Nutrição, Fisioterapia, Psicologia, Serviço Social, Fonoaudiologia, Terapia Ocupacional)
- Formato SOAP (Subjetivo, Objetivo, Avaliação, Plano)
- Anexação de documentos (exames, laudos, etc.)
- Versionamento completo
- Assinatura digital (nome + registro profissional)

---

#### `infrastructure.prisma`
**Domínio:** Infraestrutura Física
**Modelos:** 5
- `Building` - Prédios da ILPI
- `Floor` - Andares dos prédios
- `Room` - Quartos/unidades
- `Bed` - Leitos individuais
- `BedTransferHistory` - Histórico de transferências entre leitos

**Funcionalidades:**
- Gestão hierárquica de infraestrutura (Prédio → Andar → Quarto → Leito)
- Alocação de residentes em leitos
- Rastreamento de transferências com motivo obrigatório
- Compliance RDC 502/2021 (Anvisa)

---

#### `documents.prisma`
**Domínio:** Documentação Institucional
**Modelos:** 3
- `TenantProfile` - Perfil institucional da clínica (1:1 com Tenant)
- `TenantDocument` - Documentos da instituição (CNPJ, alvarás, registro, etc.)
- `DocumentHistory` - Histórico de documentos para auditoria

**Funcionalidades:**
- Perfil institucional completo (CNES, capacidade, missão/visão/valores)
- Upload de documentos regulatórios
- Rastreamento de vencimento (OK, pendente, vencendo, vencido)
- Versionamento de documentos (substituição com histórico)
- Metadados completos (emissor, número, data de emissão/validade)

---

#### `pops.prisma`
**Domínio:** Procedimentos Operacionais Padrão
**Modelos:** 3
- `Pop` - POPs institucionais (templates + customizações)
- `PopHistory` - Histórico de alterações de POPs
- `PopAttachment` - Documentos anexados aos POPs

**Funcionalidades:**
- Gestão de POPs (Gestão/Operação, Enfermagem/Cuidados)
- Workflow de aprovação (DRAFT → PUBLISHED → OBSOLETE)
- Versionamento de POPs (substituição com histórico)
- Revisão periódica configurável
- Editor rich text (Tiptap)
- Anexação de formulários, checklists, fluxogramas

---

#### `billing.prisma`
**Domínio:** Faturamento e Pagamentos (SuperAdmin)
**Modelos:** 4
- `Invoice` - Faturas do tenant
- `Payment` - Pagamentos registrados (integração Asaas)
- `UsageMetrics` - Métricas de uso do tenant
- `WebhookEvent` - Eventos de webhook (callbacks Asaas)

**Funcionalidades:**
- Faturamento automatizado
- Integração com Asaas (PIX, boleto, cartão)
- Rastreamento de pagamentos
- Métricas de uso (residentes ativos, usuários ativos, storage, API calls)
- Webhook para sincronização de status

---

#### `notifications.prisma`
**Domínio:** Notificações e Alertas
**Modelos:** 2
- `Notification` - Notificações para residentes/usuários
- `SystemAlert` - Alertas do sistema (SuperAdmin)

**Funcionalidades:**
- Sistema de notificações por categoria (prescrição, sinal vital, documento, medicação, POP, sistema, eventos)
- Severidade configurável (CRITICAL, WARNING, INFO, SUCCESS)
- Expiração automática
- Metadados flexíveis (JSON)
- Alertas de sistema para SuperAdmin

---

#### `communication.prisma`
**Domínio:** Comunicação e Templates de Email
**Modelos:** 7
- `EmailTemplate` - Templates de email (onboarding, billing, lifecycle, system)
- `EmailTemplateVersion` - Versionamento de templates
- `EmailLog` - Log de emails enviados (auditoria)
- `TenantMessage` - Mensagens broadcast do SuperAdmin para tenants
- `Message` - Mensagens internas entre usuários
- `MessageRecipient` - Destinatários de mensagens
- `MessageAttachment` - Anexos de mensagens

**Funcionalidades:**
- Sistema de templates de email versionado
- Rollback de templates
- Auditoria de emails enviados
- Mensagens internas (1:1 e broadcast)
- Sistema de mensagens SuperAdmin → Tenants
- Anexos de arquivos

---

#### `audit.prisma`
**Domínio:** Auditoria Geral
**Modelos:** 1
- `AuditLog` - Logs de auditoria geral do sistema

**Funcionalidades:**
- Rastreamento de alterações em qualquer entidade
- Snapshot de dados anteriores/novos (JSON)
- Campos alterados
- Auditoria completa (quem, quando, IP, User Agent)

---

## 🔗 Relações Entre Domínios

### Hub Central: `Tenant`
O modelo `Tenant` é o hub central do sistema multi-tenant, com relações para todos os domínios:

```
Tenant (1) → (N) Subscriptions
Tenant (1) → (N) Users
Tenant (1) → (N) Residents
Tenant (1) → (N) DailyRecords
Tenant (1) → (N) VitalSigns
Tenant (1) → (N) Prescriptions
Tenant (1) → (N) Vaccinations
Tenant (1) → (N) ClinicalNotes
Tenant (1) → (N) Buildings
Tenant (1) → (N) Documents
Tenant (1) → (N) Pops
Tenant (1) → (N) Notifications
... (50+ relações)
```

### Relações Cruzadas Importantes

- `User` → cria/atualiza → `Resident`, `Prescription`, `Medication`, `VitalSign`, etc.
- `Resident` → possui → `ClinicalProfile`, `Allergy`, `Condition`, `DietaryRestriction`
- `Resident` → alocado em → `Bed` (via `infrastructure.prisma`)
- `Prescription` → contém → `Medication[]` e `SOSMedication[]`
- `Building` → `Floor` → `Room` → `Bed` (hierarquia de infraestrutura)

---

## 🛠️ Como Funciona

### Preview Feature: `prismaSchemaFolder`

O Prisma CLI automaticamente:
1. Processa todos os arquivos `.prisma` na pasta `prisma/schema/`
2. Combina-os em um schema virtual único
3. Gera o Prisma Client normalmente
4. Valida relações entre modelos em arquivos diferentes

### Ordem de Processamento

Os arquivos são processados em **ordem alfabética**. Por isso:
- `_base.prisma` é processado primeiro (underscore garante isso)
- `enums.prisma` vem antes dos modelos que usam os enums
- Outros arquivos podem estar em qualquer ordem (relações são resolvidas após leitura completa)

---

## 📝 Comandos Prisma

Todos os comandos funcionam normalmente:

```bash
# Validar schema
npx prisma validate

# Formatar arquivos
npx prisma format

# Gerar Prisma Client
npx prisma generate

# Criar migration
npx prisma migrate dev --name nome-da-migration

# Aplicar migrations em produção
npx prisma migrate deploy

# Abrir Prisma Studio
npx prisma studio
```

---

## ✅ Validações Realizadas

Durante a modularização, foram executadas as seguintes validações:

- ✅ **Contagem de modelos:** 68 (original) = 68 (modularizado)
- ✅ **Contagem de enums:** 47 (original) = 47 (modularizado)
- ✅ **`prisma format`:** Sintaxe validada
- ✅ **`prisma validate`:** Relações preservadas
- ✅ **`prisma generate`:** Client gerado com sucesso
- ✅ **TypeScript:** Compilado sem novos erros

---

## 📚 Documentação Adicional

- **Prisma Schema Folder:** https://www.prisma.io/docs/orm/prisma-schema/overview/location#schema-folder-preview
- **Changelog:** Ver [`/CHANGELOG.md`](../../../CHANGELOG.md) - entrada de 2025-12-30
- **Plano de Modularização:** Ver [`/home/emanuel/.claude/plans/pure-jingling-eclipse.md`](/home/emanuel/.claude/plans/pure-jingling-eclipse.md)

---

## 🔒 Backup

O schema original foi preservado em:
- `apps/backend/prisma/schema.prisma.backup` (3.374 linhas)

---

## 🚀 Benefícios da Modularização

1. **Manutenibilidade:** Desenvolvedores podem trabalhar em domínios isolados sem conflitos
2. **Navegação:** Encontrar modelos e enums fica muito mais rápido
3. **Organização:** Estrutura espelha a arquitetura de domínios do sistema
4. **Code Review:** PRs menores e mais focados em domínios específicos
5. **Performance:** Prisma CLI processa arquivos em paralelo
6. **Escalabilidade:** Facilita adição de novos domínios no futuro

---

## ⚠️ Importante

- **Não há breaking changes:** O Prisma Client gerado é idêntico ao anterior
- **Migrations funcionam normalmente:** Não é necessário recriar migrations existentes
- **Schema único virtual:** Mesmo dividido em arquivos, o Prisma trata como um schema único

---

**Data de Modularização:** 30/12/2025
**Autor:** @efonseca78 (Dr. E.)
**Ferramenta:** Claude Code + Prisma Schema Folder Preview Feature
