-- ============================================================================
-- SCRIPT DE DADOS PARA ANALYTICS E GRÁFICOS
-- ============================================================================
--
-- Este script cria um histórico de faturas pagas para popular gráficos
-- e métricas de analytics (MRR, ARR, Churn, tendências, etc.)
-- ============================================================================

-- Criar histórico de faturas pagas nos últimos 12 meses para todos os tenants ativos
-- Isso permitirá visualizar:
-- - Gráficos de tendência de inadimplência
-- - Evolução de MRR/ARR
-- - Taxa de conversão de pagamentos
-- - Análise histórica

-- ============================================================================
-- Histórico de faturas PAGAS (últimos 12 meses)
-- ============================================================================

-- Casa de Repouso São Rafael (tenant principal - sempre em dia)
-- 12 faturas pagas consecutivas
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
    v_month_offset integer;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@casasaorafael.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    -- Criar 12 faturas mensais pagas
    FOR v_month_offset IN 1..12 LOOP
        INSERT INTO invoices (
            id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
            status, "dueDate", "paidAt", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), v_tenant_id, v_subscription_id,
            'INV-' || TO_CHAR(NOW() - (v_month_offset || ' months')::interval, 'YYYYMMDD') || '-SRF',
            599.90, 'BRL', 'PAID',
            (NOW() - (v_month_offset || ' months')::interval)::timestamp,
            (NOW() - (v_month_offset || ' months')::interval + interval '2 days')::timestamp,
            (NOW() - (v_month_offset || ' months')::interval - interval '30 days')::timestamp,
            NOW()
        );
    END LOOP;
END $$;

-- YIELD INFORMATICA (histórico misto - algumas pagas, algumas vencidas)
-- 8 faturas pagas + 1 vencida atual
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
    v_month_offset integer;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'yield@yield.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    -- Criar 8 faturas pagas (meses 2-9)
    FOR v_month_offset IN 2..9 LOOP
        INSERT INTO invoices (
            id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
            status, "dueDate", "paidAt", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), v_tenant_id, v_subscription_id,
            'INV-' || TO_CHAR(NOW() - (v_month_offset || ' months')::interval, 'YYYYMMDD') || '-YLD',
            149.90, 'BRL', 'PAID',
            (NOW() - (v_month_offset || ' months')::interval)::timestamp,
            (NOW() - (v_month_offset || ' months')::interval + interval '3 days')::timestamp,
            (NOW() - (v_month_offset || ' months')::interval - interval '30 days')::timestamp,
            NOW()
        );
    END LOOP;
END $$;

-- ELIZEU RODRIGUES DO PRADO (sempre pagou em dia)
-- 10 faturas pagas
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
    v_month_offset integer;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@erprado.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    FOR v_month_offset IN 2..11 LOOP
        INSERT INTO invoices (
            id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
            status, "dueDate", "paidAt", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), v_tenant_id, v_subscription_id,
            'INV-' || TO_CHAR(NOW() - (v_month_offset || ' months')::interval, 'YYYYMMDD') || '-ERP',
            349.90, 'BRL', 'PAID',
            (NOW() - (v_month_offset || ' months')::interval)::timestamp,
            (NOW() - (v_month_offset || ' months')::interval + interval '1 day')::timestamp,
            (NOW() - (v_month_offset || ' months')::interval - interval '30 days')::timestamp,
            NOW()
        );
    END LOOP;
END $$;

-- ANDREA NAZARE BARROS (histórico de pagamentos com alguns atrasos)
-- 6 pagas + 2 vencidas atuais
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
    v_month_offset integer;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@barrosnazare.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    FOR v_month_offset IN 3..8 LOOP
        INSERT INTO invoices (
            id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
            status, "dueDate", "paidAt", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), v_tenant_id, v_subscription_id,
            'INV-' || TO_CHAR(NOW() - (v_month_offset || ' months')::interval, 'YYYYMMDD') || '-ANB',
            299.90, 'BRL', 'PAID',
            (NOW() - (v_month_offset || ' months')::interval)::timestamp,
            (NOW() - (v_month_offset || ' months')::interval + interval '5 days')::timestamp,
            (NOW() - (v_month_offset || ' months')::interval - interval '30 days')::timestamp,
            NOW()
        );
    END LOOP;
END $$;

-- J A FIGUEIREDO & ENNE (bom pagador até recentemente)
-- 9 pagas + 1 vencida atual
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
    v_month_offset integer;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@jafenne.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    FOR v_month_offset IN 2..10 LOOP
        INSERT INTO invoices (
            id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
            status, "dueDate", "paidAt", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), v_tenant_id, v_subscription_id,
            'INV-' || TO_CHAR(NOW() - (v_month_offset || ' months')::interval, 'YYYYMMDD') || '-JAF',
            399.90, 'BRL', 'PAID',
            (NOW() - (v_month_offset || ' months')::interval)::timestamp,
            (NOW() - (v_month_offset || ' months')::interval + interval '2 days')::timestamp,
            (NOW() - (v_month_offset || ' months')::interval - interval '30 days')::timestamp,
            NOW()
        );
    END LOOP;
