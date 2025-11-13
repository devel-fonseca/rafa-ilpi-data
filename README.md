# Rafa ILPI - Sistema de Gestão para ILPIs

<div align="center">

![Logo Rafa Labs](docs/assets/logo.png)

**Sistema SaaS Multi-Tenant para Gestão de Instituições de Longa Permanência para Idosos**

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-20.x-brightgreen.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## 📋 Sobre o Projeto

O **Rafa ILPI** é uma plataforma completa para gestão de Instituições de Longa Permanência para Idosos (ILPIs), desenvolvida com foco em:

- 🔐 **Segurança e Privacidade** (Conformidade LGPD)
- 🏥 **Conformidade ANVISA** (RDC 502/2021)
- 👴 **Estatuto do Idoso**
- 📊 **Multi-Tenancy** com isolamento total de dados
- 🚀 **Escalabilidade** e performance

### Funcionalidades Principais

#### MVP (Fase 1-5)
- ✅ Gestão de residentes (idosos)
- ✅ Controle de medicação com prescrições
- ✅ Registro de sinais vitais (pressão, glicemia, etc.)
- ✅ AVDs (Atividades da Vida Diária)
- ✅ Relatórios ANVISA (ROI)
- ✅ Auditoria completa de ações
- ✅ Upload de documentos/imagens (AWS S3)

#### Futuro (Fase 7)
- 🔜 Módulo de RH
- 🔜 Folha de pagamento
- 🔜 Integração eSocial
- 🔜 Saúde ocupacional (PCMSO)

---

## 🏢 Empresa

**Rafa Labs Desenvolvimento e Tecnologia**

- **CNPJ:** 63.409.303/0001-82
- **Telefone:** (19) 98152-4849
- **Email Contato:** contato@rafalabs.com.br
- **Email Suporte:** suporte@rafalabs.com.br
- **Website:** https://rafalabs.com.br

---

## 💼 Planos e Preços

| Plano | Residentes | Usuários | Mensalidade | Features |
|-------|-----------|----------|-------------|----------|
| **Free** | 5 | 2 | R$ 0 | AVDs, vitais básicos |
| **Básico** | 20 | 5 | R$ 299 | + Medicação |
| **Profissional** | 100 | 15 | R$ 499 | + Relatórios ANVISA, API |
| **Enterprise** | Ilimitado | Ilimitado | Custom | + RH, eSocial, suporte 24h |

---

## 🛠️ Stack Tecnológica

### Backend
```yaml
Runtime: Node.js 20 LTS
Framework: NestJS 10+
Language: TypeScript 5+
ORM: Prisma 5+
Database: PostgreSQL 16+
Cache/Queue: Redis 7+ + BullMQ
Storage: AWS S3 (Free Tier)
Auth: JWT + Refresh Token
Validation: class-validator
Logging: Winston
```

### Frontend
```yaml
Framework: React 18+
Build Tool: Vite 5+
Language: TypeScript 5+
UI: Shadcn/ui + Tailwind CSS
State: Zustand
Data Fetching: TanStack Query v5
Validation: Zod
Routing: React Router v6
```

### DevOps
```yaml
Containerization: Docker + Docker Compose
Reverse Proxy: Nginx
Monitoring: Winston Logs
Version Control: Git
```

---

## 📁 Estrutura do Projeto

```
rafa-ilpi-data/
├── apps/
│   ├── backend/                 # NestJS API
│   │   ├── src/
│   │   │   ├── modules/         # Módulos da aplicação
│   │   │   ├── common/          # Shared utilities
│   │   │   ├── prisma/          # Prisma service
│   │   │   └── config/          # Configurações
│   │   └── prisma/              # Schema e migrations
│   │
│   └── frontend/                # React + Vite
│       └── src/
│           ├── features/        # Features por domínio
│           ├── shared/          # Componentes compartilhados
│           └── routes/          # Rotas da aplicação
│
├── packages/                    # Monorepo packages
│   ├── types/                   # Tipos compartilhados
│   └── validators/              # Validações compartilhadas
│
├── docker/                      # Dockerfiles e configs
│   ├── backend/
│   ├── frontend/
│   ├── nginx/
│   └── postgres/
│
├── docs/                        # Documentação
│   ├── api/                     # Documentação de API
│   ├── architecture/            # Diagramas e arquitetura
│   ├── compliance/              # Docs LGPD/ANVISA
│   └── legislacao/              # Legislação de referência
│
├── scripts/                     # Scripts de automação
│   ├── setup-dev.sh
│   ├── lgpd-validator.js
│   └── backup-db.sh
│
├── tasks/                       # Gerenciamento de tarefas
│   └── todo.md
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Começando

### Pré-requisitos

- [Node.js](https://nodejs.org/) >= 20.x
- [Docker](https://www.docker.com/) e Docker Compose
- [PostgreSQL](https://www.postgresql.org/) 16+ (ou via Docker)
- [Git](https://git-scm.com/)
- Conta AWS (Free Tier) para S3

### Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/rafalabs/rafa-ilpi.git
cd rafa-ilpi

# 2. Execute o script de setup
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh

# 3. Configure as variáveis de ambiente
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Edite os arquivos .env com suas credenciais

# 4. Inicie os serviços
docker-compose up -d

# 5. Acesse a aplicação
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000/api
# API Docs: http://localhost:3000/api/docs
```

