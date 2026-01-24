-- Drop dependent tables first (foreign keys)
DROP TABLE IF EXISTS "medication_administrations" CASCADE;
DROP TABLE IF EXISTS "sos_administrations" CASCADE;
DROP TABLE IF EXISTS "medications" CASCADE;
DROP TABLE IF EXISTS "medication_history" CASCADE;
DROP TABLE IF EXISTS "sos_medications" CASCADE;
DROP TABLE IF EXISTS "sos_medication_history" CASCADE;
DROP TABLE IF EXISTS "medication_locks" CASCADE;
DROP TABLE IF EXISTS "prescription_history" CASCADE;

-- Drop prescriptions table
DROP TABLE IF EXISTS "prescriptions" CASCADE;

-- Recreate prescriptions table with new schema
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "doctorName" TEXT NOT NULL,
    "doctorCrm" TEXT NOT NULL,
    "doctorCrmState" TEXT NOT NULL,
    "prescriptionDate" DATE NOT NULL,
    "prescriptionType" "PrescriptionType" NOT NULL,
    "validUntil" DATE,
    "reviewDate" DATE,
    "controlledClass" "ControlledClass",
    "notificationNumber" TEXT,
    "notificationType" "NotificationType",

    -- Arquivo original (backup auditoria)
    "originalFileUrl" TEXT,
    "originalFileKey" TEXT,
    "originalFileName" TEXT,
    "originalFileSize" INTEGER,
    "originalFileMimeType" VARCHAR(100),
    "originalFileHash" VARCHAR(64),

    -- Arquivo processado (PDF com carimbo institucional)
    "processedFileUrl" TEXT,
    "processedFileKey" TEXT,
    "processedFileName" TEXT,
    "processedFileSize" INTEGER,
    "processedFileHash" VARCHAR(64),

    -- Token público para validação
    "publicToken" VARCHAR(64),

    -- Metadados do processamento
    "processingMetadata" JSONB,

    "notes" TEXT,
    "lastMedicalReviewDate" DATE,
    "lastReviewedByDoctor" TEXT,
    "lastReviewDoctorCrm" TEXT,
    "lastReviewDoctorState" TEXT,
    "lastReviewNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- Recreate indexes
CREATE INDEX "prescriptions_tenantId_residentId_idx" ON "prescriptions"("tenantId", "residentId");
CREATE INDEX "prescriptions_tenantId_isActive_idx" ON "prescriptions"("tenantId", "isActive");
CREATE INDEX "prescriptions_tenantId_validUntil_idx" ON "prescriptions"("tenantId", "validUntil");
CREATE INDEX "prescriptions_tenantId_lastMedicalReviewDate_idx" ON "prescriptions"("tenantId", "lastMedicalReviewDate");
CREATE INDEX "prescriptions_deletedAt_idx" ON "prescriptions"("deletedAt");
CREATE INDEX "prescriptions_tenantId_residentId_isActive_idx" ON "prescriptions"("tenantId", "residentId", "isActive");
CREATE INDEX "prescriptions_tenantId_isActive_validUntil_idx" ON "prescriptions"("tenantId", "isActive", "validUntil");

-- Add unique constraint for publicToken
CREATE UNIQUE INDEX "prescriptions_publicToken_key" ON "prescriptions"("publicToken");

-- Add foreign keys
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate dependent tables
CREATE TABLE "prescription_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
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

    CONSTRAINT "prescription_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "prescription_history_tenantId_prescriptionId_versionNumber_idx" ON "prescription_history"("tenantId", "prescriptionId", "versionNumber" DESC);
CREATE INDEX "prescription_history_tenantId_changedAt_idx" ON "prescription_history"("tenantId", "changedAt" DESC);
CREATE INDEX "prescription_history_changedBy_idx" ON "prescription_history"("changedBy");
CREATE INDEX "prescription_history_changeType_idx" ON "prescription_history"("changeType");

ALTER TABLE "prescription_history" ADD CONSTRAINT "prescription_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescription_history" ADD CONSTRAINT "prescription_history_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prescription_history" ADD CONSTRAINT "prescription_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate medications table
CREATE TABLE "medications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prescriptionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "presentation" "MedicationPresentation" NOT NULL,
    "concentration" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "route" "AdministrationRoute" NOT NULL,
    "frequency" "MedicationFrequency" NOT NULL,
    "scheduledTimes" JSONB NOT NULL DEFAULT '[]',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isControlled" BOOLEAN NOT NULL DEFAULT false,
    "isHighRisk" BOOLEAN NOT NULL DEFAULT false,
    "requiresDoubleCheck" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "medications_prescriptionId_idx" ON "medications"("prescriptionId");
CREATE INDEX "medications_isControlled_idx" ON "medications"("isControlled");
CREATE INDEX "medications_startDate_endDate_idx" ON "medications"("startDate", "endDate");
CREATE INDEX "medications_deletedAt_idx" ON "medications"("deletedAt");
CREATE INDEX "medications_createdBy_idx" ON "medications"("createdBy");
CREATE INDEX "medications_updatedBy_idx" ON "medications"("updatedBy");
CREATE INDEX "medications_prescriptionId_deletedAt_idx" ON "medications"("prescriptionId", "deletedAt");
CREATE INDEX "medications_prescriptionId_startDate_endDate_idx" ON "medications"("prescriptionId", "startDate", "endDate");

