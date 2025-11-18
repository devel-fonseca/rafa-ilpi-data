#!/bin/bash

# ==================================
# RAFA ILPI - Docker Import & Run
# ==================================
# Script para importar e executar imagens Docker

set -e  # Parar em caso de erro

echo "🐳 RAFA ILPI - Docker Import & Run"
echo "===================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se existe o diretório de imagens
IMAGES_DIR="docker-images-export"
if [ ! -d "$IMAGES_DIR" ]; then
    echo -e "${RED}❌ Erro: Diretório '$IMAGES_DIR' não encontrado!${NC}"
    echo "Por favor, certifique-se de que copiou a pasta corretamente."
    exit 1
fi

# Verificar se existe o arquivo .env.production
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env.production não encontrado!${NC}"
    echo "Copiando .env.production.example para .env.production..."
    cp .env.production.example .env.production
    echo -e "${RED}⚠️  ATENÇÃO: Edite o arquivo .env.production com suas credenciais antes de continuar!${NC}"
    echo "Pressione ENTER para continuar ou CTRL+C para cancelar..."
    read
fi

echo -e "${BLUE}📥 Importando imagens Docker...${NC}"
echo ""

# Importar Backend
if [ -f "$IMAGES_DIR/rafa-ilpi-backend.tar.gz" ]; then
    echo -e "${YELLOW}📦 Importando Backend...${NC}"
    docker load < "$IMAGES_DIR/rafa-ilpi-backend.tar.gz"
    echo -e "${GREEN}✅ Backend importado!${NC}"
else
    echo -e "${RED}❌ Arquivo rafa-ilpi-backend.tar.gz não encontrado!${NC}"
    exit 1
fi

# Importar Frontend
if [ -f "$IMAGES_DIR/rafa-ilpi-frontend.tar.gz" ]; then
    echo -e "${YELLOW}📦 Importando Frontend...${NC}"
    docker load < "$IMAGES_DIR/rafa-ilpi-frontend.tar.gz"
    echo -e "${GREEN}✅ Frontend importado!${NC}"
else
    echo -e "${RED}❌ Arquivo rafa-ilpi-frontend.tar.gz não encontrado!${NC}"
    exit 1
fi

# Importar PostgreSQL
if [ -f "$IMAGES_DIR/postgres-16-alpine.tar.gz" ]; then
    echo -e "${YELLOW}📦 Importando PostgreSQL...${NC}"
    docker load < "$IMAGES_DIR/postgres-16-alpine.tar.gz"
    echo -e "${GREEN}✅ PostgreSQL importado!${NC}"
else
    echo -e "${RED}❌ Arquivo postgres-16-alpine.tar.gz não encontrado!${NC}"
    exit 1
fi

# Importar Redis
if [ -f "$IMAGES_DIR/redis-7-alpine.tar.gz" ]; then
    echo -e "${YELLOW}📦 Importando Redis...${NC}"
    docker load < "$IMAGES_DIR/redis-7-alpine.tar.gz"
    echo -e "${GREEN}✅ Redis importado!${NC}"
else
    echo -e "${RED}❌ Arquivo redis-7-alpine.tar.gz não encontrado!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✨ Todas as imagens foram importadas com sucesso!${NC}"
echo ""

# Verificar se quer executar agora
echo -e "${YELLOW}Deseja iniciar os containers agora? (y/n)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo -e "${BLUE}🚀 Iniciando containers...${NC}"
    echo ""

    # Parar containers existentes (se houver)
    docker-compose -f docker-compose.production.yml down 2>/dev/null || true

    # Iniciar containers
    docker-compose -f docker-compose.production.yml --env-file .env.production up -d

    echo ""
    echo -e "${GREEN}✨ Containers iniciados com sucesso!${NC}"
    echo ""
    echo -e "${BLUE}📊 Status dos containers:${NC}"
    docker-compose -f docker-compose.production.yml ps

    echo ""
    echo -e "${GREEN}🎉 RAFA ILPI está rodando!${NC}"
    echo ""
    echo -e "${BLUE}📝 URLs de acesso:${NC}"
    echo "   Frontend: http://localhost"
    echo "   Backend API: http://localhost:3000"
    echo "   PostgreSQL: localhost:5433"
    echo "   Redis: localhost:6379"
    echo ""
    echo -e "${YELLOW}📋 Comandos úteis:${NC}"
    echo "   Ver logs: docker-compose -f docker-compose.production.yml logs -f"
    echo "   Parar: docker-compose -f docker-compose.production.yml down"
    echo "   Reiniciar: docker-compose -f docker-compose.production.yml restart"
    echo ""
else
    echo ""
    echo -e "${BLUE}Para iniciar os containers manualmente, execute:${NC}"
    echo "docker-compose -f docker-compose.production.yml --env-file .env.production up -d"
    echo ""
fi
