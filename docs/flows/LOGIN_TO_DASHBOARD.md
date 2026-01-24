# 📋 Fluxo Completo: Login → Dashboard - Rafa ILPI

**Data:** 2026-01-23
**Versão:** 1.0.0

---

## 🎯 Visão Geral

Este documento mapeia o **fluxo end-to-end** desde a tela de login até o carregamento do dashboard, incluindo todas as camadas: **Frontend (React)**, **API (Axios)**, **Backend (NestJS)**, **Autenticação (JWT)**, e **Banco de Dados (PostgreSQL Multi-Schema)**.

---

## 📊 Diagrama de Fluxo Resumido

```
┌─────────────────────────────────────────────────────────────┐
│                    1. LOGIN (Frontend)                       │
│  Login.tsx → auth.store.ts → api.post('/auth/login')       │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    2. AUTENTICAÇÃO (Backend)                 │
│  AuthController → AuthService → Multi-Schema User Discovery │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│           3. RESPOSTA (Single ou Multi-Tenant)              │
│  • Single: { user, accessToken, refreshToken }             │
│  • Multi: { requiresTenantSelection: true, tenants: [...] } │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              4. PERSISTÊNCIA (Frontend State)                │
│  auth.store.ts → localStorage + axios defaults              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              5. REDIRECIONAMENTO (React Router)              │
│  Login.tsx useEffect → /dashboard ou /force-password-change │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              6. PROTEÇÃO DE ROTA (ProtectedRoute)            │
│  Verifica isAuthenticated, role, permissions                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│              7. CARREGAMENTO DO DASHBOARD                    │
│  Dashboard.tsx → useQuery hooks → api.get('/...')           │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│         8. VALIDAÇÃO JWT (Backend - Cada Request)            │
│  JwtAuthGuard → JwtStrategy → TenantContext.initialize()    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│          9. RESPOSTA DE DADOS (Tenant-Scoped)               │
│  Service → tenantContext.client.model.findMany()            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 PASSO 1: Submissão do Login (Frontend)

### Arquivo: [apps/frontend/src/pages/auth/Login.tsx](../../apps/frontend/src/pages/auth/Login.tsx)

**Linha 46-62: Handler de Submissão**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  clearError()

  try {
    const result = await login(formData.email, formData.password) // Chama Zustand store

    if (result?.requiresTenantSelection) {
      setShowTenantSelection(true) // Mostrar seletor de ILPI
      setSelectedTenantId(result.tenants[0].id)
    }
    // Redirecionamento automático via useEffect (linhas 24-39)
  } catch (err) {
    console.error('Erro no login:', err)
  }
}
```

**Linha 24-39: Redirecionamento Automático**

```typescript
useEffect(() => {
  if (isAuthenticated && user) {
    // ✅ Verificar se precisa trocar senha obrigatoriamente
    if (user.passwordResetRequired) {
      navigate('/force-password-change')
      return
    }

    // Redirecionar SUPERADMIN para portal específico
    if (user.role === 'SUPERADMIN') {
      navigate('/superadmin')
    } else {
      navigate('/dashboard')
    }
  }
}, [isAuthenticated, user, navigate])
```

---

## 🗄️ PASSO 2: Gerenciamento de Estado (Zustand)

### Arquivo: [apps/frontend/src/stores/auth.store.ts](../../apps/frontend/src/stores/auth.store.ts)

**Linha 73-124: Função `login()`**

```typescript
login: async (email: string, password: string) => {
  set({ isLoading: true, error: null })

  try {
    const response = await api.post('/auth/login', { email, password })

    // Se usuário tem múltiplos tenants, retornar lista
    if (response.data.requiresTenantSelection) {
      set({
        availableTenants: response.data.tenants,
        isLoading: false,
      })
      return response.data
    }

    // Login direto (único tenant)
    const { user, accessToken, refreshToken } = response.data

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    })

    // ✅ Configurar token no axios (interceptor usa isso)
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

    return response.data
  } catch (error: unknown) {
    // Tratamento de erro...
    set({
      error: errorResponse?.data?.message || 'Erro ao fazer login',
      isLoading: false,
    })
    throw error
  }
}
```

