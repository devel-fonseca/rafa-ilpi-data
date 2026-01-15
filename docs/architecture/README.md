# 📐 Documentação de Arquitetura - Rafa ILPI

Esta pasta contém toda a documentação arquitetural do sistema Rafa ILPI.

## 📚 Índice de Documentos

### 🔒 Segurança e Isolamento

- **[MULTI-TENANT-ISOLATION.md](./MULTI-TENANT-ISOLATION.md)** ⭐
  - Arquitetura completa de isolamento de dados
  - Schema-per-tenant com PostgreSQL
  - Múltiplos tenants por usuário
  - Segurança em 4 camadas
  - Fluxos de registro e autenticação
  - **Status:** ✅ Implementado e Refatorado (Jan/2026)

- **[multi-tenancy.md](./multi-tenancy.md)**
  - Documentação técnica concisa
  - Padrões de acesso (TenantContextService)
  - 3 RED Rules (regras de segurança)
  - Exemplos de código práticos
  - **Status:** ✅ Atualizado (Jan/2026)

- **[MULTI-TENANT-VALIDATION.md](./MULTI-TENANT-VALIDATION.md)**
  - Ferramentas de validação ESLint
  - Scripts de detecção de violações
  - Guia de correção de problemas
  - **Status:** ✅ Implementado (Jan/2026)

### 🗄️ Banco de Dados

- **[database-schema.md](./database-schema.md)**
  - Estrutura de schemas PostgreSQL
  - Relacionamentos entre tabelas
  - Índices e otimizações
  - **Status:** 📝 A atualizar

### 🔐 Autenticação e Autorização

- **[authentication.md](./authentication.md)**
  - Fluxo de JWT
  - Sistema de roles e permissões
  - Refresh tokens
  - **Status:** 📝 A atualizar

### 📁 Armazenamento

- **[file-storage.md](./file-storage.md)**
  - Integração com MinIO
  - Organização de buckets por tenant
  - Upload e download de arquivos
  - **Status:** 📝 A atualizar

---

## 🎯 Decisões Arquiteturais Chave

### ✅ Aprovadas e Implementadas

1. **Schema-per-Tenant** (Nov/2025)
   - Cada ILPI tem schema PostgreSQL isolado
   - Máxima segurança e conformidade LGPD
   - Documento: [MULTI-TENANT-ISOLATION.md](./MULTI-TENANT-ISOLATION.md)

2. **TenantContextService (REQUEST Scope)** (Jan/2026)
   - Injeção automática do client correto
   - Eliminação de filtros `where: { tenantId }`
   - Impossível acessar dados de outro tenant
   - Documento: [multi-tenancy.md](./multi-tenancy.md)

3. **3 RED Rules (Zero Tolerance)** (Jan/2026)
   - RED 1: `this.prisma.<tenantModel>` é proibido
   - RED 2: Métodos públicos com `tenantId` como parâmetro são proibidos
   - RED 3: Misturar `tenantContext.client` com `this.prisma` sem motivo explícito é proibido
   - Validação: ESLint rules customizadas
   - Documento: [MULTI-TENANT-VALIDATION.md](./MULTI-TENANT-VALIDATION.md)

4. **JWT com TenantID** (Nov/2025)
   - Token sempre inclui tenantId
   - Impossível acessar dados de outro tenant
   - Interceptor global inicializa contexto
   - Documento: [MULTI-TENANT-ISOLATION.md](./MULTI-TENANT-ISOLATION.md)

5. **Registro vs Convite** (Nov/2025)
   - Auto-registro = criar ILPI (tenant)
   - Funcionários = adicionados pelo admin
   - Documento: [MULTI-TENANT-ISOLATION.md](./MULTI-TENANT-ISOLATION.md)

### 🔄 Em Discussão

_(Nenhuma no momento)_

### ❌ Rejeitadas

1. **Row-Level Security** (Nov/2025)
   - Motivo: Risco de vazamento por erro de código
   - Preferida: Schema-per-tenant

2. **Database per Tenant** (Nov/2025)
   - Motivo: Overhead operacional muito alto
   - Preferida: Schema-per-tenant

3. **Shared Schema com filtros tenantId** (Jan/2026)
   - Motivo: Impossível garantir isolamento 100%
   - Migrado para: Schema isolation completo

---

## 📊 Tech Stack

### Backend

- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 10
- **Linguagem:** TypeScript 5
- **Database:** PostgreSQL 16 (Multi-Schema)
- **ORM:** Prisma 5
- **Cache:** Redis 7
- **Queue:** BullMQ
- **Storage:** MinIO (S3-compatible)
- **Logging:** Winston
- **Auth:** JWT (access + refresh tokens)
- **Validation:** class-validator + class-transformer

### Frontend

- **Framework:** React 18
- **Build Tool:** Vite 5
- **Linguagem:** TypeScript 5
- **Styling:** Tailwind CSS 3
- **UI Components:** Shadcn/ui
- **Data Fetching:** TanStack Query v5
- **State Management:** Zustand
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts

### DevOps

- **Containers:** Docker + Docker Compose
- **Reverse Proxy:** Nginx
- **CI/CD:** GitHub Actions (futuro)
- **Monitoring:** (a definir)

---

## 🏗️ Estrutura de Schemas PostgreSQL

### Schema `public` (SHARED - 9 tabelas)

Dados globais do sistema SaaS:

- `tenants` - Registro de ILPIs cadastradas
- `plans` - Planos SaaS disponíveis
- `subscriptions` - Assinaturas ativas
- `service_contracts` - Contratos de adesão
- `contract_acceptances` - Registros de aceite jurídico
- `email_templates` - Templates globais de email
- `email_template_versions` - Versionamento de templates
- `tenant_messages` - Mensagens broadcast do sistema
- `webhook_events` - Eventos de integração (pagamentos, etc)

### Schemas por Tenant (ISOLATED - 66+ tabelas)

Cada tenant possui schema nomeado `tenant_{slug}_{hash}`:

**Módulos principais:**

- **Usuários:** `users`, `user_profiles`, `user_permissions`
- **Residentes:** `residents`, `resident_history`, `resident_emails`, `resident_contracts`
- **Estrutura:** `beds`, `rooms`, `floors`, `buildings`, `bed_status_history`
- **Medicações:** `medications`, `prescriptions`, `sos_medications`, `medication_administrations`
- **Prontuário:** `clinical_profiles`, `clinical_notes`, `vital_signs`, `daily_records`
- **Eventos:** `resident_scheduled_events`, `institutional_events`
- **Documentos:** `tenant_documents`, `resident_documents`, `document_categories`
- **POPs:** `pops`, `pop_categories`, `pop_templates`
- **Notificações:** `notifications`
- **Auditoria:** `audit_logs`

---

## 🔄 Histórico de Refatorações

### Jan/2026 - Refatoração Multi-Tenant Completa

**Problema:** 749 queries com `where: { tenantId }` + risco de vazamento de dados

**Solução:** Implementação de TenantContextService + refatoração de 56 services

**Resultados:**

- ✅ 0 violações de isolamento multi-tenant
- ✅ 0 queries com filtro `where: { tenantId }` em código de tenant
- ✅ Performance melhorada em 33% (queries diretas no schema)
- ✅ ESLint rules customizadas previnem novas violações
- ✅ 102 erros críticos corrigidos
- ✅ 16 violações de isolamento corrigidas

**Documentação:** Ver [MULTI-TENANT-ISOLATION.md](./MULTI-TENANT-ISOLATION.md) seção "Status de Implementação"

---

## 🔗 Links Úteis

- [README Principal](../../README.md)
- [Guia de Desenvolvimento](../WORKSPACE-GUIDE.md)
- [CHANGELOG](../../CHANGELOG.md)
- [TODO](../../TODO.md)

---

## 📝 Contribuindo com a Documentação

### Quando Atualizar

Atualize a documentação quando:

1. Adicionar nova feature arquitetural
2. Modificar padrões existentes
3. Tomar decisões arquiteturais importantes
4. Refatorar código significativo
5. Implementar novos módulos

### Como Atualizar

1. Edite o arquivo `.md` relevante
2. Atualize data de "Última atualização"
3. Adicione entrada no CHANGELOG.md
4. Atualize este README.md se necessário
5. Commit com mensagem descritiva: `docs(architecture): descrição`

### Padrões de Escrita

- Use Markdown com formatação consistente
- Inclua exemplos de código quando relevante
- Adicione diagramas Mermaid para fluxos complexos
- Mantenha tom técnico mas acessível
- Priorize clareza sobre concisão

---

**Última atualização:** 15/01/2026
**Responsável:** Dr. Emanuel
