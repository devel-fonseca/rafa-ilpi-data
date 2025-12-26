-- ============================================================================
-- SCRIPT DE CENÁRIOS DE TESTE - INADIMPLÊNCIA
-- ============================================================================
--
-- Este script cria faturas vencidas para testar o sistema de cobrança.
-- NOTA: Casa de Repouso São Rafael NÃO será alterada (tenant protegido)
-- ============================================================================

-- Limpar faturas anteriores (exceto Casa São Rafael)
DELETE FROM invoices
WHERE "tenantId" != (SELECT id FROM tenants WHERE email = 'contato@casasaorafael.com.br');

-- ============================================================================
-- CENÁRIOS DE TESTE
-- ============================================================================

-- Cenário 1: YIELD INFORMATICA - Inadimplência LEVE (10 dias)
-- 1 fatura vencida, valor baixo
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'yield@yield.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '10 days', 'YYYYMMDD') || '-001',
        149.90, 'BRL', 'OPEN',
        (NOW() - INTERVAL '10 days')::timestamp,
        (NOW() - INTERVAL '40 days')::timestamp,
        NOW()
    );
END $$;

-- Cenário 2: ANDREA NAZARE BARROS - Inadimplência MODERADA (20 dias)
-- 2 faturas vencidas consecutivas
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@barrosnazare.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    -- Fatura 1 (50 dias de atraso)
    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '50 days', 'YYYYMMDD') || '-001',
        299.90, 'BRL', 'OPEN',
        (NOW() - INTERVAL '50 days')::timestamp,
        (NOW() - INTERVAL '80 days')::timestamp,
        NOW()
    );

    -- Fatura 2 (20 dias de atraso)
    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '20 days', 'YYYYMMDD') || '-002',
        299.90, 'BRL', 'OPEN',
        (NOW() - INTERVAL '20 days')::timestamp,
        (NOW() - INTERVAL '50 days')::timestamp,
        NOW()
    );
END $$;

-- Cenário 3: DAVID WILLIAN FERLA - Inadimplência CRÍTICA (35 dias)
-- 1 fatura com atraso grave
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@dwferla.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '35 days', 'YYYYMMDD') || '-001',
        599.90, 'BRL', 'OPEN',
        (NOW() - INTERVAL '35 days')::timestamp,
        (NOW() - INTERVAL '65 days')::timestamp,
        NOW()
    );
END $$;

-- Cenário 4: JOSE FRANCISCO FUKUMURA - Inadimplência CRÍTICA GRAVE (45 dias)
-- 3 faturas vencidas + valor alto
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@jffukumura.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    -- Fatura 1 (75 dias de atraso)
    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '75 days', 'YYYYMMDD') || '-001',
        899.90, 'BRL', 'OPEN',
        (NOW() - INTERVAL '75 days')::timestamp,
        (NOW() - INTERVAL '105 days')::timestamp,
        NOW()
    );

    -- Fatura 2 (45 dias de atraso)
    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '45 days', 'YYYYMMDD') || '-002',
        899.90, 'BRL', 'OPEN',
        (NOW() - INTERVAL '45 days')::timestamp,
        (NOW() - INTERVAL '75 days')::timestamp,
        NOW()
    );

    -- Fatura 3 (15 dias de atraso)
    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '15 days', 'YYYYMMDD') || '-003',
        899.90, 'BRL', 'OPEN',
        (NOW() - INTERVAL '15 days')::timestamp,
        (NOW() - INTERVAL '45 days')::timestamp,
        NOW()
    );
END $$;

-- Cenário 5: J A FIGUEIREDO & ENNE - Inadimplência LEVE (8 dias)
-- 1 fatura recém vencida
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@jafenne.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '8 days', 'YYYYMMDD') || '-001',
        399.90, 'BRL', 'OPEN',
        (NOW() - INTERVAL '8 days')::timestamp,
        (NOW() - INTERVAL '38 days')::timestamp,
        NOW()
    );
END $$;

