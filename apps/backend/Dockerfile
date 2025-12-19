# ==================================
# 🐳 Dockerfile Multi-Stage - Backend
# ==================================
# Build otimizado para produção NestJS

# ------------------------------
# Stage 1: Dependencies
# ------------------------------
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências (incluindo dev para build)
RUN npm ci

# ------------------------------
# Stage 2: Builder
# ------------------------------
FROM node:20-alpine AS builder

# Instalar OpenSSL para Prisma detectar corretamente
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar dependências do stage anterior
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Gerar Prisma client (já vem gerado do host)
RUN npx prisma generate

# Build da aplicação
RUN npm run build

# Remover dev dependencies
RUN npm prune --production

# ------------------------------
# Stage 3: Production
# ------------------------------
FROM node:20-alpine AS production

# Instalar dumb-init e OpenSSL para Prisma
RUN apk add --no-cache dumb-init openssl

WORKDIR /app

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar arquivos necessários
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Regenerar Prisma Client no ambiente de produção (Alpine com OpenSSL 3.0)
RUN rm -rf node_modules/.prisma && npx prisma generate

# Criar diretório de logs
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

# Mudar para usuário não-root
USER nestjs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