ALTER TABLE "medications" ADD CONSTRAINT "medications_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medications" ADD CONSTRAINT "medications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medications" ADD CONSTRAINT "medications_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate medication_history table
CREATE TABLE "medication_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
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

    CONSTRAINT "medication_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "medication_history_tenantId_medicationId_versionNumber_idx" ON "medication_history"("tenantId", "medicationId", "versionNumber" DESC);
CREATE INDEX "medication_history_tenantId_changedAt_idx" ON "medication_history"("tenantId", "changedAt" DESC);
CREATE INDEX "medication_history_changedBy_idx" ON "medication_history"("changedBy");
CREATE INDEX "medication_history_changeType_idx" ON "medication_history"("changeType");

ALTER TABLE "medication_history" ADD CONSTRAINT "medication_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_history" ADD CONSTRAINT "medication_history_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_history" ADD CONSTRAINT "medication_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate sos_medications table
CREATE TABLE "sos_medications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prescriptionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "presentation" "MedicationPresentation" NOT NULL,
    "concentration" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "route" "AdministrationRoute" NOT NULL,
    "indication" "SOSIndicationType" NOT NULL,
    "indicationDetails" TEXT,
    "minInterval" TEXT NOT NULL,
    "maxDailyDoses" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "instructions" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "sos_medications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sos_medications_prescriptionId_idx" ON "sos_medications"("prescriptionId");
CREATE INDEX "sos_medications_indication_idx" ON "sos_medications"("indication");
CREATE INDEX "sos_medications_deletedAt_idx" ON "sos_medications"("deletedAt");
CREATE INDEX "sos_medications_createdBy_idx" ON "sos_medications"("createdBy");
CREATE INDEX "sos_medications_updatedBy_idx" ON "sos_medications"("updatedBy");

ALTER TABLE "sos_medications" ADD CONSTRAINT "sos_medications_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_medications" ADD CONSTRAINT "sos_medications_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sos_medications" ADD CONSTRAINT "sos_medications_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate sos_medication_history table
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

CREATE INDEX "sos_medication_history_tenantId_sosMedicationId_versionNu_idx" ON "sos_medication_history"("tenantId", "sosMedicationId", "versionNumber" DESC);
CREATE INDEX "sos_medication_history_tenantId_changedAt_idx" ON "sos_medication_history"("tenantId", "changedAt" DESC);
CREATE INDEX "sos_medication_history_changedBy_idx" ON "sos_medication_history"("changedBy");
CREATE INDEX "sos_medication_history_changeType_idx" ON "sos_medication_history"("changeType");

ALTER TABLE "sos_medication_history" ADD CONSTRAINT "sos_medication_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_medication_history" ADD CONSTRAINT "sos_medication_history_sosMedicationId_fkey" FOREIGN KEY ("sosMedicationId") REFERENCES "sos_medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_medication_history" ADD CONSTRAINT "sos_medication_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate medication_administrations table
CREATE TABLE "medication_administrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "actualTime" TEXT,
    "wasAdministered" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "administeredBy" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "checkedBy" TEXT,
    "checkedByUserId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "medication_administrations_tenantId_date_idx" ON "medication_administrations"("tenantId", "date" DESC);
CREATE INDEX "medication_administrations_residentId_date_idx" ON "medication_administrations"("residentId", "date" DESC);
CREATE INDEX "medication_administrations_medicationId_date_idx" ON "medication_administrations"("medicationId", "date");
CREATE INDEX "medication_administrations_wasAdministered_idx" ON "medication_administrations"("wasAdministered");
CREATE INDEX "medication_administrations_tenantId_date_wasAdministered_idx" ON "medication_administrations"("tenantId", "date", "wasAdministered");
CREATE INDEX "medication_administrations_residentId_date_wasAdministere_idx" ON "medication_administrations"("residentId", "date", "wasAdministered");

ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate sos_administrations table
CREATE TABLE "sos_administrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "sosMedicationId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT NOT NULL,
    "indication" TEXT NOT NULL,
    "administeredBy" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sos_administrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sos_administrations_tenantId_date_idx" ON "sos_administrations"("tenantId", "date" DESC);
CREATE INDEX "sos_administrations_residentId_date_idx" ON "sos_administrations"("residentId", "date" DESC);
CREATE INDEX "sos_administrations_sosMedicationId_date_idx" ON "sos_administrations"("sosMedicationId", "date");

ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_sosMedicationId_fkey" FOREIGN KEY ("sosMedicationId") REFERENCES "sos_medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate medication_locks table
CREATE TABLE "medication_locks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "medicationId" UUID NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "lockedByUserId" UUID NOT NULL,
    "lockedByUserName" TEXT NOT NULL,
    "lockedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "sessionId" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "medication_locks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "medication_locks_medicationId_scheduledDate_scheduledTime_key" ON "medication_locks"("medicationId", "scheduledDate", "scheduledTime");
CREATE INDEX "medication_locks_medicationId_idx" ON "medication_locks"("medicationId");
CREATE INDEX "medication_locks_lockedByUserId_idx" ON "medication_locks"("lockedByUserId");
CREATE INDEX "medication_locks_expiresAt_idx" ON "medication_locks"("expiresAt");
CREATE INDEX "medication_locks_medicationId_scheduledDate_scheduledTime_idx" ON "medication_locks"("medicationId", "scheduledDate", "scheduledTime");

ALTER TABLE "medication_locks" ADD CONSTRAINT "medication_locks_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medication_locks" ADD CONSTRAINT "medication_locks_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
