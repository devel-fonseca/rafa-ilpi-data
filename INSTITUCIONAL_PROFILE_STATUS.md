# Status de Implementação: Módulo de Perfil Institucional

**Data:** 27/11/2024
**Desenvolvedor:** Claude Code
**Solicitante:** Dr. E. (Emanuel) - Rafa Labs

---

## ✅ BACKEND - 100% CONCLUÍDO

### 1. Database Schema & Migration
**Arquivos:**
- `apps/backend/prisma/schema.prisma` (linhas 965-1077)
- `apps/backend/prisma/migrations/20251127000000_add_institutional_profile/migration.sql`

**Models criados:**
- ✅ `TenantProfile` - Perfil institucional (1:1 com Tenant)
- ✅ `TenantDocument` - Documentos regulatórios (N:1 com Tenant)

**Enums criados:**
- ✅ `LegalNature` (ASSOCIACAO, FUNDACAO, EMPRESA_PRIVADA, MEI)
- ✅ `DocumentStatus` (OK, PENDENTE, VENCENDO, VENCIDO)

**Status:** ✅ Migração aplicada e Prisma Client gerado

---

### 2. Configuração de Requisitos
**Arquivo:** `apps/backend/src/institutional-profile/config/document-requirements.config.ts`

**Funcionalidades:**
- ✅ Mapeamento de documentos obrigatórios por natureza jurídica
- ✅ Labels amigáveis para tipos de documento
- ✅ Funções auxiliares: `getRequiredDocuments()`, `getDocumentLabel()`, `isDocumentRequired()`
- ✅ Validação de tipos de arquivo permitidos
- ✅ Limite de tamanho (10MB)

---

### 3. DTOs
**Arquivos:** `apps/backend/src/institutional-profile/dto/`

- ✅ `create-tenant-profile.dto.ts` - Validações com class-validator
- ✅ `update-tenant-profile.dto.ts` - PartialType do create
- ✅ `create-tenant-document.dto.ts`
- ✅ `update-tenant-document.dto.ts`
- ✅ `index.ts` - Exports

---

### 4. Service
**Arquivo:** `apps/backend/src/institutional-profile/institutional-profile.service.ts` (437 linhas)

**Métodos implementados:**

**Perfil:**
- ✅ `getProfile(tenantId)` - Busca perfil
- ✅ `createOrUpdateProfile(tenantId, dto)` - Upsert
- ✅ `uploadLogo(tenantId, file)` - Upload S3 + update

**Documentos:**
- ✅ `getDocuments(tenantId, filters)` - Lista com filtros
- ✅ `getDocument(tenantId, documentId)` - Busca específico
- ✅ `uploadDocument(tenantId, userId, file, dto)` - Upload + validações
- ✅ `updateDocumentMetadata(documentId, dto)` - Atualiza metadados
- ✅ `replaceDocumentFile(documentId, file)` - Substitui arquivo
- ✅ `deleteDocument(documentId)` - Soft delete + remove S3

**Compliance:**
- ✅ `getComplianceDashboard(tenantId)` - Estatísticas completas
- ✅ `updateDocumentsStatus()` - Atualiza status (cron job)

**Lógica de negócio:**
- ✅ Cálculo automático de status baseado em data de vencimento
- ✅ Validação de tipo de arquivo
- ✅ Validação de tamanho
- ✅ Integração com FilesService (S3/MinIO)
- ✅ Isolamento multi-tenant

---

### 5. Controller
**Arquivo:** `apps/backend/src/institutional-profile/institutional-profile.controller.ts` (267 linhas)

**Endpoints:**