END $$;

-- RODRIGO DE OLIVEIRA SILVA (pagador irregular)
-- 5 pagas + 2 vencidas atuais
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
    v_month_offset integer;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@roolsil.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    FOR v_month_offset IN 4..8 LOOP
        INSERT INTO invoices (
            id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
            status, "dueDate", "paidAt", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), v_tenant_id, v_subscription_id,
            'INV-' || TO_CHAR(NOW() - (v_month_offset || ' months')::interval, 'YYYYMMDD') || '-ROS',
            449.90, 'BRL', 'PAID',
            (NOW() - (v_month_offset || ' months')::interval)::timestamp,
            (NOW() - (v_month_offset || ' months')::interval + interval '10 days')::timestamp,
            (NOW() - (v_month_offset || ' months')::interval - interval '30 days')::timestamp,
            NOW()
        );
    END LOOP;
END $$;

-- DAVID WILLIAN FERLA (novo cliente com bom histórico inicial)
-- 4 pagas + 1 vencida crítica atual
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
    v_month_offset integer;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@dwferla.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    FOR v_month_offset IN 3..6 LOOP
        INSERT INTO invoices (
            id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
            status, "dueDate", "paidAt", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), v_tenant_id, v_subscription_id,
            'INV-' || TO_CHAR(NOW() - (v_month_offset || ' months')::interval, 'YYYYMMDD') || '-DWF',
            599.90, 'BRL', 'PAID',
            (NOW() - (v_month_offset || ' months')::interval)::timestamp,
            (NOW() - (v_month_offset || ' months')::interval + interval '1 day')::timestamp,
            (NOW() - (v_month_offset || ' months')::interval - interval '30 days')::timestamp,
            NOW()
        );
    END LOOP;
END $$;

-- JOSE FRANCISCO FUKUMURA (grande problema - muitas faturas vencidas)
-- 3 pagas + 3 vencidas atuais (grave)
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
    v_month_offset integer;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@jffukumura.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    FOR v_month_offset IN 5..7 LOOP
        INSERT INTO invoices (
            id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
            status, "dueDate", "paidAt", "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), v_tenant_id, v_subscription_id,
            'INV-' || TO_CHAR(NOW() - (v_month_offset || ' months')::interval, 'YYYYMMDD') || '-JFF',
            899.90, 'BRL', 'PAID',
            (NOW() - (v_month_offset || ' months')::interval)::timestamp,
            (NOW() - (v_month_offset || ' months')::interval + interval '20 days')::timestamp,
            (NOW() - (v_month_offset || ' months')::interval - interval '30 days')::timestamp,
            NOW()
        );
    END LOOP;
END $$;

-- ============================================================================
-- VERIFICAÇÃO - Resumo de faturas por tenant
-- ============================================================================
SELECT
    t.name as tenant,
    COUNT(CASE WHEN i.status = 'PAID' THEN 1 END) as pagas,
    COUNT(CASE WHEN i.status = 'OPEN' AND i."dueDate" < NOW() THEN 1 END) as vencidas,
    SUM(CASE WHEN i.status = 'PAID' THEN i.amount ELSE 0 END) as total_pago,
    SUM(CASE WHEN i.status = 'OPEN' AND i."dueDate" < NOW() THEN i.amount ELSE 0 END) as total_vencido
FROM tenants t
LEFT JOIN invoices i ON t.id = i."tenantId"
GROUP BY t.id, t.name
ORDER BY total_vencido DESC;

-- ============================================================================
-- RESUMO
-- ============================================================================
--
-- 📊 TOTAL DE FATURAS ADICIONADAS:
--    - Casa São Rafael: 12 pagas
--    - YIELD INFORMATICA: 8 pagas + 1 vencida
--    - ELIZEU RODRIGUES: 10 pagas + 1 paga
--    - ANDREA BARROS: 6 pagas + 2 vencidas
--    - J A FIGUEIREDO: 9 pagas + 1 vencida
--    - RODRIGO SILVA: 5 pagas + 2 vencidas
--    - DAVID FERLA: 4 pagas + 1 vencida
--    - JOSE FUKUMURA: 3 pagas + 3 vencidas
--
-- 📈 TOTAL GERAL:
--    - 57 faturas pagas (histórico)
--    - 10 faturas vencidas (atual)
--    - 1 fatura paga recente (ELIZEU)
--    - Total: 68 faturas no sistema
--
-- ✅ Agora você tem dados suficientes para:
--    - Gráficos de tendência de inadimplência
--    - Analytics de MRR/ARR
--    - Taxa de conversão
--    - Histórico de pagamentos por tenant
--    - Comparação de comportamento de pagamento
-- ============================================================================
