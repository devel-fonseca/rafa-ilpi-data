-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Reconciliação de Isolamento Multi-Tenant
-- Data: 2026-02-13
-- 
-- OBJETIVO: Formalizar o estado correto do banco após migração para schema-per-tenant
--
-- CONTEXTO:
-- - institutional_events foi movida de public para tenant_* schemas
-- - FKs userId em medication_administrations e sos_administrations foram removidas
--   de public (incompatíveis com multi-tenancy onde users estão em tenant_* schemas)
--
-- NOTA: Esta migration é idempotente - apenas garante que estruturas incorretas
--       não existam em public. O estado já está correto, apenas reconciliando
--       o histórico de migrations com a realidade.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Garantir que institutional_events não existe em public
--    (já foi movida para tenant schemas via 20260129000000)
DROP TABLE IF EXISTS public.institutional_events CASCADE;

-- 2. Garantir que FKs userId não existem em public.medication_administrations
--    (incompatível com multi-tenancy - users estão em tenant_* schemas)
ALTER TABLE public.medication_administrations
  DROP CONSTRAINT IF EXISTS "medication_administrations_userId_fkey";

-- 3. Garantir que FKs userId não existem em public.sos_administrations
--    (incompatível com multi-tenancy - users estão em tenant_* schemas)  
ALTER TABLE public.sos_administrations
  DROP CONSTRAINT IF EXISTS "sos_administrations_userId_fkey";

-- ══════════════════════════════════════════════════════════════════════════════
-- IMPORTANTE: As estruturas corretas existem nos tenant schemas:
-- - tenant_*.institutional_events (isolada por tenant)
-- - tenant_*.medication_administrations com FK para tenant_*.users
-- - tenant_*.sos_administrations com FK para tenant_*.users
-- ══════════════════════════════════════════════════════════════════════════════
