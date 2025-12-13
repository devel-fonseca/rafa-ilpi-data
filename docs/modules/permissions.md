# Módulo: Sistema de Permissões RBAC

**Status:** ✅ Implementado
**Versão:** 1.0.0
**Última atualização:** 11/12/2025

## Visão Geral

Sistema completo de controle de acesso baseado em funções (RBAC - Role-Based Access Control) com 45 permissões granulares, 17 códigos de cargo (PositionCode), modelo híbrido (Role + PositionCode + Permissões Customizadas), decorators para backend, guards de validação e componentes de renderização condicional no frontend.

## Funcionalidades Principais

- ✅ **45 permissões granulares**: Controle fino sobre todas as operações do sistema
- ✅ **17 códigos de cargo**: Mapeamento direto com cargos reais em ILPIs
- ✅ **3 roles base**: ADMIN, USER, VIEWER
- ✅ **Modelo híbrido**: Role + PositionCode + Custom Permissions
- ✅ **Decorator `@RequirePermissions()`**: Proteção de endpoints no backend
- ✅ **Guard `PermissionsGuard`**: Validação automática de permissões
- ✅ **Hook `usePermissions()`**: Verificação de permissões no frontend
- ✅ **Componente `<PermissionGate>`**: Renderização condicional de UI
- ✅ **Seed automático**: População inicial com permissões padrão

## Arquitetura

### Backend
- **Controller:** [apps/backend/src/users/users.controller.ts](../../apps/backend/src/users/users.controller.ts)
- **Service:** [apps/backend/src/users/users.service.ts](../../apps/backend/src/users/users.service.ts)
- **Guard:** [apps/backend/src/common/guards/permissions.guard.ts](../../apps/backend/src/common/guards/permissions.guard.ts)
- **Decorator:** [apps/backend/src/common/decorators/require-permissions.decorator.ts](../../apps/backend/src/common/decorators/require-permissions.decorator.ts)
- **Seed:** [apps/backend/prisma/seed-permissions.ts](../../apps/backend/prisma/seed-permissions.ts)
- **Schema:** [apps/backend/prisma/schema.prisma](../../apps/backend/prisma/schema.prisma)

### Frontend
- **Hook:** [apps/frontend/src/hooks/usePermissions.ts](../../apps/frontend/src/hooks/usePermissions.ts)
- **Component:** [apps/frontend/src/components/PermissionGate.tsx](../../apps/frontend/src/components/PermissionGate.tsx)
- **Context:** [apps/frontend/src/contexts/AuthContext.tsx](../../apps/frontend/src/contexts/AuthContext.tsx)

## Modelos de Dados

### User (com campos de permissões)

```prisma
model User {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @db.Uuid

  // Dados básicos
  fullName String
  email    String @unique
  password String

  // Sistema de Permissões
  role         Role         @default(USER)
  positionCode PositionCode? // Cargo/função
  permissions  String[]      @default([]) // Permissões customizadas

  // Status
  isActive Boolean @default(true)

  // Auditoria
  createdAt DateTime  @default(now()) @db.Timestamptz(3)
  updatedAt DateTime  @updatedAt @db.Timestamptz(3)
  deletedAt DateTime? @db.Timestamptz(3)

  @@index([tenantId])
  @@index([email])
  @@map("users")
}
```

## Enums

### Role (3 roles base)

```prisma
enum Role {
  ADMIN   // Administrador total
  USER    // Usuário comum (permissões por cargo)
  VIEWER  // Visualizador (somente leitura)

  @@map("role")
}
```

### PositionCode (17 cargos)

```prisma
enum PositionCode {
  // Gestão
  DIRETOR_TECNICO        // Diretor Técnico
  COORDENADOR_GERAL      // Coordenador Geral
  GERENTE_ADMINISTRATIVO // Gerente Administrativo

  // Saúde - Nível Superior
  MEDICO                 // Médico
  ENFERMEIRO             // Enfermeiro
  FISIOTERAPEUTA         // Fisioterapeuta
  NUTRICIONISTA          // Nutricionista
  PSICOLOGO              // Psicólogo
  ASSISTENTE_SOCIAL      // Assistente Social
  FARMACEUTICO           // Farmacêutico

  // Saúde - Nível Técnico
  TECNICO_ENFERMAGEM     // Técnico de Enfermagem
  AUXILIAR_ENFERMAGEM    // Auxiliar de Enfermagem

  // Apoio Operacional
  CUIDADOR               // Cuidador de Idosos
  RECEPCIONISTA          // Recepcionista
  AUXILIAR_ADMINISTRATIVO // Auxiliar Administrativo

  // Outros
  ESTAGIARIO             // Estagiário
  OUTRO                  // Outros cargos

  @@map("position_code")
}
```