```
GET    /institutional-profile              - Obter perfil
POST   /institutional-profile              - Criar/atualizar perfil
POST   /institutional-profile/logo         - Upload logo

GET    /institutional-profile/documents    - Listar documentos (com filtros)
GET    /institutional-profile/documents/:id - Buscar documento
POST   /institutional-profile/documents    - Upload documento
PATCH  /institutional-profile/documents/:id - Atualizar metadados
POST   /institutional-profile/documents/:id/file - Substituir arquivo
DELETE /institutional-profile/documents/:id - Deletar documento

GET    /institutional-profile/compliance   - Dashboard de compliance
GET    /institutional-profile/requirements/:legalNature - Documentos obrigatórios
POST   /institutional-profile/update-statuses - Atualizar status (admin)
```

**Segurança:**
- ✅ Guards: JwtAuthGuard, RolesGuard
- ✅ Decorators: @CurrentUser('tenantId'), @Roles('admin', 'user')
- ✅ Auditoria: @AuditEntity, @AuditAction, AuditInterceptor
- ✅ Validação de upload: ParseFilePipeBuilder

---

### 6. Module
**Arquivo:** `apps/backend/src/institutional-profile/institutional-profile.module.ts`

- ✅ Importa PrismaModule e FilesModule
- ✅ Registra Controller e Service
- ✅ Exporta Service

**Registro no AppModule:**
- ✅ `apps/backend/src/app.module.ts` (linha 66)

---

## ✅ FRONTEND - 60% CONCLUÍDO

### 1. API Client
**Arquivo:** `apps/frontend/src/api/institutional-profile.api.ts`

**Tipos TypeScript:**
- ✅ `LegalNature`, `DocumentStatus`
- ✅ `TenantProfile`, `TenantDocument`
- ✅ `ComplianceDashboard`, `DocumentRequirement`
- ✅ DTOs: `CreateTenantProfileDto`, `UpdateTenantProfileDto`, etc.

**Classe InstitutionalProfileAPI:**
- ✅ `getProfile()`
- ✅ `createOrUpdateProfile(data)`
- ✅ `uploadLogo(file)`
- ✅ `getDocuments(filters)`
- ✅ `getDocument(id)`
- ✅ `uploadDocument(file, metadata)`
- ✅ `updateDocumentMetadata(id, data)`
- ✅ `replaceDocumentFile(id, file)`
- ✅ `deleteDocument(id)`
- ✅ `getComplianceDashboard()`
- ✅ `getDocumentRequirements(legalNature)`
- ✅ `updateDocumentsStatus()`

---

### 2. React Query Hooks
**Arquivo:** `apps/frontend/src/hooks/useInstitutionalProfile.ts`

**Hooks implementados:**
- ✅ `useProfile()` - Query perfil
- ✅ `useUpdateProfile()` - Mutation atualizar
- ✅ `useUploadLogo()` - Mutation upload logo
- ✅ `useDocuments(filters)` - Query lista documentos
- ✅ `useDocument(id)` - Query documento específico
- ✅ `useUploadDocument()` - Mutation upload
- ✅ `useUpdateDocumentMetadata()` - Mutation atualizar
- ✅ `useReplaceDocumentFile()` - Mutation substituir
- ✅ `useDeleteDocument()` - Mutation deletar
- ✅ `useComplianceDashboard()` - Query dashboard
- ✅ `useDocumentRequirements(legalNature)` - Query requisitos
- ✅ `useUpdateDocumentsStatus()` - Mutation atualizar status

**Query Keys definidas:**
- ✅ Sistema hierárquico de invalidação de cache

---

### 3. Páginas Implementadas
**Diretório:** `apps/frontend/src/pages/institutional-profile/`

#### ✅ InstitutionalProfile.tsx
- Container principal com Tabs
- 3 abas: Dados Básicos, Documentos, Compliance

#### ✅ ProfileForm.tsx (completo)
- Upload de logo com preview
- Select de natureza jurídica
- Campos: tradeName, CNES, capacidades, contatos
- Data de fundação
- Missão, Visão, Valores
- Observações
- React Hook Form + Zod validation
- Estados de loading e erro
- Toast notifications

---

