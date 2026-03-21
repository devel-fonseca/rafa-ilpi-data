# ==================================
# 🐳 Dockerfile Multi-Stage - Frontend
# ==================================
# Build otimizado para produção React + Vite

# ------------------------------
# Stage 1: Dependencies
# ------------------------------
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# ------------------------------
# Stage 2: Builder
# ------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Argumento para URL da API (passado em build time)
# Em produção: usa /api (resolvida pelo nginx proxy)
# Em desenvolvimento: api.ts usa localhost:3000/api como fallback
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Copiar dependências do stage anterior
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Build da aplicação com a variável de ambiente
RUN npm run build

# ------------------------------
# Stage 3: Production (nginx)
# ------------------------------
FROM nginx:alpine AS production

# Instalar dumb-init
RUN apk add --no-cache dumb-init

# Copiar build do React
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S react -u 1001 && \
    chown -R react:nodejs /usr/share/nginx/html && \
    chown -R react:nodejs /var/cache/nginx && \
    chown -R react:nodejs /var/log/nginx && \
    chown -R react:nodejs /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R react:nodejs /var/run/nginx.pid

# Mudar para usuário não-root
USER react

# Expor porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]
