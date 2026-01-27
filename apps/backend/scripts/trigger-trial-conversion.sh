#!/bin/bash
#
# Script para disparar manualmente o TrialToActiveConversionJob
# via endpoint HTTP (requer backend rodando)
#

echo "🚀 Disparando TrialToActiveConversionJob manualmente..."
echo ""
echo "⚠️  Observações:"
echo "   - Este script chama o método handleCron() do job diretamente"
echo "   - Backend DEVE estar rodando em http://localhost:3000"
echo "   - Verifique os logs do backend para acompanhar a execução"
echo ""

# Chamar endpoint que dispara o job
# Nota: Este endpoint precisa ser criado no SuperAdminController

echo "❌ Endpoint HTTP não implementado ainda."
echo ""
echo "✅ Alternativa: Criar subscription manualmente via SQL"
echo ""
echo "Execute no psql:"
echo ""
echo "-- 1. Criar um tenant trial que expirou"
echo "UPDATE public.subscriptions"
echo "SET \"trialEndDate\" = NOW() - INTERVAL '1 day',"
echo "    status = 'trialing'"
echo "WHERE status = 'trialing'"
echo "LIMIT 1;"
echo ""
echo "-- 2. Verificar"
echo "SELECT id, \"trialEndDate\", status FROM public.subscriptions WHERE status = 'trialing';"
echo ""
echo "-- 3. Aguardar o job rodar às 02:00 OU chamar manualmente no código"
