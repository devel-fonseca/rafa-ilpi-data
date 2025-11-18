# 🐳 RAFA ILPI - Instruções de Deploy com Docker

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Build e Export (Máquina Origem)](#build-e-export-máquina-origem)
3. [Import e Run (Máquina Destino)](#import-e-run-máquina-destino)
4. [Configuração](#configuração)
5. [Comandos Úteis](#comandos-úteis)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### Máquina Origem (onde vai fazer o build)
- Docker 20.10+
- Docker Compose 2.0+
- Espaço em disco: ~5GB para build + ~2GB para export

### Máquina Destino (onde vai rodar em produção)
- Docker 20.10+
- Docker Compose 2.0+
- Espaço em disco: ~2GB
- Portas disponíveis: 80, 3000, 5433, 6379

---

## 📦 Build e Export (Máquina Origem)

### Passo 1: Fazer Build das Imagens

```bash
# Dar permissão de execução ao script
chmod +x docker-build-and-export.sh

# Executar o build e export
./docker-build-and-export.sh
```

Este script vai:
1. ✅ Fazer build do Backend (NestJS)
2. ✅ Fazer build do Frontend (React + Vite)
3. ✅ Fazer pull do PostgreSQL 16
4. ✅ Fazer pull do Redis 7
5. ✅ Exportar todas as imagens para arquivos `.tar.gz`

### Passo 2: Preparar Arquivos para Transfer

Após o build concluir, você terá:

```
docker-images-export/
├── rafa-ilpi-backend.tar.gz      (~500MB)
├── rafa-ilpi-frontend.tar.gz     (~200MB)
├── postgres-16-alpine.tar.gz     (~200MB)
└── redis-7-alpine.tar.gz         (~30MB)
```

**Arquivos necessários para copiar:**
- 📂 `docker-images-export/` (toda a pasta)
- 📄 `docker-compose.production.yml`
- 📄 `.env.production.example`
- 📄 `docker-import-and-run.sh`

---

## 🚀 Import e Run (Máquina Destino)

### Passo 1: Copiar Arquivos

Transfira os arquivos mencionados acima para a máquina destino.

### Passo 2: Configurar Variáveis de Ambiente

```bash
# Copiar o exemplo para .env.production
cp .env.production.example .env.production

# Editar com suas credenciais
nano .env.production
```

**Variáveis importantes a configurar:**

```env
# ⚠️ OBRIGATÓRIO: Trocar estas senhas!
POSTGRES_PASSWORD=sua_senha_segura_do_postgres
REDIS_PASSWORD=sua_senha_segura_do_redis
JWT_SECRET=seu_segredo_jwt_muito_seguro_com_pelo_menos_32_caracteres

# Opcional: Configurações da empresa
COMPANY_NAME=Sua Empresa LTDA
COMPANY_SUPPORT_EMAIL=suporte@suaempresa.com.br

# Opcional: URL da API (ajustar se necessário)
VITE_API_URL=http://seu-servidor:3000
```

### Passo 3: Importar e Executar

```bash
# Dar permissão de execução
chmod +x docker-import-and-run.sh

# Executar o import
./docker-import-and-run.sh
```

Este script vai:
1. ✅ Importar todas as imagens Docker
2. ✅ Validar o arquivo `.env.production`
3. ✅ Iniciar os containers (se você confirmar)

### Passo 4: Acessar a Aplicação

Após iniciar, acesse:

- 🌐 **Frontend**: http://localhost (porta 80)
- 🔧 **Backend API**: http://localhost:3000
- 🗄️ **PostgreSQL**: localhost:5433
- 💾 **Redis**: localhost:6379

---

## ⚙️ Configuração

### Estrutura dos Containers

```
┌─────────────────────────────────────────┐
│          RAFA ILPI Stack                │
├─────────────────────────────────────────┤
│                                         │
│  Frontend (Nginx)                       │
│  Port: 80                               │
│  Image: rafa-ilpi-frontend:latest       │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Backend (NestJS)                       │
│  Port: 3000                             │
│  Image: rafa-ilpi-backend:latest        │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  PostgreSQL 16                          │
│  Port: 5433 → 5432                      │
│  Volume: postgres_data                  │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Redis 7                                │
│  Port: 6379                             │
│  Volume: redis_data                     │
│                                         │
└─────────────────────────────────────────┘
```

### Volumes Persistentes

Os dados são salvos em volumes Docker:

- `postgres_data` - Dados do banco
- `redis_data` - Cache do Redis

Para backup destes dados:

```bash
# Backup do PostgreSQL
docker exec rafa-ilpi-postgres pg_dump -U rafa_user rafa_ilpi > backup.sql

# Backup dos volumes
docker run --rm -v postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

---

## 🛠️ Comandos Úteis

### Ver Logs

```bash
# Todos os logs
docker-compose -f docker-compose.production.yml logs -f

# Apenas backend
docker-compose -f docker-compose.production.yml logs -f backend

# Apenas frontend
docker-compose -f docker-compose.production.yml logs -f frontend
```

### Parar/Iniciar Containers

```bash
# Parar todos
docker-compose -f docker-compose.production.yml down

# Iniciar todos
docker-compose -f docker-compose.production.yml up -d

# Reiniciar um serviço específico
docker-compose -f docker-compose.production.yml restart backend
```

### Ver Status

```bash
# Status dos containers
docker-compose -f docker-compose.production.yml ps

# Ver recursos usados
docker stats
```

### Executar Comandos no Backend

```bash
# Shell no backend
docker exec -it rafa-ilpi-backend sh

# Executar migrations
docker exec -it rafa-ilpi-backend npx prisma migrate deploy

# Ver logs do Prisma
docker exec -it rafa-ilpi-backend npx prisma studio
```

---

## 🔍 Troubleshooting

### Erro: "Port already in use"

```bash
# Verificar quem está usando a porta
lsof -i :80
lsof -i :3000

# Parar processo ou mudar porta no docker-compose.production.yml
```

### Erro: "Cannot connect to database"

```bash
# Verificar se o PostgreSQL está saudável
docker-compose -f docker-compose.production.yml ps postgres

# Ver logs do PostgreSQL
docker-compose -f docker-compose.production.yml logs postgres

# Aguardar alguns segundos e tentar novamente
```

### Erro: "Out of memory"

```bash
# Ver uso de memória
docker stats

# Aumentar memória disponível para Docker
# Docker Desktop > Settings > Resources > Memory
```

### Limpar Tudo e Recomeçar

```bash
# ⚠️ ATENÇÃO: Isto VAI APAGAR todos os dados!
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d
```

### Ver Health Checks

```bash
# Ver saúde dos containers
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

## 📊 Monitoramento

### Health Endpoints

- Backend: http://localhost:3000/api/health
- Frontend: http://localhost/

### Logs de Auditoria

Os logs de auditoria são salvos no banco de dados na tabela `audit_logs`.

Para visualizar:

```bash
docker exec -it rafa-ilpi-postgres psql -U rafa_user -d rafa_ilpi -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
```

---

## 🔐 Segurança

### Recomendações Importantes

1. ✅ Troque todas as senhas padrão no `.env.production`
2. ✅ Use senhas fortes (mínimo 32 caracteres para JWT_SECRET)
3. ✅ Configure firewall para bloquear portas não necessárias
4. ✅ Use HTTPS em produção (configure reverse proxy como Nginx ou Traefik)
5. ✅ Faça backup regular dos volumes
6. ✅ Mantenha Docker e imagens atualizadas

### Configurar HTTPS (Opcional)

Use um reverse proxy como Nginx ou Traefik com Let's Encrypt.

Exemplo com Nginx:

```nginx
server {
    listen 443 ssl;
    server_name seu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/seu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📞 Suporte

Para suporte técnico:
- 📧 Email: suporte@rafalabs.com.br
- 📖 Documentação: [Link para docs]
- 🐛 Issues: [Link para GitHub Issues]

---

**Desenvolvido com ❤️ por RAFA Labs**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