## Lista Completa de Permissões (45)

### Residentes (5 permissões)
- `CREATE_RESIDENTS` - Criar residentes
- `VIEW_RESIDENTS` - Visualizar residentes
- `UPDATE_RESIDENTS` - Atualizar residentes
- `DELETE_RESIDENTS` - Excluir residentes
- `MANAGE_RESIDENTS` - Gerenciar todos os aspectos

### Registros Diários (5 permissões)
- `CREATE_DAILY_RECORDS` - Criar registros diários
- `VIEW_DAILY_RECORDS` - Visualizar registros
- `UPDATE_DAILY_RECORDS` - Atualizar registros
- `DELETE_DAILY_RECORDS` - Excluir registros
- `MANAGE_DAILY_RECORDS` - Gerenciar todos os aspectos

### Prescrições (5 permissões)
- `CREATE_PRESCRIPTIONS` - Criar prescrições
- `VIEW_PRESCRIPTIONS` - Visualizar prescrições
- `UPDATE_PRESCRIPTIONS` - Atualizar prescrições
- `DELETE_PRESCRIPTIONS` - Excluir prescrições
- `MANAGE_PRESCRIPTIONS` - Gerenciar todos os aspectos

### Sinais Vitais (5 permissões)
- `CREATE_VITAL_SIGNS` - Criar sinais vitais
- `VIEW_VITAL_SIGNS` - Visualizar sinais vitais
- `UPDATE_VITAL_SIGNS` - Atualizar sinais vitais
- `DELETE_VITAL_SIGNS` - Excluir sinais vitais
- `MANAGE_VITAL_SIGNS` - Gerenciar todos os aspectos

### Vacinação (5 permissões)
- `CREATE_VACCINATIONS` - Criar vacinações
- `VIEW_VACCINATIONS` - Visualizar vacinações
- `UPDATE_VACCINATIONS` - Atualizar vacinações
- `DELETE_VACCINATIONS` - Excluir vacinações
- `MANAGE_VACCINATIONS` - Gerenciar todos os aspectos

### Evoluções Clínicas (5 permissões)
- `CREATE_CLINICAL_NOTES` - Criar evoluções clínicas
- `VIEW_CLINICAL_NOTES` - Visualizar evoluções
- `UPDATE_CLINICAL_NOTES` - Atualizar evoluções
- `DELETE_CLINICAL_NOTES` - Excluir evoluções
- `MANAGE_CLINICAL_NOTES` - Gerenciar todos os aspectos

### Documentos (5 permissões)
- `CREATE_DOCUMENTS` - Criar documentos
- `VIEW_DOCUMENTS` - Visualizar documentos
- `UPDATE_DOCUMENTS` - Atualizar documentos
- `DELETE_DOCUMENTS` - Excluir documentos
- `MANAGE_DOCUMENTS` - Gerenciar todos os aspectos

### POPs (5 permissões)
- `CREATE_POPS` - Criar POPs
- `VIEW_POPS` - Visualizar POPs
- `UPDATE_POPS` - Atualizar POPs
- `DELETE_POPS` - Excluir POPs
- `MANAGE_POPS` - Gerenciar todos os aspectos

### Usuários e Sistema (5 permissões)
- `CREATE_USERS` - Criar usuários
- `VIEW_USERS` - Visualizar usuários
- `UPDATE_USERS` - Atualizar usuários
- `DELETE_USERS` - Excluir usuários
- `MANAGE_SYSTEM` - Gerenciar sistema completo

## Matriz de Permissões por Cargo

### Gestão

**DIRETOR_TECNICO:**
- Todas as 45 permissões (acesso total)

**COORDENADOR_GERAL:**
- Todas exceto: `DELETE_USERS`, `MANAGE_SYSTEM`
- Total: 43 permissões

