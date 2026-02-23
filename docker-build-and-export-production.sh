#!/usr/bin/env bash

# ===========================================
# RAFA ILPI - Docker Build & Export (PROD)
# ===========================================
# Builda imagens com TAG de release, exporta .tar.gz com checksums
# e gera manifesto para deploy offline sem rebuild.

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

usage() {
  cat <<'EOF'
Uso:
  ./docker-build-and-export-production.sh [opções]

Opções:
  --tag <release_tag>       Define tag da release (padrão: YYYYMMDD-HHMM-<gitsha>)
  --output-dir <dir>        Diretório de saída (padrão: docker-images-export)
  --skip-infra-pull         Não faz docker pull de postgres/redis
  --no-latest-alias         Não cria alias :latest para backend/frontend
  -h, --help                Exibe esta ajuda

Exemplos:
  ./docker-build-and-export-production.sh
  ./docker-build-and-export-production.sh --tag 2026.02.23-01
  ./docker-build-and-export-production.sh --tag 2026.02.23-01 --output-dir dist/docker
EOF
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo -e "${RED}❌ Comando obrigatório não encontrado: ${cmd}${NC}"
    exit 1
  fi
}

TAG=""
OUTPUT_DIR="docker-images-export"
PULL_INFRA="true"
CREATE_LATEST_ALIAS="true"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      TAG="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --skip-infra-pull)
      PULL_INFRA="false"
      shift
      ;;
    --no-latest-alias)
      CREATE_LATEST_ALIAS="false"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo -e "${RED}❌ Opção inválida: $1${NC}"
      usage
      exit 1
      ;;
  esac
done

require_cmd docker
require_cmd gzip
require_cmd sha256sum

if ! docker info >/dev/null 2>&1; then
  echo -e "${RED}❌ Docker daemon indisponível.${NC}"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ -z "$TAG" ]]; then
  GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"
  TAG="$(date +%Y%m%d-%H%M)-${GIT_SHA}"
else
  GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"
fi

VITE_API_URL="${VITE_API_URL:-/api}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:16-alpine}"
REDIS_IMAGE="${REDIS_IMAGE:-redis:7-alpine}"

BACKEND_IMAGE="rafa-ilpi-backend:${TAG}"
FRONTEND_IMAGE="rafa-ilpi-frontend:${TAG}"
BACKEND_LATEST="rafa-ilpi-backend:latest"
FRONTEND_LATEST="rafa-ilpi-frontend:latest"

mkdir -p "$OUTPUT_DIR"

echo "🐳 RAFA ILPI - Docker Build & Export (PROD)"
echo "==========================================="
echo -e "${BLUE}Release tag:${NC} ${TAG}"
echo -e "${BLUE}Output dir:${NC} ${OUTPUT_DIR}"
echo -e "${BLUE}VITE_API_URL:${NC} ${VITE_API_URL}"
echo ""

echo -e "${BLUE}📦 Buildando imagens de aplicação...${NC}"
echo ""

echo -e "${YELLOW}🔨 Building Backend (${BACKEND_IMAGE})...${NC}"
docker build \
  --pull \
  -t "$BACKEND_IMAGE" \
  -f apps/backend/Dockerfile \
  --target production \
  apps/backend
echo -e "${GREEN}✅ Backend build concluído${NC}"
echo ""

echo -e "${YELLOW}🔨 Building Frontend (${FRONTEND_IMAGE})...${NC}"
docker build \
  --pull \
  -t "$FRONTEND_IMAGE" \
  -f apps/frontend/Dockerfile \
  --target production \
  --build-arg "VITE_API_URL=${VITE_API_URL}" \
  apps/frontend
echo -e "${GREEN}✅ Frontend build concluído${NC}"
echo ""

if [[ "$CREATE_LATEST_ALIAS" == "true" ]]; then
  echo -e "${BLUE}🏷️  Criando alias :latest para compatibilidade com compose atual...${NC}"
  docker tag "$BACKEND_IMAGE" "$BACKEND_LATEST"
  docker tag "$FRONTEND_IMAGE" "$FRONTEND_LATEST"
  echo -e "${GREEN}✅ Alias :latest criado${NC}"
  echo ""
fi

echo -e "${BLUE}🔎 Validando imagens locais...${NC}"
docker image inspect "$BACKEND_IMAGE" >/dev/null
docker image inspect "$FRONTEND_IMAGE" >/dev/null
if [[ "$CREATE_LATEST_ALIAS" == "true" ]]; then
  docker image inspect "$BACKEND_LATEST" >/dev/null
  docker image inspect "$FRONTEND_LATEST" >/dev/null
fi
echo -e "${GREEN}✅ Imagens validadas${NC}"
echo ""

if [[ "$PULL_INFRA" == "true" ]]; then
  echo -e "${BLUE}📥 Atualizando imagens de infraestrutura...${NC}"
  docker pull "$POSTGRES_IMAGE"
  docker pull "$REDIS_IMAGE"
  echo -e "${GREEN}✅ Infra atualizada${NC}"
  echo ""
