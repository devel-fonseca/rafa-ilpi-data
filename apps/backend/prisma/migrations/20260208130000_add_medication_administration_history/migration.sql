-- AlterTable: Add soft delete to MedicationAdministration
ALTER TABLE "medication_administrations" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ(3);

-- AlterTable: Add soft delete to SOSAdministration
ALTER TABLE "sos_administrations" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ(3);

-- CreateTable: MedicationAdministrationHistory
CREATE TABLE IF NOT EXISTS "medication_administration_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "administrationId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "previousData" JSONB NOT NULL,
    "newData" JSONB NOT NULL,
    "changedFields" TEXT[],
    "changeReason" TEXT NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedByName" TEXT NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "medication_administration_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SOSAdministrationHistory
CREATE TABLE IF NOT EXISTS "sos_administration_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "administrationId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "previousData" JSONB NOT NULL,
    "newData" JSONB NOT NULL,
    "changedFields" TEXT[],
    "changeReason" TEXT NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedByName" TEXT NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sos_administration_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: MedicationAdministrationHistory
CREATE INDEX IF NOT EXISTS "medication_administration_history_administrationId_versionN_idx" ON "medication_administration_history"("administrationId", "versionNumber" DESC);
CREATE INDEX IF NOT EXISTS "medication_administration_history_tenantId_changedAt_idx" ON "medication_administration_history"("tenantId", "changedAt" DESC);
CREATE INDEX IF NOT EXISTS "medication_administration_history_changedBy_idx" ON "medication_administration_history"("changedBy");
CREATE INDEX IF NOT EXISTS "medication_administration_history_changeType_idx" ON "medication_administration_history"("changeType");

-- CreateIndex: SOSAdministrationHistory
CREATE INDEX IF NOT EXISTS "sos_administration_history_administrationId_versionNumber_idx" ON "sos_administration_history"("administrationId", "versionNumber" DESC);
CREATE INDEX IF NOT EXISTS "sos_administration_history_tenantId_changedAt_idx" ON "sos_administration_history"("tenantId", "changedAt" DESC);
CREATE INDEX IF NOT EXISTS "sos_administration_history_changedBy_idx" ON "sos_administration_history"("changedBy");
CREATE INDEX IF NOT EXISTS "sos_administration_history_changeType_idx" ON "sos_administration_history"("changeType");

-- CreateIndex: deletedAt on administrations
CREATE INDEX IF NOT EXISTS "medication_administrations_deletedAt_idx" ON "medication_administrations"("deletedAt");
CREATE INDEX IF NOT EXISTS "sos_administrations_deletedAt_idx" ON "sos_administrations"("deletedAt");

-- AddForeignKey: MedicationAdministrationHistory
ALTER TABLE "medication_administration_history" ADD CONSTRAINT "medication_administration_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_administration_history" ADD CONSTRAINT "medication_administration_history_administrationId_fkey" FOREIGN KEY ("administrationId") REFERENCES "medication_administrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_administration_history" ADD CONSTRAINT "medication_administration_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: SOSAdministrationHistory
ALTER TABLE "sos_administration_history" ADD CONSTRAINT "sos_administration_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_administration_history" ADD CONSTRAINT "sos_administration_history_administrationId_fkey" FOREIGN KEY ("administrationId") REFERENCES "sos_administrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_administration_history" ADD CONSTRAINT "sos_administration_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
