-- ==========================================
-- SOSMedication Versioning Migration
-- Adiciona versionamento e auditoria completa
-- ==========================================

-- 1. Adicionar colunas de versionamento ao SOSMedication
ALTER TABLE "sos_medications"
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "createdBy" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  ADD COLUMN "updatedBy" UUID;

-- 2. Adicionar FKs para User
ALTER TABLE "sos_medications"
  ADD CONSTRAINT "sos_medications_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sos_medications"
  ADD CONSTRAINT "sos_medications_updatedBy_fkey"
    FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Criar tabela de histórico
CREATE TABLE "sos_medication_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "sosMedicationId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changeReason" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changedAt" TIMESTAMPTZ(3) NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedByName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "sos_medication_history_pkey" PRIMARY KEY ("id")
);

-- 4. Adicionar FKs para histórico
ALTER TABLE "sos_medication_history"
  ADD CONSTRAINT "sos_medication_history_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sos_medication_history"
  ADD CONSTRAINT "sos_medication_history_sosMedicationId_fkey"
    FOREIGN KEY ("sosMedicationId") REFERENCES "sos_medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sos_medication_history"
  ADD CONSTRAINT "sos_medication_history_changedBy_fkey"
    FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Criar índices para performance
CREATE INDEX "sos_medications_createdBy_idx" ON "sos_medications"("createdBy");
CREATE INDEX "sos_medications_updatedBy_idx" ON "sos_medications"("updatedBy");

CREATE INDEX "sos_medication_history_tenantId_sosMedicationId_versionNumb_idx"
  ON "sos_medication_history"("tenantId", "sosMedicationId", "versionNumber" DESC);

CREATE INDEX "sos_medication_history_tenantId_changedAt_idx"
  ON "sos_medication_history"("tenantId", "changedAt" DESC);

CREATE INDEX "sos_medication_history_changedBy_idx"
  ON "sos_medication_history"("changedBy");

CREATE INDEX "sos_medication_history_changeType_idx"
  ON "sos_medication_history"("changeType");