**GERENTE_ADMINISTRATIVO:**
- VIEW/CREATE/UPDATE: Residentes, Documentos, POPs, Usuários
- VIEW: Todos os módulos clínicos
- Total: ~25 permissões

### Saúde - Nível Superior

**MEDICO:**
- MANAGE: Prescrições, Evoluções Clínicas
- CREATE/VIEW/UPDATE: Residentes, Sinais Vitais, Vacinação
- VIEW: Registros Diários, Documentos
- Total: ~30 permissões

**ENFERMEIRO:**
- MANAGE: Prescrições, Sinais Vitais, Registros Diários
- CREATE/VIEW/UPDATE: Vacinação, Evoluções Clínicas
- VIEW: Residentes, Documentos
- Total: ~28 permissões

**FISIOTERAPEUTA / NUTRICIONISTA / PSICOLOGO / ASSISTENTE_SOCIAL:**
- MANAGE: Evoluções Clínicas (da própria área)
- VIEW/CREATE: Registros Diários
- VIEW: Residentes, Prescrições, Sinais Vitais
- Total: ~15 permissões

**FARMACEUTICO:**
- VIEW/UPDATE: Prescrições
- VIEW: Residentes, Registros Diários
- Total: ~8 permissões

### Saúde - Nível Técnico

**TECNICO_ENFERMAGEM:**
- CREATE/VIEW/UPDATE: Sinais Vitais, Registros Diários, Vacinação
- VIEW: Residentes, Prescrições
- Total: ~15 permissões

**AUXILIAR_ENFERMAGEM:**
- CREATE/VIEW: Sinais Vitais, Registros Diários
- VIEW: Residentes, Prescrições
- Total: ~10 permissões

### Apoio Operacional

**CUIDADOR:**
- CREATE/VIEW: Registros Diários
- VIEW: Residentes, Prescrições
- Total: ~5 permissões

**RECEPCIONISTA:**
- VIEW/CREATE/UPDATE: Residentes (dados básicos)
- VIEW: Documentos
- Total: ~5 permissões

**AUXILIAR_ADMINISTRATIVO:**
- VIEW: Residentes, Documentos, POPs
- CREATE/UPDATE: Documentos
- Total: ~8 permissões

**ESTAGIARIO:**
- VIEW: Residentes, Registros Diários, Evoluções Clínicas
- Total: ~3 permissões

**OUTRO:**
- VIEW: Conforme definido pelo administrador
- Total: Customizável

## Modelo Híbrido de Permissões

O sistema combina 3 fontes de permissões:

### 1. Role (Nível Base)

```typescript
if (user.role === 'ADMIN') {
  // Acesso total (todas as 45 permissões)
  return true;
}

if (user.role === 'VIEWER') {
  // Somente VIEW_* permissões
  return permission.startsWith('VIEW_');
}
```

### 2. PositionCode (Cargo)

```typescript
const permissionsByPosition = {
  MEDICO: [
    'MANAGE_PRESCRIPTIONS',
    'MANAGE_CLINICAL_NOTES',
    'CREATE_RESIDENTS',
    // ... 30 permissões
  ],
  ENFERMEIRO: [
    'MANAGE_PRESCRIPTIONS',
    'MANAGE_VITAL_SIGNS',
    // ... 28 permissões
  ],
  // ... outros cargos
};

const positionPermissions = permissionsByPosition[user.positionCode] || [];
```

### 3. Custom Permissions (Customizadas)

```typescript
// Permissões adicionais específicas do usuário
const customPermissions = user.permissions; // ['CREATE_POPS', 'UPDATE_DOCUMENTS']
```

### Lógica de Verificação Final

```typescript
function hasPermission(user: User, permission: string): boolean {
  // 1. Admin tem tudo
  if (user.role === 'ADMIN') return true;

  // 2. Viewer só tem VIEW_*
  if (user.role === 'VIEWER') {
    return permission.startsWith('VIEW_');
  }

  // 3. Permissões por cargo
  const positionPerms = PERMISSIONS_BY_POSITION[user.positionCode] || [];
  if (positionPerms.includes(permission)) return true;

  // 4. Permissões customizadas
  if (user.permissions.includes(permission)) return true;

  // 5. Negado
  return false;
}
```