**Linha 322-330: Persistência no localStorage**

```typescript
{
  name: 'rafa-ilpi-auth',
  partialize: (state) => ({
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    isAuthenticated: state.isAuthenticated,
  }),
}
```

---

## 🌐 PASSO 3: Requisição HTTP (Axios Interceptor)

### Arquivo: [apps/frontend/src/services/api.ts](../../apps/frontend/src/services/api.ts)

**Linha 18-68: Request Interceptor**

```typescript
api.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}` // ✅ Adiciona JWT
    }

    // Headers anti-cache
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'

    // ⚠️ VALIDAÇÃO DEV: Bloquear tenantId em requests
    if (import.meta.env.DEV && !isSuperAdminRoute && !isAuthRoute) {
      const hasTenantIdInData = config.data && 'tenantId' in config.data

      if (hasTenantIdInData) {
        throw new Error(
          '❌ Frontend não deve enviar tenantId - backend extrai do JWT!'
        )
      }
    }

    return config
  }
)
```

**Linha 94-166: Response Interceptor (Refresh Token)**

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Se token expirou (401) e não é retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Mutex: evitar múltiplos refresh simultâneos
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest) // Retry request
        })
      }

      isRefreshing = true
      const refreshToken = useAuthStore.getState().refreshToken

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        })

        const { accessToken } = response.data

        // Atualiza token no store e axios
        useAuthStore.getState().updateToken(accessToken)
        processQueue(null, accessToken) // Processa fila de requests pendentes

        // Retry requisição original
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        isRefreshing = false
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh falhou - redirecionar para /session-expired
        processQueue(refreshError, null)
        isRefreshing = false
        tryLogoutOnExpiration() // Registrar logout no backend (fire-and-forget)
        useAuthStore.getState().clearAuth()
        window.location.href = '/session-expired'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)
```

---

## 🔐 PASSO 4: Endpoint de Login (Backend)

### Arquivo: [apps/backend/src/auth/auth.controller.ts](../../apps/backend/src/auth/auth.controller.ts)

**Linha 51-57: POST /auth/login**

```typescript
@Public()
@Post('login')
@HttpCode(HttpStatus.OK)
async login(@Body() loginDto: LoginDto, @Req() req: Request) {
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  return this.authService.login(loginDto, ipAddress, userAgent);
}
```

---

## 🧠 PASSO 5: Lógica de Autenticação (AuthService)

### Arquivo: [apps/backend/src/auth/auth.service.ts](../../apps/backend/src/auth/auth.service.ts)

**Linha 189-384: Método `login()` - Multi-Schema Discovery**

