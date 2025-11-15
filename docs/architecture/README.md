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
  - **Status:** ✅ Aprovado e Implementado

### 📋 Próximos Documentos (A criar)

- **DATABASE-SCHEMA.md** (Fase 2)
  - Diagrama completo do banco
  - Relacionamentos entre tabelas
  - Índices e otimizações

- **API-DESIGN.md** (Fase 2)
  - Padrões de endpoints
  - Versionamento da API
  - Rate limiting

- **AUTHENTICATION-FLOW.md** (Fase 2)
  - Fluxo detalhado de JWT
  - Refresh tokens
  - Sistema de convites

- **LGPD-COMPLIANCE.md** (Fase 6)
  - Conformidade com LGPD
  - Controle de acesso
  - Auditoria de dados

- **DEPLOYMENT.md** (Futuro)
  - Estratégia de deploy
  - CI/CD pipeline
  - Monitoramento

## 🎯 Decisões Arquiteturais Chave

### ✅ Aprovadas e Implementadas

1. **Schema-per-Tenant** (13/11/2025)
   - Cada ILPI tem schema PostgreSQL isolado
   - Máxima segurança e conformidade LGPD
   - Documento: [MULTI-TENANT-ISOLATION.md](./MULTI-TENANT-ISOLATION.md)

2. **JWT com TenantID** (13/11/2025)
   - Token sempre inclui tenantId
   - Impossível acessar dados de outro tenant
   - Documento: [MULTI-TENANT-ISOLATION.md](./MULTI-TENANT-ISOLATION.md)

3. **Registro vs Convite** (13/11/2025)
   - Auto-registro = criar ILPI (tenant)
   - Funcionários = adicionados pelo admin
   - Documento: [MULTI-TENANT-ISOLATION.md](./MULTI-TENANT-ISOLATION.md)

### 🔄 Em Discussão

_(Nenhuma no momento)_

### ❌ Rejeitadas

1. **Row-Level Security** (13/11/2025)
   - Motivo: Risco de vazamento por erro de código
   - Preferida: Schema-per-tenant

2. **Database per Tenant** (13/11/2025)
   - Motivo: Overhead operacional muito alto
   - Preferida: Schema-per-tenant

## 📊 Tech Stack

### Backend
- NestJS 10
- TypeScript 5
- PostgreSQL 16 (Multi-Schema)
- Prisma ORM
- Redis 7 + BullMQ
- MinIO (S3-compatible)
- Winston Logging
- JWT Authentication

### Frontend
- React 18
- Vite 5
- TypeScript 5
- Tailwind CSS
- Shadcn/ui
- TanStack Query v5
- Zustand
- React Router v6

### DevOps
- Docker + Docker Compose
- Nginx
- GitHub Actions (futuro)

## 🔗 Links Úteis

- [README Principal](../../README.md)
- [Guia de Desenvolvimento](../WORKSPACE-GUIDE.md)
- [TODO List](../../tasks/todo.md)
- [Próximos Passos](../../PROXIMOS-PASSOS.md)

---

**Última atualização:** 13/11/2025
**Responsável:** Dr. Emanuel
