# 🧪 Guia de Testes - Rafa ILPI Backend

## 📊 Status Atual

**Coverage Atual:**
- ✅ **PrismaService (Multi-Tenancy)**: 17/17 testes passando (100%)
- ✅ **AuthService (Autenticação)**: 20/20 testes passando (100%)
- ✅ **AuditService (LGPD)**: 23/23 testes passando (100%)
- ✅ **AuditInterceptor (Rastreabilidade)**: 20/20 testes passando (100%)
- ✅ **ResidentsService (Core Business)**: 23/23 testes passando (100%)
- ✅ **PrescriptionsService (Medicações)**: 23/23 testes passando (100%)
- ✅ **DailyRecordsService (Registros Diários)**: 26/26 testes passando (100%)
- **Total**: 152/154 testes passando (98.7%)

**Módulos Críticos Testados:**
- 🔐 Multi-Tenancy & Isolamento de Dados
- 🔑 Autenticação JWT + Refresh Token Rotation
- 📋 Auditoria LGPD (rastreabilidade completa)
- 👴 Gestão de Residentes (business core)
- 💊 Prescrições & Administração de Medicamentos
- 📝 Registros Diários com Versionamento

---

## 📁 Estrutura de Diretórios

```
apps/backend/test/
├── unit/              # Testes unitários (services, helpers)
├── integration/       # Testes de integração (módulos completos)
├── e2e/              # Testes end-to-end (fluxos completos)
├── fixtures/         # Dados mockados para testes
│   ├── tenant.fixture.ts
│   ├── user.fixture.ts
│   └── resident.fixture.ts
├── mocks/            # Mocks de serviços
│   └── prisma.mock.ts
├── setup.ts          # Configuração global de testes
├── jest-e2e.json     # Config Jest E2E
├── jest-unit.json    # Config Jest Unit
└── README.md         # Este arquivo
```

---

## 🚀 Como Executar os Testes

### Todos os Testes
```bash
npm test
```

### Testes Específicos
```bash
# Apenas PrismaService
npm test -- prisma.service.spec.ts

# Apenas AuthService
npm test -- auth.service.spec.ts

# Com coverage
npm run test:cov

# Watch mode (re-executa ao salvar)
npm run test:watch

# E2E tests
npm run test:e2e
```

---

## 📝 Padrões de Teste

### 1. Estrutura de Teste Unitário

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService } from '../../test/mocks/prisma.mock';

describe('YourService', () => {
  let service: YourService;
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
    prisma = module.get<PrismaService>(PrismaService);

    // Resetar mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('methodName()', () => {
    it('should do something', async () => {
      // Arrange
      prisma.model.findUnique.mockResolvedValue(mockData);

      // Act
      const result = await service.methodName();

      // Assert
      expect(result).toBeDefined();
      expect(prisma.model.findUnique).toHaveBeenCalledWith(...);
    });
  });
});
```

### 2. Usando Fixtures

```typescript
import { mockTenant } from '../../test/fixtures/tenant.fixture';
import { mockAdminUser } from '../../test/fixtures/user.fixture';

