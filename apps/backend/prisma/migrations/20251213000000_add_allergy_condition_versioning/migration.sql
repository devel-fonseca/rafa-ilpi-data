-- Migration: Add Allergy and Condition Versioning
-- Following the exact pattern from Medication versioning
-- Date: 2025-12-13

-- ==================== ALLERGY VERSIONING ====================

-- Add versioning fields to allergies table
ALTER TABLE "allergies"
  ADD COLUMN IF NOT EXISTS "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "updatedBy" UUID;

-- Add foreign key for updatedBy
ALTER TABLE "allergies"
  DROP CONSTRAINT IF EXISTS "allergies_updatedBy_fkey";

ALTER TABLE "allergies"
  ADD CONSTRAINT "allergies_updatedBy_fkey"
  FOREIGN KEY ("updatedBy")
  REFERENCES "users"(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS "allergies_recordedBy_idx" ON "allergies"("recordedBy");
CREATE INDEX IF NOT EXISTS "allergies_updatedBy_idx" ON "allergies"("updatedBy");

-- Create allergy_history table
CREATE TABLE IF NOT EXISTS "allergy_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "allergyId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "changeType" "ChangeType" NOT NULL,
  "changeReason" TEXT NOT NULL,
  "previousData" JSONB,
  "newData" JSONB NOT NULL,
  "changedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "changedAt" TIMESTAMPTZ(3) NOT NULL,
  "changedBy" UUID NOT NULL,
  "changedByName" TEXT,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "metadata" JSONB,

  CONSTRAINT "allergy_history_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "tenants"(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "allergy_history_allergyId_fkey"
    FOREIGN KEY ("allergyId")
    REFERENCES "allergies"(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "allergy_history_changedBy_fkey"
    FOREIGN KEY ("changedBy")
    REFERENCES "users"(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- Add indexes to allergy_history
CREATE INDEX IF NOT EXISTS "allergy_history_tenantId_allergyId_versionNumber_idx"
  ON "allergy_history"("tenantId", "allergyId", "versionNumber" DESC);
CREATE INDEX IF NOT EXISTS "allergy_history_tenantId_changedAt_idx"
  ON "allergy_history"("tenantId", "changedAt" DESC);
CREATE INDEX IF NOT EXISTS "allergy_history_changedBy_idx"
  ON "allergy_history"("changedBy");
CREATE INDEX IF NOT EXISTS "allergy_history_changeType_idx"
  ON "allergy_history"("changeType");

-- ==================== CONDITION VERSIONING ====================

-- Add versioning fields to conditions table
ALTER TABLE "conditions"
  ADD COLUMN IF NOT EXISTS "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "updatedBy" UUID;

-- Add foreign key for updatedBy
ALTER TABLE "conditions"
  DROP CONSTRAINT IF EXISTS "conditions_updatedBy_fkey";

ALTER TABLE "conditions"
  ADD CONSTRAINT "conditions_updatedBy_fkey"
  FOREIGN KEY ("updatedBy")
  REFERENCES "users"(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS "conditions_recordedBy_idx" ON "conditions"("recordedBy");
CREATE INDEX IF NOT EXISTS "conditions_updatedBy_idx" ON "conditions"("updatedBy");

-- Create condition_history table
CREATE TABLE IF NOT EXISTS "condition_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "conditionId" UUID NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "changeType" "ChangeType" NOT NULL,
  "changeReason" TEXT NOT NULL,
  "previousData" JSONB,
  "newData" JSONB NOT NULL,
  "changedFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "changedAt" TIMESTAMPTZ(3) NOT NULL,
  "changedBy" UUID NOT NULL,
  "changedByName" TEXT,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "metadata" JSONB,

  CONSTRAINT "condition_history_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "tenants"(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "condition_history_conditionId_fkey"
    FOREIGN KEY ("conditionId")
    REFERENCES "conditions"(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "condition_history_changedBy_fkey"
    FOREIGN KEY ("changedBy")
    REFERENCES "users"(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

-- Add indexes to condition_history
CREATE INDEX IF NOT EXISTS "condition_history_tenantId_conditionId_versionNumber_idx"
  ON "condition_history"("tenantId", "conditionId", "versionNumber" DESC);
CREATE INDEX IF NOT EXISTS "condition_history_tenantId_changedAt_idx"
  ON "condition_history"("tenantId", "changedAt" DESC);
CREATE INDEX IF NOT EXISTS "condition_history_changedBy_idx"
  ON "condition_history"("changedBy");
CREATE INDEX IF NOT EXISTS "condition_history_changeType_idx"
  ON "condition_history"("changeType");