-- Cenário 6: RODRIGO DE OLIVEIRA SILVA - Inadimplência MODERADA (25 dias)
-- 2 faturas, valores médios
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@roolsil.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    -- Fatura 1 (55 dias de atraso)
    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '55 days', 'YYYYMMDD') || '-001',
        449.90, 'BRL', 'OPEN',
        (NOW() - INTERVAL '55 days')::timestamp,
        (NOW() - INTERVAL '85 days')::timestamp,
        NOW()
    );

    -- Fatura 2 (25 dias de atraso)
    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '25 days', 'YYYYMMDD') || '-002',
        449.90, 'BRL', 'OPEN',
        (NOW() - INTERVAL '25 days')::timestamp,
        (NOW() - INTERVAL '55 days')::timestamp,
        NOW()
    );
END $$;

-- Cenário 7: ELIZEU RODRIGUES DO PRADO - Em dia (fatura paga recentemente)
-- Criar 1 fatura PAGA para contraste
DO $$
DECLARE
    v_tenant_id uuid;
    v_subscription_id uuid;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE email = 'contato@erprado.com.br';
    SELECT id INTO v_subscription_id FROM subscriptions WHERE "tenantId" = v_tenant_id;

    INSERT INTO invoices (
        id, "tenantId", "subscriptionId", "invoiceNumber", amount, currency,
        status, "dueDate", "paidAt", "createdAt", "updatedAt"
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_subscription_id,
        'INV-' || TO_CHAR(NOW() - INTERVAL '5 days', 'YYYYMMDD') || '-001',
        349.90, 'BRL', 'PAID',
        (NOW() - INTERVAL '5 days')::timestamp,
        (NOW() - INTERVAL '3 days')::timestamp,
        (NOW() - INTERVAL '35 days')::timestamp,
        NOW()
    );
END $$;

-- ============================================================================
-- VERIFICAÇÃO - Listar faturas criadas
-- ============================================================================
SELECT
    t.name as tenant,
    t.email,
    i."invoiceNumber",
    i.amount,
    i.status,
    i."dueDate",
    EXTRACT(DAY FROM (NOW() - i."dueDate")) as dias_atraso
FROM invoices i
JOIN tenants t ON i."tenantId" = t.id
WHERE t.email != 'contato@casasaorafael.com.br'
ORDER BY i."dueDate";

-- ============================================================================
-- RESUMO DOS CENÁRIOS CRIADOS
-- ============================================================================
--
-- ✅ YIELD INFORMATICA (yield@yield.com.br)
--    - 1 fatura vencida há 10 dias (R$ 149,90)
--    - Severidade: LEVE
--
-- ⚠️  ANDREA NAZARE BARROS (contato@barrosnazare.com.br)
--    - 2 faturas vencidas (50 e 20 dias) (R$ 599,80 total)
--    - Severidade: MODERADA
--
-- 🚨 DAVID WILLIAN FERLA (contato@dwferla.com.br)
--    - 1 fatura vencida há 35 dias (R$ 599,90)
--    - Severidade: CRÍTICA
--
-- 🔥 JOSE FRANCISCO FUKUMURA (contato@jffukumura.com.br)
--    - 3 faturas vencidas (75, 45 e 15 dias) (R$ 2.699,70 total)
--    - Severidade: CRÍTICA GRAVE
--
-- ✅ J A FIGUEIREDO & ENNE (contato@jafenne.com.br)
--    - 1 fatura vencida há 8 dias (R$ 399,90)
--    - Severidade: LEVE
--
-- ⚠️  RODRIGO DE OLIVEIRA SILVA (contato@roolsil.com.br)
--    - 2 faturas vencidas (55 e 25 dias) (R$ 899,80 total)
--    - Severidade: MODERADA
--
-- ✅ ELIZEU RODRIGUES DO PRADO (contato@erprado.com.br)
--    - 1 fatura PAGA (em dia - para contraste)
--
-- 🛡️  Casa de Repouso São Rafael (contato@casasaorafael.com.br)
--    - SEM ALTERAÇÕES (tenant protegido)
--
-- 📊 TOTAL:
--    - 11 faturas criadas
--    - 10 vencidas (OPEN)
--    - 1 paga (PAID)
--    - Valor total em atraso: R$ 5.099,20
--    - 6 tenants inadimplentes
-- ============================================================================
