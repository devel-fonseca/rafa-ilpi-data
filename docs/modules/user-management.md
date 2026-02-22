# Módulo: Gestão de Usuários (User Management)

> **Documento complementar (não canônico)**
> Referências principais de implementação:
> - [admin](./admin.md)
> - [user-profiles](./user-profiles.md)
> - [permissions](./permissions.md)
> Uso: documentação histórica da implementação anterior de gestão de usuários.

**Status:** ✅ Implementado
**Versão:** 2.0.0
**Última atualização:** 23/12/2025

## Visão Geral

Sistema completo de gestão de usuários com interface dedicada de criação, recomendação inteligente de roles, validações contextuais e integração com sistema de permissões ILPI. Substitui modal de 1300 linhas por página organizada de 530 linhas com UX otimizada.

## Funcionalidades Principais

- ✅ **Página Dedicada de Criação**: Interface organizada em 4 seções com progressive disclosure
- ✅ **Recomendação Inteligente de Roles**: Sistema sugere role apropriada baseado em cargo + flags
- ✅ **Validação de Perfil ILPI**: Suporte completo a positionCode, registrationType, flags especiais
- ✅ **Tratamento Contextual de Erros**: Mensagens específicas com CTAs (ex: upgrade de plano)
- ✅ **Progressive Disclosure**: Seções condicionais aparecem baseadas em seleções
- ✅ **Defense in Depth**: Validações no frontend (UX) + backend (segurança)

## Arquitetura

### Backend
- **Controller:** [apps/backend/src/tenants/tenants.controller.ts](../../apps/backend/src/tenants/tenants.controller.ts)
- **Service:** [apps/backend/src/tenants/tenants.service.ts](../../apps/backend/src/tenants/tenants.service.ts)
- **DTOs:** [apps/backend/src/tenants/dto/add-user.dto.ts](../../apps/backend/src/tenants/dto/add-user.dto.ts)
- **User Profiles Service:** [apps/backend/src/user-profiles/user-profiles.service.ts](../../apps/backend/src/user-profiles/user-profiles.service.ts)
- **User Profiles DTO:** [apps/backend/src/user-profiles/dto/create-user-profile.dto.ts](../../apps/backend/src/user-profiles/dto/create-user-profile.dto.ts)

### Frontend
- **Página de Criação:** [apps/frontend/src/pages/users/UserCreatePage.tsx](../../apps/frontend/src/pages/users/UserCreatePage.tsx)
- **Lista de Usuários:** [apps/frontend/src/pages/users/UsersList.tsx](../../apps/frontend/src/pages/users/UsersList.tsx)
- **Role Selector:** [apps/frontend/src/components/users/RoleSelectorWithSuggestion.tsx](../../apps/frontend/src/components/users/RoleSelectorWithSuggestion.tsx)
- **Position Selector:** [apps/frontend/src/components/users/PositionCodeSelector.tsx](../../apps/frontend/src/components/users/PositionCodeSelector.tsx)
- **Role Recommendation:** [apps/frontend/src/utils/roleRecommendation.ts](../../apps/frontend/src/utils/roleRecommendation.ts)
- **API Service:** [apps/frontend/src/services/api.ts](../../apps/frontend/src/services/api.ts)
- **Routes:** [apps/frontend/src/routes/index.tsx](../../apps/frontend/src/routes/index.tsx)

## Fluxo de Criação de Usuário

### 1. Navegação
```
UsersList (click "Adicionar Usuário")
  → navigate('/dashboard/usuarios/new')
  → UserCreatePage (ProtectedRoute requiredRole="ADMIN")
```

### 2. Preenchimento do Formulário

**Seção 1: Dados Básicos** (sempre visível)
- Nome Completo* (obrigatório)
- Email* (obrigatório)
- CPF (opcional)
- Senha Temporária (opcional, auto-gerada se vazio)
- ☑ Enviar email de convite (default: true)

**Seção 2: Permissões e Cargo** (sempre visível)
- **Cargo ILPI**: Select com 17 opções (PositionCode)
- **Flags Especiais**:
  - ☑ Responsável Técnico da ILPI (RT)
  - ☑ Coordenador de Enfermagem
- **Role do Sistema**: Auto-sugerida baseada em cargo + flags
  - Feedback visual: 🔵 bloqueado | 🟡 diferente da sugestão | 🟢 correto

**Seção 3: Registro Profissional** (condicional: só se cargo selecionado)
- Tipo de Registro: COREN | CRM | CRP | CRESS | CREFITO | CRN | CREFONO | NONE
- Número do Registro
- UF do Registro (2 letras)

**Seção 4: Dados Administrativos** (sempre visível)
- Departamento
- Telefone
- Data de Nascimento (input type="date")