```typescript
async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
  const { email, password } = loginDto;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Buscar SUPERADMIN em public schema
  // ═══════════════════════════════════════════════════════════════════════
  const superAdminUsers = await this.prisma.user.findMany({
    where: {
      email,
      isActive: true,
      tenantId: null, // ✅ Apenas SUPERADMIN
    },
    include: {
      profile: true,
      tenant: { include: { subscriptions: { include: { plan: true } } } },
    },
  });

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Buscar em TODOS os tenant schemas
  // ═══════════════════════════════════════════════════════════════════════
  const tenants = await this.prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true, schemaName: true, name: true, status: true },
  });

  const tenantUsersPromises = tenants.map(async (tenant) => {
    const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
    const user = await tenantClient.user.findFirst({
      where: {
        email,
        isActive: true,
        deletedAt: null,
      },
      include: { profile: true },
    });

    if (!user) return null;

    // Buscar dados do tenant no public schema
    const fullTenant = await this.prisma.tenant.findUnique({
      where: { id: tenant.id },
      include: { subscriptions: { /* ... */ } },
    });

    return { ...user, tenant: fullTenant };
  });

  const tenantUsers = (await Promise.all(tenantUsersPromises)).filter((u) => u !== null);

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Combinar resultados (SUPERADMIN + Tenants)
  // ═══════════════════════════════════════════════════════════════════════
  const users = [...superAdminUsers, ...tenantUsers];

  if (users.length === 0) {
    throw new UnauthorizedException('Credenciais inválidas');
  }

  // ✅ Verificar senha (mesma para todos os tenants)
  let passwordValid = false;
  for (const user of users) {
    if (await this.comparePasswords(password, user.password)) {
      passwordValid = true;
      break;
    }
  }

  if (!passwordValid) {
    throw new UnauthorizedException('Credenciais inválidas');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CASO 1: Usuário tem APENAS 1 tenant → Login direto
  // ═══════════════════════════════════════════════════════════════════════
  if (users.length === 1) {
    const user = users[0];

    // Atualizar lastLogin no schema correto
    if (user.tenantId) {
      const schemaName = await this.getSchemaName(user.tenantId);
      const tenantClient = this.prisma.getTenantClient(schemaName);
      await tenantClient.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    }

    // Gerar tokens JWT
    const tokens = await this.generateTokens(user);

    // Salvar refresh token no schema correto
    await this.saveRefreshToken(user.id, user.tenantId, tokens.refreshToken, ipAddress, userAgent);

    // Registrar log de acesso (LOGIN SUCCESS)
    if (user.tenantId) {
      await this.logAccess(user.id, user.tenantId, AccessAction.LOGIN, 'SUCCESS', ipAddress, userAgent);
    }

    return {
      user: { ...userWithoutPassword, tenant: tenantWithPlan },
      ...tokens,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CASO 2: Usuário tem MÚLTIPLOS tenants → Retornar lista para seleção
  // ═══════════════════════════════════════════════════════════════════════
  return {
    requiresTenantSelection: true,
    tenants: usersWithTenant.map((user) => ({
      id: user.tenant!.id,
      name: user.tenant!.name,
      role: user.role,
      status: user.tenant!.status,
      plan: user.tenant!.subscriptions?.[0]?.plan?.name || 'Free',
    })),
  };
}
```

**Linha 1099-1121: Geração de Tokens JWT**

```typescript
private async generateTokens(user: { id: string; email: string; tenantId: string | null; role: string }) {
  const payload = {
    sub: user.id,
    email: user.email,
    tenantId: user.tenantId, // ✅ CRÍTICO: tenantId incluído no payload
    role: user.role,
  };

  const accessToken = this.jwtService.sign(payload, {
    secret: this.configService.get('JWT_SECRET'),
    expiresIn: '15m', // Token de acesso expira em 15 minutos
  });

  const refreshToken = this.jwtService.sign(payload, {
    secret: this.configService.get('JWT_REFRESH_SECRET'),
    expiresIn: '7d', // Refresh token expira em 7 dias
  });

  return { accessToken, refreshToken };
}
```

---

## 🛡️ PASSO 6: Proteção de Rotas (Frontend)

### Arquivo: [apps/frontend/src/routes/index.tsx](../../apps/frontend/src/routes/index.tsx)

**Linha 167-174: Rota /dashboard**

```typescript
{
  path: '/dashboard',
  element: (
    <ProtectedRoute> {/* Verifica autenticação */}
      <RequireProfileCompletion> {/* Verifica perfil completo */}
        <DashboardLayout />
      </RequireProfileCompletion>
    </ProtectedRoute>
  ),
  children: [
    { index: true, element: <Dashboard /> },
    // ... outras rotas
  ],
}
```

### Arquivo: [apps/frontend/src/components/auth/ProtectedRoute.tsx](../../apps/frontend/src/components/auth/ProtectedRoute.tsx)

**Linha 26-55: Verificação de Autenticação**

```typescript
useEffect(() => {
  const checkAuth = async () => {
    console.log('ProtectedRoute check:', {
      hasToken: !!accessToken,
      isAuthenticated,
      hasUser: !!user
    })

    // Se tem accessToken mas não está autenticado, tentar refresh
    if (accessToken && !isAuthenticated) {
      try {
        await refreshAuth()
      } catch (error) {
        console.error('Erro ao renovar autenticação:', error)
      }
    }
    setIsChecking(false)
  }

  checkAuth()
}, [accessToken, isAuthenticated, refreshAuth, user])

// Aguardando verificação inicial
if (isChecking) {
  return <Loader2 className="h-8 w-8 animate-spin" />
}

// Não autenticado → Redirecionar para /login
if (!isAuthenticated) {
  return <Navigate to="/login" state={{ from: location }} replace />
}
```

