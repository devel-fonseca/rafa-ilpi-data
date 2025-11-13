# Rafa ILPI - Backend API

Backend NestJS para o sistema Rafa ILPI.

## 🚀 Tecnologias

- **Node.js** 20 LTS
- **NestJS** 10+
- **TypeScript** 5+
- **Prisma** 5+ (ORM)
- **PostgreSQL** 16+
- **Redis** 7+ (Cache e Queue)
- **AWS S3** (Storage)
- **JWT** (Autenticação)
- **Winston** (Logging)
- **BullMQ** (Queue/Jobs)

## 📋 Pré-requisitos

- Node.js >= 20.x
- PostgreSQL >= 16
- Redis >= 7
- Conta AWS (Free Tier) para S3

## 🛠️ Instalação

```bash
# Instalar dependências
npm install

# Copiar .env
cp .env.example .env

# Editar .env com suas credenciais
nano .env

# Gerar Prisma Client
npm run prisma:generate

# Executar migrations
npm run prisma:migrate

# (Opcional) Popular banco com dados de teste
npm run prisma:seed
```

## 🚀 Executar

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod

# Debug
npm run start:debug
```

## 📊 Prisma

```bash
# Gerar Client
npm run prisma:generate

# Criar migration
npm run prisma:migrate

# Abrir Prisma Studio
npm run prisma:studio

# Deploy migrations (produção)
npm run prisma:migrate:prod
```

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes em watch mode
npm run test:watch

# Cobertura de testes
npm run test:cov

# Testes E2E
npm run test:e2e
```

## 📚 Documentação da API

Após iniciar o servidor, acesse:

- **Swagger UI:** http://localhost:3000/api/docs
- **OpenAPI JSON:** http://localhost:3000/api/docs-json

## 🏗️ Estrutura

```
src/
├── modules/           # Módulos da aplicação
│   ├── auth/         # Autenticação
│   ├── tenants/      # Multi-tenancy
│   ├── residents/    # Gestão de residentes
│   ├── medications/  # Controle de medicação
│   ├── vitals/       # Sinais vitais
│   ├── daily-activities/ # AVDs
│   ├── audits/       # Auditoria
│   ├── consents/     # Consentimentos LGPD
│   └── files/        # Upload/Download S3
├── common/           # Shared utilities
│   ├── decorators/   # Custom decorators
│   ├── filters/      # Exception filters
│   ├── guards/       # Guards (Auth, Tenant, Roles)
│   ├── interceptors/ # Interceptors
│   ├── middleware/   # Middleware
│   └── utils/        # Helper functions
├── prisma/           # Prisma service
├── config/           # Configurações
├── app.module.ts     # Módulo raiz
└── main.ts           # Entry point
```

## 🔐 Variáveis de Ambiente

Veja `.env.example` para todas as variáveis necessárias.

### Obrigatórias:

- `DATABASE_URL` - URL do PostgreSQL
- `JWT_SECRET` - Secret para JWT (min 32 chars)
- `JWT_REFRESH_SECRET` - Secret para refresh token
- `AWS_REGION` - Região AWS (ex: us-east-1)
- `AWS_S3_BUCKET` - Nome do bucket S3
- `AWS_ACCESS_KEY_ID` - AWS Access Key
- `AWS_SECRET_ACCESS_KEY` - AWS Secret Key
- `ENCRYPTION_KEY` - Chave de encriptação (32 bytes)

## 📦 Scripts Úteis

```bash
# Formatar código
npm run format

# Lint
npm run lint

# Build
npm run build
```

## 🔒 Segurança

- JWT com refresh token
- Encriptação de dados sensíveis (AES-256)
- Rate limiting (100 req/min por IP)
- Helmet (security headers)
- CORS configurado
- Row-Level Security (RLS)
- Auditoria completa

## 📝 Logs

Logs são salvos em:
- `logs/error.log` - Apenas erros
- `logs/combined.log` - Todos os logs
- `logs/audit.log` - Auditoria LGPD

## 🤝 Suporte

Para dúvidas ou problemas:

- Email: suporte@rafalabs.com.br
- Telefone: (19) 98152-4849

---

**Rafa Labs Desenvolvimento e Tecnologia**
CNPJ: 63.409.303/0001-82