### 3. Validações

**Client-Side (Frontend):**
```typescript
// Validações obrigatórias
if (!formData.name.trim()) {
  toast.error('Nome é obrigatório')
  return
}

if (!formData.email.trim()) {
  toast.error('Email é obrigatório')
  return
}
```

**Server-Side (Backend):**
- Email único por tenant
- Limite de usuários do plano (5 para básico, 20 para profissional, ilimitado para enterprise)
- Validação de role válida: `ADMIN | MANAGER | USER | VIEWER`
- Validação de CPF (formato e dígitos verificadores)
- Senha temporária mínimo 8 caracteres com maiúscula, minúscula, número e caractere especial

### 4. Submissão

```typescript
// 1. Mapear role frontend → backend
const roleMapping = {
  admin: 'ADMIN',
  manager: 'MANAGER',
  staff: 'USER',    // ← Conversão crítica
  viewer: 'VIEWER',
}

// 2. Criar usuário
const newUser = await addUserToTenant(tenantId, {
  name, email, role: roleMapping[formData.role],
  sendInviteEmail, temporaryPassword
})
// Backend retorna: { user: {...}, temporaryPassword?: ... }
// API extrai: response.data.user

// 3. Criar perfil ILPI (se cargo selecionado)
if (formData.positionCode) {
  await createUserProfile(newUser.id, {
    positionCode, department, registrationType,
    registrationNumber, registrationState,
    phone, cpf, birthDate, // ← birthDate como ISO string
    isTechnicalManager, isNursingCoordinator
  })
}

// 4. Navegação
toast.success('Usuário criado com sucesso!')
navigate('/dashboard/usuarios')
```

## Sistema de Recomendação de Roles

### Lógica de Recomendação

```typescript
function getRoleRecommendation(
  positionCode: PositionCode | null,
  isTechnicalManager: boolean,
  isNursingCoordinator: boolean
): RoleRecommendation {
  // Prioridade 1: RT sempre admin (não pode sobrescrever)
  if (isTechnicalManager) {
    return {
      suggestedRole: 'admin',
      reason: 'Responsável Técnico exige acesso administrativo total',
      allowOverride: false,
      warning: 'RT sempre recebe role "admin" por exigência regulatória (RDC 502/2021)'
    }
  }

  // Prioridade 2: Coordenador de Enfermagem (mínimo manager)
  if (isNursingCoordinator) {
    const defaultRole = positionCode ? POSITION_DEFAULT_ROLES[positionCode] : 'staff'
    const suggestedRole = defaultRole === 'admin' ? 'admin' : 'manager'
    return {
      suggestedRole,
      reason: 'Coordenador de Enfermagem requer role de gestão',
      allowOverride: true
    }
  }

  // Prioridade 3: Cargo ILPI
  if (positionCode) {
    return {
      suggestedRole: POSITION_DEFAULT_ROLES[positionCode],
      reason: `Role recomendada para ${getPositionDisplayName(positionCode)}`,
      allowOverride: true
    }
  }

  // Default: staff
  return {
    suggestedRole: 'staff',
    reason: 'Role padrão para usuários sem cargo definido',
    allowOverride: true
  }
}
```

### Mapeamento Cargo → Role Padrão

```typescript
const POSITION_DEFAULT_ROLES: Record<PositionCode, UserRole> = {
  // Gestão → admin
  ADMINISTRATOR: 'admin',
  TECHNICAL_DIRECTOR: 'admin',
  GENERAL_COORDINATOR: 'admin',

  // Nível Superior → manager
  DOCTOR: 'manager',
  NURSE: 'manager',
  PHYSIOTHERAPIST: 'manager',
  NUTRITIONIST: 'manager',
  PSYCHOLOGIST: 'manager',
  SOCIAL_WORKER: 'manager',
  OCCUPATIONAL_THERAPIST: 'manager',
  SPEECH_THERAPIST: 'manager',

  // Nível Técnico/Auxiliar → staff
  NURSING_TECHNICIAN: 'staff',
  NURSING_ASSISTANT: 'staff',
  CAREGIVER: 'staff',
  RECEPTIONIST: 'staff',
  GENERAL_SERVICES: 'staff',
}
```

### Interface RoleRecommendation

```typescript
interface RoleRecommendation {
  suggestedRole: UserRole      // 'admin' | 'manager' | 'staff' | 'viewer'
  reason: string                // Justificativa da sugestão
  allowOverride: boolean        // Se usuário pode mudar
  warning?: string              // Aviso adicional (ex: RT bloqueado)
}
```

## Componente RoleSelectorWithSuggestion

### Feedback Visual

