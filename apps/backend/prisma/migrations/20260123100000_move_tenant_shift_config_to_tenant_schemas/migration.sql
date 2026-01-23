-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: Mover tenant_shift_config de public para tenant schemas
-- Data: 23/01/2026
--
-- MOTIVO: Correção arquitetural - TenantShiftConfig deve estar isolado por tenant
--
-- ANTES: public.tenant_shift_configs (SHARED, filtrado por tenantId)
-- DEPOIS: tenant_xxx.tenant_shift_config (ISOLADO por schema)
-- ──────────────────────────────────────────────────────────────────────────────

-- Passo 1: Dropar tabela antiga de public (se existir)
DROP TABLE IF EXISTS public.tenant_shift_configs CASCADE;

-- Passo 2: Criar tabela em CADA schema de tenant será feito por script customizado
-- Ver: apps/backend/scripts/migrate-tenant-shift-config.ts
