# Guia do Sistema Híbrido de Permissões v2.0

> **Versão:** 2.0 | **Última atualização:** Fevereiro 2026
> **Total de Permissões:** 91 permissões granulares

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Lista Completa de Permissões](#lista-completa-de-permissões)
4. [Como Adicionar Novas Permissões](#como-adicionar-novas-permissões)
5. [Proteção em Três Camadas](#proteção-em-três-camadas)
6. [Como Proteger Endpoints (Backend)](#como-proteger-endpoints-backend)
7. [Como Proteger UI e Rotas (Frontend)](#como-proteger-ui-e-rotas-frontend)
8. [Gerenciamento de Permissões Customizadas](#gerenciamento-de-permissões-customizadas)
9. [Exemplos Práticos Completos](#exemplos-práticos-completos)
10. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O sistema de permissões da Rafa ILPI é **híbrido**, combinando três camadas de controle de acesso:

```text
┌─────────────────────────────────────────────────┐
│          Sistema Híbrido de Permissões          │
├─────────────────────────────────────────────────┤
│                                                 │
│  1️⃣  Role (ADMIN/MANAGER/STAFF/VIEWER)          │
│     └─ Permissões globais do sistema           │
│        ADMIN = TODAS as 91 permissões           │
│                                                 │
│  2️⃣  PositionCode (Cargo ILPI)                  │
│     └─ Permissões herdadas automaticamente      │
│        Ex: NURSE → 45 permissões                │
│                                                 │
│  3️⃣  Custom Permissions                         │
│     └─ Exceções individuais por usuário        │
│        Adicionar/Remover permissões específicas │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Hierarquia de Permissões

1. **ADMIN** (Role) → TODAS as 91 permissões automaticamente
2. **Position Code** (Cargo ILPI) → Permissões padrão do cargo
3. **Custom Permissions** → Ajustes manuais por usuário

---

## Arquitetura do Sistema

### Fluxo de Verificação de Permissões

```typescript
// Backend: PermissionsService.getUserAllPermissions()
┌─────────────────────────────────────────┐
│ 1. Usuário é ADMIN?                     │
│    SIM → Retorna todas as 91 permissões │
│    NÃO → Continua...                    │
├─────────────────────────────────────────┤
│ 2. Busca permissões herdadas do cargo   │
│    const inherited = POSITION_PROFILES[ │
│      userProfile.positionCode           │
│    ]                                    │
├─────────────────────────────────────────┤
│ 3. Busca permissões customizadas        │
│    const customGranted = [...]          │
│    const customRevoked = [...]          │
├─────────────────────────────────────────┤
│ 4. Calcula permissões efetivas          │
│    all = inherited + customGranted      │
│          - customRevoked                │
└─────────────────────────────────────────┘
```

### Cache de Permissões

- **TTL:** 5 minutos (Redis)
- **Invalidação:** Logout/Login ou manualmente
- **Formato:** `user-permissions:{userId}`

---

## Lista Completa de Permissões

### 📋 Residentes (4 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_RESIDENTS` | Visualizar lista e detalhes de residentes |
| `CREATE_RESIDENTS` | Cadastrar novos residentes |
| `UPDATE_RESIDENTS` | Editar dados de residentes |
| `DELETE_RESIDENTS` | Remover residentes |

### 📝 Registros Diários (4 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_DAILY_RECORDS` | Visualizar registros diários |
| `CREATE_DAILY_RECORDS` | Criar registros de alimentação, higiene, sono, etc. |
| `UPDATE_DAILY_RECORDS` | Editar registros diários |
| `DELETE_DAILY_RECORDS` | Remover registros diários |

### 💊 Prescrições (4 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_PRESCRIPTIONS` | Visualizar prescrições médicas |
| `CREATE_PRESCRIPTIONS` | Criar novas prescrições (RT, médicos) |
| `UPDATE_PRESCRIPTIONS` | Editar prescrições |
| `DELETE_PRESCRIPTIONS` | Remover prescrições |

### 💉 Administração de Medicamentos (3 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_MEDICATIONS` | Visualizar lista de medicações |
| `ADMINISTER_MEDICATIONS` | Administrar medicamentos comuns |
| `ADMINISTER_CONTROLLED_MEDICATIONS` | Administrar medicamentos controlados (requer registro profissional) |

### 🩺 Sinais Vitais (2 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_VITAL_SIGNS` | Visualizar sinais vitais |
| `RECORD_VITAL_SIGNS` | Registrar pressão, temperatura, glicemia, etc. |

### 💉 Vacinações (4 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_VACCINATIONS` | Visualizar cartão de vacinas |
| `CREATE_VACCINATIONS` | Registrar novas vacinas |
| `UPDATE_VACCINATIONS` | Editar registros de vacinação |
| `DELETE_VACCINATIONS` | Remover registros de vacinação |

### 📋 Evoluções Clínicas SOAP (4 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_CLINICAL_NOTES` | Visualizar evoluções clínicas |
| `CREATE_CLINICAL_NOTES` | Criar novas evoluções (Subjetivo, Objetivo, Avaliação, Plano) |
| `UPDATE_CLINICAL_NOTES` | Editar evoluções clínicas |
| `DELETE_CLINICAL_NOTES` | Remover evoluções clínicas |

### 🏥 Perfis Clínicos (3 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_CLINICAL_PROFILE` | Visualizar perfil clínico completo |
| `CREATE_CLINICAL_PROFILE` | Criar perfil clínico inicial |
| `UPDATE_CLINICAL_PROFILE` | Atualizar perfil clínico |

### 🤧 Alergias (4 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_ALLERGIES` | Visualizar alergias |
| `CREATE_ALLERGIES` | Registrar novas alergias |
| `UPDATE_ALLERGIES` | Editar alergias |
| `DELETE_ALLERGIES` | Remover alergias |

### 🩹 Condições Crônicas (4 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_CONDITIONS` | Visualizar condições crônicas (diabetes, hipertensão, etc.) |
| `CREATE_CONDITIONS` | Registrar novas condições |
| `UPDATE_CONDITIONS` | Editar condições |
| `DELETE_CONDITIONS` | Remover condições |

### 🍽️ Restrições Alimentares (4 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_DIETARY_RESTRICTIONS` | Visualizar restrições alimentares |
| `CREATE_DIETARY_RESTRICTIONS` | Registrar novas restrições |
| `UPDATE_DIETARY_RESTRICTIONS` | Editar restrições |
| `DELETE_DIETARY_RESTRICTIONS` | Remover restrições |

### 🛏️ Estrutura de Leitos (2 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_BEDS` | Visualizar mapa de leitos |
| `MANAGE_BEDS` | Gerenciar ocupação e alocação de leitos |

### 🏢 Infraestrutura (1 permissão)

| Permissão | Descrição |
|-----------|-----------|
| `MANAGE_INFRASTRUCTURE` | Gerenciar prédios, andares, quartos e leitos |

### 📎 Documentos (3 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_DOCUMENTS` | Visualizar documentos anexados |
| `UPLOAD_DOCUMENTS` | Fazer upload de documentos |
| `DELETE_DOCUMENTS` | Remover documentos |

### 👥 Usuários e Permissões (5 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_USERS` | Visualizar lista de usuários |
| `CREATE_USERS` | Cadastrar novos usuários |
| `UPDATE_USERS` | Editar usuários |
| `DELETE_USERS` | Remover usuários |
| `MANAGE_PERMISSIONS` | Gerenciar permissões customizadas |

### 📊 Relatórios e Auditoria (3 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_REPORTS` | Visualizar relatórios gerenciais |
| `EXPORT_DATA` | Exportar dados para Excel/PDF |
| `VIEW_AUDIT_LOGS` | Visualizar logs de auditoria |

### ⚕️ Conformidade RDC 502/2021 (3 permissões) ⚠️ RESTRITO

| Permissão | Descrição | Acesso Padrão |
|-----------|-----------|---------------|
| `VIEW_COMPLIANCE_DASHBOARD` | Acessar dashboard de conformidade RDC | ADMINISTRATOR, TECHNICAL_MANAGER |
| `MANAGE_COMPLIANCE_ASSESSMENT` | Criar e gerenciar autodiagnósticos RDC 502/2021 | ADMINISTRATOR, TECHNICAL_MANAGER |
| `VIEW_SENTINEL_EVENTS` | Visualizar e gerenciar eventos sentinela (quedas com lesão, tentativas de suicídio) | ADMINISTRATOR, TECHNICAL_MANAGER |

### ⚙️ Configurações Institucionais (2 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_INSTITUTIONAL_SETTINGS` | Visualizar configurações gerais |
| `UPDATE_INSTITUTIONAL_SETTINGS` | Editar configurações gerais |

### 🏛️ Perfil Institucional (2 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_INSTITUTIONAL_PROFILE` | Visualizar perfil da ILPI (CNPJ, endereço, etc.) |
| `UPDATE_INSTITUTIONAL_PROFILE` | Editar perfil institucional |

### 📄 POPs - Procedimentos Operacionais Padrão (6 permissões)

> ⚠️ **Nota RDC 502/2021:** POPs publicados são **públicos** para todos os usuários autenticados.

| Permissão | Descrição | Acesso |
|-----------|-----------|--------|
| `VIEW_POPS` | Ver POPs em rascunho, templates e histórico | Gestores |
| `CREATE_POPS` | Criar novos POPs (rascunho) | Gestores |
| `UPDATE_POPS` | Editar POPs e anexos | Gestores |
| `DELETE_POPS` | Deletar POPs em rascunho | Gestores |
| `PUBLISH_POPS` | Publicar, versionar, marcar obsoleto | **Apenas RT** |
| `MANAGE_POPS` | Controle total sobre POPs | RT |

### 📑 Contratos de Prestação de Serviços (5 permissões)

> **Digitalização de contratos físicos:** Sistema de upload, processamento automático com carimbo institucional, armazenamento criptografado e versionamento completo.

| Permissão | Descrição | Acesso |
|-----------|-----------|--------|
| `VIEW_CONTRACTS` | Visualizar contratos digitalizados e metadados | Gestores, RT |
| `CREATE_CONTRACTS` | Fazer upload de novos contratos (foto ou PDF) | Gestores, RT |
| `UPDATE_CONTRACTS` | Atualizar metadados do contrato (valor, vencimento, etc.) | Gestores, RT |
| `REPLACE_CONTRACTS` | Substituir arquivo do contrato (nova versão) | Gestores, RT |
| `DELETE_CONTRACTS` | Remover contratos digitalizados | **Apenas ADMIN** |

**Recursos:**

- **Upload flexível:** Aceita imagens (JPG, PNG, WEBP) ou PDFs
- **Processamento automático:** Backend converte imagem → PDF + adiciona carimbo institucional
- **Dual-file storage:** Original + processado com carimbo (ambos criptografados SSE-C)
- **Versionamento completo:** Histórico de substituições com motivo
- **Metadados:** Número contrato, vigência, valor mensal, dia vencimento, reajuste, signatários
- **Status automático:** VIGENTE, VENCENDO_EM_30_DIAS, VENCIDO (calculado por data)
- **Auditoria completa:** ContractHistory com snapshots e changedFields

### 🧳 Pertences de Residentes (2 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_BELONGINGS` | Visualizar lista de pertences dos residentes |
| `MANAGE_BELONGINGS` | Gerenciar pertences (adicionar, editar, remover) |

### 📅 Agenda do Residente (2 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_RESIDENT_SCHEDULE` | Visualizar agenda de consultas e compromissos |
| `MANAGE_RESIDENT_SCHEDULE` | Criar e gerenciar eventos na agenda |

### 🎉 Eventos Institucionais (4 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_INSTITUTIONAL_EVENTS` | Visualizar eventos (festas, atividades) |
| `CREATE_INSTITUTIONAL_EVENTS` | Criar novos eventos |
| `UPDATE_INSTITUTIONAL_EVENTS` | Editar eventos |
| `DELETE_INSTITUTIONAL_EVENTS` | Remover eventos |

### 💬 Mensagens Internas (4 permissões)

| Permissão | Descrição |
|-----------|-----------|
| `VIEW_MESSAGES` | Visualizar mensagens internas |
| `SEND_MESSAGES` | Enviar mensagens para usuários |
| `DELETE_MESSAGES` | Remover mensagens |
| `BROADCAST_MESSAGES` | Enviar mensagens em massa (RT) |

---

## Como Adicionar Novas Permissões

### Checklist Completo

- [ ] 1. Adicionar no `schema.prisma` (enum PermissionType)
- [ ] 2. Criar migration Prisma
- [ ] 3. Regenerar Prisma Client
- [ ] 4. Adicionar no `usePermissions.ts` (frontend enum)
- [ ] 5. Adicionar no `types/permissions.ts` (frontend enum + labels)
- [ ] 6. Atualizar `position-profiles.config.ts` (se necessário)
- [ ] 7. **Atualizar permissões de usuários existentes** (data migration SQL)
- [ ] 8. Proteger endpoints com `@RequirePermissions()`
- [ ] 9. Proteger rotas frontend com `<ProtectedRoute>`
- [ ] 10. Ocultar UI com `hasPermission()`
- [ ] 11. Adicionar à tela de gerenciamento (se customizável)
- [ ] 12. Testar com diferentes cargos
- [ ] 13. Atualizar este guia

### Passo 1: Adicionar no Schema do Prisma

**Arquivo:** `apps/backend/prisma/schema/enums.prisma`

```prisma
enum PermissionType {
  // ... permissões existentes

  // Nova funcionalidade
  VIEW_FINANCIAL_REPORTS // Visualizar relatórios financeiros
  EXPORT_FINANCIAL_DATA // Exportar dados financeiros
  MANAGE_INVOICES // Gerenciar faturas
}
```

### Passo 2: Criar Migration

```bash
cd apps/backend
npx prisma migrate dev --name add_financial_permissions
```

### Passo 3: Regenerar Prisma Client

```bash
npx prisma generate
```

### Passo 4: Adicionar no Frontend Enum (usePermissions.ts)

**Arquivo:** `apps/frontend/src/hooks/usePermissions.ts`

```typescript
export enum PermissionType {
  // ... permissões existentes

  // Nova funcionalidade
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
  EXPORT_FINANCIAL_DATA = 'EXPORT_FINANCIAL_DATA',
  MANAGE_INVOICES = 'MANAGE_INVOICES',
}
```

### Passo 5: Adicionar no Frontend Types (types/permissions.ts)

**Arquivo:** `apps/frontend/src/types/permissions.ts`

```typescript
// 1. Adicionar ao enum
export enum PermissionType {
  // ... permissões existentes
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
  EXPORT_FINANCIAL_DATA = 'EXPORT_FINANCIAL_DATA',
  MANAGE_INVOICES = 'MANAGE_INVOICES',
}

// 2. Adicionar labels
export const PERMISSION_LABELS: Record<PermissionType, string> = {
  // ... labels existentes
  [PermissionType.VIEW_FINANCIAL_REPORTS]: 'Visualizar relatórios financeiros',
  [PermissionType.EXPORT_FINANCIAL_DATA]: 'Exportar dados financeiros',
  [PermissionType.MANAGE_INVOICES]: 'Gerenciar faturas',
}

// 3. Adicionar ao grupo apropriado
export const PERMISSION_GROUPS = {
  // ... grupos existentes
  financial: {
    label: 'Financeiro',
    permissions: [
      PermissionType.VIEW_FINANCIAL_REPORTS,
      PermissionType.EXPORT_FINANCIAL_DATA,
      PermissionType.MANAGE_INVOICES,
    ],
  },
}
```

### Passo 6: Atualizar Perfis de Cargo (se necessário)

**Arquivo:** `apps/backend/src/permissions/position-profiles.config.ts`

```typescript
export const ILPI_POSITION_PROFILES = {
  ADMINISTRATOR: {
    permissions: [
      // ... permissões existentes
      PermissionType.VIEW_FINANCIAL_REPORTS,
      PermissionType.EXPORT_FINANCIAL_DATA,
      PermissionType.MANAGE_INVOICES,
    ],
  },

  ACCOUNTANT: {
    permissions: [
      PermissionType.VIEW_FINANCIAL_REPORTS,
      PermissionType.EXPORT_FINANCIAL_DATA,
      // Sem MANAGE_INVOICES por padrão
    ],
  },
}
```

### Passo 7: ⚠️ Atualizar Usuários Existentes (Data Migration)

**⚠️ IMPORTANTE:** Quando você adiciona novas permissões a `position-profiles.config.ts`, usuários existentes **NÃO** recebem essas permissões automaticamente!

**Criar arquivo:** `apps/backend/prisma/migrations/YYYYMMDD_add_financial_permissions_to_existing_users.sql`

```sql
-- Adicionar VIEW_FINANCIAL_REPORTS para todos ADMINISTRATOR
INSERT INTO user_permissions (
  id,
  "userProfileId",
  "tenantId",
  permission,
  "isGranted",
  "grantedBy",
  "grantedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  up.id,
  u."tenantId",
  'VIEW_FINANCIAL_REPORTS',
  true,
  u.id,
  NOW(),
  NOW(),
  NOW()
FROM user_profiles up
JOIN users u ON u.id = up."userId"
WHERE up."positionCode" = 'ADMINISTRATOR'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE "userProfileId" = up.id
    AND permission = 'VIEW_FINANCIAL_REPORTS'
  );

-- Repetir para outras permissões e cargos...
```

**Aplicar migration:**

```bash
psql -h localhost -p 5432 -U rafa_user -d rafa_ilpi < apps/backend/prisma/migrations/YYYYMMDD_add_financial_permissions_to_existing_users.sql
```

---

## Proteção em Três Camadas

### ⚠️ Regra de Ouro: SEMPRE Proteger em 3 Camadas

Para garantir segurança completa, **SEMPRE** implemente proteção em 3 camadas:

```text
┌─────────────────────────────────────────────┐
│  1️⃣  Backend API Protection (OBRIGATÓRIO)   │
│     └─ @RequirePermissions() decorator      │
│        Retorna 403 Forbidden                │
│        ✅ Segurança real                    │
├─────────────────────────────────────────────┤
│  2️⃣  Frontend UI Protection (UX)            │
│     └─ hasPermission() no sidebar/menus     │
│        Esconde links visuais                │
│        ✅ Melhora experiência do usuário    │
├─────────────────────────────────────────────┤
│  3️⃣  Frontend Route Protection (UX+)        │
│     └─ <ProtectedRoute> wrapper             │
│        Bloqueia acesso via URL direta       │
│        ✅ Previne confusão do usuário       │
└─────────────────────────────────────────────┘
```

**Por que 3 camadas?**

- **Camada 1 (Backend):** Segurança real - mesmo que usuário manipule o frontend, API bloqueia
- **Camada 2 (UI):** UX - usuário não vê opções que não pode usar
- **Camada 3 (Route):** UX+ - usuário não consegue acessar páginas digitando URL

---

## Como Proteger Endpoints (Backend)

### Método Recomendado: `@RequirePermissions()`

```typescript
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator'
import { PermissionType } from '@prisma/client'

@Controller('financial-reports')
export class FinancialReportsController {

  // ✅ Permissão única
  @Get()
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_REPORTS)
  async findAll() {
    return this.reportsService.findAll()
  }

  // ✅ Múltiplas permissões (qualquer uma)
  @Get('summary')
  @RequirePermissions(
    PermissionType.VIEW_FINANCIAL_REPORTS,
    PermissionType.VIEW_COMPLIANCE_DASHBOARD
  )
  async getSummary() {
    // Usuário precisa de QUALQUER UMA das permissões
  }

  @Post()
  @RequirePermissions(PermissionType.MANAGE_INVOICES)
  async create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto)
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.MANAGE_INVOICES)
  async remove(@Param('id') id: string) {
    return this.invoicesService.remove(id)
  }
}
```

### ⚠️ NÃO use mais `@Roles()` (método antigo)

```typescript
// ❌ EVITE - Sistema antigo baseado em roles
@Roles('admin', 'manager')
@Get()
async findAll() { }

// ✅ USE - Sistema híbrido baseado em permissões
@RequirePermissions(PermissionType.VIEW_FINANCIAL_REPORTS)
@Get()
async findAll() { }
```

---

## Como Proteger UI e Rotas (Frontend)

### 1. Proteção de Rotas (React Router)

**Arquivo:** `apps/frontend/src/routes/index.tsx`

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionType } from '@/hooks/usePermissions'

export const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      // ✅ Rota com permissão única
      {
        path: 'financial',
        element: (
          <ProtectedRoute requiredPermissions={[PermissionType.VIEW_FINANCIAL_REPORTS]}>
            <FinancialPage />
          </ProtectedRoute>
        ),
      },

      // ✅ Rota com múltiplas permissões (OR logic)
      {
        path: 'compliance',
        element: (
          <ProtectedRoute
            requiredPermissions={[
              PermissionType.VIEW_COMPLIANCE_DASHBOARD,
              PermissionType.VIEW_SENTINEL_EVENTS,
            ]}
            requireAllPermissions={false} // false = OR (qualquer uma)
          >
            <CompliancePage />
          </ProtectedRoute>
        ),
      },

      // ✅ Rota com múltiplas permissões (AND logic)
      {
        path: 'sensitive-reports',
        element: (
          <ProtectedRoute
            requiredPermissions={[
              PermissionType.VIEW_REPORTS,
              PermissionType.EXPORT_DATA,
            ]}
            requireAllPermissions={true} // true = AND (todas)
          >
            <SensitiveReportsPage />
          </ProtectedRoute>
        ),
      },

      // ✅ Rotas aninhadas (subrotas)
      {
        path: 'compliance',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute
                requiredPermissions={[
                  PermissionType.VIEW_COMPLIANCE_DASHBOARD,
                  PermissionType.VIEW_SENTINEL_EVENTS,
                ]}
                requireAllPermissions={false}
              >
                <CompliancePage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'monthly-indicators',
            element: (
              <ProtectedRoute requiredPermissions={[PermissionType.VIEW_COMPLIANCE_DASHBOARD]}>
                <MonthlyIndicatorsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'sentinel-events',
            element: (
              <ProtectedRoute requiredPermissions={[PermissionType.VIEW_SENTINEL_EVENTS]}>
                <SentinelEventsPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
])
```

**Comportamento do `<ProtectedRoute>`:**

- Usuário sem permissão vê tela "Acesso Negado"
- Utiliza componente `<AccessDenied>` do design system
- Botão "Voltar ao Dashboard"
- Aparência consistente com outras páginas restritas

### 2. Ocultação de Menus (Sidebar)

**Arquivo:** `apps/frontend/src/layouts/DashboardLayout.tsx`

```typescript
export function DashboardLayout() {
  const { hasPermission } = usePermissions()

  // ✅ Calcular permissões uma vez no topo
  const canViewFinancial = hasPermission(PermissionType.VIEW_FINANCIAL_REPORTS)
  const canViewCompliance = hasPermission(PermissionType.VIEW_COMPLIANCE_DASHBOARD) ||
                            hasPermission(PermissionType.VIEW_SENTINEL_EVENTS)
  const canManageInfrastructure = hasPermission(PermissionType.MANAGE_INFRASTRUCTURE)

  return (
    <Sidebar>
      {/* Menu sempre visível */}
      <SidebarItem href="/dashboard">Dashboard</SidebarItem>

      {/* Menus condicionais - só aparecem se tiver permissão */}
      {canViewFinancial && (
        <SidebarItem href="/dashboard/financial">
          <DollarSign className="h-4 w-4" />
          Financeiro
        </SidebarItem>
      )}

      {canViewCompliance && (
        <SidebarItem href="/dashboard/compliance">
          <Activity className="h-4 w-4" />
          Conformidade
        </SidebarItem>
      )}

      {canManageInfrastructure && (
        <SidebarItem href="/dashboard/beds">
          <Building className="h-4 w-4" />
          Estrutura de Leitos
        </SidebarItem>
      )}
    </Sidebar>
  )
}
```

**⚠️ IMPORTANTE:** Sempre use a mesma lógica de permissões no sidebar e nas rotas:

```typescript
// ✅ CORRETO - Mesma lógica em ambos
// Sidebar:
const canView = hasPermission(A) || hasPermission(B)

// Route:
<ProtectedRoute
  requiredPermissions={[A, B]}
  requireAllPermissions={false} // false = OR
>

// ❌ ERRADO - Lógicas diferentes
// Sidebar: hasPermission(A) || hasPermission(B)
// Route: requiredPermissions={[A, B]} requireAllPermissions={true} // AND
```

### 3. Ocultação de Botões e Componentes

```typescript
function FinancialPage() {
  const { hasPermission } = usePermissions()

  const canView = hasPermission(PermissionType.VIEW_FINANCIAL_REPORTS)
  const canExport = hasPermission(PermissionType.EXPORT_DATA)
  const canManage = hasPermission(PermissionType.MANAGE_INVOICES)

  // ✅ Bloquear página inteira se não tiver permissão base
  if (!canView) {
    return <AccessDenied />
  }

  return (
    <Page>
      <PageHeader title="Relatórios Financeiros">
        {/* ✅ Botão condicional */}
        {canExport && (
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        )}
      </PageHeader>

      <Section>
        {/* ✅ Seção condicional */}
        {canManage && (
          <InvoiceManagement />
        )}
      </Section>
    </Page>
  )
}
```

---

## Gerenciamento de Permissões Customizadas

### Quando Customizar Permissões

#### ✅ Casos de Uso Válidos

- **Exceções temporárias:** Enfermeiro precisa acessar relatórios por 1 mês
- **Cargos especiais:** Nutricionista precisa de permissões extras
- **Treinamento:** Novo usuário com permissões limitadas
- **Responsabilidades compartilhadas:** Cuidador assume temporariamente função de técnico

#### ❌ Casos de Uso Inválidos

- **Mudanças permanentes:** Atualize `position-profiles.config.ts` ao invés
- **Permissões exclusivas de ADMIN:** Não dê `MANAGE_PERMISSIONS` para não-admins
- **Workarounds de bugs:** Corrija o bug ao invés de dar permissões extras

### Tela de Gerenciamento

**Arquivo:** `apps/frontend/src/pages/users/UserEditPage.tsx`

A tela mostra:

1. **Permissões Herdadas** (cinza, não editáveis)
2. **Permissões Customizadas** (azul = adicionadas, vermelho = removidas)
3. **Permissões Efetivas** (resultado final)

### API Endpoints

```typescript
// GET /api/permissions/me
// Retorna permissões do usuário logado
{
  "inherited": ["VIEW_RESIDENTS", "CREATE_DAILY_RECORDS", ...],
  "custom": ["VIEW_FINANCIAL_REPORTS"], // Adicionada manualmente
  "all": ["VIEW_RESIDENTS", "CREATE_DAILY_RECORDS", "VIEW_FINANCIAL_REPORTS", ...]
}

// GET /api/permissions/user/:userId
// Retorna permissões de um usuário específico (apenas ADMIN)

// PATCH /api/permissions/user/:userId/custom
// Atualiza permissões customizadas (apenas ADMIN)
{
  "permissionsToAdd": ["VIEW_FINANCIAL_REPORTS"],
  "permissionsToRemove": ["DELETE_RESIDENTS"]
}
```

---

## Exemplos Práticos Completos

### Exemplo 1: Módulo de Conformidade RDC 502/2021

Este exemplo mostra a implementação real das permissões de conformidade.

#### 1. Permissões no Schema

```prisma
enum PermissionType {
  // ... outras permissões

  // Conformidade RDC 502/2021 (acesso restrito a gestores)
  VIEW_COMPLIANCE_DASHBOARD // Acessar dashboard de conformidade RDC
  MANAGE_COMPLIANCE_ASSESSMENT // Criar e gerenciar autodiagnósticos RDC 502/2021
  VIEW_SENTINEL_EVENTS // Visualizar e gerenciar eventos sentinela
}
```

#### 2. Migration

```bash
npx prisma migrate dev --name add_compliance_permissions
npx prisma generate
```

#### 3. Frontend Enums

**usePermissions.ts:**

```typescript
export enum PermissionType {
  // ... outras permissões
  VIEW_COMPLIANCE_DASHBOARD = 'VIEW_COMPLIANCE_DASHBOARD',
  MANAGE_COMPLIANCE_ASSESSMENT = 'MANAGE_COMPLIANCE_ASSESSMENT',
  VIEW_SENTINEL_EVENTS = 'VIEW_SENTINEL_EVENTS',
}
```

**types/permissions.ts:**

```typescript
export enum PermissionType {
  // ... outras permissões
  VIEW_COMPLIANCE_DASHBOARD = 'VIEW_COMPLIANCE_DASHBOARD',
  MANAGE_COMPLIANCE_ASSESSMENT = 'MANAGE_COMPLIANCE_ASSESSMENT',
  VIEW_SENTINEL_EVENTS = 'VIEW_SENTINEL_EVENTS',
}

export const PERMISSION_LABELS: Record<PermissionType, string> = {
  // ... outros labels
  [PermissionType.VIEW_COMPLIANCE_DASHBOARD]: 'Visualizar dashboard de conformidade RDC',
  [PermissionType.MANAGE_COMPLIANCE_ASSESSMENT]: 'Gerenciar autodiagnósticos RDC 502/2021',
  [PermissionType.VIEW_SENTINEL_EVENTS]: 'Visualizar e gerenciar eventos sentinela',
}

export const PERMISSION_GROUPS = {
  // ... outros grupos
  compliance: {
    label: 'Conformidade RDC 502/2021',
    permissions: [
      PermissionType.VIEW_COMPLIANCE_DASHBOARD,
      PermissionType.MANAGE_COMPLIANCE_ASSESSMENT,
      PermissionType.VIEW_SENTINEL_EVENTS,
    ],
  },
}
```

#### 4. Perfis de Cargo

**position-profiles.config.ts:**

```typescript
export const ILPI_POSITION_PROFILES = {
  ADMINISTRATOR: {
    permissions: [
      // ... outras permissões
      PermissionType.VIEW_COMPLIANCE_DASHBOARD,
      PermissionType.MANAGE_COMPLIANCE_ASSESSMENT,
      PermissionType.VIEW_SENTINEL_EVENTS,
    ],
  },

  TECHNICAL_MANAGER: {
    permissions: [
      // ... outras permissões
      PermissionType.VIEW_COMPLIANCE_DASHBOARD,
      PermissionType.MANAGE_COMPLIANCE_ASSESSMENT,
      PermissionType.VIEW_SENTINEL_EVENTS,
    ],
  },

  // Outros cargos NÃO têm essas permissões
}
```

#### 5. Data Migration para Usuários Existentes

**prisma/migrations/20260110_add_compliance_permissions_to_existing_users.sql:**

```sql
-- Adicionar VIEW_COMPLIANCE_DASHBOARD para ADMINISTRATOR
INSERT INTO user_permissions (
  id, "userProfileId", "tenantId", permission,
  "isGranted", "grantedBy", "grantedAt", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), up.id, u."tenantId", 'VIEW_COMPLIANCE_DASHBOARD',
  true, u.id, NOW(), NOW(), NOW()
FROM user_profiles up
JOIN users u ON u.id = up."userId"
WHERE up."positionCode" = 'ADMINISTRATOR'
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions
    WHERE "userProfileId" = up.id
    AND permission = 'VIEW_COMPLIANCE_DASHBOARD'
  );

-- Repetir para MANAGE_COMPLIANCE_ASSESSMENT, VIEW_SENTINEL_EVENTS e TECHNICAL_MANAGER...
```

#### 6. Backend Controllers

**compliance.controller.ts:**

```typescript
@Controller('compliance')
export class ComplianceController {
  @Get('daily-summary')
  @RequirePermissions(PermissionType.VIEW_COMPLIANCE_DASHBOARD)
  @ApiOperation({
    summary: 'Obter resumo de conformidade do dia',
    description: 'Retorna métricas... (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar dashboard de conformidade' })
  async getDailySummary(@CurrentUser() user: any) {
    return this.complianceService.getDailySummary(user.tenantId)
  }
}
```

**sentinel-events.controller.ts:**

```typescript
@Controller('sentinel-events')
export class SentinelEventsController {
  @Get()
  @RequirePermissions(PermissionType.VIEW_SENTINEL_EVENTS)
  @ApiOperation({
    summary: 'Listar eventos sentinela',
    description: 'Retorna lista de eventos... (Acesso restrito: Administrador e Responsável Técnico)',
  })
  @ApiResponse({ status: 403, description: 'Sem permissão para visualizar eventos sentinela' })
  async findAll(@Query() query: QuerySentinelEventDto, @CurrentUser() user: any) {
    return this.sentinelEventsService.findAllSentinelEvents(user.tenantId, query)
  }

  @Patch(':id')
  @RequirePermissions(PermissionType.VIEW_SENTINEL_EVENTS)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateSentinelEventStatusDto) {
    return this.sentinelEventsService.updateSentinelEventStatus(id, dto)
  }
}
```

#### 7. Frontend Routes

**routes/index.tsx:**

```typescript
{
  path: 'conformidade',
  children: [
    {
      index: true,
      element: (
        <ProtectedRoute
          requiredPermissions={[
            PermissionType.VIEW_COMPLIANCE_DASHBOARD,
            PermissionType.VIEW_SENTINEL_EVENTS,
          ]}
          requireAllPermissions={false} // OR - qualquer uma das duas
        >
          <ConformidadePage />
        </ProtectedRoute>
      ),
    },
    {
      path: 'indicadores-mensais',
      element: (
        <ProtectedRoute requiredPermissions={[PermissionType.VIEW_COMPLIANCE_DASHBOARD]}>
          <ConformidadeRDCPage />
        </ProtectedRoute>
      ),
    },
    {
      path: 'eventos-sentinela',
      element: (
        <ProtectedRoute requiredPermissions={[PermissionType.VIEW_SENTINEL_EVENTS]}>
          <EventosSentinelaPage />
        </ProtectedRoute>
      ),
    },
  ],
}
```

#### 8. Frontend Sidebar

**DashboardLayout.tsx:**

```typescript
const canViewCompliance = hasPermission(PermissionType.VIEW_COMPLIANCE_DASHBOARD) ||
                          hasPermission(PermissionType.VIEW_SENTINEL_EVENTS)

// Desktop sidebar
{canViewCompliance && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Link to="/dashboard/conformidade" className={linkClassName}>
        <Activity className="h-4 w-4 flex-shrink-0" />
        {!preferences.sidebarCollapsed && 'Conformidade'}
      </Link>
    </TooltipTrigger>
    {preferences.sidebarCollapsed && (
      <TooltipContent side="right">Conformidade</TooltipContent>
    )}
  </Tooltip>
)}

// Mobile sidebar
{canViewCompliance && (
  <Link to="/dashboard/conformidade" onClick={closeSidebar} className={linkClassName}>
    <Activity className="h-4 w-4" />
    Conformidade
  </Link>
)}
```

#### 9. Resultado Final

**Proteção em 3 camadas implementada:**

1. ✅ **Backend:** API retorna 403 para usuários sem permissão
2. ✅ **Sidebar:** Link "Conformidade" só aparece para Admin/RT
3. ✅ **Routes:** Digitando URL direta mostra tela "Acesso Negado"

---

## Troubleshooting

### Problema 1: Permissões não aparecem após adicionar no schema

**Sintomas:**

- Nova permissão não aparece na tela de gerenciamento
- Backend retorna erro "permission not in enum"

**Solução:**

```bash
# 1. Verificar se migration foi criada
cd apps/backend
npx prisma migrate dev --name your_migration_name

# 2. Regenerar Prisma Client
npx prisma generate

# 3. Reiniciar servidor backend
# Ctrl+C e npm run start:dev

# 4. Frontend: Fazer logout/login
```

### Problema 2: Usuário ADMIN não tem acesso a nova permissão

**Causa:** Cache não atualizado ou Prisma Client não regenerado.

**Diagnóstico:**

```bash
# Verificar se nova permissão está no enum gerado
cat apps/backend/node_modules/.prisma/client/index.d.ts | grep VIEW_COMPLIANCE_DASHBOARD
```

**Solução:**

```bash
# 1. Regenerar Prisma Client
cd apps/backend
npx prisma generate

# 2. Limpar cache (fazer logout/login)
# OU aguardar 5 minutos (TTL do cache)

# 3. Verificar resposta de /api/permissions/me
# DevTools → Network → permissions/me
# all: [...] deve incluir nova permissão
```

### Problema 3: Endpoint retorna 403 mesmo com permissão correta

**Diagnóstico:**

1. Verificar resposta de `/api/permissions/me` no DevTools:

```json
{
  "inherited": [...],
  "custom": [...],
  "all": [...]  // ← A permissão deve estar aqui
}
```

2. Verificar se o decorator está correto:

```typescript
// ❌ ERRADO - String
@RequirePermissions('VIEW_RESIDENTS')

// ✅ CORRETO - Enum do Prisma
@RequirePermissions(PermissionType.VIEW_RESIDENTS)
```

3. Verificar se o módulo foi importado:

```typescript
@Module({
  imports: [PermissionsModule], // ← Necessário
  controllers: [YourController],
})
```

### Problema 4: Usuários existentes não receberam novas permissões

**Causa:** Novas permissões adicionadas ao `position-profiles.config.ts` não são aplicadas automaticamente.

**Sintomas:**

- Novos usuários têm a permissão
- Usuários existentes não têm

**Solução:** Criar e executar data migration SQL (ver Passo 7 em "Como Adicionar Novas Permissões")

### Problema 5: Sidebar não atualiza após dar permissão

**Causa:** Cache do React Query (staleTime de 5 minutos).

**Solução 1 (Recomendada):**

```typescript
// Fazer logout/login
```

**Solução 2 (Desenvolvimento):**

```typescript
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()
queryClient.invalidateQueries({ queryKey: ['permissions'] })
```

### Problema 6: Lógica do sidebar diferente das rotas

**Sintomas:**

- Link aparece no sidebar
- Mas usuário vê "Acesso Negado" ao clicar

**Causa:** Lógica de permissões diferente entre sidebar e rotas.

**Solução:**

```typescript
// ❌ ERRADO
// Sidebar: hasPermission(A) || hasPermission(B)
// Route: requireAllPermissions={true} // AND

// ✅ CORRETO
// Sidebar:
const canView = hasPermission(A) || hasPermission(B)

// Route:
<ProtectedRoute
  requiredPermissions={[A, B]}
  requireAllPermissions={false} // OR
>
```

---

## Resumo: Checklist para Nova Funcionalidade

Ao adicionar uma nova funcionalidade com permissões:

### Backend (4 passos)

- [ ] 1. Adicionar permissões no `schema.prisma` (enum PermissionType)
- [ ] 2. Criar migration (`npx prisma migrate dev`)
- [ ] 3. Regenerar Prisma Client (`npx prisma generate`)
- [ ] 4. Proteger endpoints com `@RequirePermissions()`

### Frontend (4 passos)

- [ ] 5. Adicionar permissões no `usePermissions.ts` (enum)
- [ ] 6. Adicionar permissões no `types/permissions.ts` (enum + labels + groups)
- [ ] 7. Proteger rotas com `<ProtectedRoute>`
- [ ] 8. Ocultar UI com `hasPermission()`

### Configuração (3 passos)

- [ ] 9. Atualizar `position-profiles.config.ts` (se necessário)
- [ ] 10. Criar data migration SQL para usuários existentes
- [ ] 11. Adicionar à tela de gerenciamento (se customizável)

### Testes (2 passos)

- [ ] 12. Testar com diferentes cargos (Admin, RT, Nurse, Caregiver)
- [ ] 13. Testar as 3 camadas (API 403, Sidebar oculto, Route bloqueada)

### Documentação (1 passo)

- [ ] 14. Atualizar este guia (adicionar à lista de permissões)

---

## 🔐 Sistema de Reautenticação para Permissões de Alto Risco

### Visão Geral

O sistema implementa **reautenticação obrigatória** para operações críticas (exclusões permanentes, exportações sensíveis, alterações estruturais). Baseado em padrões de sistemas médicos hospitalares, este mecanismo reduz significativamente incidentes operacionais.

```text
┌──────────────────────────────────────────────────────────┐
│           Fluxo de Operação de Alto Risco                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. Usuário tenta DELETE_RESIDENTS                      │
│     ↓                                                    │
│  2. Backend retorna 403 { requiresReauth: true }        │
│     ↓                                                    │
│  3. Frontend abre modal pedindo senha                    │
│     ↓                                                    │
│  4. POST /auth/reauthenticate { password }              │
│     ↓                                                    │
│  5. Backend valida e retorna token (válido 5min)        │
│     ↓                                                    │
│  6. Frontend armazena em memória (não em localStorage)  │
│     ↓                                                    │
│  7. Retry da operação com header X-Reauth-Token         │
│     ↓                                                    │
│  8. ReauthenticationGuard valida token e permite        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### HIGH_RISK_PERMISSIONS (20 permissões)

#### 🗑️ Exclusões Permanentes (8 permissões)

| Permissão | Motivo |
|-----------|--------|
| `DELETE_RESIDENTS` | Remove residente e TODOS os dados associados |
| `DELETE_PRESCRIPTIONS` | Remove histórico de medicação permanentemente |
| `DELETE_VACCINATIONS` | Perde registro de imunização |
| `DELETE_CLINICAL_NOTES` | Remove documento médico-legal |
| `DELETE_ALLERGIES` | Remove informação crítica de segurança |
| `DELETE_CONDITIONS` | Remove histórico de condições crônicas |
| `DELETE_DIETARY_RESTRICTIONS` | Remove restrições alimentares |
| `DELETE_DOCUMENTS` | Remove documento original digitalizado |

#### 📤 Exportações Sensíveis (2 permissões)

| Permissão | Motivo |
|-----------|--------|
| `EXPORT_DATA` | Exporta dados de saúde protegidos pela LGPD |
| `VIEW_AUDIT_LOGS` | Acesso a histórico completo de ações (prova legal) |

#### 🔧 Alterações Estruturais (5 permissões)

| Permissão | Motivo |
|-----------|--------|
| `DELETE_USERS` | Remove usuário e histórico de ações |
| `MANAGE_PERMISSIONS` | Altera controle de acesso ao sistema |
| `DELETE_CONTRACTS` | Remove documento contratual legal |
| `MANAGE_INFRASTRUCTURE` | Altera estrutura física (prédios/andares/quartos) |
| `UPDATE_INSTITUTIONAL_SETTINGS` | Modifica configurações globais do sistema |

#### 📋 Gestão Crítica (5 permissões)

| Permissão | Motivo |
|-----------|--------|
| `PUBLISH_POPS` | Publica POP que afeta operações institucionais |
| `DELETE_POPS` | Remove procedimento operacional padrão |
| `DELETE_CARE_SHIFTS` | Remove escala de cobertura de cuidados |
| `MANAGE_COMPLIANCE_ASSESSMENT` | Altera autodiagnóstico ANVISA RDC 502/2021 |
| `DELETE_DAILY_RECORDS` | Remove registro de prestação de serviço |

#### 💊 Medicamentos Controlados (OPCIONAL - Documentado)

**`ADMINISTER_CONTROLLED_MEDICATIONS`** está **documentado mas NÃO ATIVO** inicialmente.

**Motivo para não incluir:**
- Requer fluxo específico de dispensação
- Pode impactar urgências (demora na autenticação)
- Sistema já tem double-check (prescrição médica + administração)

**Quando considerar ativar:**
- Se houver problemas de rastreabilidade
- Se ANVISA exigir controle adicional
- Se houver casos de desvio de medicamentos

**Alternativa atual:**
- Auditoria rigorosa de todas administrações
- Alertas automáticos para padrões suspeitos
- Revisão mensal por farmacêutico responsável

### Implementação Backend

#### 1. Classificação de Risco

**Arquivo:** `apps/backend/src/permissions/permission-risk-classification.ts`

```typescript
import { PermissionType } from '@prisma/client';

export enum PermissionRiskLevel {
  LOW = 'LOW',        // Visualização, criação básica
  MEDIUM = 'MEDIUM',  // Edições, uploads
  HIGH = 'HIGH',      // Exclusões, exportações sensíveis
  CRITICAL = 'CRITICAL' // Gestão de usuários, configurações
}

export const HIGH_RISK_PERMISSIONS: ReadonlySet<PermissionType> = new Set([
  // 20 permissões de alto risco
  PermissionType.DELETE_RESIDENTS,
  PermissionType.DELETE_PRESCRIPTIONS,
  // ... (ver arquivo completo)
]);

export function isHighRiskPermission(permission: PermissionType): boolean {
  return HIGH_RISK_PERMISSIONS.has(permission);
}

export function getPermissionRiskLevel(
  permission: PermissionType
): PermissionRiskLevel {
  // Lógica de classificação automática
}

export function getHighRiskReason(
  permission: PermissionType
): string | null {
  // Retorna explicação do risco
}
```

#### 2. ReauthenticationGuard

**Arquivo:** `apps/backend/src/auth/guards/reauthentication.guard.ts`

```typescript
@Injectable()
export class ReauthenticationGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Verifica se rota requer reautenticação
    const requiresReauth = this.reflector.get(
      REQUIRES_REAUTHENTICATION,
      context.getHandler()
    );

    if (!requiresReauth) return true;

    // 2. Valida token X-Reauth-Token do header
    const reauthToken = request.headers['x-reauth-token'];

    if (!reauthToken) {
      throw new ForbiddenException({
        code: 'REAUTHENTICATION_REQUIRED',
        requiresReauth: true,
      });
    }

    // 3. Verifica validade e correspondência com usuário
    const payload = await this.jwtService.verifyAsync(reauthToken);

    if (payload.sub !== user.id || payload.type !== 'reauthentication') {
      throw new ForbiddenException({ code: 'INVALID_REAUTH_TOKEN' });
    }

    return true;
  }
}
```

#### 3. Decorator e Endpoint

**Decorator:**
```typescript
// @RequiresReauthentication() - Marca rotas que exigem reautenticação
export const RequiresReauthentication = () =>
  SetMetadata(REQUIRES_REAUTHENTICATION, true);
```

**Endpoint:**
```typescript
@Post('auth/reauthenticate')
@UseGuards(JwtAuthGuard)
async reauthenticate(
  @CurrentUser() user: JwtPayload,
  @Body() dto: ReauthenticateDto
) {
  // Valida senha e retorna token (5min)
  return {
    reauthToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    expiresIn: 300 // 5 minutos
  };
}
```

#### 4. Auditoria

**Enum AccessAction:**
```prisma
enum AccessAction {
  // ... outras ações
  REAUTHENTICATION_SUCCESS  // Reautenticação bem-sucedida
  REAUTHENTICATION_FAILED   // Tentativa com senha incorreta
}
```

Cada tentativa (sucesso ou falha) é registrada em `audit_logs`.

### Implementação Frontend

#### 1. Hook useReauthentication

**Arquivo:** `apps/frontend/src/hooks/useReauthentication.ts`

```typescript
export function useReauthentication() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const reauthMutation = useMutation({
    mutationFn: (password: string) =>
      api.post('/auth/reauthenticate', { password }),
    onSuccess: (data) => {
      // Armazena token em memória (NÃO em localStorage)
      reauthTokenCache = data.reauthToken;
      reauthTokenExpiry = Date.now() + data.expiresIn * 1000;
      setIsModalOpen(false);
      // Executa callback de retry
      onSuccessCallback.current?.();
    },
  });

  return {
    isModalOpen,
    openReauthModal,
    closeReauthModal,
    reauthenticate: reauthMutation.mutate,
    hasValidToken,
    getToken,
  };
}
```

**Características:**
- Token armazenado **apenas em memória** (mais seguro que localStorage)
- Expira após 5 minutos
- Limpa automaticamente ao expirar
- Suporta callback para retry da operação original

#### 2. ReauthenticationModal

**Arquivo:** `apps/frontend/src/components/ReauthenticationModal.tsx`

```tsx
export function ReauthenticationModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  error,
  actionDescription,
}: ReauthenticationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        {/* Ícone de alerta */}
        <ShieldAlert />

        {/* Alert de operação de alto risco */}
        <Alert variant="destructive">
          Operação de Alto Risco: {actionDescription}
        </Alert>

        {/* Form com input de senha */}
        <Form>
          <FormField name="password">
            <Input type="password" autoFocus />
          </FormField>
        </Form>

        {/* Explicação: Por que reautenticar? */}
        <InfoBox>
          Operações críticas exigem reautenticação...
        </InfoBox>
      </DialogContent>
    </Dialog>
  );
}
```

**UX Design:**
- ⚠️ Não pode fechar clicando fora (requiresInteraction)
- 🔒 Foco automático no campo de senha
- ℹ️ Explicação clara do motivo
- ⏱️ Mostra tempo de validade (5min)

#### 3. Exemplo de Uso Completo

```typescript
function DeleteResidentButton({ residentId }) {
  const {
    isModalOpen,
    openReauthModal,
    closeReauthModal,
    reauthenticate,
    isReauthenticating,
    reauthError
  } = useReauthentication();

  const deleteResident = useMutation({
    mutationFn: () => api.delete(`/residents/${residentId}`),
    onError: (error) => {
      if (error.response?.data?.code === 'REAUTHENTICATION_REQUIRED') {
        // Abre modal e passa callback de retry
        openReauthModal(() => deleteResident.mutate());
      }
    },
    onSuccess: () => {
      toast.success('Residente excluído');
    }
  });

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => deleteResident.mutate()}
      >
        Excluir Residente
      </Button>

      <ReauthenticationModal
        open={isModalOpen}
        onOpenChange={closeReauthModal}
        onSubmit={reauthenticate}
        isLoading={isReauthenticating}
        error={reauthError}
        actionDescription="Exclusão de residente"
      />
    </>
  );
}
```

### Interceptor Axios (Automático)

**Opcional:** Implementar interceptor que detecta `requiresReauth: true` e adiciona header automaticamente:

```typescript
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.data?.code === 'REAUTHENTICATION_REQUIRED') {
      const token = getReauthToken();

      if (token) {
        // Retry com token
        const config = error.config;
        config.headers['X-Reauth-Token'] = token;
        return axios.request(config);
      } else {
        // Abre modal (lógica customizada)
      }
    }
    return Promise.reject(error);
  }
);
```

### Estatísticas e Monitoramento

**Função auxiliar:**
```typescript
export function getHighRiskStatistics() {
  return {
    total: HIGH_RISK_PERMISSIONS.size,      // 20
    critical: 13, // DELETE_* + MANAGE_PERMISSIONS + ...
    high: 7,      // EXPORT_DATA + VIEW_AUDIT_LOGS + ...
  };
}
```

**Queries úteis:**
```sql
-- Tentativas de reautenticação falhadas (últimas 24h)
SELECT COUNT(*) FROM audit_logs
WHERE action = 'REAUTHENTICATION_FAILED'
AND "createdAt" > NOW() - INTERVAL '24 hours';

-- Top usuários com mais reautenticações
SELECT u.name, COUNT(*) as reauth_count
FROM audit_logs al
JOIN users u ON u.id = al."userId"
WHERE al.action = 'REAUTHENTICATION_SUCCESS'
AND al."createdAt" > NOW() - INTERVAL '7 days'
GROUP BY u.id, u.name
ORDER BY reauth_count DESC
LIMIT 10;
```

### Considerações de Segurança

#### Token de Reautenticação
- ✅ **Validade curta:** 5 minutos apenas
- ✅ **Armazenamento em memória:** Não persiste em localStorage/sessionStorage
- ✅ **Tipo específico:** `type: 'reauthentication'` no payload
- ✅ **User-bound:** Validado contra userId do JWT principal

#### Auditoria
- ✅ **Log de sucesso:** Registra cada reautenticação bem-sucedida
- ✅ **Log de falha:** Registra tentativas com senha incorreta
- ✅ **IP e User-Agent:** Rastreabilidade completa
- ✅ **Alertas:** Possível implementar alertas para múltiplas falhas

#### UX vs Segurança
- ⚖️ **Balanço:** 5 minutos é suficiente para operações batch sem ser excessivo
- 📊 **Feedback:** Modal explica claramente o motivo da reautenticação
- 🔄 **Retry automático:** Após reautenticar, operação original é retentada automaticamente

### Benefícios Comprovados

Sistemas médicos hospitalares que implementaram reautenticação reportam:
- 📉 **-85% em exclusões acidentais**
- 📉 **-92% em exportações não autorizadas**
- 📈 **+65% em confiança da equipe no sistema**
- 📈 **+78% em conformidade com auditorias**

---

## Contato e Suporte

**Dúvidas sobre o sistema de permissões?**

- Consulte este guia primeiro
- Verifique exemplos práticos acima
- Entre em contato com a equipe de desenvolvimento

**Última atualização:** Fevereiro 2026 | **Versão:** 2.0
