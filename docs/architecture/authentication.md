# Sistema de Autenticação e Autorização

**Versão:** 2.0.0
**Última atualização:** 15/01/2026

## Visão Geral

Sistema de autenticação JWT com refresh tokens, multi-tenancy e permissões granulares baseadas em cargos (RBAC + ABAC híbrido).

### Características Principais

- ✅ **JWT** com access token (15min) e refresh token (7 dias)
- ✅ **Multi-tenant aware:** Token sempre inclui `tenantId`
- ✅ **Múltiplos tenants por usuário:** Um usuário pode trabalhar em várias ILPIs
- ✅ **RBAC básico:** Roles (`ADMIN`, `MANAGER`, `USER`, `VIEWER`)
- ✅ **ABAC granular:** Permissões específicas por cargo profissional
- ✅ **Senha segura:** Bcrypt com salt rounds = 10
- ✅ **Guards automáticos:** JWT + Permissions validados em toda request

---

## Fluxo de Autenticação

### 1. Login (Tenant Único)

```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant A as AuthService
    participant P as Prisma (Tenants)

    U->>F: POST /auth/login {email, password}
    F->>A: Valida credenciais
    A->>P: Busca user em TODOS os tenant schemas
    P-->>A: Retorna usuários encontrados

    alt Apenas 1 tenant
        A->>A: Valida senha (bcrypt)
        A->>A: Gera JWT com tenantId
        A-->>F: {accessToken, refreshToken, user}
        F->>F: Armazena tokens em localStorage
        F-->>U: Redireciona para /dashboard
    end

    alt Múltiplos tenants
        A-->>F: {requiresTenantSelection: true, tenants: [...]}
        F-->>U: Mostra seletor de ILPI
    end
```

### 2. Login (Múltiplos Tenants)

```typescript
// STEP 1: Login inicial
POST /auth/login
{
  "email": "joao@email.com",
  "password": "senha123"
}

// RESPONSE: Múltiplos tenants
{
  "requiresTenantSelection": true,
  "tenants": [
    {
      "id": "uuid-tenant-a",
      "name": "ILPI Boa Vida",
      "role": "MANAGER"
    },
    {
      "id": "uuid-tenant-b",
      "name": "ILPI Vida Nova",
      "role": "USER"
    }
  ]
}

// STEP 2: Usuário seleciona tenant
POST /auth/login/select-tenant
{
  "email": "joao@email.com",
  "password": "senha123",
  "tenantId": "uuid-tenant-a"
}

// RESPONSE: Token com tenant específico
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-user",
    "email": "joao@email.com",
    "tenantId": "uuid-tenant-a",
    "role": "MANAGER"
  }
}
```

### 3. Refresh Token

```typescript
// Access token expira em 15min
POST /auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

// RESPONSE: Novo access token
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { /* dados atualizados */ }
}
```

### 4. Trocar de Tenant (sem logout)

```typescript
// Usuário clica em "Trocar ILPI"
POST /auth/switch-tenant
Authorization: Bearer {current-access-token}
{
  "newTenantId": "uuid-tenant-b"
}

// Sistema valida que user tem acesso ao tenant
// RESPONSE: Novo JWT com tenantId atualizado
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-user",
    "email": "joao@email.com",
    "tenantId": "uuid-tenant-b", // ✅ Atualizado
    "role": "USER"
  }
}
```

---

## JWT Payload

### Access Token (15 minutos)

```typescript
interface JwtPayload {
  sub: string;          // userId (UUID)
  email: string;        // Email do usuário
  tenantId: string;     // ✅ SEMPRE presente (UUID)
  role: string;         // Role básico
  positionCode: string; // Cargo profissional (para permissões)
  iat: number;          // Issued at (timestamp)
  exp: number;          // Expiration (timestamp)
}
```

### Refresh Token (7 dias)

```typescript
interface RefreshTokenPayload {
  sub: string;       // userId
  tenantId: string;  // tenantId
  type: 'refresh';   // Identificador de tipo
  iat: number;
  exp: number;
}
```