## Backend - Uso

### Decorator `@RequirePermissions()`

**Proteção de endpoint:**

```typescript
@Controller('prescriptions')
export class PrescriptionsController {
  @Post()
  @RequirePermissions('CREATE_PRESCRIPTIONS')
  async create(@Body() dto: CreatePrescriptionDto) {
    // Apenas usuários com CREATE_PRESCRIPTIONS podem acessar
  }

  @Get()
  // Sem decorator = acesso público (autenticado)
  async findAll() {
    // Qualquer usuário autenticado pode listar
  }

  @Delete(':id')
  @RequirePermissions('DELETE_PRESCRIPTIONS')
  async remove(@Param('id') id: string) {
    // Apenas com DELETE_PRESCRIPTIONS
  }
}
```

**Múltiplas permissões (OR):**

```typescript
@Patch(':id')
@RequirePermissions('UPDATE_PRESCRIPTIONS', 'MANAGE_PRESCRIPTIONS')
async update(@Param('id') id: string, @Body() dto: UpdateDto) {
  // Usuário precisa ter UPDATE_PRESCRIPTIONS OU MANAGE_PRESCRIPTIONS
}
```

### Guard `PermissionsGuard`

**Aplicação global:**

```typescript
// main.ts
app.useGlobalGuards(new PermissionsGuard(reflector));
```

**Lógica do guard:**

```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler()
    );

    if (!requiredPermissions) return true; // Sem decorator = acesso liberado

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredPermissions.some(permission =>
      this.hasPermission(user, permission)
    );
  }
}
```

## Frontend - Uso

### Hook `usePermissions()`

**Verificação em componentes:**

```tsx
import { usePermissions } from '@/hooks/usePermissions';

function PrescriptionForm() {
  const { hasPermission } = usePermissions();

  if (!hasPermission('CREATE_PRESCRIPTIONS')) {
    return <AccessDenied />;
  }

  return <Form />;
}
```

**Verificação múltipla:**

```tsx
const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

// Precisa de UMA das permissões
if (hasAnyPermission(['UPDATE_PRESCRIPTIONS', 'MANAGE_PRESCRIPTIONS'])) {
  // Mostrar botão de editar
}

// Precisa de TODAS as permissões
if (hasAllPermissions(['CREATE_USERS', 'MANAGE_SYSTEM'])) {
  // Mostrar painel de admin
}
```

### Componente `<PermissionGate>`

**Renderização condicional:**

```tsx
import { PermissionGate } from '@/components/PermissionGate';

function Dashboard() {
  return (
    <>
      <PermissionGate permission="CREATE_PRESCRIPTIONS">
        <Button>Nova Prescrição</Button>
      </PermissionGate>

      <PermissionGate permissions={['UPDATE_RESIDENTS', 'MANAGE_RESIDENTS']} mode="any">
        <Button>Editar Residente</Button>
      </PermissionGate>

      <PermissionGate permissions={['CREATE_USERS', 'MANAGE_SYSTEM']} mode="all">
        <AdminPanel />
      </PermissionGate>
    </>
  );
}
```

**Props:**

```typescript
interface PermissionGateProps {
  permission?: string;           // Única permissão
  permissions?: string[];        // Múltiplas permissões
  mode?: 'any' | 'all';         // any = OR, all = AND (default: any)
  fallback?: React.ReactNode;   // Renderizar se não tiver permissão
  children: React.ReactNode;
}
```

## Seed de Permissões

### Execução Automática

**No deploy:**

```bash
npx prisma migrate deploy
npx prisma db seed
```

**Arquivo seed:**

```typescript
// prisma/seed-permissions.ts
const PERMISSIONS_BY_POSITION = {
  DIRETOR_TECNICO: ALL_PERMISSIONS,
  COORDENADOR_GERAL: ALL_EXCEPT(['DELETE_USERS', 'MANAGE_SYSTEM']),
  MEDICO: [
    'MANAGE_PRESCRIPTIONS',
    'MANAGE_CLINICAL_NOTES',
    // ... 30 permissões
  ],
  // ... outros cargos
};
```

### Atualização de Permissões

**Ao adicionar nova permissão:**

