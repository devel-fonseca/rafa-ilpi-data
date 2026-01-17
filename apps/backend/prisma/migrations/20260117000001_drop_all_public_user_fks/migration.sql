-- Migration: Drop ALL Cross-Schema User Foreign Keys no schema public
-- Data: 2026-01-17
-- Motivo: Em arquitetura schema-per-tenant, users estão em schemas isolados (tenant_xyz.users)
--         mas várias tabelas são duplicadas no schema public pelas migrations.
--         FKs userId apontam para public.users (que não existe) causando violações.
--
-- Solução: Remover FKs userId dessas tabelas APENAS no schema public.
--          Nos schemas dos tenants, as FKs podem permanecer pois users existe lá.

-- Dropar FK de daily_records
ALTER TABLE public.daily_records
  DROP CONSTRAINT IF EXISTS "daily_records_userId_fkey";

-- Dropar FK de medication_administrations
ALTER TABLE public.medication_administrations
  DROP CONSTRAINT IF EXISTS "medication_administrations_userId_fkey";

-- Dropar FK de message_recipients
ALTER TABLE public.message_recipients
  DROP CONSTRAINT IF EXISTS "message_recipients_userId_fkey";

-- Dropar FK de notification_reads
ALTER TABLE public.notification_reads
  DROP CONSTRAINT IF EXISTS "notification_reads_userId_fkey";

-- Dropar FK de password_reset_tokens
ALTER TABLE public.password_reset_tokens
  DROP CONSTRAINT IF EXISTS "password_reset_tokens_userId_fkey";

-- Dropar FK de sos_administrations
ALTER TABLE public.sos_administrations
  DROP CONSTRAINT IF EXISTS "sos_administrations_userId_fkey";

-- Dropar FK de user_history
ALTER TABLE public.user_history
  DROP CONSTRAINT IF EXISTS "user_history_userId_fkey";

-- Dropar FK de user_profiles
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS "user_profiles_userId_fkey";

-- Dropar FK de vital_signs
ALTER TABLE public.vital_signs
  DROP CONSTRAINT IF EXISTS "vital_signs_userId_fkey";

-- ⚠️ IMPORTANTE: NÃO recriar estas FKs no schema public!
-- Elas são incompatíveis com multi-tenancy schema-per-tenant
-- Nos schemas dos tenants, as FKs permanecem ativas e funcionais