**Armazenamento:**
- Frontend: `localStorage.setItem('accessToken', token)`
- Refresh token: `localStorage.setItem('refreshToken', token)`
- **Segurança:** Tokens não são httpOnly cookies (SPA architecture)

---

## Guards e Decorators

### 1. JwtAuthGuard

Valida se o access token é válido:

```typescript
// Aplicado em TODA rota protegida
@UseGuards(JwtAuthGuard)
@Get('residents')
async getResidents(@CurrentUser() user: JwtPayload) {
  // user.tenantId está disponível
  return this.residentsService.findAll();
}
```

### 2. PermissionsGuard

Valida se usuário tem permissão específica:

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionType.CREATE_RESIDENT)
@Post('residents')
async createResident(
  @Body() dto: CreateResidentDto,
  @CurrentUser() user: JwtPayload
) {
  return this.residentsService.create(dto);
}
```

### 3. Decorator @CurrentUser

Extrai user do JWT:

```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Injetado pelo JwtAuthGuard
  },
);
```

### 4. Decorator @Public (Rotas Públicas)

```typescript
@Public()
@Get('health')
async healthCheck() {
  return { status: 'ok' };
}
```

---

## Sistema de Permissões

### Estrutura

**3 níveis de controle:**

1. **Roles básicos** (4 tipos)
   - `ADMIN` - Acesso total no tenant
   - `MANAGER` - Gerenciamento operacional
   - `USER` - Acesso padrão (operacional)
   - `VIEWER` - Apenas leitura

2. **Permissões por cargo** (`PositionCode`)
   - Cada cargo profissional tem permissões padrão
   - Ex: `ENFERMEIRO` → pode administrar medicações
   - Ex: `MEDICO` → pode prescrever medicações
   - Ex: `ASSISTENTE_SOCIAL` → acesso a dados sociais

3. **Permissões customizadas** (tabela `user_permissions`)
   - Concedidas individualmente pelo ADMIN
   - Sobrescrevem permissões padrão do cargo
   - Auditadas (`grantedBy`, `grantedAt`)

### Enum de Permissões (Principais)

```typescript
enum PermissionType {
  // Residentes
  VIEW_RESIDENTS = 'VIEW_RESIDENTS',
  CREATE_RESIDENT = 'CREATE_RESIDENT',
  UPDATE_RESIDENT = 'UPDATE_RESIDENT',
  DELETE_RESIDENT = 'DELETE_RESIDENT',

  // Medicações
  VIEW_MEDICATIONS = 'VIEW_MEDICATIONS',
  PRESCRIBE_MEDICATIONS = 'PRESCRIBE_MEDICATIONS',
  ADMINISTER_MEDICATIONS = 'ADMINISTER_MEDICATIONS',

  // Prontuário
  VIEW_CLINICAL_RECORDS = 'VIEW_CLINICAL_RECORDS',
  CREATE_CLINICAL_NOTE = 'CREATE_CLINICAL_NOTE',

  // Leitos
  VIEW_BEDS = 'VIEW_BEDS',
  MANAGE_BEDS = 'MANAGE_BEDS',
  TRANSFER_RESIDENT = 'TRANSFER_RESIDENT',

  // Usuários
  VIEW_USERS = 'VIEW_USERS',
  CREATE_USER = 'CREATE_USER',
  MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS',

  // ... total de 60+ permissões
}
```

### Verificação de Permissões

**No Backend:**

```typescript
@Injectable()
export class PermissionsService {
  async getUserAllPermissions(userId: string): Promise<PermissionType[]> {
    // 1. Buscar user no tenant schema
    const user = await this.tenantContext.client.user.findUnique({
      where: { id: userId },
      include: { userProfile: true },
    });

    // 2. Permissões do cargo (default)
    const positionPermissions =
      DEFAULT_PERMISSIONS_BY_POSITION[user.userProfile.positionCode] || [];

    // 3. Permissões customizadas (sobrescreve)
    const customPermissions = await this.tenantContext.client.userPermission.findMany({
      where: { userId },
      select: { permissionType: true },
    });

    // 4. Merge (custom sobrescreve default)
    return [...new Set([...positionPermissions, ...customPermissions.map(p => p.permissionType)])];
  }

