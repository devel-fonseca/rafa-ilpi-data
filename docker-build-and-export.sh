#!/bin/bash

# ==================================
# RAFA ILPI - Docker Build & Export
# ==================================
# Script para fazer build e exportar imagens Docker

set -e  # Parar em caso de erro

echo "🐳 RAFA ILPI - Docker Build & Export"
echo "===================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Diretório de output
OUTPUT_DIR="docker-images-export"
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}📦 Fazendo build das imagens...${NC}"
echo ""

# Build Backend
echo -e "${YELLOW}🔨 Building Backend...${NC}"
docker build \
  -t rafa-ilpi-backend:latest \
  -f apps/backend/Dockerfile \
  --target production \
  apps/backend

echo -e "${GREEN}✅ Backend build concluído!${NC}"
echo ""

# Build Frontend
echo -e "${YELLOW}🔨 Building Frontend...${NC}"
docker build \
  -t rafa-ilpi-frontend:latest \
  -f apps/frontend/Dockerfile \
  --target production \
  apps/frontend

echo -e "${GREEN}✅ Frontend build concluído!${NC}"
echo ""

# Pull imagens de infraestrutura
echo -e "${BLUE}📥 Pulling infrastructure images...${NC}"
docker pull postgres:16-alpine
docker pull redis:7-alpine

echo ""
echo -e "${BLUE}💾 Exportando imagens para tar.gz...${NC}"
echo ""

# Exportar Backend
echo -e "${YELLOW}📦 Exportando Backend...${NC}"
docker save rafa-ilpi-backend:latest | gzip > "$OUTPUT_DIR/rafa-ilpi-backend.tar.gz"
echo -e "${GREEN}✅ Backend exportado: $OUTPUT_DIR/rafa-ilpi-backend.tar.gz${NC}"

# Exportar Frontend
echo -e "${YELLOW}📦 Exportando Frontend...${NC}"
docker save rafa-ilpi-frontend:latest | gzip > "$OUTPUT_DIR/rafa-ilpi-frontend.tar.gz"
echo -e "${GREEN}✅ Frontend exportado: $OUTPUT_DIR/rafa-ilpi-frontend.tar.gz${NC}"

# Exportar PostgreSQL
echo -e "${YELLOW}📦 Exportando PostgreSQL...${NC}"
docker save postgres:16-alpine | gzip > "$OUTPUT_DIR/postgres-16-alpine.tar.gz"
echo -e "${GREEN}✅ PostgreSQL exportado: $OUTPUT_DIR/postgres-16-alpine.tar.gz${NC}"

# Exportar Redis
echo -e "${YELLOW}📦 Exportando Redis...${NC}"
docker save redis:7-alpine | gzip > "$OUTPUT_DIR/redis-7-alpine.tar.gz"
echo -e "${GREEN}✅ Redis exportado: $OUTPUT_DIR/redis-7-alpine.tar.gz${NC}"

echo ""
echo -e "${BLUE}📊 Tamanhos dos arquivos:${NC}"
ls -lh "$OUTPUT_DIR"/*.tar.gz

echo ""
echo -e "${GREEN}✨ Build e export concluídos com sucesso!${NC}"
echo ""
echo -e "${BLUE}📂 Arquivos exportados em: $OUTPUT_DIR/${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo "1. Copie a pasta '$OUTPUT_DIR' para a outra máquina"
echo "2. Copie também os arquivos:"
echo "   - docker-compose.production.yml"
echo "   - .env.production.example (renomeie para .env.production)"
echo "3. Na outra máquina, execute: ./docker-import-and-run.sh"
echo ""