## ❌ FRONTEND - PENDENTE (40%)

### 4. Componentes a Criar

#### DocumentsTab.tsx
**Funcionalidades necessárias:**
- Tabela com colunas: Tipo, Arquivo, Emissão, Validade, Status, Ações
- Badge colorido por status (OK=verde, VENCENDO=amarelo, VENCIDO=vermelho, PENDENTE=cinza)
- Filtros: tipo, status
- Botão "Novo Documento" (abre modal)
- Ações por linha: Download, Editar, Excluir
- Estados de loading/empty

**Componentes UI necessários:**
- Table (já existe)
- Badge (já existe)
- DropdownMenu (já existe)
- Dialog (para confirmação de exclusão)

---

#### DocumentUploadModal.tsx
**Funcionalidades necessárias:**
- Dialog com formulário
- Select de tipo de documento (filtrado por legalNature do perfil)
- FileUpload component
- DatePicker para issuedAt e expiresAt
- Textarea para notes
- Validação: tipos permitidos (PDF, JPG, PNG), tamanho máx 10MB
- Preview do arquivo selecionado
- Estados de upload (progress, success, error)

**Estrutura:**
```tsx
<Dialog>
  <DialogContent>
    <form>
      <Select type />
      <FileUpload />
      <DatePicker issuedAt />
      <DatePicker expiresAt />
      <Textarea notes />
      <Button submit />
    </form>
  </DialogContent>
</Dialog>
```

---

#### ComplianceTab.tsx
**Funcionalidades necessárias:**

1. **Cards de Estatísticas** (grid 5 colunas):
   - Total de documentos
   - Documentos OK
   - Vencendo (< 30 dias)
   - Vencidos
   - Pendentes

2. **Lista de Documentos Obrigatórios:**
   - Checkbox visual (✓ ou ✗)
   - Nome do documento
   - Status (OK, Pendente, Vencendo, Vencido)
   - Ação: Upload (se pendente) ou Visualizar

3. **Alertas:**
   - Card com lista de documentos vencidos/vencendo
   - Badge de urgência
   - Link para aba de documentos

4. **Progresso de Compliance:**
   - Barra de progresso (compliancePercentage)
   - Texto: "X de Y documentos obrigatórios enviados"

**Componentes UI necessários:**
- Card (já existe)
- Badge (já existe)
- Progress (pode precisar criar ou usar Alert)
- Alert (já existe)

---

### 5. Integração de Rotas

**Arquivo a modificar:** `apps/frontend/src/routes/index.tsx`

**Adicionar:**
```tsx
{
  path: 'perfil-institucional',
  element: <InstitutionalProfile />
}
```

---

### 6. Menu de Navegação

**Arquivo a modificar:** `apps/frontend/src/layouts/DashboardLayout.tsx`

**Adicionar item:**
```tsx
{
  icon: Building2,
  label: 'Perfil Institucional',
  href: '/dashboard/perfil-institucional'
}
```

Ou com submenu:
```tsx
{
  icon: Building2,
  label: 'Perfil Institucional',
  items: [
    { label: 'Dados', href: '/dashboard/perfil-institucional' },
    { label: 'Documentos', href: '/dashboard/perfil-institucional?tab=documents' },
    { label: 'Compliance', href: '/dashboard/perfil-institucional?tab=compliance' }
  ]
}
```

---

## 📋 CHECKLIST PARA PRÓXIMA SESSÃO

### Prioridade ALTA
- [ ] Criar `DocumentsTab.tsx` (listagem e CRUD de documentos)
- [ ] Criar `DocumentUploadModal.tsx` (upload com validações)
- [ ] Criar `ComplianceTab.tsx` (dashboard de conformidade)
- [ ] Adicionar rota em `routes/index.tsx`
- [ ] Adicionar item no menu `DashboardLayout.tsx`