**Linha 64-83: Verificação de Role**

```typescript
if (requiredRole) {
  const roleHierarchy = {
    VIEWER: 1,
    USER: 2,
    MANAGER: 3,
    ADMIN: 4,
    SUPERADMIN: 5
  }

  const userRoleLevel = roleHierarchy[user?.role] || 0
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0

  if (userRoleLevel < requiredRoleLevel) {
    return <AccessDenied />
  }
}
```

---

## 📊 PASSO 7: Carregamento do Dashboard

### Arquivo: [apps/frontend/src/pages/Dashboard.tsx](../../apps/frontend/src/pages/Dashboard.tsx)

**Linha 19-54: Queries de Dados**

```typescript
export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // ✅ Buscar estatísticas (cada useQuery faz uma requisição autenticada)
  const { data: residentsStats } = useResidentStats()

  const { data: prescriptionsStats } = useQuery({
    queryKey: tenantKey('prescriptions', 'stats', 'dashboard'), // ✅ Namespace por tenant
    queryFn: async () => {
      const response = await api.get('/prescriptions/stats/dashboard')
      return response.data
    },
  })

  const { data: usersCount } = useQuery({
    queryKey: tenantKey('users', 'stats', 'count'),
    queryFn: () => usersApi.countActiveUsers(),
  })

  // Buscar registros de hoje
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: recordsToday = [] } = useDailyRecordsByDate(today)

  // Detectar cargo e renderizar dashboard específico
  if (user?.profile?.positionCode === 'CAREGIVER') {
    return <CaregiverDashboard />
  }

  if (user?.profile?.positionCode === 'ADMINISTRATOR') {
    return <AdminDashboard />
  }

  // Renderizar cards de estatísticas...
  return <Page>{ /* ... */ }</Page>
}
```

---

## 🔐 PASSO 8: Validação JWT em Cada Request (Backend)

### Arquivo: [apps/backend/src/auth/guards/jwt-auth.guard.ts](../../apps/backend/src/auth/guards/jwt-auth.guard.ts)

