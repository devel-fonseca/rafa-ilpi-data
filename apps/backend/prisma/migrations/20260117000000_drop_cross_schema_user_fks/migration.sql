-- Migration: Drop Cross-Schema Foreign Keys para Multi-Tenancy
-- Data: 2026-01-17
-- Motivo: Em arquitetura schema-per-tenant, users estão em schemas isolados (tenant_xyz.users)
--         mas contract_acceptances e privacy_policy_acceptances estão no schema public.
--         FKs userId apontam para public.users (que não existe) causando violação.
--
-- Solução: Remover FKs userId dessas tabelas permanentemente.
--          Integridade referencial é garantida por:
--          1. Validação em código (userId sempre válido no momento da criação)
--          2. Aceites são append-only (nunca editados/deletados)
--          3. userId é UUID válido no tenant schema correspondente

-- Dropar FK de contract_acceptances
ALTER TABLE public.contract_acceptances
  DROP CONSTRAINT IF EXISTS contract_acceptances_userId_fkey;

-- Dropar FK de privacy_policy_acceptances
ALTER TABLE public.privacy_policy_acceptances
  DROP CONSTRAINT IF EXISTS privacy_policy_acceptances_userId_fkey;

-- ⚠️ IMPORTANTE: NÃO recriar estas FKs!
-- Elas são incompatíveis com multi-tenancy schema-per-tenant