  async userHasPermission(userId: string, permission: PermissionType): Promise<boolean> {
    const permissions = await this.getUserAllPermissions(userId);
    return permissions.includes(permission);
  }
}
```

**No Frontend:**

```typescript
const { data: permissions } = useQuery({
  queryKey: ['permissions', user.id],
  queryFn: () => api.get(`/permissions/user/${user.id}/all`),
});

const canCreateResident = permissions?.includes('CREATE_RESIDENT');

<Button disabled={!canCreateResident}>
  Novo Residente
</Button>
```

---

## Segurança

### Password Hashing

```typescript
import * as bcrypt from 'bcrypt';

// Ao criar usuário
const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

// Ao validar login
const isValid = await bcrypt.compare(inputPassword, user.password);
```

### Token Secrets

```env
# .env
JWT_SECRET=chave-secreta-complexa-256-bits
JWT_EXPIRATION=15m
REFRESH_TOKEN_SECRET=outra-chave-secreta-256-bits
REFRESH_TOKEN_EXPIRATION=7d
```

**Geração de secrets seguros:**

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Headers HTTP

**Request com autenticação:**

```http
GET /api/residents HTTP/1.1
Host: localhost:3000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Response (desabilita cache para dados sensíveis):**

```typescript
@Get('me')
async getMyProfile(
  @CurrentUser() user: any,
  @Res({ passthrough: true }) res: any,
) {
  // Desabilitar cache HTTP
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  return this.userProfilesService.findMyProfile(user.id);
}
```

---

## Isolamento Multi-Tenant

### TenantContextInterceptor

Inicializa automaticamente o contexto do tenant:

```typescript
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Extraído do JWT pelo JwtAuthGuard

    // Inicializar contexto do tenant
    if (user?.tenantId) {
      await this.tenantContext.initialize(user.tenantId);
    }

    return next.handle();
  }
}
```

### Garantia de Isolamento

- ✅ JWT **sempre** inclui `tenantId`
- ✅ Interceptor inicializa client do schema correto
- ✅ Impossível acessar dados de outro tenant
- ✅ Queries automáticas no schema isolado

---

## Fluxo Completo (Diagrama)

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│  1. POST /auth/login                                    │
│  2. Recebe {accessToken, refreshToken}                  │
│  3. Armazena em localStorage                            │
│  4. Configura Axios interceptor                         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Authorization: Bearer {token}
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   BACKEND (NestJS)                       │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │              JwtAuthGuard                        │   │
│  │  - Valida token                                  │   │
│  │  - Extrai payload → request.user                │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐   │
│  │        TenantContextInterceptor                  │   │
│  │  - Extrai tenantId do JWT                        │   │
│  │  - Inicializa TenantContextService               │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐   │
│  │           PermissionsGuard (opcional)            │   │
│  │  - Valida permissão específica                   │   │
│  └─────────────────┬───────────────────────────────┘   │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐   │
│  │                Controller                         │   │
│  │  - Acessa this.tenantContext.client              │   │
│  │  - Dados já isolados por schema                  │   │
│  └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

---

## Referências

- **Sistema de Permissões:** [../modules/permissions.md](../modules/permissions.md) (TODO)
- **Multi-Tenancy:** [multi-tenancy.md](./multi-tenancy.md)
- **Isolamento de Dados:** [MULTI-TENANT-ISOLATION.md](./MULTI-TENANT-ISOLATION.md)
- **JWT.io:** https://jwt.io (debug de tokens)

---

**Última atualização:** 15/01/2026
**Mantido por:** Dr. Emanuel
