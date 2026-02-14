/*
  Warnings:

  - The values [VALIDATE_CONTRACTS] on the enum `PermissionType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[publicToken]` on the table `resident_contracts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicToken]` on the table `resident_documents` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicToken]` on the table `tenant_documents` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[publicToken]` on the table `vaccinations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publicToken` to the `resident_contracts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PermissionType_new" AS ENUM ('VIEW_RESIDENTS', 'CREATE_RESIDENTS', 'UPDATE_RESIDENTS', 'DELETE_RESIDENTS', 'VIEW_DAILY_RECORDS', 'CREATE_DAILY_RECORDS', 'UPDATE_DAILY_RECORDS', 'DELETE_DAILY_RECORDS', 'VIEW_PRESCRIPTIONS', 'CREATE_PRESCRIPTIONS', 'UPDATE_PRESCRIPTIONS', 'DELETE_PRESCRIPTIONS', 'VIEW_MEDICATIONS', 'ADMINISTER_MEDICATIONS', 'ADMINISTER_CONTROLLED_MEDICATIONS', 'UPDATE_MEDICATION_ADMINISTRATIONS', 'DELETE_MEDICATION_ADMINISTRATIONS', 'VIEW_VITAL_SIGNS', 'RECORD_VITAL_SIGNS', 'VIEW_VACCINATIONS', 'CREATE_VACCINATIONS', 'UPDATE_VACCINATIONS', 'DELETE_VACCINATIONS', 'VIEW_CLINICAL_NOTES', 'CREATE_CLINICAL_NOTES', 'UPDATE_CLINICAL_NOTES', 'DELETE_CLINICAL_NOTES', 'VIEW_CLINICAL_PROFILE', 'CREATE_CLINICAL_PROFILE', 'UPDATE_CLINICAL_PROFILE', 'VIEW_ALLERGIES', 'CREATE_ALLERGIES', 'UPDATE_ALLERGIES', 'DELETE_ALLERGIES', 'VIEW_CONDITIONS', 'CREATE_CONDITIONS', 'UPDATE_CONDITIONS', 'DELETE_CONDITIONS', 'VIEW_DIETARY_RESTRICTIONS', 'CREATE_DIETARY_RESTRICTIONS', 'UPDATE_DIETARY_RESTRICTIONS', 'DELETE_DIETARY_RESTRICTIONS', 'VIEW_BEDS', 'MANAGE_BEDS', 'MANAGE_INFRASTRUCTURE', 'VIEW_DOCUMENTS', 'UPLOAD_DOCUMENTS', 'DELETE_DOCUMENTS', 'VIEW_USERS', 'CREATE_USERS', 'UPDATE_USERS', 'DELETE_USERS', 'MANAGE_PERMISSIONS', 'VIEW_REPORTS', 'EXPORT_DATA', 'VIEW_AUDIT_LOGS', 'VIEW_COMPLIANCE_DASHBOARD', 'MANAGE_COMPLIANCE_ASSESSMENT', 'VIEW_SENTINEL_EVENTS', 'VIEW_INSTITUTIONAL_SETTINGS', 'UPDATE_INSTITUTIONAL_SETTINGS', 'VIEW_INSTITUTIONAL_PROFILE', 'UPDATE_INSTITUTIONAL_PROFILE', 'VIEW_POPS', 'CREATE_POPS', 'UPDATE_POPS', 'DELETE_POPS', 'PUBLISH_POPS', 'MANAGE_POPS', 'VIEW_RESIDENT_SCHEDULE', 'MANAGE_RESIDENT_SCHEDULE', 'VIEW_INSTITUTIONAL_EVENTS', 'CREATE_INSTITUTIONAL_EVENTS', 'UPDATE_INSTITUTIONAL_EVENTS', 'DELETE_INSTITUTIONAL_EVENTS', 'VIEW_MESSAGES', 'SEND_MESSAGES', 'DELETE_MESSAGES', 'BROADCAST_MESSAGES', 'VIEW_CONTRACTS', 'CREATE_CONTRACTS', 'UPDATE_CONTRACTS', 'DELETE_CONTRACTS', 'REPLACE_CONTRACTS', 'VIEW_BELONGINGS', 'MANAGE_BELONGINGS', 'VIEW_CARE_SHIFTS', 'CREATE_CARE_SHIFTS', 'UPDATE_CARE_SHIFTS', 'DELETE_CARE_SHIFTS', 'CHECKIN_CARE_SHIFTS', 'MANAGE_TEAMS', 'VIEW_RDC_COMPLIANCE', 'CONFIGURE_SHIFT_SETTINGS', 'VIEW_FINANCIAL_OPERATIONS', 'MANAGE_FINANCIAL_CATEGORIES', 'MANAGE_FINANCIAL_TRANSACTIONS', 'MANAGE_FINANCIAL_ACCOUNTS', 'MANAGE_FINANCIAL_RECONCILIATION', 'VIEW_FINANCIAL_DASHBOARD');
ALTER TABLE "user_permissions" ALTER COLUMN "permission" TYPE "PermissionType_new" USING ("permission"::text::"PermissionType_new");
ALTER TYPE "PermissionType" RENAME TO "PermissionType_old";
ALTER TYPE "PermissionType_new" RENAME TO "PermissionType";
DROP TYPE "PermissionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "bed_status_history" DROP CONSTRAINT IF EXISTS "bed_status_history_changedBy_fkey";

-- DropForeignKey
ALTER TABLE "bed_status_history" DROP CONSTRAINT IF EXISTS "bed_status_history_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "financial_transactions" DROP CONSTRAINT IF EXISTS "financial_transactions_residentContractId_fkey";

-- DropForeignKey
ALTER TABLE "financial_transactions" DROP CONSTRAINT IF EXISTS "financial_transactions_residentId_fkey";

-- DropForeignKey
ALTER TABLE "incident_monthly_indicators" DROP CONSTRAINT IF EXISTS "incident_monthly_indicators_calculatedBy_fkey";

-- DropForeignKey
ALTER TABLE "incident_monthly_indicators" DROP CONSTRAINT IF EXISTS "incident_monthly_indicators_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "medications" DROP CONSTRAINT IF EXISTS "medications_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT IF EXISTS "rooms_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "sos_medications" DROP CONSTRAINT IF EXISTS "sos_medications_updatedBy_fkey";

-- DropIndex
DROP INDEX IF EXISTS "audit_logs_tenant_id_created_at_idx";

-- AlterTable
ALTER TABLE "bed_status_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "bed_transfer_history" ALTER COLUMN "fromBedId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "compliance_question_versions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "compliance_questions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "financial_bank_accounts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "financial_categories" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "financial_payment_methods" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "financial_reconciliations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "financial_transactions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "medication_administrations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "medication_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "medication_locks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "medications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "prescription_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "prescriptions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resident_anthropometry" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resident_anthropometry_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resident_blood_type_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resident_blood_types" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resident_contracts" ADD COLUMN IF NOT EXISTS "publicToken" VARCHAR(64),
ALTER COLUMN "originalFileUrl" DROP NOT NULL,
ALTER COLUMN "originalFileKey" DROP NOT NULL,
ALTER COLUMN "originalFileName" DROP NOT NULL,
ALTER COLUMN "originalFileSize" DROP NOT NULL,
ALTER COLUMN "originalFileMimeType" DROP NOT NULL,
ALTER COLUMN "originalFileHash" DROP NOT NULL,
ALTER COLUMN "processedFileUrl" DROP NOT NULL,
ALTER COLUMN "processedFileKey" DROP NOT NULL,
ALTER COLUMN "processedFileName" DROP NOT NULL,
ALTER COLUMN "processedFileSize" DROP NOT NULL,
ALTER COLUMN "processedFileHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "resident_dependency_assessment_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resident_dependency_assessments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resident_documents" ADD COLUMN IF NOT EXISTS "originalFileHash" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "originalFileKey" TEXT,
ADD COLUMN IF NOT EXISTS "originalFileMimeType" TEXT,
ADD COLUMN IF NOT EXISTS "originalFileName" TEXT,
ADD COLUMN IF NOT EXISTS "originalFileSize" INTEGER,
ADD COLUMN IF NOT EXISTS "originalFileUrl" TEXT,
ADD COLUMN IF NOT EXISTS "processedFileHash" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "processedFileKey" TEXT,
ADD COLUMN IF NOT EXISTS "processedFileName" TEXT,
ADD COLUMN IF NOT EXISTS "processedFileSize" INTEGER,
ADD COLUMN IF NOT EXISTS "processedFileUrl" TEXT,
ADD COLUMN IF NOT EXISTS "processingMetadata" JSONB,
ADD COLUMN IF NOT EXISTS "publicToken" VARCHAR(64);

-- AlterTable
ALTER TABLE "shift_templates" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sos_administrations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sos_medication_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sos_medications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_documents" ADD COLUMN IF NOT EXISTS "originalFileHash" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "originalFileKey" TEXT,
ADD COLUMN IF NOT EXISTS "originalFileMimeType" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "originalFileName" TEXT,
ADD COLUMN IF NOT EXISTS "originalFileSize" INTEGER,
ADD COLUMN IF NOT EXISTS "originalFileUrl" TEXT,
ADD COLUMN IF NOT EXISTS "processedFileHash" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "processedFileKey" TEXT,
ADD COLUMN IF NOT EXISTS "processedFileName" TEXT,
ADD COLUMN IF NOT EXISTS "processedFileSize" INTEGER,
ADD COLUMN IF NOT EXISTS "processedFileUrl" TEXT,
ADD COLUMN IF NOT EXISTS "processingMetadata" JSONB,
ADD COLUMN IF NOT EXISTS "publicToken" VARCHAR(64);

-- AlterTable
ALTER TABLE "tenant_stats" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "terms_of_service" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "terms_of_service_acceptances" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vaccinations" ADD COLUMN IF NOT EXISTS "originalFileHash" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "originalFileKey" TEXT,
ADD COLUMN IF NOT EXISTS "originalFileMimeType" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "originalFileName" TEXT,
ADD COLUMN IF NOT EXISTS "originalFileSize" INTEGER,
ADD COLUMN IF NOT EXISTS "originalFileUrl" TEXT,
ADD COLUMN IF NOT EXISTS "processedFileHash" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "processedFileKey" TEXT,
ADD COLUMN IF NOT EXISTS "processedFileName" TEXT,
ADD COLUMN IF NOT EXISTS "processedFileSize" INTEGER,
ADD COLUMN IF NOT EXISTS "processedFileUrl" TEXT,
ADD COLUMN IF NOT EXISTS "processingMetadata" JSONB,
ADD COLUMN IF NOT EXISTS "publicToken" VARCHAR(64);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tenant_shift_config" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "shiftTemplateId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customName" VARCHAR(50),
    "customStartTime" VARCHAR(5),
    "customEndTime" VARCHAR(5),
    "customDuration" INTEGER,
    "notes" TEXT,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "tenant_shift_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "teams" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" VARCHAR(7),
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "team_members" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" VARCHAR(50),
    "addedBy" UUID NOT NULL,
    "addedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedBy" UUID,
    "removedAt" TIMESTAMPTZ(3),

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shifts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "shiftTemplateId" UUID NOT NULL,
    "teamId" UUID,
    "status" "ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "checked_in_at" TIMESTAMPTZ(3),
    "checked_in_by" UUID,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_assignments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "isFromTeam" BOOLEAN NOT NULL DEFAULT true,
    "assignedBy" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedBy" UUID,
    "removedAt" TIMESTAMPTZ(3),

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_substitutions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "type" "SubstitutionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "originalTeamId" UUID,
    "newTeamId" UUID,
    "originalUserId" UUID,
    "newUserId" UUID,
    "substitutedBy" UUID NOT NULL,
    "substitutedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeType" "ChangeType" NOT NULL,
    "changeReason" TEXT NOT NULL,
    "previousData" JSONB,
    "newData" JSONB NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changedBy" UUID NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_handovers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "shiftId" UUID NOT NULL,
    "handedOverBy" UUID NOT NULL,
    "receivedBy" UUID,
    "report" TEXT NOT NULL,
    "activitiesSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_assessments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "assessmentDate" TIMESTAMPTZ(3) NOT NULL,
    "performedBy" UUID,
    "status" VARCHAR(20) NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "questionsAnswered" INTEGER NOT NULL DEFAULT 0,
    "questionsNA" INTEGER NOT NULL DEFAULT 0,
    "applicableQuestions" INTEGER NOT NULL DEFAULT 37,
    "totalPointsObtained" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPointsPossible" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "compliancePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complianceLevel" VARCHAR(20) NOT NULL DEFAULT 'IRREGULAR',
    "criticalNonCompliant" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "compliance_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "compliance_assessment_responses" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "selectedPoints" INTEGER,
    "selectedText" TEXT,
    "isNotApplicable" BOOLEAN NOT NULL DEFAULT false,
    "questionTextSnapshot" TEXT NOT NULL,
    "criticalityLevel" VARCHAR(5) NOT NULL,
    "observations" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "compliance_assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "institutional_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "eventType" "InstitutionalEventType" NOT NULL,
    "visibility" "InstitutionalEventVisibility" NOT NULL DEFAULT 'ALL_USERS',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" TEXT,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "status" "ScheduledEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMPTZ(3),
    "notes" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "expiryDate" DATE,
    "responsible" TEXT,
    "trainingTopic" TEXT,
    "instructor" TEXT,
    "targetAudience" TEXT,
    "location" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID,

    CONSTRAINT "institutional_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_shift_config_tenantId_idx" ON "tenant_shift_config"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_shift_config_isEnabled_idx" ON "tenant_shift_config"("isEnabled");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tenant_shift_config_deletedAt_idx" ON "tenant_shift_config"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_shift_config_shiftTemplateId_deletedAt_key" ON "tenant_shift_config"("shiftTemplateId", "deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teams_tenantId_isActive_idx" ON "teams"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teams_deletedAt_idx" ON "teams"("deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_members_tenantId_teamId_idx" ON "team_members"("tenantId", "teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_members_userId_idx" ON "team_members"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_members_removedAt_idx" ON "team_members"("removedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_teamId_userId_removedAt_key" ON "team_members"("teamId", "userId", "removedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shifts_tenantId_date_idx" ON "shifts"("tenantId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shifts_tenantId_date_status_idx" ON "shifts"("tenantId", "date", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shifts_teamId_idx" ON "shifts"("teamId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shifts_status_idx" ON "shifts"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shifts_deletedAt_idx" ON "shifts"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "shifts_tenantId_date_shiftTemplateId_deletedAt_key" ON "shifts"("tenantId", "date", "shiftTemplateId", "deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_assignments_tenantId_shiftId_idx" ON "shift_assignments"("tenantId", "shiftId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_assignments_userId_idx" ON "shift_assignments"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_assignments_removedAt_idx" ON "shift_assignments"("removedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "shift_assignments_shiftId_userId_removedAt_key" ON "shift_assignments"("shiftId", "userId", "removedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_substitutions_tenantId_shiftId_idx" ON "shift_substitutions"("tenantId", "shiftId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_substitutions_shiftId_type_idx" ON "shift_substitutions"("shiftId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_history_tenantId_shiftId_versionNumber_idx" ON "shift_history"("tenantId", "shiftId", "versionNumber" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_history_tenantId_changedAt_idx" ON "shift_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_history_changedBy_idx" ON "shift_history"("changedBy");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "shift_handovers_shiftId_key" ON "shift_handovers"("shiftId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_handovers_tenantId_idx" ON "shift_handovers"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_handovers_shiftId_idx" ON "shift_handovers"("shiftId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_handovers_handedOverBy_idx" ON "shift_handovers"("handedOverBy");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_assessments_tenantId_assessmentDate_idx" ON "compliance_assessments"("tenantId", "assessmentDate" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_assessments_status_idx" ON "compliance_assessments"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_assessments_versionId_idx" ON "compliance_assessments"("versionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_assessments_performedBy_idx" ON "compliance_assessments"("performedBy");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_assessments_deletedAt_idx" ON "compliance_assessments"("deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_assessment_responses_assessmentId_idx" ON "compliance_assessment_responses"("assessmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_assessment_responses_tenantId_idx" ON "compliance_assessment_responses"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "compliance_assessment_responses_questionId_idx" ON "compliance_assessment_responses"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "compliance_assessment_responses_assessmentId_questionNumber_key" ON "compliance_assessment_responses"("assessmentId", "questionNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "institutional_events_tenantId_idx" ON "institutional_events"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "institutional_events_scheduledDate_idx" ON "institutional_events"("scheduledDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "institutional_events_eventType_idx" ON "institutional_events"("eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "institutional_events_visibility_idx" ON "institutional_events"("visibility");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "institutional_events_status_idx" ON "institutional_events"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "institutional_events_deletedAt_idx" ON "institutional_events"("deletedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "institutional_events_tenantId_scheduledDate_idx" ON "institutional_events"("tenantId", "scheduledDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "institutional_events_tenantId_eventType_scheduledDate_idx" ON "institutional_events"("tenantId", "eventType", "scheduledDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "institutional_events_expiryDate_idx" ON "institutional_events"("expiryDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "resident_contracts_publicToken_key" ON "resident_contracts"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "resident_documents_publicToken_key" ON "resident_documents"("publicToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "resident_documents_publicToken_idx" ON "resident_documents"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_documents_publicToken_key" ON "tenant_documents"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vaccinations_publicToken_key" ON "vaccinations"("publicToken");

-- RenameForeignKey
ALTER TABLE "resident_anthropometry_history" RENAME CONSTRAINT "resident_anthropometry_history_anthropometryId_fkey" TO "resident_anthropometry_history_residentAnthropometryId_fkey";

-- RenameForeignKey
ALTER TABLE "resident_dependency_assessment_history" RENAME CONSTRAINT "resident_dependency_assessment_history_assessmentId_fkey" TO "resident_dependency_assessment_history_residentDependencyA_fkey";

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_userId_fkey'
  ) THEN
    ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_history_userId_fkey'
  ) THEN
    ALTER TABLE "user_history" ADD CONSTRAINT "user_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_userId_fkey'
  ) THEN
    ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'team_members_teamId_fkey'
  ) THEN
    ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shifts_teamId_fkey'
  ) THEN
    ALTER TABLE "shifts" ADD CONSTRAINT "shifts_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_assignments_shiftId_fkey'
  ) THEN
    ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_substitutions_shiftId_fkey'
  ) THEN
    ALTER TABLE "shift_substitutions" ADD CONSTRAINT "shift_substitutions_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_substitutions_originalTeamId_fkey'
  ) THEN
    ALTER TABLE "shift_substitutions" ADD CONSTRAINT "shift_substitutions_originalTeamId_fkey" FOREIGN KEY ("originalTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_substitutions_newTeamId_fkey'
  ) THEN
    ALTER TABLE "shift_substitutions" ADD CONSTRAINT "shift_substitutions_newTeamId_fkey" FOREIGN KEY ("newTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_history_shiftId_fkey'
  ) THEN
    ALTER TABLE "shift_history" ADD CONSTRAINT "shift_history_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_handovers_shiftId_fkey'
  ) THEN
    ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'message_recipients_userId_fkey'
  ) THEN
    ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'compliance_assessment_responses_assessmentId_fkey'
  ) THEN
    ALTER TABLE "compliance_assessment_responses" ADD CONSTRAINT "compliance_assessment_responses_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "compliance_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_records_userId_fkey'
  ) THEN
    ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institutional_events_tenantId_fkey'
  ) THEN
    ALTER TABLE "institutional_events" ADD CONSTRAINT "institutional_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institutional_events_createdBy_fkey'
  ) THEN
    ALTER TABLE "institutional_events" ADD CONSTRAINT "institutional_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institutional_events_updatedBy_fkey'
  ) THEN
    ALTER TABLE "institutional_events" ADD CONSTRAINT "institutional_events_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medications_updatedBy_fkey'
  ) THEN
    ALTER TABLE "medications" ADD CONSTRAINT "medications_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sos_medications_updatedBy_fkey'
  ) THEN
    ALTER TABLE "sos_medications" ADD CONSTRAINT "sos_medications_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medication_administrations_userId_fkey'
  ) THEN
    ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sos_administrations_userId_fkey'
  ) THEN
    ALTER TABLE "sos_administrations" ADD CONSTRAINT "sos_administrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notification_reads_userId_fkey'
  ) THEN
    ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vital_signs_userId_fkey'
  ) THEN
    ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- RenameIndex
ALTER INDEX "financial_bank_account_ledger_tenant_account_date_created_idx" RENAME TO "financial_bank_account_ledger_tenantId_bankAccountId_effect_idx";

-- RenameIndex
ALTER INDEX "financial_bank_account_ledger_tenant_entryType_idx" RENAME TO "financial_bank_account_ledger_tenantId_entryType_idx";

-- RenameIndex
ALTER INDEX "financial_bank_account_ledger_transaction_idx" RENAME TO "financial_bank_account_ledger_transactionId_idx";

-- RenameIndex
ALTER INDEX "financial_bank_accounts_tenant_bank_branch_number_deletedAt_key" RENAME TO "financial_bank_accounts_tenantId_bankCode_branch_accountNum_key";

-- RenameIndex
ALTER INDEX "financial_bank_accounts_tenant_isActive_idx" RENAME TO "financial_bank_accounts_tenantId_isActive_idx";

-- RenameIndex
ALTER INDEX "financial_bank_accounts_tenant_isDefault_idx" RENAME TO "financial_bank_accounts_tenantId_isDefault_idx";

-- RenameIndex
ALTER INDEX "financial_categories_tenant_name_deletedAt_key" RENAME TO "financial_categories_tenantId_name_deletedAt_key";

-- RenameIndex
ALTER INDEX "financial_categories_tenant_parent_idx" RENAME TO "financial_categories_tenantId_parentCategoryId_idx";

-- RenameIndex
ALTER INDEX "financial_categories_tenant_type_isActive_idx" RENAME TO "financial_categories_tenantId_type_isActive_idx";

-- RenameIndex
ALTER INDEX "financial_payment_methods_tenant_code_deletedAt_key" RENAME TO "financial_payment_methods_tenantId_code_deletedAt_key";

-- RenameIndex
ALTER INDEX "financial_payment_methods_tenant_isActive_idx" RENAME TO "financial_payment_methods_tenantId_isActive_idx";

-- RenameIndex
ALTER INDEX "financial_reconciliation_items_reconciliation_transaction_key" RENAME TO "financial_reconciliation_items_reconciliationId_transaction_key";

-- RenameIndex
ALTER INDEX "financial_reconciliation_items_transaction_idx" RENAME TO "financial_reconciliation_items_transactionId_idx";

-- RenameIndex
ALTER INDEX "financial_reconciliations_tenant_bankAccount_reconciliationDate" RENAME TO "financial_reconciliations_tenantId_bankAccountId_reconcilia_key";

-- RenameIndex
ALTER INDEX "financial_reconciliations_tenant_bank_status_idx" RENAME TO "financial_reconciliations_tenantId_bankAccountId_status_idx";

-- RenameIndex
ALTER INDEX "financial_transactions_bankAccount_idx" RENAME TO "financial_transactions_bankAccountId_idx";

-- RenameIndex
ALTER INDEX "financial_transactions_category_idx" RENAME TO "financial_transactions_categoryId_idx";

-- RenameIndex
ALTER INDEX "financial_transactions_paymentMethod_idx" RENAME TO "financial_transactions_paymentMethodId_idx";

-- RenameIndex
ALTER INDEX "financial_transactions_tenant_competence_type_idx" RENAME TO "financial_transactions_tenantId_competenceMonth_type_idx";

-- RenameIndex
ALTER INDEX "financial_transactions_tenant_residentContract_idx" RENAME TO "financial_transactions_tenantId_residentContractId_idx";

-- RenameIndex
ALTER INDEX "financial_transactions_tenant_resident_idx" RENAME TO "financial_transactions_tenantId_residentId_idx";

-- RenameIndex
ALTER INDEX "financial_transactions_tenant_status_dueDate_idx" RENAME TO "financial_transactions_tenantId_status_dueDate_idx";

-- RenameIndex
ALTER INDEX "medication_administrations_residentId_date_wasAdministere_idx" RENAME TO "medication_administrations_residentId_date_wasAdministered_idx";

-- RenameIndex
ALTER INDEX "resident_anthropometry_history_tenantId_anthropometryId_ver_idx" RENAME TO "resident_anthropometry_history_tenantId_residentAnthropomet_idx";

-- RenameIndex
ALTER INDEX "resident_blood_type_history_tenantId_residentBloodTypeId_ver_id" RENAME TO "resident_blood_type_history_tenantId_residentBloodTypeId_ve_idx";

-- RenameIndex
ALTER INDEX "resident_dependency_assessment_history_tenantId_assessmentId_ve" RENAME TO "resident_dependency_assessment_history_tenantId_residentDep_idx";

-- RenameIndex
ALTER INDEX "sos_medication_history_tenantId_sosMedicationId_versionNu_idx" RENAME TO "sos_medication_history_tenantId_sosMedicationId_versionNumb_idx";