| Situação | Cor | Ícone | Mensagem |
|----------|-----|-------|----------|
| Role bloqueada (RT) | 🔵 Azul | Lock | "Role bloqueada: {reason}" |
| Diferente da sugestão | 🟡 Amarelo | AlertTriangle | "Atenção: Role sugerida é {role}" |
| Seguindo recomendação | 🟢 Verde | CheckCircle2 | "✓ Recomendação seguida: {reason}" |

### Exemplo de Uso

```tsx
<RoleSelectorWithSuggestion
  value={formData.role}
  onValueChange={(value) => setFormData({ ...formData, role: value })}
  positionCode={formData.positionCode}
  isTechnicalManager={formData.isTechnicalManager}
  isNursingCoordinator={formData.isNursingCoordinator}
/>
```

## Tratamento de Erros

### Erro: Limite do Plano

```typescript
if (errorMessage.includes('Limite de usuários') || errorMessage.includes('plano')) {
  toast.error(errorMessage, {
    duration: 10000,
    description: 'Considere fazer upgrade do plano para adicionar mais usuários à sua equipe.',
    action: {
      label: 'Ver Planos',
      onClick: () => {
        window.open('https://wa.me/5511999999999?text=Gostaria%20de%20fazer%20upgrade%20do%20plano', '_blank')
      }
    }
  })
}
```

**Mensagem exibida:**
```
❌ Limite de usuários do plano básico atingido (5 usuários)

Considere fazer upgrade do plano para adicionar mais usuários à sua equipe.

[Ver Planos] ← Link para WhatsApp
```

### Outros Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `Email já cadastrado nesta ILPI` | Email duplicado no tenant | Usar email diferente |
| `CNPJ já cadastrado` | CNPJ duplicado | Verificar se tenant já existe |
| `Usuário criado mas ID não foi retornado` | Backend retornou estrutura aninhada | API extrai `.user` automaticamente |
| `Validation failed (uuid is expected)` | birthDate enviada como Date object | Enviar como ISO string |

## API Endpoints

### POST /tenants/:tenantId/users

**Request:**
```json
{
  "name": "João Silva Santos",
  "email": "joao@exemplo.com",
  "role": "USER",
  "sendInviteEmail": true,
  "temporaryPassword": "Senha@123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "name": "João Silva Santos",
    "email": "joao@exemplo.com",
    "role": "USER",
    "isActive": true,
    "createdAt": "2025-12-23T..."
  },
  "temporaryPassword": "Senha@123"
}
```

### POST /user-profiles/:userId

**Request:**
```json
{
  "positionCode": "NURSE",
  "department": "Enfermagem",
  "registrationType": "COREN",
  "registrationNumber": "123456",
  "registrationState": "SP",
  "phone": "(11) 98765-4321",
  "cpf": "123.456.789-00",
  "birthDate": "1990-05-15",
  "isTechnicalManager": false,
  "isNursingCoordinator": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "tenantId": "uuid",
  "positionCode": "NURSE",
  "department": "Enfermagem",
  "registrationType": "COREN",
  "registrationNumber": "123456",
  "registrationState": "SP",
  "phone": "(11) 98765-4321",
  "cpf": "123.456.789-00",
  "birthDate": "1990-05-15T00:00:00.000Z",
  "isTechnicalManager": false,
  "isNursingCoordinator": true,
  "createdAt": "2025-12-23T...",
  "updatedAt": "2025-12-23T..."
}
```

## Rotas Frontend

```typescript
{
  path: 'usuarios',
  element: (
    <ProtectedRoute requiredRole="ADMIN">
      <UsersList />
    </ProtectedRoute>
  ),
},
{
  path: 'usuarios/new',
  element: (
    <ProtectedRoute requiredRole="ADMIN">
      <UserCreatePage />
    </ProtectedRoute>
  ),
},
```

## Padrões de Design Aplicados

### 1. Progressive Disclosure
- Seção "Registro Profissional" só aparece se cargo selecionado
- Reduz sobrecarga cognitiva mostrando apenas campos relevantes

### 2. Defense in Depth
- **Frontend**: Validações de UX (mensagens amigáveis, feedback imediato)
- **Backend**: Validações de segurança (SQL injection, XSS, CSRF)

### 3. Smart Defaults
- Role auto-sugerida baseada em contexto
- Email de convite habilitado por padrão
- Reduz erros de configuração

### 4. Guided UX
- Alertas coloridos orientam sobre role apropriada
- Tooltips explicam hierarquia administrativa
- Checkmark visual na opção recomendada

### 5. Separation of Concerns
- **Lógica de negócio**: `utils/roleRecommendation.ts`
- **Componentes reutilizáveis**: `components/users/`
- **Serviços de API**: `services/api.ts`
- **Páginas**: `pages/users/`