1. Adicionar enum de permissão
2. Atualizar `PERMISSIONS_BY_POSITION` no seed
3. Rodar `npx prisma db seed` novamente
4. Permissões são mescladas (não substituídas)

## Regras de Negócio

### Hierarquia de Acesso

**Nível 1 - ADMIN:**
- ✅ Acesso irrestrito a todas as funcionalidades
- ✅ Bypass de todas as verificações de permissão
- ✅ Pode criar/editar/deletar tudo

**Nível 2 - USER (com PositionCode):**
- ✅ Permissões definidas pelo cargo
- ✅ Pode receber permissões customizadas adicionais
- ✅ Não pode ter permissões removidas do cargo (apenas adicionar)

**Nível 3 - VIEWER:**
- ✅ Somente visualização (VIEW_* permissions)
- ✅ Não pode criar, editar ou deletar
- ✅ Acesso a relatórios e consultas

### Restrições Especiais

**Multi-tenancy:**
- ✅ Permissões válidas apenas dentro do próprio tenant
- ✅ Admin de Tenant A não acessa dados do Tenant B
- ✅ Isolamento total de dados

**Soft Delete:**
- ✅ DELETE_* permissions = soft delete (marca deletedAt)
- ✅ Apenas ADMIN pode fazer hard delete
- ✅ Dados excluídos não aparecem em queries normais

**Auditoria:**
- ✅ Todas as ações com permissões são logadas
- ✅ userId registrado em criações/edições
- ✅ Histórico de mudanças de permissões

## Validações

### Backend

**Validação em endpoint:**

```typescript
@Post()
@RequirePermissions('CREATE_PRESCRIPTIONS')
async create(@Body() dto: CreateDto, @CurrentUser() user: User) {
  // 1. Guard já validou a permissão
  // 2. Aqui já sabemos que o usuário TEM a permissão
  // 3. Podemos fazer validações adicionais

  if (!user.positionCode || user.positionCode === 'CUIDADOR') {
    throw new ForbiddenException('Cuidadores não podem criar prescrições');
  }

  return this.service.create(dto);
}
```

### Frontend

**Validação dupla (UI + API):**

```tsx
// 1. Esconder botão se não tiver permissão
<PermissionGate permission="DELETE_RESIDENTS">
  <Button onClick={handleDelete}>Excluir</Button>
</PermissionGate>

// 2. API também valida (segurança em camadas)
async function handleDelete() {
  try {
    await api.delete(`/residents/${id}`);
  } catch (error) {
    if (error.status === 403) {
      toast.error('Você não tem permissão para excluir residentes');
    }
  }
}
```

## Integrações

### Com Módulo de Usuários
- ✅ Campos `role`, `positionCode`, `permissions` no model User
- ✅ Endpoint `/api/users/:id/permissions` para gerenciar permissões
- ✅ Validação ao criar/editar usuários

### Com Todos os Módulos
- ✅ Decorator `@RequirePermissions()` em todos os controllers
- ✅ Permissões específicas para cada operação (CREATE, VIEW, UPDATE, DELETE, MANAGE)
- ✅ Verificação automática via PermissionsGuard

### Com Autenticação
- ✅ Permissões carregadas no token JWT
- ✅ Verificação em cada request
- ✅ Refresh ao atualizar permissões

## Tratamento de Erros

**403 Forbidden:**

```typescript
// Backend
throw new ForbiddenException('Você não tem permissão para executar esta ação');

// Frontend
if (error.status === 403) {
  toast.error('Acesso negado. Verifique suas permissões.');
  router.push('/dashboard');
}
```

**Permissão não encontrada:**

```typescript
if (!VALID_PERMISSIONS.includes(permission)) {
  throw new BadRequestException(`Permissão inválida: ${permission}`);
}
```

## Referências

- [CHANGELOG - 2025-12-02](../../CHANGELOG.md#2025-12-02---sistema-de-permissões-rbac-para-ilpi)
- [Módulo de Usuários](../architecture/authentication.md) - Integração com autenticação
- [Multi-Tenancy](../architecture/multi-tenancy.md) - Isolamento de permissões por tenant

---

**Desenvolvedor:** Emanuel (Dr. E.) + Claude Sonnet 4.5
