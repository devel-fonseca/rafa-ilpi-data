#!/bin/bash
# Script para testar a API de inbox
# Primeiro, fazer login para pegar o token

echo "=== Testando API de Mensagens ==="
echo ""

# Login do usuário Responsável
echo "1. Fazendo login..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "e.rafalabs@gmail.com", "password": "senha123"}' \
  | grep -o '"accessToken":"[^"]*"' \
  | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login"
  exit 1
fi

echo "✅ Token obtido: ${TOKEN:0:50}..."
echo ""

# Testar inbox
echo "2. Buscando inbox..."
curl -s http://localhost:3000/api/messages/inbox \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

echo ""
echo "3. Buscando inbox com unreadOnly=true..."
curl -s "http://localhost:3000/api/messages/inbox?unreadOnly=true" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

