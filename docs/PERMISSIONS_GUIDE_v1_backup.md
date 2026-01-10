# Guia do Sistema Híbrido de Permissões

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Quando Usar Cada Tipo de Permissão](#quando-usar-cada-tipo-de-permissão)
4. [Como Adicionar Novas Permissões](#como-adicionar-novas-permissões)
5. [Como Proteger Endpoints (Backend)](#como-proteger-endpoints-backend)
6. [Como Ocultar UI (Frontend)](#como-ocultar-ui-frontend)
7. [Gerenciamento de Permissões Customizadas](#gerenciamento-de-permissões-customizadas)
8. [Exemplos Práticos](#exemplos-práticos)
9. [Troubleshooting](#troubleshooting)

---

## Visão Geral

O sistema de permissões da Rafa ILPI é **híbrido**, combinando três camadas:

```
┌─────────────────────────────────────────────────┐
│          Sistema Híbrido de Permissões          │
├─────────────────────────────────────────────────┤
│                                                 │
│  1️⃣ Role (ADMIN/MANAGER/STAFF)                 │
│     └─ Permissões globais do sistema           │
│                                                 │
│  2️⃣ PositionCode (ADMINISTRATOR/NURSE/etc)     │
│     └─ Permissões herdadas do cargo ILPI       │
│                                                 │
│  3️⃣ Custom Permissions                         │
│     └─ Permissões específicas do usuário       │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Hierarquia de Permissões

1. **ADMIN** (Role) = TODAS as permissões automaticamente
2. **Position Code** (ex: NURSE) = Permissões herdadas do cargo
3. **Custom Permissions** = Permissões adicionais ou removidas manualmente

---

## Arquitetura do Sistema

### 1. Enum de Permissões (schema.prisma)

**Localização**: `apps/backend/prisma/schema.prisma`

```prisma
enum PermissionType {
  // Residentes
  VIEW_RESIDENTS
  CREATE_RESIDENTS
  UPDATE_RESIDENTS
  DELETE_RESIDENTS
  EXPORT_RESIDENTS_DATA

  // Registros Diários
  VIEW_DAILY_RECORDS
  CREATE_DAILY_RECORDS
  UPDATE_DAILY_RECORDS
  DELETE_DAILY_RECORDS

  // Prescrições
  VIEW_PRESCRIPTIONS
  CREATE_PRESCRIPTIONS
  UPDATE_PRESCRIPTIONS
  DELETE_PRESCRIPTIONS

  // Administração de Medicamentos
  VIEW_MEDICATIONS
  ADMINISTER_MEDICATIONS
  ADMINISTER_CONTROLLED_MEDICATIONS

  // Gestão de Leitos
  VIEW_BEDS
  MANAGE_BEDS

  // Infraestrutura (Prédios, Andares, Quartos, Leitos)
  MANAGE_INFRASTRUCTURE

  // Documentos
  VIEW_DOCUMENTS
  UPLOAD_DOCUMENTS
  DELETE_DOCUMENTS

  // Perfil Clínico
  VIEW_CLINICAL_PROFILE
  UPDATE_CLINICAL_PROFILE

  // Notas Clínicas
  VIEW_CLINICAL_NOTES
  CREATE_CLINICAL_NOTES
  UPDATE_CLINICAL_NOTES
  DELETE_CLINICAL_NOTES

  // POPs (Procedimentos Operacionais Padrão)
  // ⚠️ ATENÇÃO: POPs publicados são PÚBLICOS para todos os usuários (RDC 502/2021)
  // VIEW_POPS permite ver DRAFT e acessar templates/histórico
  VIEW_POPS          // Ver POPs em rascunho, templates, histórico de versões
  CREATE_POPS        // Criar novos POPs (rascunho)
  UPDATE_POPS        // Editar POPs, adicionar/remover anexos
  DELETE_POPS        // Deletar POPs em rascunho
  PUBLISH_POPS       // Publicar, versionar, marcar obsoleto (apenas RT)
  MANAGE_POPS        // Controle total sobre POPs

  // Auditoria
  VIEW_AUDIT_LOGS

  // Gerenciamento de Usuários
  VIEW_USERS
  CREATE_USERS
  UPDATE_USERS
  DELETE_USERS
  MANAGE_USER_PERMISSIONS

  // Configurações Institucionais
  VIEW_INSTITUTIONAL_SETTINGS
  UPDATE_INSTITUTIONAL_SETTINGS

  // Perfil Institucional
  VIEW_INSTITUTIONAL_PROFILE
  UPDATE_INSTITUTIONAL_PROFILE
}
```

### 2. Perfis de Cargo (position-profiles.config.ts)

**Localização**: `apps/backend/src/permissions/config/position-profiles.config.ts`

Define as permissões que cada cargo ILPI herda automaticamente:

```typescript
export const POSITION_PROFILES: Record<PositionCode, PermissionType[]> = {
  ADMINISTRATOR: [
    // Administrador tem TODAS as permissões
    PermissionType.MANAGE_INFRASTRUCTURE,
    PermissionType.VIEW_INSTITUTIONAL_PROFILE,
    // ... todas as outras
  ],

  NURSE: [
    // Enfermeiro: permissões clínicas
    PermissionType.VIEW_RESIDENTS,
    PermissionType.VIEW_DAILY_RECORDS,
    PermissionType.CREATE_DAILY_RECORDS,
    PermissionType.VIEW_PRESCRIPTIONS,
    PermissionType.ADMINISTER_MEDICATIONS,
    // ...
  ],

  NURSING_TECHNICIAN: [
    // Técnico de Enfermagem: permissões operacionais
    PermissionType.VIEW_RESIDENTS,
    PermissionType.CREATE_DAILY_RECORDS,
    PermissionType.ADMINISTER_MEDICATIONS,
    // ...
  ],

  // ... outros cargos
}
```

### 3. Sistema de Verificação

```typescript
// Backend: PermissionsService
class PermissionsService {
  async getUserAllPermissions(userId: string) {
    // 1. Se é ADMIN → retorna TODAS
    if (user.role === 'ADMIN') {
      return Object.values(PermissionType);
    }

    // 2. Busca permissões herdadas do cargo
    const inherited = POSITION_PROFILES[userProfile.positionCode] || [];

    // 3. Busca permissões customizadas
    const custom = await this.getCustomPermissions(userId);

    // 4. Mescla e retorna
    return [...new Set([...inherited, ...custom])];
  }
}
```

---

## Quando Usar Cada Tipo de Permissão

### ✅ Use **Role** (ADMIN/MANAGER/STAFF) quando:

- **Decisões globais do sistema**
- Exemplo: ADMIN pode acessar tudo, STAFF é restrito

### ✅ Use **PositionCode** quando:

- **Permissões padrão de cargos ILPI**
- Exemplo: Enfermeiros sempre podem administrar medicações
- Exemplo: Técnicos de Enfermagem sempre podem criar registros diários

### ✅ Use **Custom Permissions** quando:

- **Exceções individuais**
- Exemplo: Dar permissão extra para um usuário específico
- Exemplo: Remover uma permissão que normalmente vem do cargo

---

## Como Adicionar Novas Permissões

### Passo 1: Adicionar no Schema do Prisma

**Arquivo**: `apps/backend/prisma/schema.prisma`

```prisma
enum PermissionType {
  // ... permissões existentes

  // Nova funcionalidade
  VIEW_FINANCIAL_REPORTS
  EXPORT_FINANCIAL_DATA
  MANAGE_INVOICES
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

### Passo 4: Adicionar no Frontend Enum

**Arquivo**: `apps/frontend/src/hooks/usePermissions.ts`

```typescript
export enum PermissionType {
  // ... permissões existentes

  // Nova funcionalidade
  VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS',
  EXPORT_FINANCIAL_DATA = 'EXPORT_FINANCIAL_DATA',
  MANAGE_INVOICES = 'MANAGE_INVOICES',
}
```

### Passo 5: Atualizar Perfis de Cargo (se necessário)

**Arquivo**: `apps/backend/src/permissions/config/position-profiles.config.ts`

```typescript
export const POSITION_PROFILES: Record<PositionCode, PermissionType[]> = {
  ADMINISTRATOR: [
    // ... permissões existentes
    PermissionType.VIEW_FINANCIAL_REPORTS,
    PermissionType.EXPORT_FINANCIAL_DATA,
    PermissionType.MANAGE_INVOICES,
  ],

  ACCOUNTANT: [
    PermissionType.VIEW_FINANCIAL_REPORTS,
    PermissionType.EXPORT_FINANCIAL_DATA,
    // Sem MANAGE_INVOICES por padrão
  ],
}
```

### Passo 6: Documentar a Permissão

Adicione comentários no código explicando:
- **O que** a permissão permite fazer
- **Quem** deve ter essa permissão por padrão
- **Quando** usar essa permissão

---

## Como Proteger Endpoints (Backend)

### Método Recomendado: `@RequirePermissions()`

Use o decorator `@RequirePermissions()` nos controllers:

```typescript
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';
import { PermissionType } from '@prisma/client';

@Controller('financial-reports')
export class FinancialReportsController {

  // ✅ Método recomendado: Decorator de permissões
  @Get()
  @RequirePermissions(PermissionType.VIEW_FINANCIAL_REPORTS)
  async findAll() {
    return this.reportsService.findAll();
  }

  @Post()
  @RequirePermissions(PermissionType.MANAGE_INVOICES)
  async create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(dto);
  }

  @Delete(':id')
  @RequirePermissions(PermissionType.MANAGE_INVOICES)
  async remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
```

### Verificação Manual no Service (quando necessário)

```typescript
@Injectable()
export class FinancialReportsService {
  constructor(private permissionsService: PermissionsService) {}

  async exportSensitiveData(userId: string) {
    // Verificação manual para lógica complexa
    const hasPermission = await this.permissionsService.hasPermission(
      userId,
      PermissionType.EXPORT_FINANCIAL_DATA
    );

    if (!hasPermission) {
      throw new ForbiddenException('Você não tem permissão para exportar dados financeiros');
    }

    // Lógica de exportação
  }
}
```

### ⚠️ NÃO use mais `@Roles()` (método antigo)

```typescript
// ❌ EVITE - Sistema antigo
@Roles('admin', 'manager')
@Get()
async findAll() { }

// ✅ USE - Sistema híbrido
@RequirePermissions(PermissionType.VIEW_FINANCIAL_REPORTS)
@Get()
async findAll() { }
```

---

## Como Ocultar UI (Frontend)

### ⚠️ Proteção em Três Camadas (Obrigatório)

Para garantir segurança completa, **SEMPRE** implemente proteção em 3 camadas:

```
┌─────────────────────────────────────────────┐
│  1️⃣ Backend API Protection                 │
│     └─ @RequirePermissions() decorator      │
│        Retorna 403 Forbidden                │
├─────────────────────────────────────────────┤
│  2️⃣ Frontend UI Protection                 │
│     └─ hasPermission() no sidebar/menus     │
│        Esconde links visuais                │
├─────────────────────────────────────────────┤
│  3️⃣ Frontend Route Protection              │
│     └─ <ProtectedRoute> wrapper             │
│        Bloqueia acesso via URL direta       │
└─────────────────────────────────────────────┘
```

### Hook: `usePermissions()`

**Arquivo**: `apps/frontend/src/hooks/usePermissions.ts`

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionType } from '@/hooks/usePermissions';

function FinancialDashboard() {
  const { hasPermission } = usePermissions();

  const canViewReports = hasPermission(PermissionType.VIEW_FINANCIAL_REPORTS);
  const canExportData = hasPermission(PermissionType.EXPORT_FINANCIAL_DATA);
  const canManageInvoices = hasPermission(PermissionType.MANAGE_INVOICES);

  return (
    <div>
      {canViewReports && (
        <ReportsSection />
      )}

      {canExportData && (
        <Button onClick={handleExport}>
          Exportar Dados
        </Button>
      )}

      {canManageInvoices && (
        <InvoiceManagement />
      )}
    </div>
  );
}
```

### Proteção de Rotas (React Router)

**Arquivo**: `apps/frontend/src/routes/index.tsx`

Use o componente `<ProtectedRoute>` para bloquear acesso via URL direta:

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PermissionType } from '@/hooks/usePermissions'

export const router = createBrowserRouter([
  {
    path: '/dashboard',
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      // Rota com permissão única
      {
        path: 'financial',
        element: (
          <ProtectedRoute requiredPermissions={[PermissionType.VIEW_FINANCIAL_REPORTS]}>
            <FinancialPage />
          </ProtectedRoute>
        ),
      },

      // Rota com múltiplas permissões (OR logic)
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

      // Rota com múltiplas permissões (AND logic)
      {
        path: 'sensitive-reports',
        element: (
          <ProtectedRoute
            requiredPermissions={[
              PermissionType.VIEW_REPORTS,
              PermissionType.EXPORT_SENSITIVE_DATA,
            ]}
            requireAllPermissions={true} // true = AND (todas)
          >
            <SensitiveReportsPage />
          </ProtectedRoute>
        ),
      },

      // Rotas aninhadas (subrotas)
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
        ],
      },
    ],
  },
])
```

**Comportamento do `<ProtectedRoute>`:**
- Usuário sem permissão vê tela "Acesso Negado" com botão "Voltar ao Dashboard"
- Utiliza o componente `<AccessDenied>` do design system
- Aparência consistente com outras páginas restritas

### Ocultação Condicional de Menus (Sidebar)

**Arquivo**: `apps/frontend/src/layouts/DashboardLayout.tsx`

```typescript
export function DashboardLayout() {
  const { hasPermission } = usePermissions();

  // Calcular permissões uma vez
  const canViewFinancial = hasPermission(PermissionType.VIEW_FINANCIAL_REPORTS);
  const canViewCompliance = hasPermission(PermissionType.VIEW_COMPLIANCE_DASHBOARD) ||
                            hasPermission(PermissionType.VIEW_SENTINEL_EVENTS);
  const canManageInfrastructure = hasPermission(PermissionType.MANAGE_INFRASTRUCTURE);

  return (
    <Sidebar>
      {/* Menu sempre visível */}
      <SidebarItem href="/dashboard">Dashboard</SidebarItem>

      {/* Menus condicionais - só aparecem se tiver permissão */}
      {canViewFinancial && (
        <SidebarItem href="/dashboard/financial">Financeiro</SidebarItem>
      )}

      {canViewCompliance && (
        <SidebarItem href="/dashboard/compliance">Conformidade</SidebarItem>
      )}

      {canManageInfrastructure && (
        <SidebarItem href="/dashboard/beds">Gestão de Leitos</SidebarItem>
      )}
    </Sidebar>
  );
}
```

**⚠️ IMPORTANTE:** Sempre use a mesma lógica de permissões no sidebar e nas rotas:
```typescript
// ✅ CORRETO - Mesma lógica em ambos
// Sidebar:
const canView = hasPermission(A) || hasPermission(B);

// Route:
<ProtectedRoute
  requiredPermissions={[A, B]}
  requireAllPermissions={false} // false = OR
>

// ❌ ERRADO - Lógicas diferentes
// Sidebar: hasPermission(A) || hasPermission(B)
// Route: hasPermission(A) && hasPermission(B)
```

### Ocultação de Botões de Ação

**Arquivo**: `apps/frontend/src/components/cards/InvoiceCard.tsx`

```typescript
interface InvoiceCardProps {
  invoice: Invoice;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  canManage?: boolean; // ✅ Recebe permissão como prop
}

export function InvoiceCard({
  invoice,
  onEdit,
  onDelete,
  canManage = true // Default true para backward compatibility
}: InvoiceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{invoice.number}</CardTitle>

        {/* Botões de ação aparecem apenas se canManage = true */}
        {canManage && (
          <DropdownMenu>
            <DropdownMenuItem onClick={() => onEdit?.(invoice)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.(invoice)}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      </CardHeader>
    </Card>
  );
}
```

**Uso no componente pai:**

```typescript
function InvoicesPage() {
  const { hasPermission } = usePermissions();
  const canManageInvoices = hasPermission(PermissionType.MANAGE_INVOICES);

  return (
    <div>
      {invoices.map(invoice => (
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          canManage={canManageInvoices} // ✅ Passa a permissão
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

---

## Gerenciamento de Permissões Customizadas

### Quando Alterar a Tela de Gerenciamento

Você deve atualizar a tela de **Gerenciar Permissões** (`ManageUserPermissionsDialog.tsx`) quando:

#### ✅ Adicionar nova funcionalidade ao sistema
- Nova seção no sistema (ex: Financeiro)
- Novas permissões que usuários podem precisar customizar

#### ✅ Permitir exceções por usuário
- Um enfermeiro específico pode precisar de permissões administrativas
- Um técnico pode ter acesso temporário a relatórios

#### ❌ NÃO precisa alterar quando:
- Apenas mudanças em `POSITION_PROFILES` (permissões herdadas)
- Permissões que SEMPRE devem vir do cargo (não customizáveis)
- Permissões exclusivas de ADMIN (já tem tudo)

### Estrutura da Tela de Gerenciamento

**Arquivo**: `apps/frontend/src/components/user-profiles/ManageUserPermissionsDialog.tsx`

```typescript
const PERMISSION_GROUPS = [
  {
    title: 'Residentes',
    permissions: [
      {
        value: PermissionType.VIEW_RESIDENTS,
        label: 'Visualizar residentes',
        description: 'Permite visualizar a lista e detalhes dos residentes'
      },
      {
        value: PermissionType.CREATE_RESIDENTS,
        label: 'Cadastrar residentes'
      },
      // ...
    ]
  },
  {
    title: 'Financeiro', // ✅ NOVO GRUPO
    permissions: [
      {
        value: PermissionType.VIEW_FINANCIAL_REPORTS,
        label: 'Visualizar relatórios financeiros'
      },
      {
        value: PermissionType.EXPORT_FINANCIAL_DATA,
        label: 'Exportar dados financeiros'
      },
      {
        value: PermissionType.MANAGE_INVOICES,
        label: 'Gerenciar faturas'
      },
    ]
  }
];
```

### API de Permissões Customizadas

```typescript
// GET /api/permissions/me
// Retorna permissões do usuário logado
{
  "inherited": ["VIEW_RESIDENTS", "CREATE_DAILY_RECORDS", ...],
  "custom": ["VIEW_FINANCIAL_REPORTS"], // Adicionada manualmente
  "all": ["VIEW_RESIDENTS", "CREATE_DAILY_RECORDS", "VIEW_FINANCIAL_REPORTS", ...]
}

// GET /api/permissions/user/:userId
// Retorna permissões de um usuário específico

// PATCH /api/permissions/user/:userId/custom
// Atualiza permissões customizadas
{
  "permissionsToAdd": ["VIEW_FINANCIAL_REPORTS"],
  "permissionsToRemove": ["DELETE_RESIDENTS"]
}
```

---

## Exemplos Práticos

### Exemplo 1: Adicionar Módulo de Vacinação

#### 1. Adicionar permissões ao schema

```prisma
enum PermissionType {
  // ... outras permissões

  // Vacinação
  VIEW_VACCINATIONS
  CREATE_VACCINATIONS
  UPDATE_VACCINATIONS
  DELETE_VACCINATIONS
}
```

#### 2. Criar migration

```bash
npx prisma migrate dev --name add_vaccination_permissions
npx prisma generate
```

#### 3. Adicionar ao frontend enum

```typescript
// usePermissions.ts
export enum PermissionType {
  VIEW_VACCINATIONS = 'VIEW_VACCINATIONS',
  CREATE_VACCINATIONS = 'CREATE_VACCINATIONS',
  UPDATE_VACCINATIONS = 'UPDATE_VACCINATIONS',
  DELETE_VACCINATIONS = 'DELETE_VACCINATIONS',
}
```

#### 4. Atualizar perfis de cargo

```typescript
// position-profiles.config.ts
NURSE: [
  // ... permissões existentes
  PermissionType.VIEW_VACCINATIONS,
  PermissionType.CREATE_VACCINATIONS,
  PermissionType.UPDATE_VACCINATIONS,
],

NURSING_TECHNICIAN: [
  // ... permissões existentes
  PermissionType.VIEW_VACCINATIONS,
  PermissionType.CREATE_VACCINATIONS,
],
```

#### 5. Proteger endpoints

```typescript
@Controller('vaccinations')
export class VaccinationsController {
  @Get()
  @RequirePermissions(PermissionType.VIEW_VACCINATIONS)
  async findAll() { }

  @Post()
  @RequirePermissions(PermissionType.CREATE_VACCINATIONS)
  async create() { }

  @Patch(':id')
  @RequirePermissions(PermissionType.UPDATE_VACCINATIONS)
  async update() { }

  @Delete(':id')
  @RequirePermissions(PermissionType.DELETE_VACCINATIONS)
  async remove() { }
}
```

#### 6. Ocultar UI no frontend

```typescript
function VaccinationsPage() {
  const { hasPermission } = usePermissions();

  const canView = hasPermission(PermissionType.VIEW_VACCINATIONS);
  const canCreate = hasPermission(PermissionType.CREATE_VACCINATIONS);
  const canUpdate = hasPermission(PermissionType.UPDATE_VACCINATIONS);
  const canDelete = hasPermission(PermissionType.DELETE_VACCINATIONS);

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <div>
      {canCreate && <Button onClick={handleCreate}>Nova Vacinação</Button>}

      <VaccinationsList
        canEdit={canUpdate}
        canDelete={canDelete}
      />
    </div>
  );
}
```

#### 7. Adicionar ao gerenciamento de permissões

```typescript
// ManageUserPermissionsDialog.tsx
const PERMISSION_GROUPS = [
  // ... grupos existentes
  {
    title: 'Vacinação',
    permissions: [
      { value: PermissionType.VIEW_VACCINATIONS, label: 'Visualizar vacinações' },
      { value: PermissionType.CREATE_VACCINATIONS, label: 'Registrar vacinações' },
      { value: PermissionType.UPDATE_VACCINATIONS, label: 'Editar vacinações' },
      { value: PermissionType.DELETE_VACCINATIONS, label: 'Remover vacinações' },
    ]
  }
];
```

### Exemplo 2: Permissão de Exportação de Dados Sensíveis

#### Cenário:
Apenas alguns usuários podem exportar dados sensíveis de residentes (CPF, RG, etc.)

#### 1. Adicionar permissão ao schema

```prisma
enum PermissionType {
  // ... outras permissões
  EXPORT_SENSITIVE_DATA
}
```

#### 2. NÃO adicionar a nenhum `POSITION_PROFILE`

```typescript
// position-profiles.config.ts
// Nenhum cargo tem essa permissão por padrão
// Ela será concedida apenas manualmente via tela de gerenciamento
```

#### 3. Proteger endpoint

```typescript
@Controller('residents')
export class ResidentsController {
  @Get('export/sensitive')
  @RequirePermissions(PermissionType.EXPORT_SENSITIVE_DATA)
  async exportSensitiveData() {
    // Retorna CSV com CPF, RG, etc.
  }
}
```

#### 4. Ocultar botão no frontend

```typescript
function ResidentsPage() {
  const { hasPermission } = usePermissions();
  const canExportSensitive = hasPermission(PermissionType.EXPORT_SENSITIVE_DATA);

  return (
    <div>
      <Button onClick={handleExportBasic}>Exportar Dados Básicos</Button>

      {canExportSensitive && (
        <Button onClick={handleExportSensitive}>
          Exportar Dados Sensíveis
        </Button>
      )}
    </div>
  );
}
```

#### 5. Adicionar à tela de gerenciamento

```typescript
const PERMISSION_GROUPS = [
  {
    title: 'Residentes',
    permissions: [
      // ... outras permissões
      {
        value: PermissionType.EXPORT_SENSITIVE_DATA,
        label: 'Exportar dados sensíveis',
        description: '⚠️ Permite exportar CPF, RG e outros dados pessoais'
      },
    ]
  }
];
```

---

## Troubleshooting

### Problema: Permissões não aparecem após adicionar no schema

**Solução:**

1. Verificar se a migration foi criada:
```bash
cd apps/backend
npx prisma migrate dev --name your_migration_name
```

2. Regenerar Prisma Client:
```bash
npx prisma generate
```

3. Reiniciar o servidor backend (se estiver rodando)

4. Fazer logout/login no frontend para atualizar cache de permissões

---

### Problema: Usuário ADMIN não tem acesso a nova permissão

**Causa:** Bug no cache ou Prisma Client não regenerado.

**Solução:**

```typescript
// permissions.service.ts verifica se é ADMIN
async getUserAllPermissions(userId: string) {
  if (user.role === 'ADMIN') {
    // ADMIN sempre tem TODAS as permissões do enum
    return Object.values(PermissionType);
  }
  // ...
}
```

1. Verificar se `Object.values(PermissionType)` inclui a nova permissão
2. Fazer logout/login
3. Verificar resposta de `/api/permissions/me`

---

### Problema: Endpoint retorna 403 mesmo com permissão correta

**Diagnóstico:**

1. Verificar resposta de `/api/permissions/me` no DevTools (Network):
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

// ✅ CORRETO - Enum
@RequirePermissions(PermissionType.VIEW_RESIDENTS)
```

3. Verificar se o módulo de permissões foi importado:
```typescript
@Module({
  imports: [PermissionsModule], // ← Necessário
  controllers: [YourController],
})
```

---

### Problema: Permissões herdadas não aparecem

**Causa:** PositionCode do usuário não configurado ou incorreto.

**Verificação:**

1. Checar UserProfile do usuário:
```sql
SELECT "positionCode" FROM "UserProfile" WHERE "userId" = 'xxx';
```

2. Verificar se o `positionCode` existe no `POSITION_PROFILES`:
```typescript
// position-profiles.config.ts
export const POSITION_PROFILES: Record<PositionCode, PermissionType[]> = {
  NURSE: [...], // ← Deve existir
}
```

---

### Problema: Sidebar não atualiza após dar permissão

**Causa:** Cache do React Query (staleTime de 5 minutos).

**Solução:**

1. Fazer logout/login
2. OU invalidar query manualmente:
```typescript
const queryClient = useQueryClient();
queryClient.invalidateQueries({ queryKey: ['permissions'] });
```

---

## Caso Especial: POPs (Procedimentos Operacionais Padrão)

### Contexto Regulatório

Conforme **RDC 502/2021 da ANVISA**, POPs são **documentos institucionais obrigatórios** que devem estar disponíveis para toda a equipe da ILPI. Por isso, o módulo de POPs implementa um modelo de acesso híbrido:

### Rotas Públicas (Todos os Usuários Autenticados)

Estas rotas **NÃO exigem** `@RequirePermissions()`:

1. **GET /pops/published** - Listar POPs publicados (vigentes)
2. **GET /pops/:id** - Visualizar POP específico
   - ⚠️ **Validação**: Apenas POPs com `status=PUBLISHED` são acessíveis
   - POPs `DRAFT` ou `OBSOLETE` retornam erro 400 para usuários sem VIEW_POPS
3. **GET /pops/categories** - Listar categorias (para filtros)
4. **Anexos**: URLs de download incluídas no response do POP

### Rotas Restritas (Requerem Permissões)

| Rota | Permissão | Descrição |
|------|-----------|-----------|
| GET /pops | VIEW_POPS | Listar TODOS (incluindo DRAFT) |
| GET /pops/templates/* | VIEW_POPS | Acessar templates |
| GET /pops/:id/versions | VIEW_POPS | Histórico de versões |
| GET /pops/:id/history | VIEW_POPS | Auditoria completa |
| POST /pops | CREATE_POPS | Criar novo POP |
| PATCH /pops/:id | UPDATE_POPS | Editar POP |
| DELETE /pops/:id | DELETE_POPS | Deletar POP (DRAFT) |
| POST /pops/:id/publish | PUBLISH_POPS | Publicar (RT apenas) |
| POST /pops/:id/version | PUBLISH_POPS | Versionar (RT apenas) |
| POST /pops/:id/obsolete | PUBLISH_POPS | Marcar obsoleto (RT apenas) |
| POST /pops/:id/mark-reviewed | PUBLISH_POPS | Marcar revisado (RT apenas) |
| POST /pops/:id/attachments | UPDATE_POPS | Adicionar anexo |
| DELETE /pops/attachments/:id | UPDATE_POPS | Remover anexo |

### Implementação da Segurança

```typescript
// pops.controller.ts
@Get('published')
// ⚠️ SEM @RequirePermissions - Rota pública
async findPublished(@Req() req: any) {
  return this.popsService.findPublished(req.user.tenantId)
}

@Get(':id')
// ⚠️ SEM @RequirePermissions - Validação no service
async findOne(@Req() req: any, @Param('id') id: string) {
  // findOnePublic valida se POP está PUBLISHED
  return this.popsService.findOnePublic(req.user.tenantId, id, req.user.id)
}
```

```typescript
// pops.service.ts
async findOnePublic(tenantId: string, popId: string, userId: string) {
  const pop = await this.prisma.pop.findFirst({ ... })

  // Se não está publicado, bloqueia usuários comuns
  if (pop.status !== PopStatus.PUBLISHED) {
    const user = await this.prisma.user.findUnique({ ... })

    // Admin sempre tem acesso
    if (user?.role === 'admin') return pop

    // Outros usuários: bloqueado
    throw new BadRequestException(
      'Este POP está em rascunho e não está disponível para visualização'
    )
  }

  return pop
}
```

### Distribuição de Permissões por Cargo

```typescript
// position-profiles.config.ts
BASE_PERMISSIONS.VIEWER = [
  PermissionType.VIEW_POPS, // ❌ REMOVIDO - POPs publicados são públicos
  // ... outras permissões
]

// Apenas cargos que criam/gerenciam POPs têm VIEW_POPS
ILPI_POSITION_PROFILES.TECHNICAL_MANAGER = {
  permissions: [
    PermissionType.VIEW_POPS,      // Ver DRAFT
    PermissionType.CREATE_POPS,    // Criar
    PermissionType.UPDATE_POPS,    // Editar
    PermissionType.DELETE_POPS,    // Deletar
    PermissionType.PUBLISH_POPS,   // Publicar (RT)
    PermissionType.MANAGE_POPS,    // Controle total
  ]
}
```

### Por Que Este Modelo?

✅ **Compliance RDC 502/2021**: POPs devem estar acessíveis a todos
✅ **Segurança**: DRAFT não vaza para usuários comuns
✅ **Auditoria**: Histórico e versões apenas para gestores
✅ **Simplicidade**: Usuários comuns não veem opções de gestão

---

## Resumo: Checklist para Adicionar Nova Permissão

- [ ] 1. Adicionar no `schema.prisma` (enum `PermissionType`)
- [ ] 2. Criar migration (`npx prisma migrate dev`)
- [ ] 3. Regenerar Prisma Client (`npx prisma generate`)
- [ ] 4. Adicionar no `usePermissions.ts` (frontend enum)
- [ ] 5. Atualizar `position-profiles.config.ts` (se necessário)
- [ ] 6. Proteger endpoints com `@RequirePermissions()`
- [ ] 7. Ocultar UI com `hasPermission()`
- [ ] 8. Adicionar à tela de gerenciamento (se customizável)
- [ ] 9. Testar com diferentes cargos
- [ ] 10. Documentar a permissão neste guia

---

## Contato

Dúvidas sobre o sistema de permissões? Entre em contato com a equipe de desenvolvimento.

**Última atualização:** Dezembro 2025
