/*
  Warnings:

  - You are about to drop the column `date_tz` on the `daily_records` table. All the data in the column will be lost.
  - You are about to drop the column `date_tz` on the `medication_administrations` table. All the data in the column will be lost.
  - You are about to drop the column `end_date_tz` on the `medications` table. All the data in the column will be lost.
  - You are about to drop the column `start_date_tz` on the `medications` table. All the data in the column will be lost.
  - You are about to drop the column `prescription_date_tz` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `review_date_tz` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `valid_until_tz` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `admission_date_tz` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `birth_date_tz` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `discharge_date_tz` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `date_tz` on the `sos_administrations` table. All the data in the column will be lost.
  - You are about to drop the column `end_date_tz` on the `sos_medications` table. All the data in the column will be lost.
  - You are about to drop the column `start_date_tz` on the `sos_medications` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at_tz` on the `tenant_documents` table. All the data in the column will be lost.
  - You are about to drop the column `issued_at_tz` on the `tenant_documents` table. All the data in the column will be lost.
  - You are about to drop the column `founded_at_tz` on the `tenant_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `birth_date_tz` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `date_tz` on the `vaccinations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentAction" AS ENUM ('CREATED', 'UPDATED', 'REPLACED', 'DELETED');

-- AlterTable
ALTER TABLE "daily_records" DROP COLUMN "date_tz",
ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "medication_administrations" DROP COLUMN "date_tz",
ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "medications" DROP COLUMN "end_date_tz",
DROP COLUMN "start_date_tz",
ALTER COLUMN "startDate" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "endDate" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "pop_attachments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pop_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pops" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "prescriptions" DROP COLUMN "prescription_date_tz",
DROP COLUMN "review_date_tz",
DROP COLUMN "valid_until_tz",
ADD COLUMN     "updatedBy" UUID,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "prescriptionDate" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "validUntil" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "reviewDate" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "resident_history" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "residents" DROP COLUMN "admission_date_tz",
DROP COLUMN "birth_date_tz",
DROP COLUMN "discharge_date_tz",
ALTER COLUMN "birthDate" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "admissionDate" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "dischargeDate" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "sos_administrations" DROP COLUMN "date_tz",
ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "sos_medications" DROP COLUMN "end_date_tz",
DROP COLUMN "start_date_tz",
ALTER COLUMN "startDate" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "endDate" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "tenant_documents" DROP COLUMN "expires_at_tz",
DROP COLUMN "issued_at_tz",
ADD COLUMN     "documentNumber" VARCHAR(100),
ADD COLUMN     "issuerEntity" VARCHAR(200),
ADD COLUMN     "replacedAt" TIMESTAMPTZ(3),
ADD COLUMN     "replacedById" UUID,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "issuedAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "tenant_profiles" DROP COLUMN "founded_at_tz",
ALTER COLUMN "foundedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "birth_date_tz",
ALTER COLUMN "birthDate" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "vaccinations" DROP COLUMN "date_tz",
ALTER COLUMN "date" SET DATA TYPE TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "prescription_history" (
    "id" UUID NOT NULL,
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

-- CreateTable
CREATE TABLE "document_history" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "action" "DocumentAction" NOT NULL,
    "reason" TEXT,
    "previousData" JSONB,
    "newData" JSONB,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changedBy" UUID NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prescription_history_tenantId_prescriptionId_versionNumber_idx" ON "prescription_history"("tenantId", "prescriptionId", "versionNumber" DESC);

-- CreateIndex
CREATE INDEX "prescription_history_tenantId_changedAt_idx" ON "prescription_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "prescription_history_changedBy_idx" ON "prescription_history"("changedBy");

-- CreateIndex
CREATE INDEX "prescription_history_changeType_idx" ON "prescription_history"("changeType");

-- CreateIndex
CREATE INDEX "document_history_tenantId_documentId_idx" ON "document_history"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "document_history_documentId_idx" ON "document_history"("documentId");

-- CreateIndex
CREATE INDEX "document_history_action_idx" ON "document_history"("action");

-- CreateIndex
CREATE INDEX "document_history_changedAt_idx" ON "document_history"("changedAt");

-- CreateIndex
CREATE INDEX "tenant_documents_replacedById_idx" ON "tenant_documents"("replacedById");

-- CreateIndex
CREATE INDEX "tenant_documents_version_idx" ON "tenant_documents"("version");

-- AddForeignKey
ALTER TABLE "prescription_history" ADD CONSTRAINT "prescription_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_history" ADD CONSTRAINT "prescription_history_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_history" ADD CONSTRAINT "prescription_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_documents" ADD CONSTRAINT "tenant_documents_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "tenant_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_history" ADD CONSTRAINT "document_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_history" ADD CONSTRAINT "document_history_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "tenant_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