// Use fixtures ao invés de criar dados manualmente
const testData = {
  tenantId: mockTenant.id,
  userId: mockAdminUser.id,
};
```

### 3. Mockando Bibliotecas Externas

```typescript
// Mock ANTES de importar o serviço
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Usar no teste
const bcrypt = require('bcrypt');
bcrypt.compare.mockResolvedValue(true);
```

---

## ✅ Testes Implementados

### **PrismaService (Multi-Tenancy)** - 17 testes ✅

**Criticidade:** 🔴 **MÁXIMA** - Isolamento de dados entre tenants (LGPD)

**Coberto:**
- ✅ Criação de clients por tenant
- ✅ Reutilização de conexões (cache)
- ✅ Isolamento entre tenants diferentes
- ✅ Criação e exclusão de schemas
- ✅ Limpeza de conexões no destroy
- ✅ Validação de DATABASE_URL
- ✅ Query parameters em URLs
- ✅ Prevenção de SQL injection (documentado)
- ✅ Performance (caching)

**Arquivo:** `src/prisma/prisma.service.spec.ts`

---

### **AuthService (Autenticação & Segurança)** - 20 testes ✅

**Criticidade:** 🔴 **MÁXIMA** - Segurança de autenticação

**Coberto:**

#### Registro de Usuários (7 testes)
- ✅ Criação de usuário com sucesso
- ✅ Primeiro usuário é ADMIN automático
- ✅ Erro se tenant não existe
- ✅ Erro se email duplicado no tenant
- ✅ Respeita limite de usuários do plano
- ✅ Plano ENTERPRISE (-1) = usuários ilimitados
- ✅ Hash de senha com bcrypt

#### Login (6 testes)
- ✅ Login com tenant único
- ✅ Seleção de tenant para multi-tenant
- ✅ Erro em credenciais inválidas (email)
- ✅ Erro em senha incorreta
- ✅ Atualiza lastLogin
- ✅ Salva refresh token no banco

#### Refresh Token (5 testes)
- ✅ Gera novos tokens com refresh válido
- ✅ **Token Rotation** (deleta antigo - OWASP)
- ✅ Erro se token não existe
- ✅ Erro se token expirado (e deleta)
- ✅ Erro se usuário inativo

#### Logout (1 teste)
- ✅ Deleta todos os refresh tokens do usuário

#### Segurança (1 teste)
- ✅ JWT contém tenantId (multi-tenancy)

**Arquivo:** `src/auth/auth.service.spec.ts`

---

## ✅ Módulos Testados Recentemente

### **AuditService & AuditInterceptor** (LGPD Compliance) ✅
**43 testes implementados** (23 AuditService + 20 AuditInterceptor)

**Cobertura:**
- ✅ Criação de logs de auditoria com todos os campos LGPD
- ✅ Queries com filtros (entityType, action, userId, datas)
- ✅ Estatísticas agregadas (por entidade, ação, usuários)
- ✅ Interceptor captura automática de ações (CREATE, UPDATE, DELETE)
- ✅ Extração de entityId de params e response
- ✅ Remoção de campos sensíveis (password) do log
- ✅ Inclusão de request body em CREATE/UPDATE
- ✅ Inclusão de dados deletados em DELETE
- ✅ Registro de IP, User-Agent, tempo de execução
- ✅ Não interrompe operação se auditoria falhar
- ✅ Conformidade LGPD: Quem, O quê, Quando, De onde, Como

**Arquivos:**
- `src/audit/audit.service.spec.ts` (23 testes)
- `src/audit/audit.interceptor.spec.ts` (20 testes)

### **ResidentsService** (Core Business) ✅
**23 testes implementados**

**Cobertura:**
- ✅ Criação de residentes com validações completas
- ✅ Validação de CPF único por tenant
- ✅ Respeito ao limite de residentes do plano
- ✅ Residentes ilimitados para maxResidents = -1
- ✅ Listagem com paginação e filtros (status, busca)
- ✅ Busca por nome (case insensitive) com OR em CPF
- ✅ Soft delete (deletedAt) sem hard delete
- ✅ Validação de tenant em todas as operações
- ✅ Isolamento multi-tenancy (NÃO acesso cross-tenant)
- ✅ Dados enriquecidos com hierarquia (bed → room → floor → building)

**Arquivo:** `src/residents/residents.service.spec.ts`

### **PrescriptionsService** (Medicações) ✅
**23 testes implementados**

**Cobertura:**
- ✅ Criação de prescrições com medicamentos
- ✅ Prescrições com medicamentos SOS
- ✅ Validação de residente existe e pertence ao tenant
- ✅ Validação de horários programados (scheduledTimes)
- ✅ Criação em transação (prescrição + medicamentos + SOS)
- ✅ Listagem com paginação e filtros (residentId, tipo)
- ✅ Soft delete de prescrições
- ✅ Atualização com validações de tenant
- ✅ Isolamento multi-tenancy
- ✅ Dados completos com resident, medications, sosMedications

**Arquivo:** `src/prescriptions/prescriptions.service.spec.ts`

---

### **DailyRecordsService** (Registros Diários com Versionamento) ✅

**26 testes implementados**

**Cobertura:**

- ✅ Criação de registros diários com múltiplos tipos (MONITORAMENTO, HIGIENE, ALIMENTACAO, MEDICACAO, ATIVIDADE)
- ✅ Validação de residente existe e pertence ao tenant
- ✅ Validação de formato de hora (HH:mm)
- ✅ Listagem com paginação e filtros (residentId, tipo, range de datas)
- ✅ Soft delete de registros
- ✅ **Versionamento automático** (histórico de mudanças)
- ✅ Atualização com criação de snapshot anterior
- ✅ Histórico de deleção com motivo (deleteReason)
- ✅ Transações para garantir consistência entre registro e histórico
- ✅ Isolamento multi-tenancy
- ✅ Dados enriquecidos com informações do residente

**Arquivo:** `src/daily-records/daily-records.service.spec.ts`

### **Prioridade 4: Testes E2E**
```typescript
// test/e2e/auth.e2e-spec.ts

