/*
  Warnings:

  - You are about to drop the column `addressDocuments` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `documents` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `legalGuardianDocuments` on the `residents` table. All the data in the column will be lost.
  - You are about to drop the column `medicalReport` on the `residents` table. All the data in the column will be lost.
  - The `roomId` column on the `residents` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `bedId` column on the `residents` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[bedId]` on the table `residents` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `buildings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `floors` table without a default value. This is not possible if the table is not empty.
  - Made the column `code` on table `rooms` required. This step will fail if there are existing NULL values in that column.
  - Made the column `roomNumber` on table `rooms` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "rooms_code_idx";

-- AlterTable
ALTER TABLE "buildings" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "floors" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "reviewDate" DATE;

-- AlterTable
ALTER TABLE "residents" DROP COLUMN "addressDocuments",
DROP COLUMN "documents",
DROP COLUMN "legalGuardianDocuments",
DROP COLUMN "medicalReport",
DROP COLUMN "roomId",
ADD COLUMN     "roomId" UUID,
DROP COLUMN "bedId",
ADD COLUMN     "bedId" UUID;

-- AlterTable
ALTER TABLE "rooms" ALTER COLUMN "code" SET NOT NULL,
ALTER COLUMN "roomNumber" SET NOT NULL;

-- CreateTable
CREATE TABLE "resident_documents" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" VARCHAR(100),
    "details" TEXT,
    "uploadedBy" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "resident_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_record_history" (
    "id" UUID NOT NULL,
    "recordId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "previousData" JSONB NOT NULL,
    "newData" JSONB NOT NULL,
    "changedFields" JSONB NOT NULL DEFAULT '[]',
    "changeType" TEXT NOT NULL,
    "changeReason" TEXT NOT NULL,
    "changedBy" UUID NOT NULL,
    "changedByName" TEXT NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,

    CONSTRAINT "daily_record_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resident_documents_tenantId_residentId_idx" ON "resident_documents"("tenantId", "residentId");

-- CreateIndex
CREATE INDEX "resident_documents_residentId_type_idx" ON "resident_documents"("residentId", "type");

-- CreateIndex
CREATE INDEX "resident_documents_deletedAt_idx" ON "resident_documents"("deletedAt");

-- CreateIndex
CREATE INDEX "daily_record_history_recordId_versionNumber_idx" ON "daily_record_history"("recordId", "versionNumber");

-- CreateIndex
CREATE INDEX "daily_record_history_tenantId_changedAt_idx" ON "daily_record_history"("tenantId", "changedAt" DESC);

-- CreateIndex
CREATE INDEX "daily_record_history_changedBy_idx" ON "daily_record_history"("changedBy");

-- CreateIndex
CREATE UNIQUE INDEX "residents_bedId_key" ON "residents"("bedId");

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_documents" ADD CONSTRAINT "resident_documents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_documents" ADD CONSTRAINT "resident_documents_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_record_history" ADD CONSTRAINT "daily_record_history_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "daily_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_record_history" ADD CONSTRAINT "daily_record_history_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