### Desenvolvimento Local (sem Docker)

```bash
# Backend
cd apps/backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev

# Frontend (em outro terminal)
cd apps/frontend
npm install
npm run dev
```

---

## 📚 Documentação

- [📖 Guia de Desenvolvimento](docs/development-guide.md)
- [🏗️ Arquitetura do Sistema](docs/architecture/system-design.md)
- [🗄️ Schema do Banco de Dados](docs/architecture/database-schema.md)
- [🔐 Segurança e LGPD](docs/compliance/lgpd-compliance.md)
- [🏥 Conformidade ANVISA](docs/compliance/anvisa-rdc-502.md)
- [📋 Legislação de Referência](docs/legislacao/)
- [🚀 Guia de Deploy](docs/deployment/docker.md)

---

## 🔐 Segurança e Conformidade

### LGPD (Lei 13.709/2018)
- ✅ Dados sensíveis encriptados (pgcrypto)
- ✅ Auditoria completa de acessos
- ✅ Consentimentos rastreáveis
- ✅ Direitos dos titulares (acesso, retificação, exclusão)
- ✅ DPO designado por tenant
- ✅ DPIA (Avaliação de Impacto)
- ✅ Notificação de incidentes

### ANVISA (RDC 502/2021)
- ✅ Registro individual por residente
- ✅ Planos de atendimento
- ✅ Controle de medicamentos
- ✅ Relatórios ROI (Roteiro de Inspeção)

### Estatuto do Idoso (Lei 10.741/2003)
- ✅ Proteção contra abusos
- ✅ Transparência de dados
- ✅ Auditoria de acessos

### Segurança Técnica
- ✅ Multi-tenancy com schemas isolados
- ✅ JWT + Refresh Token
- ✅ Rate limiting
- ✅ HTTPS obrigatório
- ✅ Headers de segurança (Helmet)
- ✅ RLS (Row-Level Security)
- ✅ Backup automático

---

## 🧪 Testes

```bash
# Backend - Testes unitários
cd apps/backend
npm run test

# Backend - Testes E2E
npm run test:e2e

# Backend - Cobertura
npm run test:cov

# Frontend - Testes de componentes
cd apps/frontend
npm run test
```

---

## 📊 Monitoramento e Logs

- **Logs estruturados:** Winston (JSON format)
- **Auditoria:** Tabela `audits` em cada schema de tenant
- **Conformidade:** Validador LGPD automático (`scripts/lgpd-validator.js`)

---

## 🤝 Contribuindo

Este é um projeto proprietário da Rafa Labs. Contribuições externas não são aceitas neste momento.

Para reportar bugs ou solicitar features, entre em contato:
- Email: suporte@rafalabs.com.br
- Telefone: (19) 98152-4849

---

## 📄 Licença

Copyright © 2025 Rafa Labs Desenvolvimento e Tecnologia - Todos os direitos reservados.

Este software é proprietário e confidencial. Uso não autorizado é estritamente proibido.

**CNPJ:** 63.409.303/0001-82

---

## 👨‍💻 Desenvolvedor

**Dr. Emanuel**
- Founder & CEO - Rafa Labs
- Product Owner
- Lead Developer

---

## 📞 Contato

**Rafa Labs Desenvolvimento e Tecnologia**

🌐 Website: https://rafalabs.com.br
📧 Contato: contato@rafalabs.com.br
🛟 Suporte: suporte@rafalabs.com.br
📱 Telefone: (19) 98152-4849

🏢 CNPJ: 63.409.303/0001-82

---

## 🗺️ Roadmap

### Q1 2026 - MVP
- [x] Setup e infraestrutura
- [ ] Autenticação e multi-tenancy
- [ ] CRUD de residentes
- [ ] Controle de medicação
- [ ] Sinais vitais
- [ ] AVDs
- [ ] Relatórios ANVISA

### Q2 2026 - Conformidade
- [ ] Encriptação completa
- [ ] Consentimentos LGPD
- [ ] Direitos dos titulares
- [ ] MFA
- [ ] Certificação LGPD

### Q3 2026 - RH e Folha
- [ ] Cadastro de funcionários
- [ ] Folha de pagamento
- [ ] Integração eSocial
- [ ] Saúde ocupacional

### Q4 2026 - Escala
- [ ] App mobile (React Native)
- [ ] Kubernetes
- [ ] Monitoramento avançado
- [ ] Expansion to new markets

---

## ⭐ Status do Projeto

🟢 **Em Desenvolvimento Ativo**

**Última atualização:** 13 de Novembro de 2025
**Versão:** 0.1.0-alpha
**Fase atual:** Setup e Infraestrutura

---

<div align="center">

**Desenvolvido com ❤️ pela [Rafa Labs](https://rafalabs.com.br)**

</div>