### Prioridade MÉDIA
- [ ] Testar upload de logo
- [ ] Testar upload de documento
- [ ] Testar cálculo de status automático
- [ ] Verificar responsividade mobile
- [ ] Adicionar loading skeletons

### Prioridade BAIXA (Melhorias futuras)
- [ ] Adicionar gráfico de compliance (Chart.js ou Recharts)
- [ ] Exportar relatório de compliance em PDF
- [ ] Notificações de documentos vencendo (push/email)
- [ ] Histórico de versões de documentos
- [ ] Assinatura digital de documentos

---

## 🧪 TESTES SUGERIDOS

### Backend
```bash
# Endpoints a testar via Postman/Insomnia:

# 1. Criar perfil
POST /api/institutional-profile
Body: { legalNature: "ASSOCIACAO", tradeName: "Casa Lar ILPI" }

# 2. Upload logo
POST /api/institutional-profile/logo
Body: FormData { file: logo.png }

# 3. Upload documento
POST /api/institutional-profile/documents
Body: FormData {
  file: estatuto.pdf,
  type: "ESTATUTO",
  issuedAt: "2024-01-01",
  expiresAt: "2029-01-01"
}

# 4. Dashboard compliance
GET /api/institutional-profile/compliance

# 5. Requisitos por natureza
GET /api/institutional-profile/requirements/ASSOCIACAO
```

### Frontend
```bash
# Acessar após adicionar rota:
http://localhost:5173/dashboard/perfil-institucional

# Testar:
1. Formulário de perfil (salvar, cancelar, validações)
2. Upload de logo (arquivo grande, tipo inválido, sucesso)
3. Aba de documentos (quando implementada)
4. Aba de compliance (quando implementada)
```

---

## 📚 DOCUMENTAÇÃO DE REFERÊNCIA

### Documentos lidos:
- `docs/ideias/perfil_institucional.txt` - Requisitos principais
- `docs/ideias/perfil_institucional_telas.txt` - Mockups HTML das telas

### Padrões seguidos:
- Backend: NestJS modular, Prisma ORM, Guards multi-tenant, Auditoria
- Frontend: React + TypeScript, React Hook Form + Zod, TanStack Query, Shadcn/ui

### Commits sugeridos:
```bash
git add .
git commit -m "feat: implementar backend completo do módulo de perfil institucional

- Adicionar models TenantProfile e TenantDocument no Prisma
- Criar migração com enums LegalNature e DocumentStatus
- Implementar InstitutionalProfileService com CRUD completo
- Adicionar endpoints REST no InstitutionalProfileController
- Configurar requisitos de documentos por natureza jurídica
- Integrar upload S3/MinIO para logos e documentos
- Implementar dashboard de compliance com estatísticas
- Adicionar validações e auditoria

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git commit -m "feat: implementar frontend parcial do perfil institucional

- Criar API client TypeScript com tipos completos
- Implementar hooks React Query personalizados
- Adicionar página principal com Tabs
- Criar ProfileForm completo com upload de logo
- Configurar validações com React Hook Form + Zod

Pendente: DocumentsTab, ComplianceTab, modal upload, rotas, menu

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🎯 OBJETIVO FINAL

Sistema completo de gerenciamento de perfil institucional para ILPIs que:

✅ Permite cadastrar dados da instituição (natureza jurídica, capacidades, contatos)
✅ Faz upload e gerencia logo institucional
⏳ Gerencia documentos regulatórios obrigatórios por tipo de instituição
⏳ Calcula automaticamente status de documentos (OK, Vencendo, Vencido)
⏳ Apresenta dashboard de compliance com alertas
✅ Integra com S3/MinIO para armazenamento
✅ Garante segurança multi-tenant
✅ Registra auditoria de todas as operações

---

**Desenvolvido por:** Claude Code (Anthropic)
**Para:** Rafa Labs - Sistema ILPI
**Contato:** Dr. Emanuel (CEO / Product Owner)
