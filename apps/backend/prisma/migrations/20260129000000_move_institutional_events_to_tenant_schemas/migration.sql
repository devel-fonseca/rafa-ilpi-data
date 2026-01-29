-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: Mover institutional_events de public para tenant schemas
-- Data: 29/01/2026
--
-- MOTIVO: Correção arquitetural - InstitutionalEvent deve estar isolado por tenant
--
-- ANTES: public.institutional_events (SHARED, filtrado por tenantId)
-- DEPOIS: tenant_xxx.institutional_events (ISOLADO por schema com ENUMs próprios)
-- ──────────────────────────────────────────────────────────────────────────────

-- Passo 1: Dropar tabela antiga de public (se existir)
-- Nota: Tabela está vazia, confirmado via SELECT COUNT(*)
DROP TABLE IF EXISTS public.institutional_events CASCADE;

-- Passo 2: Criar ENUMs no schema do tenant (para novos tenants via prisma migrate deploy)
-- IMPORTANTE: DO $$ BEGIN/EXCEPTION permite que a migration seja idempotente

DO $$ BEGIN
  CREATE TYPE "InstitutionalEventType" AS ENUM (
    'DOCUMENT_EXPIRY',
    'TRAINING',
    'MEETING',
    'INSPECTION',
    'MAINTENANCE',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InstitutionalEventVisibility" AS ENUM (
    'ADMIN_ONLY',
    'RT_ONLY',
    'ALL_USERS'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ScheduledEventStatus" AS ENUM (
    'SCHEDULED',
    'COMPLETED',
    'CANCELLED',
    'MISSED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Passo 3: Criar tabela institutional_events (para novos tenants via prisma migrate deploy)
CREATE TABLE IF NOT EXISTS institutional_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "eventType" "InstitutionalEventType" NOT NULL,
  visibility "InstitutionalEventVisibility" DEFAULT 'ALL_USERS' NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  "scheduledDate" DATE NOT NULL,
  "scheduledTime" TEXT,
  "allDay" BOOLEAN DEFAULT false NOT NULL,
  status "ScheduledEventStatus" DEFAULT 'SCHEDULED' NOT NULL,
  "completedAt" TIMESTAMPTZ(3),
  notes TEXT,

  -- Campos específicos para vencimento de documentos
  "documentType" TEXT,
  "documentNumber" TEXT,
  "expiryDate" DATE,
  responsible TEXT,

  -- Campos específicos para treinamentos
  "trainingTopic" TEXT,
  instructor TEXT,
  "targetAudience" TEXT,
  location TEXT,

  -- Metadados adicionais (JSON flexível)
  metadata JSONB,

  -- Auditoria
  "createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  "createdBy" UUID NOT NULL,
  "updatedBy" UUID
);

-- Passo 4: Criar índices
CREATE INDEX IF NOT EXISTS "institutional_events_tenantId_idx" ON institutional_events ("tenantId");
CREATE INDEX IF NOT EXISTS "institutional_events_scheduledDate_idx" ON institutional_events ("scheduledDate");
CREATE INDEX IF NOT EXISTS "institutional_events_eventType_idx" ON institutional_events ("eventType");
CREATE INDEX IF NOT EXISTS "institutional_events_visibility_idx" ON institutional_events (visibility);
CREATE INDEX IF NOT EXISTS "institutional_events_status_idx" ON institutional_events (status);
CREATE INDEX IF NOT EXISTS "institutional_events_deletedAt_idx" ON institutional_events ("deletedAt");
CREATE INDEX IF NOT EXISTS "institutional_events_tenantId_scheduledDate_idx" ON institutional_events ("tenantId", "scheduledDate");
CREATE INDEX IF NOT EXISTS "institutional_events_tenantId_eventType_scheduledDate_idx" ON institutional_events ("tenantId", "eventType", "scheduledDate");
CREATE INDEX IF NOT EXISTS "institutional_events_expiryDate_idx" ON institutional_events ("expiryDate");

-- Nota: Para tenants existentes, usar: apps/backend/scripts/migrate-institutional-events.ts