describe('Auth E2E', () => {
  it('POST /auth/register → 201');
  it('POST /auth/login → 200 (tokens)');
  it('GET /residents sem token → 401');
  it('GET /residents com token → 200');
  it('POST /auth/refresh → 200 (novos tokens)');
  it('POST /auth/refresh (token usado) → 401 (rotation)');
});

// test/e2e/multi-tenancy.e2e-spec.ts

describe('Multi-Tenancy E2E', () => {
  it('Tenant A NÃO vê residentes de Tenant B');
  it('Tenant A NÃO pode editar residentes de Tenant B');
  it('Tenant A NÃO pode criar prescrição em Tenant B');
});
```

---

##  🛡️ Checklist de Segurança nos Testes

Ao criar novos testes, SEMPRE verificar:

- [ ] **Multi-Tenancy**: Valida que `tenantId` está presente?
- [ ] **Isolamento**: Testa que dados não vazam entre tenants?
- [ ] **Autenticação**: Requer JWT válido?
- [ ] **Autorização**: Valida roles (admin, user, viewer)?
- [ ] **Validação**: DTOs validam entrada do usuário?
- [ ] **Sanitização**: Previne SQL injection?
- [ ] **Auditoria**: Ação é registrada em audit_logs?
- [ ] **LGPD**: Dados sensíveis são encriptados?

---

## 📊 Metas de Coverage

| Módulo | Meta | Status Atual |
|--------|------|--------------|
| **PrismaService** | 95% | ✅ 100% (17/17) |
| **AuthService** | 90% | ✅ 100% (20/20) |
| **AuditService** | 90% | ✅ 100% (23/23) |
| **AuditInterceptor** | 90% | ✅ 100% (20/20) |
| **ResidentsService** | 85% | ✅ 100% (23/23) |
| **PrescriptionsService** | 85% | ✅ 100% (23/23) |
| **DailyRecordsService** | 85% | ✅ 100% (26/26) |
| **VitalSignsService** | 75% | 🔴 0% |
| **FilesService** | 70% | 🔴 0% |
| **Geral** | **80%** | 🟡 ~50% |

---

## 🚨 Regras de CI/CD (Futuro)

```yaml
# .github/workflows/test.yml

- Coverage mínimo: 70% (fail se < 70%)
- Todos os testes devem passar (zero failures)
- Testes E2E de multi-tenancy obrigatórios
- Testes de segurança (auth, audit) obrigatórios
```

---

## 💡 Dicas & Boas Práticas

### 1. Arrange-Act-Assert (AAA)
```typescript
it('deve criar usuário', async () => {
  // Arrange (preparar)
  prisma.tenant.findUnique.mockResolvedValue(mockTenant);

  // Act (executar)
  const result = await service.register(dto);

  // Assert (verificar)
  expect(result).toBeDefined();
});
```

### 2. Descrições Claras
```typescript
// ❌ Ruim
it('should work');

// ✅ Bom
it('deve lançar erro se CPF duplicado no mesmo tenant');
```

### 3. Teste Edge Cases
```typescript
it('deve permitir usuários ilimitados se maxUsers = -1');
it('deve lidar com URLs que já contêm query parameters');
it('deve lidar com schema que não existe no Map');
```

### 4. Teste Comportamentos de Segurança
```typescript
it('deve DELETAR refresh token antigo (rotation)');
it('deve incluir tenantId no JWT para multi-tenancy');
it('deve NÃO permitir acesso cross-tenant');
```

---

## 📚 Recursos

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

---

**Última Atualização:** 29/11/2025
**Responsável:** Claude Code + Dr. E. (Emanuel)
**Rafa Labs Desenvolvimento e Tecnologia**