## Bugs Resolvidos (Histórico)

### 1. Role Mapping Mismatch
**Problema**: Frontend enviava `role: 'STAFF'` mas backend só aceita `ADMIN | MANAGER | USER | VIEWER`
**Solução**: Objeto `roleMapping` convertendo `staff → USER`
**Commit**: 2025-12-23

### 2. Perfil ILPI Incompleto
**Problema**: Usuários criados sem `positionCode`, `isTechnicalManager`, campos de registro
**Causa Raiz**: `UserProfilesService.create()` não salvava campos ILPI
**Solução**: Adicionados 6 campos ao `.create()`
**Commit**: 2025-12-23

### 3. Erro de Validação UUID (birthDate)
**Problema**: Backend rejeitava `birthDate` com erro de tipo
**Causa Raiz**: Frontend enviava `Date` object, backend esperava ISO string
**Solução**: Enviar `birthDate.trim()` como string
**Commit**: 2025-12-23

### 4. `newUser.id` undefined
**Problema**: Usuário criado mas ID não acessível
**Causa Raiz**: Backend retorna `{ user: {...}, temporaryPassword?: ... }` aninhado
**Solução**: Extrair `response.data.user` em `addUserToTenant()`
**Commit**: 2025-12-23

### 5. Mensagem Genérica de Limite
**Problema**: Erro genérico sem orientação
**Solução**: Toast contextual com CTA "Ver Planos"
**Commit**: 2025-12-23

## Exemplos de Uso

### Exemplo 1: Criar Enfermeiro Coordenador

```typescript
// Dados preenchidos
formData = {
  name: 'Maria Santos',
  email: 'maria@exemplo.com',
  cpf: '123.456.789-00',
  role: 'manager', // Auto-sugerido
  sendInviteEmail: true,
  temporaryPassword: '',

  positionCode: 'NURSE',
  department: 'Enfermagem',
  registrationType: 'COREN',
  registrationNumber: '123456',
  registrationState: 'SP',
  phone: '(11) 98765-4321',
  birthDate: '1985-03-20',

  isTechnicalManager: false,
  isNursingCoordinator: true, // ← Flag ativa
}

// Sistema sugere: manager (pode sobrescrever para admin)
// Feedback: 🟢 "Coordenador de Enfermagem requer role de gestão"
```

### Exemplo 2: Criar Responsável Técnico (RT)

```typescript
formData = {
  name: 'Dr. João Souza',
  email: 'rt@exemplo.com',
  positionCode: 'DOCTOR',
  isTechnicalManager: true, // ← Flag RT
  isNursingCoordinator: false,
  role: 'admin', // Auto-sugerido e BLOQUEADO
}

// Sistema sugere: admin (NÃO pode sobrescrever)
// Feedback: 🔵 "Role bloqueada: RT sempre admin por exigência regulatória"
// Warning: "RT sempre recebe role 'admin' por exigência regulatória (RDC 502/2021)"
```

### Exemplo 3: Criar Cuidador Sem Cargo

```typescript
formData = {
  name: 'Ana Costa',
  email: 'ana@exemplo.com',
  positionCode: null, // Sem cargo
  isTechnicalManager: false,
  isNursingCoordinator: false,
  role: 'staff', // Auto-sugerido
}

// Sistema sugere: staff (pode sobrescrever)
// Feedback: 🟢 "Role padrão para usuários sem cargo definido"
```

## Melhorias Futuras

### Funcionalidades Planejadas
- [ ] **UserEditPage.tsx**: Página de edição similar à criação
  - Requer endpoint PATCH no backend para atualizar role/email
  - Validação de mudanças sensíveis (ex: RT não pode perder flag)

- [ ] **Filtros e Busca**:
  - Busca por nome/email
  - Filtro por role, cargo, departamento
  - Filtro por status (ativo/inativo)

- [ ] **Bulk Actions**:
  - Ativar/desativar múltiplos usuários
  - Exportar lista de usuários (CSV/Excel)
  - Envio em massa de emails de convite

### Otimizações
- [ ] Cache de lista de usuários (React Query)
- [ ] Lazy loading de lista (paginação infinita)
- [ ] Validação assíncrona de email (verificar duplicata enquanto digita)

## Referências

- [Documentação de Permissões](./permissions.md)
- [RDC 502/2021 - ANVISA](https://www.gov.br/anvisa/pt-br/assuntos/servicosdesaude/instituicoes-de-longa-permanencia-para-idosos-ilpi)
- [Guia de Permissões](../PERMISSIONS_GUIDE.md)
- [Arquitetura Multi-Tenancy](../architecture/multi-tenancy.md)