**Linha 15-50: Guard de Autenticação**

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  // Verificar se a rota é pública (@Public() decorator)
  const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
    context.getHandler(),
    context.getClass(),
  ]);

  if (isPublic) {
    return true;
  }

  // ✅ Executar validação JWT do Passport (chama JwtStrategy.validate())
  const canActivate = await super.canActivate(context);
  if (!canActivate) {
    return false;
  }

  // ✅ Após validação bem-sucedida, inicializar contexto do tenant
  const request = context.switchToHttp().getRequest();
  const user = request.user; // Payload retornado por JwtStrategy.validate()

  if (user?.tenantId) {
    try {
      await this.tenantContext.initialize(user.tenantId);
      // ✅ TenantContext agora está pronto para uso em services REQUEST-scoped
    } catch (error) {
      console.error(`Erro ao inicializar contexto do tenant ${user.tenantId}`);
      // Não bloqueia a request - deixa services tratarem erro se necessário
    }
  }

  return true;
}
```

### Arquivo: [apps/backend/src/auth/strategies/jwt.strategy.ts](../../apps/backend/src/auth/strategies/jwt.strategy.ts)

**Linha 24-146: Validação do Token JWT**

```typescript
async validate(payload: { sub: string; email: string; tenantId?: string | null; role: string }) {
  // Payload contém: { sub, email, tenantId, role }

  // ✅ OTIMIZAÇÃO: Verificar cache primeiro (30s TTL)
  const cachedUser = this.jwtCache.get(payload.sub);
  if (cachedUser) {
    return cachedUser; // Cache HIT - sem query ao banco
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Arquitetura Híbrida: buscar em public (SUPERADMIN) ou tenant schema
  // ═══════════════════════════════════════════════════════════════════════

  let user = null;

  // STEP 1: Tentar buscar SUPERADMIN em public schema
  const superAdminUser = await this.prisma.user.findFirst({
    where: {
      id: payload.sub,
      deletedAt: null,
      tenantId: null, // Apenas SUPERADMIN
    },
    select: { id, email, name, role, tenantId, isActive },
  });

  if (superAdminUser) {
    user = superAdminUser;
  } else {
    // STEP 2: Buscar em tenant schema (se JWT contém tenantId)
    if (payload.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: payload.tenantId },
        select: { schemaName: true },
      });

      if (tenant) {
        const tenantClient = this.prisma.getTenantClient(tenant.schemaName);
        user = await tenantClient.user.findFirst({
          where: { id: payload.sub, deletedAt: null },
          select: { id, email, name, role, tenantId, isActive },
        });
      }
    }
  }

  if (!user || !user.isActive) {
    throw new UnauthorizedException('Usuário não autorizado');
  }

  // Buscar tenant do cache (otimização)
  let tenant = null;
  if (user.tenantId) {
    tenant = await this.tenantCacheService.get(user.tenantId);
  }

  // ✅ Retorna o usuário que será adicionado ao request (req.user)
  const userPayload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId, // ✅ CRÍTICO: Usado por TenantContextService
    tenant: tenant ? { id, name, schemaName, isActive } : null,
  };

  // ✅ OTIMIZAÇÃO: Cachear resultado por 30 segundos
  this.jwtCache.set(user.id, userPayload);

  return userPayload; // Disponível em @CurrentUser() decorator
}
```

---

## 🗄️ PASSO 9: Acesso a Dados (Tenant-Scoped)

### Exemplo: ResidentsService

```typescript
@Injectable({ scope: Scope.REQUEST }) // ✅ REQUEST-scoped
export class ResidentsService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async findAll() {
    // ✅ TenantContext já foi inicializado pelo JwtAuthGuard
    // ✅ Usa automaticamente o schema do tenant do JWT
    return this.tenantContext.client.resident.findMany({
      where: { deletedAt: null }, // ✅ SEM filtro tenantId!
      orderBy: { nome: 'asc' },
    });
  }
}
```

---

## 🔄 Ciclo de Vida Completo (Timeline)

```
T=0s    | Usuário clica em "Entrar"
T=0.1s  | Login.tsx → handleSubmit()
T=0.2s  | auth.store.ts → login()
T=0.3s  | api.post('/auth/login') → Request Interceptor adiciona headers anti-cache
T=0.5s  | Backend recebe POST /auth/login
T=0.6s  | AuthService busca users em public schema (SUPERADMIN)
T=0.8s  | AuthService busca users em TODOS os tenant schemas (paralelo)
T=1.2s  | AuthService valida senha com bcrypt
T=1.3s  | AuthService gera JWT (accessToken + refreshToken)
T=1.4s  | AuthService salva refreshToken no schema correto
T=1.5s  | AuthService registra log de acesso (AccessLog)
T=1.6s  | Backend retorna { user, accessToken, refreshToken }
T=1.7s  | Response Interceptor passa (200 OK)
T=1.8s  | auth.store.ts atualiza estado (user, tokens, isAuthenticated=true)
T=1.9s  | Zustand persiste no localStorage ('rafa-ilpi-auth')
T=2.0s  | Login.tsx useEffect detecta isAuthenticated=true
T=2.1s  | React Router navega para /dashboard
T=2.2s  | ProtectedRoute verifica isAuthenticated (✅ true)
T=2.3s  | RequireProfileCompletion verifica perfil completo
T=2.4s  | DashboardLayout renderiza layout
T=2.5s  | Dashboard.tsx inicia renderização
T=2.6s  | useQuery() faz api.get('/residents/stats') → Request Interceptor adiciona JWT
T=2.7s  | Backend recebe GET /residents/stats → JwtAuthGuard valida JWT
T=2.8s  | JwtStrategy.validate() verifica cache (MISS - primeira request)
T=2.9s  | JwtStrategy busca user no tenant schema (usando tenantId do JWT)
T=3.0s  | JwtStrategy cacheia resultado (30s TTL)
T=3.1s  | JwtAuthGuard inicializa TenantContext (tenantId do payload)
T=3.2s  | TenantContext busca schemaName do tenant
T=3.3s  | TenantContext obtém PrismaClient para tenant schema (cached)
T=3.4s  | Request processada → ResidentsService.getStats()
T=3.5s  | tenantContext.client.resident.count() → Query no schema correto
T=3.6s  | Backend retorna { total: 42, active: 40, ... }
T=3.7s  | Response Interceptor passa (200 OK)
T=3.8s  | useQuery atualiza cache React Query (namespace tenant)
T=3.9s  | Dashboard.tsx renderiza cards com dados
T=4.0s  | Dashboard totalmente carregado 🎉
```

---

## 🔐 Segurança e Isolamento

### 1. **Multi-Tenant Isolation (Backend)**

- **Schema-per-Tenant**: Cada ILPI tem um schema PostgreSQL isolado
- **TenantContext**: Injeta automaticamente o client correto baseado no JWT
- **Sem filtros `WHERE tenantId`**: Schema PostgreSQL já isola os dados
- **Validação em DEV**: Frontend bloqueia requests com `tenantId` (violação arquitetural)

### 2. **JWT Security**

- **Short-lived accessToken**: 15 minutos (minimiza janela de exploração)
- **Long-lived refreshToken**: 7 dias (armazenado em DB, revogável)
- **Payload mínimo**: `{ sub, email, tenantId, role }` (sem dados sensíveis)
- **Refresh Token Rotation**: Novo refreshToken gerado a cada refresh

### 3. **Cache Strategy**

- **JwtCache (Backend)**: 30s TTL para evitar queries repetidas de validação JWT
- **TenantCache (Backend)**: Cache de `tenantId → schemaName` (reduz queries)
- **React Query (Frontend)**: Cache de dados por tenant (namespace `tenantKey()`)
- **Invalidação**: Logout limpa TODOS os caches (backend + frontend)

### 4. **Session Management**

- **RefreshToken em DB**: Permite revogação granular (logout de device específico)
- **Access Logs**: Registra LOGIN/LOGOUT com IP, User-Agent, device
- **Session Expired**: Endpoint `/auth/logout-expired` registra logout automático
- **Mutex no Refresh**: Evita race conditions (múltiplos requests simultâneos)

---

## 🐛 Troubleshooting

### Problema 1: "Usuário não autorizado" após login bem-sucedido

**Causa:** JwtStrategy não encontra user no schema correto

**Solução:**
1. Verificar se `tenantId` está no payload do JWT
2. Verificar se schema `tenant_xxx` existe no PostgreSQL
3. Verificar logs do backend: `[JwtAuthGuard] Erro ao inicializar contexto`

```bash
# Verificar schemas existentes
docker exec rafa-ilpi-postgres psql -U rafa_user -d rafa_ilpi -c "\dn"
```

### Problema 2: Dashboard vazio (nenhum dado carrega)

**Causa:** TenantContext não foi inicializado corretamente

**Solução:**
1. Verificar console do frontend: `ProtectedRoute check:` deve mostrar `isAuthenticated: true`
2. Verificar Network tab: requests devem ter header `Authorization: Bearer xxx`
3. Verificar logs do backend: `[TenantContext] initialize: tenant-xxx`

### Problema 3: "Refresh token inválido" em loop infinito

**Causa:** RefreshToken foi deletado do banco mas ainda está no localStorage

**Solução:**
1. Limpar localStorage: `localStorage.removeItem('rafa-ilpi-auth')`
2. Forçar logout completo: `useAuthStore.getState().logout()`
3. Verificar DB: `SELECT * FROM public.refresh_tokens WHERE user_id = 'xxx'`

---

## 📚 Referências

- **Arquitetura Multi-Tenant**: [../architecture/multi-tenancy.md](../architecture/multi-tenancy.md)
- **Padrões de Data/Hora**: [../standards/DATETIME_STANDARD.md](../standards/DATETIME_STANDARD.md)
- **Validação Multi-Tenant**: [../architecture/MULTI-TENANT-VALIDATION.md](../architecture/MULTI-TENANT-VALIDATION.md)
- **JWT Best Practices**: https://tools.ietf.org/html/rfc7519
- **Zustand Persist**: https://github.com/pmndrs/zustand#persist-middleware

---

**Última atualização:** 2026-01-23
**Próxima revisão:** Após implementação de MFA (Multi-Factor Authentication)