else
  echo -e "${YELLOW}⏭️  Pull de infraestrutura ignorado (--skip-infra-pull)${NC}"
  echo ""
fi

echo -e "${BLUE}💾 Exportando imagens...${NC}"
echo ""

BACKEND_TAR="${OUTPUT_DIR}/rafa-ilpi-backend.tar.gz"
FRONTEND_TAR="${OUTPUT_DIR}/rafa-ilpi-frontend.tar.gz"
POSTGRES_TAR="${OUTPUT_DIR}/postgres-16-alpine.tar.gz"
REDIS_TAR="${OUTPUT_DIR}/redis-7-alpine.tar.gz"

echo -e "${YELLOW}📦 Exportando Backend...${NC}"
if [[ "$CREATE_LATEST_ALIAS" == "true" ]]; then
  docker save "$BACKEND_IMAGE" "$BACKEND_LATEST" | gzip -c > "$BACKEND_TAR"
else
  docker save "$BACKEND_IMAGE" | gzip -c > "$BACKEND_TAR"
fi
echo -e "${GREEN}✅ ${BACKEND_TAR}${NC}"

echo -e "${YELLOW}📦 Exportando Frontend...${NC}"
if [[ "$CREATE_LATEST_ALIAS" == "true" ]]; then
  docker save "$FRONTEND_IMAGE" "$FRONTEND_LATEST" | gzip -c > "$FRONTEND_TAR"
else
  docker save "$FRONTEND_IMAGE" | gzip -c > "$FRONTEND_TAR"
fi
echo -e "${GREEN}✅ ${FRONTEND_TAR}${NC}"

echo -e "${YELLOW}📦 Exportando PostgreSQL...${NC}"
docker save "$POSTGRES_IMAGE" | gzip -c > "$POSTGRES_TAR"
echo -e "${GREEN}✅ ${POSTGRES_TAR}${NC}"

echo -e "${YELLOW}📦 Exportando Redis...${NC}"
docker save "$REDIS_IMAGE" | gzip -c > "$REDIS_TAR"
echo -e "${GREEN}✅ ${REDIS_TAR}${NC}"
echo ""

echo -e "${BLUE}🔐 Gerando checksums...${NC}"
(
  cd "$OUTPUT_DIR"
  sha256sum \
    "rafa-ilpi-backend.tar.gz" \
    "rafa-ilpi-frontend.tar.gz" \
    "postgres-16-alpine.tar.gz" \
    "redis-7-alpine.tar.gz" > SHA256SUMS
)
echo -e "${GREEN}✅ ${OUTPUT_DIR}/SHA256SUMS${NC}"
echo ""

BACKEND_ID="$(docker image inspect "$BACKEND_IMAGE" --format '{{.Id}}')"
FRONTEND_ID="$(docker image inspect "$FRONTEND_IMAGE" --format '{{.Id}}')"
POSTGRES_ID="$(docker image inspect "$POSTGRES_IMAGE" --format '{{.Id}}')"
REDIS_ID="$(docker image inspect "$REDIS_IMAGE" --format '{{.Id}}')"

MANIFEST_FILE="${OUTPUT_DIR}/manifest.txt"
cat > "$MANIFEST_FILE" <<EOF
RAFA ILPI - Docker Export Manifest
Generated at (UTC): $(date -u '+%Y-%m-%d %H:%M:%S')
Release tag: ${TAG}
Git commit: ${GIT_SHA}

Application images:
  - ${BACKEND_IMAGE} (id: ${BACKEND_ID})
  - ${FRONTEND_IMAGE} (id: ${FRONTEND_ID})
$( [[ "$CREATE_LATEST_ALIAS" == "true" ]] && cat <<EOL
Compatibility aliases:
  - ${BACKEND_LATEST}
  - ${FRONTEND_LATEST}
EOL
)
Infrastructure images:
  - ${POSTGRES_IMAGE} (id: ${POSTGRES_ID})
  - ${REDIS_IMAGE} (id: ${REDIS_ID})

Exported archives:
  - rafa-ilpi-backend.tar.gz
  - rafa-ilpi-frontend.tar.gz
  - postgres-16-alpine.tar.gz
  - redis-7-alpine.tar.gz

Validation on target host:
  cd docker-images-export
  sha256sum -c SHA256SUMS

Recommended deploy command (no rebuild):
  docker compose -f docker-compose.production.yml --env-file .env.production up -d --no-build

Fallback (legacy docker-compose):
  docker-compose -f docker-compose.production.yml --env-file .env.production up -d --no-build
EOF

echo -e "${GREEN}✅ ${MANIFEST_FILE}${NC}"
echo ""

echo -e "${BLUE}📊 Arquivos gerados:${NC}"
ls -lh "$OUTPUT_DIR"/*.tar.gz "$OUTPUT_DIR"/SHA256SUMS "$OUTPUT_DIR"/manifest.txt
echo ""

echo -e "${GREEN}✨ Export de produção concluído com sucesso!${NC}"
echo -e "${YELLOW}Próximo passo:${NC} validar checksums na máquina de destino antes de dar up."
